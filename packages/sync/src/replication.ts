import type { Report, ReplicationBatch, VectorClock } from '@blackout/types';
import { ProtocolCodec } from '@blackout/protocol';
import { PriorityOutboxQueue } from './priority-queue';
import { ReportCRDTResolver, VectorClockEngine } from './crdt';

export interface ReplicationChannel {
  sendBatch(data: Uint8Array): Promise<boolean>;
  nodeId: string;
}

export type SyncEventHandler = (event: {
  type: 'SYNC_STARTED' | 'REPORTS_MERGED' | 'BATCH_SENT' | 'SYNC_FAILED';
  payload?: unknown;
}) => void;

/**
 * Replication engine that powers offline-first peer and client-server sync.
 */
export class ReplicationEngine {
  private readonly nodeId: string;
  private readonly outbox: PriorityOutboxQueue;
  private localVectorClock: VectorClock = {};
  private listeners: Set<SyncEventHandler> = new Set();

  constructor(nodeId: string) {
    this.nodeId = nodeId;
    this.outbox = new PriorityOutboxQueue();
    this.localVectorClock = { [nodeId]: 1 };
  }

  public getNodeId(): string {
    return this.nodeId;
  }

  public getOutbox(): PriorityOutboxQueue {
    return this.outbox;
  }

  public getVectorClock(): VectorClock {
    return { ...this.localVectorClock };
  }

  public subscribe(handler: SyncEventHandler): () => void {
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  private emit(type: 'SYNC_STARTED' | 'REPORTS_MERGED' | 'BATCH_SENT' | 'SYNC_FAILED', payload?: unknown) {
    for (const listener of this.listeners) {
      listener({ type, payload });
    }
  }

  /**
   * Called whenever a local report is created or edited.
   */
  public stageLocalReport(report: Report): Report {
    this.localVectorClock = VectorClockEngine.increment(this.localVectorClock, this.nodeId);

    const updatedReport: Report = {
      ...report,
      vectorClock: { ...this.localVectorClock },
      updatedAt: Date.now(),
      syncState: 'LOCAL_PENDING',
    };

    this.outbox.enqueue(updatedReport);
    return updatedReport;
  }

  /**
   * Generates a binary replication batch from the top pending outbox items.
   */
  public generateOutboxBatch(maxItems: number = 25): { batch: ReplicationBatch; binary: Uint8Array } {
    const reports: Report[] = [];
    const items = this.outbox.getItems().slice(0, maxItems);

    for (const item of items) {
      if (item.serializedPayload instanceof Uint8Array) {
        reports.push(ProtocolCodec.decodeReport(item.serializedPayload));
      }
    }

    const batch: ReplicationBatch = {
      batchId: `batch_${this.nodeId}_${Date.now()}`,
      sourceNodeId: this.nodeId,
      reports,
      checkpoint: Date.now(),
      vectorClock: this.getVectorClock(),
    };

    const binary = ProtocolCodec.encodeMeshMessage({
      id: batch.batchId,
      senderId: this.nodeId,
      senderCallsign: 'LOCAL_NODE',
      type: 'DELTA_SYNC_RESPONSE',
      timestamp: Date.now(),
      payload: batch,
    });

    return { batch, binary };
  }

  /**
   * Reconciles incoming remote reports against local database records using CRDT logic.
   */
  public reconcileIncomingReports(
    incomingReports: Report[],
    getLocalReport: (id: string) => Report | undefined
  ): {
    updated: Report[];
    conflictsResolved: number;
  } {
    this.emit('SYNC_STARTED');
    const updated: Report[] = [];
    let conflictsResolved = 0;

    for (const remote of incomingReports) {
      const local = getLocalReport(remote.id);

      if (!local) {
        // New record from peer/server
        const accepted: Report = {
          ...remote,
          syncState: 'MESH_PROPAGATED',
        };
        this.localVectorClock = VectorClockEngine.merge(this.localVectorClock, remote.vectorClock);
        updated.push(accepted);
      } else {
        // Conflict / update resolution
        const comparison = VectorClockEngine.compare(local.vectorClock, remote.vectorClock);
        if (comparison === 'DOMINATED_BY' || comparison === 'CONCURRENT') {
          const resolved = ReportCRDTResolver.resolve(local, remote);
          conflictsResolved += 1;
          this.localVectorClock = VectorClockEngine.merge(this.localVectorClock, resolved.vectorClock);
          updated.push(resolved);
        }
      }
    }

    this.emit('REPORTS_MERGED', { count: updated.length, conflictsResolved });
    return { updated, conflictsResolved };
  }

  /**
   * Flushes outbox to a connected peer or server channel.
   */
  public async flushToChannel(channel: ReplicationChannel): Promise<boolean> {
    if (this.outbox.size() === 0) return true;

    const { batch, binary } = this.generateOutboxBatch();
    try {
      const success = await channel.sendBatch(binary);
      if (success) {
        for (const report of batch.reports) {
          this.outbox.acknowledge(report.id);
        }
        this.emit('BATCH_SENT', { batchId: batch.batchId, count: batch.reports.length });
        return true;
      }
      return false;
    } catch (err) {
      this.emit('SYNC_FAILED', err);
      return false;
    }
  }
}
