import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { SeverityLevel } from '@blackout/types';

export interface SeveritySelectorProps {
  selected: SeverityLevel;
  onSelect: (severity: SeverityLevel) => void;
}

const SEVERITIES: SeverityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export const SeveritySelector: React.FC<SeveritySelectorProps> = ({ selected, onSelect }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>SEVERITY LEVEL</Text>
      <View style={styles.row}>
        {SEVERITIES.map((sev) => {
          const isSelected = selected === sev;
          const bg =
            sev === 'CRITICAL'
              ? isSelected ? '#ef4444' : '#2b1515'
              : sev === 'HIGH'
              ? isSelected ? '#f97316' : '#2b1c12'
              : sev === 'MEDIUM'
              ? isSelected ? '#eab308' : '#2b2612'
              : isSelected ? '#22c55e' : '#122b17';

          return (
            <TouchableOpacity
              key={sev}
              onPress={() => onSelect(sev)}
              style={[
                styles.button,
                { backgroundColor: bg, borderColor: isSelected ? '#ffffff' : '#334155' },
              ]}
            >
              <Text style={[styles.buttonText, isSelected && styles.buttonTextSelected]}>
                {sev}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  buttonTextSelected: {
    color: '#ffffff',
  },
});
