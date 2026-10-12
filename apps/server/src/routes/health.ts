import type { FastifyPluginAsync } from 'fastify';
import { serverDb } from '../db/database';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    const reports = await serverDb.getAllReports();
    return {
      status: 'OK',
      service: 'blackout-server',
      timestamp: Date.now(),
      totalReportsStored: reports.length,
      serverVectorClock: serverDb.getVectorClock(),
      uptime: process.uptime(),
    };
  });
};
