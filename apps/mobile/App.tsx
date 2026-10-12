import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Report, PeerInfo } from '@blackout/types';
import { mobileDbWorker } from './src/workers/mobile-db-worker';
import { IncidentFeedScreen } from './src/screens/IncidentFeedScreen';
import { NewReportScreen } from './src/screens/NewReportScreen';
import { MeshRadarScreen } from './src/screens/MeshRadarScreen';

type ActiveView = 'FEED' | 'NEW_REPORT' | 'RADAR';

const CALLSIGN = 'MOBILE_RESCUE_01';

export default function App() {
  const [activeView, setActiveView] = useState<ActiveView>('FEED');
  const [reports, setReports] = useState<Report[]>([]);
  const [peers, setPeers] = useState<PeerInfo[]>([]);

  useEffect(() => {
    // Initial sample reports
    const sampleReports: Report[] = [
      {
        id: 'mob_demo_01',
        title: 'Gas Leak Detected - Residential Zone 9',
        description: 'Strong smell of natural gas following seismic tremor. 12 residents evacuated.',
        severity: 'HIGH',
        category: 'HAZARD',
        status: 'SUBMITTED',
        syncState: 'LOCAL_PENDING',
        location: { latitude: 37.7749, longitude: -122.4194 },
        reporterId: 'mob_user_01',
        callsign: CALLSIGN,
        casualtiesCount: 0,
        trappedCount: 0,
        resourcesNeeded: ['GAS_DETECTOR', 'FIRE_CREW'],
        createdAt: Date.now() - 600000,
        updatedAt: Date.now() - 600000,
        version: 1,
        vectorClock: { [CALLSIGN]: 1 },
      },
    ];

    setReports(sampleReports);

    // Initial mock peer in local radio range
    setPeers([
      {
        peerId: 'peer_field_medic_04',
        callsign: 'FIELD_MEDIC_4',
        role: 'FIRST_RESPONDER',
        connectedAt: Date.now() - 300000,
        lastPing: Date.now(),
        latencyMs: 18,
        isMeshRelay: true,
      },
    ]);
  }, []);

  const handleAddReport = async (report: Report) => {
    await mobileDbWorker.upsertReport(report);
    setReports((prev) => [report, ...prev]);
    setActiveView('FEED');
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {activeView === 'FEED' && (
        <IncidentFeedScreen
          reports={reports}
          onOpenNewReport={() => setActiveView('NEW_REPORT')}
          onOpenRadar={() => setActiveView('RADAR')}
          peerCount={peers.length}
        />
      )}

      {activeView === 'NEW_REPORT' && (
        <NewReportScreen
          onSubmit={handleAddReport}
          onCancel={() => setActiveView('FEED')}
          reporterCallsign={CALLSIGN}
        />
      )}

      {activeView === 'RADAR' && (
        <View style={styles.radarWrapper}>
          <MeshRadarScreen peers={peers} localCallsign={CALLSIGN} />
          <View style={styles.backRow}>
            <IncidentFeedScreen
              reports={[]}
              onOpenNewReport={() => {}}
              onOpenRadar={() => setActiveView('FEED')}
              peerCount={peers.length}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0d14',
  },
  radarWrapper: {
    flex: 1,
    paddingTop: 40,
  },
  backRow: {
    height: 0,
    overflow: 'hidden',
  },
});
