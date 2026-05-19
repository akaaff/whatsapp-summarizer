import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  label?: string;
}

// Web: plain HTML date input
function WebDatePicker({ value, onChange, minimumDate, maximumDate }: Props) {
  const toInputValue = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <input
      type="date"
      value={toInputValue(value)}
      min={minimumDate ? toInputValue(minimumDate) : undefined}
      max={maximumDate ? toInputValue(maximumDate) : undefined}
      onChange={(e) => {
        if (e.target.value) onChange(new Date(e.target.value + 'T00:00:00'));
      }}
      style={{
        width: '100%',
        padding: '14px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '10px',
        backgroundColor: '#fafafa',
        color: '#1a1a1a',
        boxSizing: 'border-box',
        marginBottom: '20px',
      } as React.CSSProperties}
    />
  );
}

// Native: uses the lazy-loaded native date picker
function NativeDatePicker(props: Props) {
  // Loaded lazily so web bundle doesn't include native-only module
  const DateTimePicker = require('@react-native-community/datetimepicker').default;
  const [show, setShow] = React.useState(false);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShow(true)}>
        <Text style={styles.dateText}>{fmt(props.value)}</Text>
      </TouchableOpacity>
      {show && (
        <DateTimePicker
          value={props.value}
          mode="date"
          minimumDate={props.minimumDate}
          maximumDate={props.maximumDate}
          onChange={(_: unknown, d?: Date) => {
            setShow(Platform.OS === 'ios');
            if (d) props.onChange(d);
          }}
        />
      )}
    </>
  );
}

export default function DatePicker(props: Props) {
  if (Platform.OS === 'web') return <WebDatePicker {...props} />;
  return <NativeDatePicker {...props} />;
}

const styles = StyleSheet.create({
  dateButton: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    padding: 14, marginBottom: 20,
  },
  dateText: { fontSize: 16, color: '#1a1a1a' },
});
