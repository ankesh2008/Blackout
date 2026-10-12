import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import type { PeerInfo } from '@blackout/types';

export interface MeshRadarScreenProps {
  peers: PeerInfo[];
  localCallsign: string;
}

export const MeshRadarScreen: React.FC<MeshRadarScreenProps> = ({ peers, localCallsign }) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>OFFLINE P2P RADAR</Text>
        <Text style={styles.peerCount}>{peers.length} PEERS IN RANGE</Text>
      </View>

      {/* Radar Target Simulation */}
      <View style={styles.radarContainer}>
        <View style={[styles.circle, styles.outerCircle]} />
        <View style={[styles.circle, styles.midCircle]} />
        <View style={[styles.circle, styles.innerCircle]} />
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <View style={styles.centerDot}>
          <Text style={styles.localDotText}>{localCallsign.slice(0, 4)}</Text>
        </View>

        {/* Peer blips */}
        {peers.map((peer, idx) => {
          const angle = (idx * (360 / Math.max(peers.length, 1)) * Math.PI) / 180;
          const radius = 35 + (idx % 2) * 30;
          const left = 100 + Math.cos(angle) * radius - 6;
          const top = 100 + Math.sin(angle) * radius - 6;

          return (
            <View
              key={peer.peerId}
              style={[
                styles.peerBlip,
                { left, top },
              ]}
            />
          );
        })}
      </View>

      <Text style={styles.listHeader}>ACTIVE LOCAL NODES</Text>
      <FlatList
        data={peers}
        keyExtractor={(item) => item.peerId}
        renderItem={({ item }) => (
          <View style={styles.peerRow}>
            <View>
              <Text style={styles.peerCallsign}>{item.callsign}</Text>
              <Text style={styles.peerRole}>{item.role}</Text>
            </View>
            <View style={styles.latencyBadge}>
              <Text style={styles.latencyText}>{item.latencyMs} ms</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No local peers in broadcast range. P2P radio beacon listening...
          </Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  peerCount: {
    color: '#38bdf8',
    fontSize: 12,
    fontFamily: 'monospace',
  },
  radarContainer: {
    width: 200,
    height: 200,
    alignSelf: 'center',
    marginVertical: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  outerCircle: {
    width: 200,
    height: 200,
  },
  midCircle: {
    width: 130,
    height: 130,
  },
  innerCircle: {
    width: 60,
    height: 60,
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  localDotText: {
    fontSize: 7,
    color: '#064e3b',
    fontWeight: 'bold',
  },
  peerBlip: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#38bdf8',
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  listHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 16,
    marginBottom: 8,
  },
  peerRow: {
    backgroundColor: '#121824',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f293d',
  },
  peerCallsign: {
    color: '#ffffff',
    fontSize: 13,
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  peerRole: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  latencyBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  latencyText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center',
    marginTop: 20,
  },
});
