import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getChats, getStatus } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Chat = { chat_id: string; last_message_at: string; message_count: string };
type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'ChatList'> };

export default function ChatListScreen({ navigation }: Props) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [chatsRes, statusRes] = await Promise.all([getChats(), getStatus()]);
      setChats(chatsRes.data.chats);
      setSessionExpired(statusRes.data.status === 'expired');
    } catch {}
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const chatName = (id: string) => id.replace('@g.us', ' (Group)').replace('@s.whatsapp.net', '');

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#25D366" /></View>;
  }

  return (
    <View style={styles.container}>
      {sessionExpired && (
        <TouchableOpacity
          style={styles.expiredBanner}
          onPress={() => navigation.navigate('LinkWhatsApp')}
        >
          <Text style={styles.expiredText}>
            ⚠️  WhatsApp session expired — tap to re-link
          </Text>
        </TouchableOpacity>
      )}
      {chats.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>💬</Text>
          <Text style={styles.emptyTitle}>No chats yet</Text>
          <Text style={styles.emptyText}>Link your WhatsApp account and wait for messages to sync.</Text>
        </View>
      ) : (
        <FlatList
          data={chats}
          keyExtractor={(item) => item.chat_id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('SummaryRequest', { chatId: item.chat_id })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{chatName(item.chat_id)[0]?.toUpperCase() || '?'}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{chatName(item.chat_id)}</Text>
                <Text style={styles.meta}>{item.message_count} messages · Last: {formatDate(item.last_message_at)}</Text>
              </View>
              <TouchableOpacity
                style={styles.searchIcon}
                onPress={() => navigation.navigate('Search', {
                  chatId: item.chat_id,
                  chatName: chatName(item.chat_id),
                })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.searchIconText}>🔍</Text>
              </TouchableOpacity>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22 },
  expiredBanner: { backgroundColor: '#FFF3CD', paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#FFEAA7' },
  expiredText: { color: '#856404', fontSize: 14, fontWeight: '500', textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#25D366',
    alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  meta: { fontSize: 13, color: '#888' },
  searchIcon: { padding: 4, marginRight: 8 },
  searchIconText: { fontSize: 18 },
  chevron: { fontSize: 22, color: '#ccc' },
});
