import React from 'react';
import { MeshStatusBadge } from '@blackout/ui';

export interface HeaderProps {
  peerCount: number;
  isOnline: boolean;
  onOpenCreate: () => void;
  onManualSync: () => void;
  callsign: string;
}

export const Header: React.FC<HeaderProps> = ({
  peerCount,
  isOnline,
  onOpenCreate,
  onManualSync,
  callsign,
}) => {
  return (
    <header
      style={{
        backgroundColor: '#121824',
        borderBottom: '1px solid #1f293d',
      }}
      className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40"
    >
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <h1 className="text-xl font-black tracking-wider font-mono text-white">
            BLACKOUT <span className="text-xs text-sky-400 font-normal">// INCIDENT COMMAND</span>
          </h1>
        </div>

        <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
          NODE: {callsign}
        </span>
      </div>

      <div className="flex items-center space-x-4">
        <MeshStatusBadge peerCount={peerCount} isOnline={isOnline} />

        <button
          onClick={onManualSync}
          className="px-3 py-1.5 text-xs font-mono uppercase bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 rounded transition"
        >
          SYNC MESH
        </button>

        <button
          onClick={onOpenCreate}
          className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white rounded shadow-lg shadow-red-900/40 transition flex items-center space-x-1"
        >
          <span>+ REPORT INCIDENT</span>
        </button>
      </div>
    </header>
  );
};
