import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { Report, SeverityLevel, PeerInfo } from '@blackout/types';
import { ReplicationEngine } from '@blackout/sync';
import { MeshDiscovery, PeerSyncManager } from '@blackout/mesh';
import { Header } from '../components/Header';
import { ReportCard } from '../components/ReportCard';
import { PeerRadar } from '../components/PeerRadar';
import { CreateReportModal } from './CreateReportModal';

const LOCAL_NODE_ID = `web_node_${Math.random().toString(36).slice(2, 8)}`;
const LOCAL_CALLSIGN = `TACTICAL_${LOCAL_NODE_ID.slice(-4).toUpperCase()}`;

export const Dashboard: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [peers, setPeers] = useState<PeerInfo[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'ALL'>('ALL');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);

  // Mesh & Sync engine references
  const replicationRef = useRef<ReplicationEngine | null>(null);
  const discoveryRef = useRef<MeshDiscovery | null>(null);
  const peerSyncRef = useRef<PeerSyncManager | null>(null);
  const reportsMapRef = useRef<Map<string, Report>>(new Map());

  // Initialize offline-first mesh stack
  useEffect(() => {
    const replication = new ReplicationEngine(LOCAL_NODE_ID);
    replicationRef.current = replication;

    const discovery = new MeshDiscovery({
      nodeId: LOCAL_NODE_ID,
      callsign: LOCAL_CALLSIGN,
      role: 'FIRST_RESPONDER',
      channelName: 'blackout-mesh-swarm-alpha',
    });
    discoveryRef.current = discovery;

    const peerSync = new PeerSyncManager({
      discovery,
      replication,
      getLocalReport: (id) => reportsMapRef.current.get(id),
      saveReports: async (incoming) => {
        for (const r of incoming) {
          reportsMapRef.current.set(r.id, r);
        }
        setReports(Array.from(reportsMapRef.current.values()));
        setOutboxCount(replication.getOutbox().size());
      },
      getAllReports: async () => Array.from(reportsMapRef.current.values()),
    });
    peerSyncRef.current = peerSync;

    // Discovery listener
    const unsub = discovery.on((event) => {
      if (
        event.type === 'PEER_CONNECTED' ||
        event.type === 'PEER_DISCONNECTED' ||
        event.type === 'PEER_FOUND'
      ) {
        setPeers(discovery.getConnectedPeers());
      }
    });

    discovery.start();

    // Browser online/offline event listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial demo disaster scenario if completely empty
    if (reportsMapRef.current.size === 0) {
      const demo1: Report = {
        id: 'rpt_demo_seattle_01',
        title: 'Emergency Medical Evacuation Required - St. Jude Field Station',
        description: 'Auxiliary backup generators flooded. 4 critical patients require immediate oxygen transfer.',
        severity: 'CRITICAL',
        category: 'MEDICAL',
        status: 'TRIAGED',
        syncState: 'LOCAL_PENDING',
        location: { latitude: 47.6062, longitude: -122.3321 },
        reporterId: LOCAL_NODE_ID,
        callsign: LOCAL_CALLSIGN,
        casualtiesCount: 4,
        trappedCount: 0,
        resourcesNeeded: ['OXYGEN_TANKS', 'MEDEVAC_BOAT'],
        createdAt: Date.now() - 1200000,
        updatedAt: Date.now() - 1200000,
        version: 1,
        vectorClock: { [LOCAL_NODE_ID]: 1 },
      };

      const demo2: Report = {
        id: 'rpt_demo_seattle_02',
        title: 'Submerged Highway Underpass - Sector B4',
        description: 'Flash flooding depth 1.8 meters. 1 vehicle partially submerged, occupants safely on roof.',
        severity: 'HIGH',
        category: 'SEARCH_AND_RESCUE',
        status: 'SUBMITTED',
        syncState: 'LOCAL_PENDING',
        location: { latitude: 47.6097, longitude: -122.3331 },
        reporterId: LOCAL_NODE_ID,
        callsign: LOCAL_CALLSIGN,
        casualtiesCount: 0,
        trappedCount: 2,
        resourcesNeeded: ['WATER_RESCUE', 'WINCH_TRUCK'],
        createdAt: Date.now() - 2400000,
        updatedAt: Date.now() - 2400000,
        version: 1,
        vectorClock: { [LOCAL_NODE_ID]: 1 },
      };

      reportsMapRef.current.set(demo1.id, demo1);
      reportsMapRef.current.set(demo2.id, demo2);
      setReports([demo1, demo2]);
      replication.stageLocalReport(demo1);
      replication.stageLocalReport(demo2);
      setOutboxCount(replication.getOutbox().size());
    }

    return () => {
      unsub();
      discovery.destroy();
      peerSync.destroy();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleCreateReport = (
    data: Omit<Report, 'createdAt' | 'updatedAt' | 'version' | 'vectorClock'>
  ) => {
    if (!peerSyncRef.current) return;

    const fullReport: Report = {
      ...data,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: 1,
      vectorClock: { [LOCAL_NODE_ID]: 1 },
    };

    peerSyncRef.current.broadcastHighPriorityReport(fullReport);
  };

  const handleManualSync = () => {
    if (discoveryRef.current) {
      discoveryRef.current.announcePresence();
    }
  };

  // Filtered & sorted reports (CRITICAL first, then by timestamp)
  const filteredReports = useMemo(() => {
    return reports
      .filter((r) => severityFilter === 'ALL' || r.severity === severityFilter)
      .sort((a, b) => {
        const order: Record<SeverityLevel, number> = {
          CRITICAL: 4,
          HIGH: 3,
          MEDIUM: 2,
          LOW: 1,
        };
        if (order[b.severity] !== order[a.severity]) {
          return order[b.severity] - order[a.severity];
        }
        return b.createdAt - a.createdAt;
      });
  }, [reports, severityFilter]);

  // Statistics
  const stats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let totalCasualties = 0;
    let totalTrapped = 0;

    for (const r of reports) {
      if (r.severity === 'CRITICAL') critical++;
      if (r.severity === 'HIGH') high++;
      totalCasualties += r.casualtiesCount;
      totalTrapped += r.trappedCount;
    }

    return { critical, high, totalCasualties, totalTrapped, total: reports.length };
  }, [reports]);

  return (
    <div className="min-h-screen bg-[#0a0d14] text-slate-100 flex flex-col font-sans">
      <Header
        peerCount={peers.length}
        isOnline={isOnline}
        onOpenCreate={() => setIsCreateOpen(true)}
        onManualSync={handleManualSync}
        callsign={LOCAL_CALLSIGN}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Tactical Status Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 rounded-lg bg-[#121824] border border-red-500/30">
            <span className="text-xs font-mono text-red-400 block">CRITICAL INCIDENTS</span>
            <span className="text-2xl font-black font-mono text-red-500">{stats.critical}</span>
          </div>
          <div className="p-4 rounded-lg bg-[#121824] border border-orange-500/30">
            <span className="text-xs font-mono text-orange-400 block">HIGH URGENCY</span>
            <span className="text-2xl font-black font-mono text-orange-400">{stats.high}</span>
          </div>
          <div className="p-4 rounded-lg bg-[#121824] border border-[#1f293d]">
            <span className="text-xs font-mono text-slate-400 block">CASUALTIES REPORTED</span>
            <span className="text-2xl font-black font-mono text-white">{stats.totalCasualties}</span>
          </div>
          <div className="p-4 rounded-lg bg-[#121824] border border-[#1f293d]">
            <span className="text-xs font-mono text-slate-400 block">PERSONS TRAPPED</span>
            <span className="text-2xl font-black font-mono text-amber-400">{stats.totalTrapped}</span>
          </div>
          <div className="p-4 rounded-lg bg-[#121824] border border-sky-500/30 col-span-2 md:col-span-1">
            <span className="text-xs font-mono text-sky-400 block">OUTBOX QUEUE</span>
            <span className="text-2xl font-black font-mono text-sky-400">{outboxCount} PENDING</span>
          </div>
        </div>

        {/* Main Content Layout: Live Incident Feed + Mesh Radar Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Incident Feed Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Tabs */}
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSeverityFilter(filter)}
                  className={`px-3 py-1 text-xs font-mono rounded transition ${
                    severityFilter === filter
                      ? 'bg-sky-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Reports List */}
            <div className="space-y-3">
              {filteredReports.length === 0 ? (
                <div className="p-12 text-center text-slate-500 font-mono bg-[#121824] rounded-lg border border-slate-800">
                  NO INCIDENTS MATCHING FILTER. SWARM LISTENING.
                </div>
              ) : (
                filteredReports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))
              )}
            </div>
          </div>

          {/* Right Column: Radar and P2P Swarm Info */}
          <div className="space-y-6">
            <PeerRadar peers={peers} localCallsign={LOCAL_CALLSIGN} />

            {/* Local Protocol Info Box */}
            <div
              style={{ backgroundColor: '#121824', borderColor: '#1f293d' }}
              className="p-4 rounded-lg border text-xs font-mono space-y-2 text-slate-400"
            >
              <div className="text-slate-200 font-bold flex items-center justify-between">
                <span>PROTOCOL ARCHITECTURE</span>
                <span className="text-sky-400">v1.0 BLK</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400">
                Operating in disconnected peer-to-peer mesh mode. Incidents are serialized via compact
                protobuf, priority-queued by severity score, and replicated conflict-free via Vector Clocks.
              </p>
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-500 space-y-1">
                <div>• Storage: RxDB Local Offload</div>
                <div>• CRDT: LWW with Deterministic Tiebreak</div>
                <div>• Transport: WebRTC / Local Broadcast</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <CreateReportModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateReport}
        reporterCallsign={LOCAL_CALLSIGN}
      />
    </div>
  );
};
