import type { RxJsonSchema } from 'rxdb';
import type { Report, UserProfile } from '@blackout/types';

export const reportRxSchema: RxJsonSchema<Report> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 128,
    },
    title: {
      type: 'string',
    },
    description: {
      type: 'string',
    },
    severity: {
      type: 'string',
      maxLength: 16,
    },
    category: {
      type: 'string',
      maxLength: 32,
    },
    status: {
      type: 'string',
      maxLength: 24,
    },
    syncState: {
      type: 'string',
      maxLength: 24,
    },
    location: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        altitude: { type: 'number' },
        accuracy: { type: 'number' },
      },
      required: ['latitude', 'longitude'],
    },
    reporterId: {
      type: 'string',
      maxLength: 128,
    },
    callsign: {
      type: 'string',
    },
    casualtiesCount: {
      type: 'number',
    },
    trappedCount: {
      type: 'number',
    },
    resourcesNeeded: {
      type: 'array',
      items: { type: 'string' },
    },
    createdAt: {
      type: 'number',
      minimum: 0,
    },
    updatedAt: {
      type: 'number',
      minimum: 0,
    },
    version: {
      type: 'number',
    },
    vectorClock: {
      type: 'object',
    },
    deleted: {
      type: 'boolean',
    },
  },
  required: [
    'id',
    'title',
    'description',
    'severity',
    'category',
    'status',
    'syncState',
    'location',
    'reporterId',
    'casualtiesCount',
    'trappedCount',
    'createdAt',
    'updatedAt',
    'version',
  ],
  indexes: ['severity', 'updatedAt', 'createdAt'],
};

export const userRxSchema: RxJsonSchema<UserProfile> = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 128,
    },
    callsign: {
      type: 'string',
    },
    role: {
      type: 'string',
      maxLength: 32,
    },
    deviceFingerprint: {
      type: 'string',
      maxLength: 128,
    },
    lastKnownLocation: {
      type: 'object',
      properties: {
        latitude: { type: 'number' },
        longitude: { type: 'number' },
        altitude: { type: 'number' },
        accuracy: { type: 'number' },
      },
    },
    lastActive: {
      type: 'number',
    },
    publicKey: {
      type: 'string',
    },
  },
  required: ['id', 'callsign', 'role', 'deviceFingerprint', 'lastActive'],
  indexes: ['lastActive'],
};
