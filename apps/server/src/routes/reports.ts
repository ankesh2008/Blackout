import type { FastifyPluginAsync } from 'fastify';
import type { Report } from '@blackout/types';
import { serverDb } from '../db/database';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  // REST: Get all reports
  fastify.get('/api/reports', async (request) => {
    const { severity } = request.query as { severity?: string };
    const all = await serverDb.getAllReports();

    if (severity) {
      return all.filter((r) => r.severity === severity.toUpperCase());
    }

    return all;
  });

  // REST: Get report by ID
  fastify.get('/api/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = await serverDb.getReport(id);

    if (!report) {
      reply.status(404).send({ error: 'Report not found' });
      return;
    }

    return report;
  });

  // REST: Ingest single report
  fastify.post('/api/reports', async (request, reply) => {
    const report = request.body as Report;
    if (!report || !report.id || !report.title) {
      reply.status(400).send({ error: 'Invalid report payload' });
      return;
    }

    const saved: Report = {
      ...report,
      syncState: 'SERVER_CONFIRMED',
      updatedAt: Date.now(),
    };

    await serverDb.saveReport(saved);
    serverDb.incrementClock();

    return { success: true, report: saved };
  });

  // WebSocket: Real-time report stream for connected command dashboards
  fastify.get('/api/reports/live', { websocket: true }, (socket, req) => {
    fastify.log.info('New WebSocket client connected to /api/reports/live');

    // Send initial snapshot
    serverDb.getAllReports().then((reports) => {
      socket.send(JSON.stringify({ type: 'SNAPSHOT', data: reports }));
    });

    // Subscribe to new report saves
    const unsubscribe = serverDb.subscribe((event) => {
      try {
        socket.send(JSON.stringify(event));
      } catch (err) {
        // Socket closed
      }
    });

    socket.on('close', () => {
      unsubscribe();
      fastify.log.info('WebSocket client disconnected');
    });
  });
};
