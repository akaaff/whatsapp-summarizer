import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, Platform, ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { requestSummary } from '../api/client';
import { RootStackParamList } from '../navigation/types';

const LANGUAGES = [
  'English', 'Russian', 'Hebrew', 'Spanish', 'French',
  'German', 'Arabic', 'Portuguese', 'Italian', 'Dutch',
];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SummaryRequest'>;
  route: RouteProp<RootStackParamList, 'SummaryRequest'>;
};

export default function SummaryRequestScreen({ navigation, route }: Props) {
  const { chatId } = route.params;
  const chatName = chatId.replace('@g.us', ' (Group)').replace('@s.whatsapp.net', '');

  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d;
  });
  const [dateTo, setDateTo] = useState(new Date());
  const [language, setLanguage] = useState('English');
  const [showFrom, setShowFrom] = useState(false);
  const [showTo, setShowTo] = useState(false);
  const [loading, setLoading] = useState(false);

  const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  const handleSubmit = async () => {
    if (dateFrom >= dateTo) { Alert.alert('Invalid range', '"From" must be before "To"'); return; }
    setLoading(true);
    try {
      const res = await requestSummary(
        chatId,
        dateFrom.toISOString(),
        dateTo.toISOString(),
        language,
      );
      navigation.replace('SummaryResult', { requestId: res.data.id, chatName, language });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Failed to start summary');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.chatName}>{chatName}</Text>

      <Text style={styles.label}>From</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowFrom(true)}>
        <Text style={styles.dateText}>{fmt(dateFrom)}</Text>
      </TouchableOpacity>
      {showFrom && (
        <DateTimePicker value={dateFrom} mode="date" maximumDate={dateTo}
          onChange={(_, d) => { setShowFrom(Platform.OS === 'ios'); if (d) setDateFrom(d); }} />
      )}

      <Text style={styles.label}>To</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowTo(true)}>
        <Text style={styles.dateText}>{fmt(dateTo)}</Text>
      </TouchableOpacity>
      {showTo && (
        <DateTimePicker value={dateTo} mode="date" minimumDate={dateFrom} maximumDate={new Date()}
          onChange={(_, d) => { setShowTo(Platform.OS === 'ios'); if (d) setDateTo(d); }} />
      )}

      <Text style={styles.label}>Language</Text>
      <View style={styles.langGrid}>
        {LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang}
            style={[styles.langChip, language === lang && styles.langChipActive]}
            onPress={() => setLanguage(lang)}
          >
            <Text style={[styles.langText, language === lang && styles.langTextActive]}>{lang}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>Generate Summary</Text>
        }
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 24 },
  chatName: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  dateButton: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, marginBottom: 20 },
  dateText: { fontSize: 16, color: '#1a1a1a' },
  langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 32 },
  langChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingVertical: 7, paddingHorizontal: 14 },
  langChipActive: { backgroundColor: '#25D366', borderColor: '#25D366' },
  langText: { fontSize: 14, color: '#444' },
  langTextActive: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: '#25D366', borderRadius: 10, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
