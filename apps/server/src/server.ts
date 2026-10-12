import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { healthRoutes } from './routes/health';
import { reportRoutes } from './routes/reports';
import { syncRoutes } from './routes/sync';
import { serverDb } from './db/database';

export async function buildServer() {
  const server = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  await server.register(cors, {
    origin: '*',
  });

  await server.register(websocket);

  // Register routes
  await server.register(healthRoutes);
  await server.register(reportRoutes);
  await server.register(syncRoutes);

  return server;
}

async function start() {
  const server = await buildServer();
  const PORT = Number(process.env.PORT) || 4000;
  const HOST = process.env.HOST || '0.0.0.0';

  // Seed sample initial disaster scenario if database is empty
  const initialReports = await serverDb.getAllReports();
  if (initialReports.length === 0) {
    await serverDb.saveReport({
      id: 'rpt_init_alpha_01',
      title: 'Structural Collapse - South Bridge Sector 4',
      description: 'Major bridge span compromised. 2 vehicles submerged, emergency bypass required.',
      severity: 'CRITICAL',
      category: 'INFRASTRUCTURE',
      status: 'TRIAGED',
      syncState: 'SERVER_CONFIRMED',
      location: { latitude: 37.7749, longitude: -122.4194 },
      reporterId: 'node_base_station_01',
      callsign: 'COMMAND_01',
      casualtiesCount: 3,
      trappedCount: 2,
      resourcesNeeded: ['HEAVY_EQUIPMENT', 'PARAMEDICS', 'BOAT_RESCUE'],
      createdAt: Date.now() - 3600000,
      updatedAt: Date.now() - 3600000,
      version: 1,
      vectorClock: { server_master: 1 },
    });

    await serverDb.saveReport({
      id: 'rpt_init_bravo_02',
      title: 'Power Grid Fire - North Transformer Substation',
      description: 'High voltage transformer fire spreading toward residential perimeter.',
      severity: 'HIGH',
      category: 'FIRE',
      status: 'DISPATCHED',
      syncState: 'SERVER_CONFIRMED',
      location: { latitude: 37.7833, longitude: -122.4167 },
      reporterId: 'node_recon_unit_05',
      callsign: 'RECON_ALPHA',
      casualtiesCount: 0,
      trappedCount: 0,
      resourcesNeeded: ['HAZMAT', 'FIRE_TENDER'],
      createdAt: Date.now() - 1800000,
      updatedAt: Date.now() - 1800000,
      version: 1,
      vectorClock: { server_master: 2 },
    });
  }

  try {
    await server.listen({ port: PORT, host: HOST });
    console.log(`[Blackout Server] Running on http://${HOST}:${PORT}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

if (require.main === module || process.env.NODE_ENV !== 'test') {
  start();
}
