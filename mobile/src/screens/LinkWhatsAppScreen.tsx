import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { getQR, getStatus } from '../api/client';

type Status = 'idle' | 'loading' | 'qr_ready' | 'linked' | 'expired' | 'error';

export default function LinkWhatsAppScreen() {
  const [status, setStatus] = useState<Status>('idle');
  const [qrData, setQrData] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const startPolling = () => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const res = await getStatus();
        if (res.data.status === 'linked') {
          setStatus('linked');
          stopPolling();
        }
      } catch {}
    }, 3000);
  };

  const fetchQR = async () => {
    setStatus('loading');
    setQrData(null);
    try {
      const res = await getQR();
      if (res.data.status === 'linked') { setStatus('linked'); return; }
      setQrData(res.data.qr);
      setStatus('qr_ready');
      startPolling();
    } catch (e: any) {
      setStatus('error');
      Alert.alert('Error', e.response?.data?.error || 'Could not load QR code');
    }
  };

  useEffect(() => {
    getStatus().then((res) => {
      if (res.data.status === 'linked') setStatus('linked');
      else if (res.data.status === 'expired') setStatus('expired');
    }).catch(() => {});
    return stopPolling;
  }, []);

  if (status === 'linked') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>WhatsApp Linked</Text>
        <Text style={styles.subtitle}>Your account is connected. Go to Chats to get started.</Text>
      </View>
    );
  }

  if (status === 'expired') {
    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Session Expired</Text>
        <Text style={styles.subtitle}>
          Your WhatsApp session was logged out (e.g. from another device).{'\n'}
          Scan a new QR code to reconnect.
        </Text>
        <TouchableOpacity style={styles.button} onPress={fetchQR}>
          <Text style={styles.buttonText}>Re-link WhatsApp</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Link WhatsApp</Text>
      <Text style={styles.subtitle}>
        Scan this QR code with WhatsApp on your phone.{'\n'}
        Open WhatsApp › Settings › Linked Devices › Link a Device
      </Text>

      {status === 'loading' && (
        <View style={styles.qrBox}>
          <ActivityIndicator size="large" color="#25D366" />
          <Text style={styles.hint}>Generating QR code...</Text>
        </View>
      )}

      {status === 'qr_ready' && qrData && (
        <>
          <Image source={{ uri: qrData }} style={styles.qrImage} />
          <Text style={styles.hint}>Waiting for scan...</Text>
          <ActivityIndicator color="#25D366" style={{ marginTop: 8 }} />
        </>
      )}

      {(status === 'idle' || status === 'error') && (
        <TouchableOpacity style={styles.button} onPress={fetchQR}>
          <Text style={styles.buttonText}>
            {status === 'error' ? 'Retry' : 'Generate QR Code'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#1a1a1a' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  qrBox: { alignItems: 'center', justifyContent: 'center', height: 260 },
  qrImage: { width: 260, height: 260, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  hint: { marginTop: 12, color: '#888', fontSize: 14 },
  button: { backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 14,
    paddingHorizontal: 32, marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
