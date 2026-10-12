import React from 'react';
import type { SyncState } from '@blackout/types';

export interface MeshStatusBadgeProps {
  peerCount: number;
  syncState?: SyncState;
  isOnline?: boolean;
}

export const MeshStatusBadge: React.FC<MeshStatusBadgeProps> = ({
  peerCount,
  syncState,
  isOnline = false,
}) => {
  return (
    <div className="flex items-center space-x-2 text-xs font-mono">
      {/* Cloud Connectivity */}
      <span
        className="px-2 py-0.5 rounded border"
        style={{
          borderColor: isOnline ? '#22c55e' : '#64748b',
          color: isOnline ? '#86efac' : '#94a3b8',
          backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(100, 116, 139, 0.1)',
        }}
      >
        {isOnline ? '● CLOUD ONLINE' : '○ NO INTERNET'}
      </span>

      {/* Mesh Swarm Peers */}
      <span
        className="px-2 py-0.5 rounded border"
        style={{
          borderColor: peerCount > 0 ? '#38bdf8' : '#f97316',
          color: peerCount > 0 ? '#7dd3fc' : '#fdba74',
          backgroundColor: peerCount > 0 ? 'rgba(56, 189, 248, 0.1)' : 'rgba(249, 115, 22, 0.1)',
        }}
      >
        MESH: {peerCount} {peerCount === 1 ? 'PEER' : 'PEERS'}
      </span>

      {/* Sync State */}
      {syncState && (
        <span className="text-gray-400">
          [{syncState.replace('_', ' ')}]
        </span>
      )}
    </div>
  );
};
