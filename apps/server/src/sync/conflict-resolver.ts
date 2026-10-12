import type { Report, ReplicationBatch } from '@blackout/types';
import { ReportCRDTResolver, VectorClockEngine } from '@blackout/sync';
import { serverDb } from '../db/database';

export interface ServerSyncResult {
  accepted: Report[];
  conflictsResolved: number;
  serverClock: Record<string, number>;
}

export class ServerConflictResolver {
  public static async resolveBatch(batch: ReplicationBatch): Promise<ServerSyncResult> {
    const accepted: Report[] = [];
    let conflictsResolved = 0;

    for (const incoming of batch.reports) {
      const existing = await serverDb.getReport(incoming.id);

      if (!existing) {
        // Completely new record
        const confirmed: Report = {
          ...incoming,
          syncState: 'SERVER_CONFIRMED',
        };
        await serverDb.saveReport(confirmed);
        accepted.push(confirmed);
      } else {
        // Reconcile via CRDT
        const resolved = ReportCRDTResolver.resolve(existing, incoming);
        const resolvedWithSync: Report = {
          ...resolved,
          syncState: 'SERVER_CONFIRMED',
        };

        if (resolved.version > existing.version || resolved.updatedAt > existing.updatedAt) {
          conflictsResolved += 1;
        }

        await serverDb.saveReport(resolvedWithSync);
        accepted.push(resolvedWithSync);
      }
    }

    // Advance and merge server vector clock
    const mergedClock = VectorClockEngine.merge(serverDb.getVectorClock(), batch.vectorClock);
    serverDb.setVectorClock(mergedClock);
    serverDb.incrementClock();

    return {
      accepted,
      conflictsResolved,
      serverClock: serverDb.getVectorClock(),
    };
  }
}
