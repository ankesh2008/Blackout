import type { Report, VectorClock, ReplicationBatch, MeshMessage } from '@blackout/types';
import { ReplicationEngine, VectorClockEngine } from '@blackout/sync';
import { MeshDiscovery } from './discovery';

export interface PeerSyncOptions {
  discovery: MeshDiscovery;
  replication: ReplicationEngine;
  getLocalReport: (id: string) => Report | undefined;
  saveReports: (reports: Report[]) => Promise<void>;
  getAllReports: () => Promise<Report[]>;
}

/**
 * Coordinates direct device-to-device database synchronization over local mesh connections.
 */
export class PeerSyncManager {
  private readonly discovery: MeshDiscovery;
  private readonly replication: ReplicationEngine;
  private readonly getLocalReport: (id: string) => Report | undefined;
  private readonly saveReports: (reports: Report[]) => Promise<void>;
  private readonly getAllReports: () => Promise<Report[]>;
  private unsubscribeDiscovery: (() => void) | null = null;
  private seenPacketIds: Set<string> = new Set();

  constructor(options: PeerSyncOptions) {
    this.discovery = options.discovery;
    this.replication = options.replication;
    this.getLocalReport = options.getLocalReport;
    this.saveReports = options.saveReports;
    this.getAllReports = options.getAllReports;

    this.setupListeners();
  }

  private setupListeners() {
    this.unsubscribeDiscovery = this.discovery.on(async (event) => {
      switch (event.type) {
        case 'PEER_CONNECTED':
          await this.initiateSyncWithPeer(event.peer.peerId);
          break;
        case 'PACKET_RECEIVED':
          await this.handleMeshPacket(event.packet, event.fromPeerId);
          break;
      }
    });
  }

  public destroy() {
    if (this.unsubscribeDiscovery) {
      this.unsubscribeDiscovery();
      this.unsubscribeDiscovery = null;
    }
    this.seenPacketIds.clear();
  }

  /**
   * Initiates clock exchange with newly connected peer.
   */
  public async initiateSyncWithPeer(peerId: string) {
    const clockMessage: MeshMessage<VectorClock> = {
      id: `clk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: this.replication.getNodeId(),
      senderCallsign: 'LOCAL_PEER',
      targetId: peerId,
      type: 'CLOCK_EXCHANGE',
      timestamp: Date.now(),
      payload: this.replication.getVectorClock(),
    };

    this.discovery.broadcast(clockMessage);
  }

  /**
   * Broadcasts a newly created or updated local report immediately to all mesh peers.
   */
  public async broadcastHighPriorityReport(report: Report) {
    const staged = this.replication.stageLocalReport(report);
    await this.saveReports([staged]);

    const broadcastMsg: MeshMessage<Report> = {
      id: `sos_${report.id}_${Date.now()}`,
      senderId: this.replication.getNodeId(),
      senderCallsign: report.callsign || 'RESPONDER',
      type: 'HIGH_PRIORITY_BROADCAST',
      timestamp: Date.now(),
      payload: staged,
    };

    this.discovery.broadcast(broadcastMsg);
  }

  private async handleMeshPacket(packet: MeshMessage, fromPeerId: string) {
    // Deduplication check
    if (this.seenPacketIds.has(packet.id)) return;
    this.seenPacketIds.add(packet.id);
    if (this.seenPacketIds.size > 1000) {
      const first = this.seenPacketIds.values().next().value;
      if (first) this.seenPacketIds.delete(first);
    }

    switch (packet.type) {
      case 'CLOCK_EXCHANGE': {
        const remoteClock = packet.payload as VectorClock;
        const localClock = this.replication.getVectorClock();
        const comparison = VectorClockEngine.compare(localClock, remoteClock);

        // If remote has newer or concurrent events, request delta
        if (comparison === 'DOMINATED_BY' || comparison === 'CONCURRENT') {
          const syncReq: MeshMessage<VectorClock> = {
            id: `req_${Date.now()}`,
            senderId: this.replication.getNodeId(),
            senderCallsign: 'LOCAL_PEER',
            targetId: fromPeerId,
            type: 'DELTA_SYNC_REQUEST',
            timestamp: Date.now(),
            payload: localClock,
          };
          this.discovery.broadcast(syncReq);
        }

        // If we have newer updates that remote doesn't have, send our batch
        if (comparison === 'DOMINATES' || comparison === 'CONCURRENT') {
          const allReports = await this.getAllReports();
          this.sendBatchResponse(fromPeerId, allReports);
        }
        break;
      }

      case 'DELTA_SYNC_REQUEST': {
        const allReports = await this.getAllReports();
        this.sendBatchResponse(fromPeerId, allReports);
        break;
      }

      case 'DELTA_SYNC_RESPONSE': {
        const batch = packet.payload as ReplicationBatch;
        if (batch && Array.isArray(batch.reports)) {
          const { updated } = this.replication.reconcileIncomingReports(
            batch.reports,
            this.getLocalReport
          );

          if (updated.length > 0) {
            await this.saveReports(updated);
          }
        }
        break;
      }

      case 'HIGH_PRIORITY_BROADCAST': {
        const remoteReport = packet.payload as Report;
        if (remoteReport && remoteReport.id) {
          const { updated } = this.replication.reconcileIncomingReports(
            [remoteReport],
            this.getLocalReport
          );

          if (updated.length > 0) {
            await this.saveReports(updated);
            // Re-broadcast (mesh gossip flooding) to ensure surrounding nodes receive it
            this.discovery.broadcast(packet);
          }
        }
        break;
      }
    }
  }

  private sendBatchResponse(targetPeerId: string, reports: Report[]) {
    const batch: ReplicationBatch = {
      batchId: `batch_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sourceNodeId: this.replication.getNodeId(),
      reports,
      checkpoint: Date.now(),
      vectorClock: this.replication.getVectorClock(),
    };

    const responseMsg: MeshMessage<ReplicationBatch> = {
      id: `resp_${batch.batchId}`,
      senderId: this.replication.getNodeId(),
      senderCallsign: 'LOCAL_PEER',
      targetId: targetPeerId,
      type: 'DELTA_SYNC_RESPONSE',
      timestamp: Date.now(),
      payload: batch,
    };

    this.discovery.broadcast(responseMsg);
  }
}
