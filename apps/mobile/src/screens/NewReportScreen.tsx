import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import type { Report, SeverityLevel, IncidentCategory } from '@blackout/types';
import { SeveritySelector } from '../components/SeveritySelector';

export interface NewReportScreenProps {
  onSubmit: (report: Report) => void;
  onCancel: () => void;
  reporterCallsign: string;
}

export const NewReportScreen: React.FC<NewReportScreenProps> = ({
  onSubmit,
  onCancel,
  reporterCallsign,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('CRITICAL');
  const [category, setCategory] = useState<IncidentCategory>('MEDICAL');
  const [casualtiesCount, setCasualtiesCount] = useState('0');
  const [trappedCount, setTrappedCount] = useState('0');
  const [resources, setResources] = useState('');

  const handleSend = () => {
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter an incident summary');
      return;
    }

    const report: Report = {
      id: `mob_rpt_${Date.now()}`,
      title,
      description,
      severity,
      category,
      status: 'SUBMITTED',
      syncState: 'LOCAL_PENDING',
      location: {
        latitude: 37.7749,
        longitude: -122.4194,
      },
      reporterId: `mob_${reporterCallsign.toLowerCase()}`,
      callsign: reporterCallsign,
      casualtiesCount: Number(casualtiesCount) || 0,
      trappedCount: Number(trappedCount) || 0,
      resourcesNeeded: resources
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      vectorClock: { [reporterCallsign]: 1 },
    };

    onSubmit(report);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>TRANSMIT INCIDENT</Text>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelText}>CANCEL</Text>
        </TouchableOpacity>
      </View>

      <SeveritySelector selected={severity} onSelect={setSeverity} />

      <Text style={styles.label}>INCIDENT SUMMARY</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Flash flood trapped family in attic"
        placeholderTextColor="#475569"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>TACTICAL DETAILS</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        multiline
        numberOfLines={3}
        placeholder="Current hazards, access obstructions, victim conditions..."
        placeholderTextColor="#475569"
        value={description}
        onChangeText={setDescription}
      />

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={styles.label}>CASUALTIES</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={casualtiesCount}
            onChangeText={setCasualtiesCount}
          />
        </View>
        <View style={styles.col}>
          <Text style={styles.label}>TRAPPED PERSONS</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={trappedCount}
            onChangeText={setTrappedCount}
          />
        </View>
      </View>

      <Text style={styles.label}>RESOURCES NEEDED</Text>
      <TextInput
        style={styles.input}
        placeholder="PARAMEDICS, BOAT, EXTRACTION_TOOLS"
        placeholderTextColor="#475569"
        value={resources}
        onChangeText={setResources}
      />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSend}>
        <Text style={styles.submitText}>QUEUE & BROADCAST VIA MESH</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f293d',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1f293d',
    borderRadius: 8,
    color: '#ffffff',
    padding: 12,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
});
