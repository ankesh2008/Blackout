import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import type { Report } from '@blackout/types';

export interface IncidentFeedScreenProps {
  reports: Report[];
  onOpenNewReport: () => void;
  onOpenRadar: () => void;
  peerCount: number;
}

export const IncidentFeedScreen: React.FC<IncidentFeedScreenProps> = ({
  reports,
  onOpenNewReport,
  onOpenRadar,
  peerCount,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>BLACKOUT MOBILE</Text>
          <Text style={styles.statusSubtitle}>OFFLINE P2P MESH // ACTIVE</Text>
        </View>

        <TouchableOpacity style={styles.radarBtn} onPress={onOpenRadar}>
          <Text style={styles.radarBtnText}>📡 RADAR ({peerCount})</Text>
        </TouchableOpacity>
      </View>

      {/* Reports List */}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isCritical = item.severity === 'CRITICAL';
          return (
            <View
              style={[
                styles.card,
                isCritical && styles.cardCritical,
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <View
                  style={[
                    styles.severityBadge,
                    {
                      backgroundColor:
                        item.severity === 'CRITICAL'
                          ? '#ef4444'
                          : item.severity === 'HIGH'
                          ? '#f97316'
                          : '#eab308',
                    },
                  ]}
                >
                  <Text style={styles.severityText}>{item.severity}</Text>
                </View>
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  CASUALTIES: {item.casualtiesCount} | TRAPPED: {item.trappedCount}
                </Text>
                <Text style={styles.syncStateText}>
                  {item.syncState.replace('_', ' ')}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No emergency incidents recorded.</Text>
            <Text style={styles.emptySubtext}>Swarm mesh is standing by.</Text>
          </View>
        }
      />

      {/* Bottom SOS Action Button */}
      <TouchableOpacity style={styles.fab} onPress={onOpenNewReport}>
        <Text style={styles.fabText}>+ TRANSMIT EMERGENCY SOS</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#121824',
    borderBottomWidth: 1,
    borderBottomColor: '#1f293d',
  },
  appTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  statusSubtitle: {
    color: '#38bdf8',
    fontSize: 10,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  radarBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  radarBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  card: {
    backgroundColor: '#121824',
    borderWidth: 1,
    borderColor: '#1f293d',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
  },
  cardCritical: {
    borderColor: '#ef4444',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  severityText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  cardDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1f293d',
    paddingTop: 6,
  },
  metaText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  syncStateText: {
    color: '#34d399',
    fontSize: 10,
    fontFamily: 'monospace',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#dc2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#dc2626',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'monospace',
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 4,
  },
});
