export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentCategory =
  | 'MEDICAL'
  | 'FIRE'
  | 'SEARCH_AND_RESCUE'
  | 'INFRASTRUCTURE'
  | 'HAZARD'
  | 'RESOURCE_NEED'
  | 'GENERAL';

export type ReportStatus = 'SUBMITTED' | 'TRIAGED' | 'DISPATCHED' | 'RESOLVED';

export type SyncState = 'LOCAL_PENDING' | 'MESH_PROPAGATED' | 'SERVER_CONFIRMED';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export type VectorClock = Record<string, number>;

export interface Report {
  id: string;
  title: string;
  description: string;
  severity: SeverityLevel;
  category: IncidentCategory;
  status: ReportStatus;
  syncState: SyncState;
  location: GeoLocation;
  reporterId: string;
  callsign?: string;
  casualtiesCount: number;
  trappedCount: number;
  resourcesNeeded: string[];
  createdAt: number;
  updatedAt: number;
  version: number;
  vectorClock: VectorClock;
  deleted?: boolean;
}

export type UserRole = 'CITIZEN' | 'FIRST_RESPONDER' | 'INCIDENT_COMMANDER';

export interface UserProfile {
  id: string;
  callsign: string;
  role: UserRole;
  deviceFingerprint: string;
  lastKnownLocation?: GeoLocation;
  lastActive: number;
  publicKey?: string;
}

export type MeshMessageType =
  | 'PEER_HELLO'
  | 'PEER_WELCOME'
  | 'CLOCK_EXCHANGE'
  | 'DELTA_SYNC_REQUEST'
  | 'DELTA_SYNC_RESPONSE'
  | 'HIGH_PRIORITY_BROADCAST'
  | 'HEARTBEAT';

export interface MeshMessage<T = unknown> {
  id: string;
  senderId: string;
  senderCallsign: string;
  targetId?: string; // undefined means broadcast
  type: MeshMessageType;
  timestamp: number;
  payload: T;
  signature?: string;
}

export interface OutboxQueueItem {
  id: string;
  reportId: string;
  severity: SeverityLevel;
  attempts: number;
  lastAttemptAt?: number;
  createdAt: number;
  serializedPayload: Uint8Array | string;
}

export interface ReplicationBatch {
  batchId: string;
  sourceNodeId: string;
  reports: Report[];
  checkpoint: number;
  vectorClock: VectorClock;
}

export interface PeerInfo {
  peerId: string;
  callsign: string;
  role: UserRole;
  connectedAt: number;
  lastPing: number;
  latencyMs: number;
  isMeshRelay: boolean;
  batteryLevel?: number;
}
