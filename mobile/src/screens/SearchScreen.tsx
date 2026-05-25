import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { searchMessages } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Search'>;
  route: RouteProp<RootStackParamList, 'Search'>;
};

type Source = { sender: string; body: string; timestamp: string };
type Result = { answer: string; sources: Source[] };

export default function SearchScreen({ route }: Props) {
  const { chatId } = route.params;
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [firstSearch, setFirstSearch] = useState(true);

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await searchMessages(chatId, q);
      setResult(res.data);
      setFirstSearch(false);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ask a question about this chat…"
          placeholderTextColor="#aaa"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoFocus
        />
        <TouchableOpacity
          style={[styles.searchBtn, (!query.trim() || loading) && styles.searchBtnDisabled]}
          onPress={handleSearch}
          disabled={!query.trim() || loading}
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.searchBtnText}>Search</Text>
          }
        </TouchableOpacity>
      </View>

      {loading && firstSearch && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Indexing messages for the first time — this may take a minute.
          </Text>
        </View>
      )}

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {result && (
        <FlatList
          data={result.sources}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.answerCard}>
              <Text style={styles.answerLabel}>Answer</Text>
              <Text style={styles.answerText}>{result.answer}</Text>
              {result.sources.length > 0 && (
                <Text style={styles.sourcesLabel}>
                  Based on {result.sources.length} message{result.sources.length !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.sourceRow}>
              <View style={styles.sourceHeader}>
                <Text style={styles.sourceSender}>{item.sender}</Text>
                <Text style={styles.sourceTime}>{formatDate(item.timestamp)}</Text>
              </View>
              <Text style={styles.sourceBody}>{item.body}</Text>
            </View>
          )}
        />
      )}

      {!result && !loading && !error && (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>Ask anything about this chat</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: '#1a1a1a',
    backgroundColor: '#fafafa' },
  searchBtn: { backgroundColor: '#25D366', borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnDisabled: { opacity: 0.5 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  hint: { backgroundColor: '#FFF8E1', paddingVertical: 10, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#FFE082' },
  hintText: { color: '#795548', fontSize: 13 },
  errorBox: { margin: 16, padding: 14, backgroundColor: '#FFEBEE', borderRadius: 10 },
  errorText: { color: '#c00', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  answerCard: { backgroundColor: '#e8f5e9', borderRadius: 12, padding: 16, marginBottom: 16 },
  answerLabel: { fontSize: 11, fontWeight: '700', color: '#25D366',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  answerText: { fontSize: 15, lineHeight: 23, color: '#1a1a1a' },
  sourcesLabel: { fontSize: 12, color: '#888', marginTop: 10 },
  sourceRow: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12 },
  sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sourceSender: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  sourceTime: { fontSize: 12, color: '#aaa' },
  sourceBody: { fontSize: 14, color: '#444', lineHeight: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 15, color: '#888' },
});
