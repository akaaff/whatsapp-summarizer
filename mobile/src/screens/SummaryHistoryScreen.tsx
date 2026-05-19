import React, { useCallback, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listSummaries } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Summary = {
  id: string; chat_id: string; language: string;
  status: string; date_from: string; date_to: string; created_at: string;
};
type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'SummaryHistory'> };

export default function SummaryHistoryScreen({ navigation }: Props) {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try { const res = await listSummaries(); setSummaries(res.data.summaries); } catch {}
    setLoading(false); setRefreshing(false);
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const chatName = (id: string) => id.replace('@g.us', ' (Group)').replace('@s.whatsapp.net', '');
  const statusColor = (s: string) => s === 'done' ? '#25D366' : s === 'failed' ? '#c00' : '#f90';

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#25D366" /></View>;

  return (
    <View style={styles.container}>
      {summaries.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No summaries yet</Text>
          <Text style={styles.emptyText}>Select a chat and generate your first summary.</Text>
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} />}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => item.status === 'done' &&
                navigation.navigate('SummaryResult', {
                  requestId: item.id,
                  chatName: chatName(item.chat_id),
                  language: item.language,
                })
              }
            >
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{chatName(item.chat_id)}</Text>
                <Text style={styles.meta}>{fmt(item.date_from)} – {fmt(item.date_to)} · {item.language}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColor(item.status) + '22' }]}>
                <Text style={[styles.badgeText, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  meta: { fontSize: 13, color: '#888' },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
});
