import path from 'path';
import fs from 'fs';
import { EventEmitter } from 'events';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { toDataURL } from 'qrcode';
import pino from 'pino';
import { pool } from '../db/pool';

const silentLogger = pino({ level: 'silent' });

export type SessionStatus = 'unlinked' | 'linking' | 'linked' | 'expired';

interface Session {
  socket: WASocket;
  status: SessionStatus;
  qr?: string; // base64 data URL
}

const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(process.cwd(), 'sessions');

class SessionManager extends EventEmitter {
  private sessions = new Map<string, Session>();

  sessionPath(userId: string): string {
    return path.join(SESSIONS_DIR, userId);
  }

  async create(userId: string): Promise<void> {
    if (this.sessions.has(userId)) return;
    await this._connect(userId);
  }

  getStatus(userId: string): SessionStatus {
    return this.sessions.get(userId)?.status ?? 'unlinked';
  }

  getQR(userId: string): string | undefined {
    return this.sessions.get(userId)?.qr;
  }

  getSocket(userId: string): WASocket | undefined {
    return this.sessions.get(userId)?.socket;
  }

  async destroy(userId: string): Promise<void> {
    const session = this.sessions.get(userId);
    if (session) {
      await session.socket.logout().catch(() => {});
      this.sessions.delete(userId);
    }
    await pool.query(
      "UPDATE whatsapp_sessions SET status = 'unlinked', linked_at = NULL WHERE user_id = $1",
      [userId]
    );
  }

  private async _connect(userId: string): Promise<void> {
    const sessionDir = this.sessionPath(userId);
    fs.mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, { level: 'silent' } as any),
      },
      printQRInTerminal: false,
      logger: silentLogger,
      syncFullHistory: false,
    });

    const session: Session = { socket, status: 'linking' };
    this.sessions.set(userId, session);

    socket.ev.on('creds.update', saveCreds);

    socket.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        session.qr = await toDataURL(qr);
        session.status = 'linking';
        this.emit('qr', userId, session.qr);
      }

      if (connection === 'open') {
        session.status = 'linked';
        session.qr = undefined;
        this.emit('linked', userId);
        await pool.query(
          `INSERT INTO whatsapp_sessions (user_id, session_path, status, linked_at)
           VALUES ($1, $2, 'linked', NOW())
           ON CONFLICT (user_id) DO UPDATE
           SET status = 'linked', session_path = $2, linked_at = NOW()`,
          [userId, sessionDir]
        );
      }

      if (connection === 'close') {
        const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;

        if (loggedOut) {
          session.status = 'expired';
          this.sessions.delete(userId);
          // Remove credentials from disk — stale creds cause an immediate re-logout loop
          fs.rmSync(this.sessionPath(userId), { recursive: true, force: true });
          await pool.query(
            "UPDATE whatsapp_sessions SET status = 'expired' WHERE user_id = $1",
            [userId]
          );
          this.emit('expired', userId);
        } else {
          // Reconnect on transient disconnect
          this.sessions.delete(userId);
          setTimeout(() => this._connect(userId), 3000);
        }
      }
    });

    socket.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe === undefined) continue;
        const body =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '';
        if (!body) continue;

        const chatId = msg.key.remoteJid;
        const sender = msg.pushName || msg.key.participant || msg.key.remoteJid || '';
        const timestamp = new Date((msg.messageTimestamp as number) * 1000);
        const waMessageId = msg.key.id;

        await pool.query(
          `INSERT INTO cached_messages (user_id, chat_id, sender, body, timestamp, wa_message_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (user_id, wa_message_id) DO NOTHING`,
          [userId, chatId, sender, body, timestamp, waMessageId]
        ).catch(() => {});
      }
    });
  }

  // Restore sessions for all linked users on startup
  async restoreAll(): Promise<void> {
    const { rows } = await pool.query(
      "SELECT user_id FROM whatsapp_sessions WHERE status = 'linked'"
    );
    for (const row of rows) {
      await this._connect(row.user_id).catch((err) =>
        console.error(`Failed to restore session for ${row.user_id}:`, err)
      );
    }
    if (rows.length > 0) console.log(`Restored ${rows.length} WhatsApp session(s)`);
  }
}

export const sessionManager = new SessionManager();
