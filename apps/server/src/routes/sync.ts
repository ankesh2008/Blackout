import type { FastifyPluginAsync } from 'fastify';
import type { ReplicationBatch, VectorClock, Report } from '@blackout/types';
import { VectorClockEngine } from '@blackout/sync';
import { serverDb } from '../db/database';
import { ServerConflictResolver } from '../sync/conflict-resolver';

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  // Pull sync: Client sends its Vector Clock, server returns all reports unknown or newer to client
  fastify.post('/api/sync/pull', async (request) => {
    const { clientClock, sinceTimestamp } = request.body as {
      clientClock?: VectorClock;
      sinceTimestamp?: number;
    };

    const allReports = await serverDb.getAllReports();
    let deltaReports: Report[] = [];

    if (sinceTimestamp) {
      deltaReports = allReports.filter((r) => r.updatedAt > sinceTimestamp);
    } else if (clientClock) {
      // Find reports where the report's vector clock is not dominated by clientClock
      deltaReports = allReports.filter((r) => {
        const comp = VectorClockEngine.compare(r.vectorClock, clientClock);
        return comp === 'DOMINATES' || comp === 'CONCURRENT';
      });
    } else {
      deltaReports = allReports;
    }

    return {
      reports: deltaReports,
      serverClock: serverDb.getVectorClock(),
      checkpoint: Date.now(),
    };
  });

  // Push sync: Client pushes replication batch with conflict resolution
  fastify.post('/api/sync/push', async (request, reply) => {
    const batch = request.body as ReplicationBatch;

    if (!batch || !Array.isArray(batch.reports)) {
      reply.status(400).send({ error: 'Invalid replication batch format' });
      return;
    }

    const result = await ServerConflictResolver.resolveBatch(batch);

    return {
      success: true,
      acceptedCount: result.accepted.length,
      conflictsResolved: result.conflictsResolved,
      serverClock: result.serverClock,
      checkpoint: Date.now(),
    };
  });
};
