import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Share,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { getSummary, subscribeProgress } from '../api/client';
import { RootStackParamList } from '../navigation/types';

type Status = 'pending' | 'done' | 'failed';
type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SummaryResult'>;
  route: RouteProp<RootStackParamList, 'SummaryResult'>;
};

export default function SummaryResultScreen({ navigation, route }: Props) {
  const { requestId, chatName, language } = route.params;
  const [status, setStatus] = useState<Status>('pending');
  const [result, setResult] = useState<string | null>(null);
  const [chunksDone, setChunksDone] = useState(0);
  const [chunksTotal, setChunksTotal] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeProgress(requestId, (event) => {
      if (event.type === 'progress') {
        setChunksDone(event.done);
        setChunksTotal(event.total);
      } else if (event.type === 'done') {
        getSummary(requestId)
          .then((res) => {
            setResult(res.data.result);
            setStatus('done');
          })
          .catch(() => setStatus('failed'));
      } else if (event.type === 'error') {
        setResult(event.message);
        setStatus('failed');
      }
    });
    return unsubscribe;
  }, [requestId]);

  const handleShare = () => {
    if (result) Share.share({ message: `Summary of ${chatName}:\n\n${result}` });
  };

  if (status === 'pending') {
    const progress = chunksTotal > 1 ? chunksDone / chunksTotal : null;
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#25D366" />
        <Text style={styles.loadingText}>Generating summary in {language}…</Text>
        {chunksTotal > 1 ? (
          <>
            <Text style={styles.chunkText}>
              Summarising chunk {chunksDone} of {chunksTotal}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.round((progress ?? 0) * 100)}%` as any }]} />
            </View>
          </>
        ) : (
          <Text style={styles.loadingHint}>This may take up to a minute</Text>
        )}
      </View>
    );
  }

  if (status === 'failed') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Summary failed</Text>
        <Text style={styles.errorText}>{result}</Text>
        <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.chatName} numberOfLines={1}>{chatName}</Text>
        <View style={styles.langBadge}>
          <Text style={styles.langText}>{language}</Text>
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.summary}>{result}</Text>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Text style={styles.shareText}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => navigation.popToTop()}>
          <Text style={styles.buttonText}>Back to Chats</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  chatName: { flex: 1, fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  langBadge: { backgroundColor: '#e8f5e9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  langText: { fontSize: 12, color: '#25D366', fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  summary: { fontSize: 16, lineHeight: 26, color: '#1a1a1a' },
  footer: { flexDirection: 'row', padding: 16, gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#eee' },
  shareButton: { flex: 1, borderWidth: 1, borderColor: '#25D366', borderRadius: 10,
    padding: 14, alignItems: 'center' },
  shareText: { color: '#25D366', fontSize: 15, fontWeight: '600' },
  button: { flex: 1, backgroundColor: '#25D366', borderRadius: 10, padding: 14, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  loadingText: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 20 },
  loadingHint: { fontSize: 13, color: '#888', marginTop: 8 },
  chunkText: { fontSize: 13, color: '#888', marginTop: 8, marginBottom: 16 },
  barTrack: { width: '100%', height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#25D366', borderRadius: 3 },
  errorIcon: { fontSize: 48, marginBottom: 12 },
  errorTitle: { fontSize: 18, fontWeight: '700', color: '#c00', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
});
