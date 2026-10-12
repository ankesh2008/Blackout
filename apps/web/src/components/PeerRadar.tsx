import React from 'react';
import type { PeerInfo } from '@blackout/types';

export interface PeerRadarProps {
  peers: PeerInfo[];
  localCallsign: string;
}

export const PeerRadar: React.FC<PeerRadarProps> = ({ peers, localCallsign }) => {
  return (
    <div
      style={{
        backgroundColor: '#121824',
        border: '1px solid #1f293d',
      }}
      className="p-4 rounded-lg flex flex-col items-center"
    >
      <div className="w-full flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
        <span>LOCAL MESH RADAR</span>
        <span className="text-sky-400">{peers.length} ACTIVE PEERS</span>
      </div>

      {/* Radar Scope */}
      <div className="relative w-56 h-56 rounded-full border border-sky-500/30 flex items-center justify-center bg-slate-950/80 overflow-hidden shadow-inner">
        {/* Concentric rings */}
        <div className="absolute w-40 h-40 rounded-full border border-sky-500/20" />
        <div className="absolute w-24 h-24 rounded-full border border-sky-500/20" />
        <div className="absolute w-8 h-8 rounded-full border border-sky-500/40 bg-sky-500/10" />

        {/* Crosshairs */}
        <div className="absolute w-full h-[1px] bg-sky-500/20" />
        <div className="absolute h-full w-[1px] bg-sky-500/20" />

        {/* Sweep effect */}
        <div
          className="absolute inset-0 origin-center pointer-events-none"
          style={{
            background: 'conic-gradient(from 0deg, rgba(56, 189, 248, 0.25) 0deg, transparent 60deg)',
            animation: 'spin 4s linear infinite',
          }}
        />

        {/* Center node (local device) */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
          <span className="text-[9px] font-mono text-emerald-300 mt-1">{localCallsign}</span>
        </div>

        {/* Render Peer Blips */}
        {peers.map((peer, idx) => {
          // Distribute blips geometrically around radar
          const angle = (idx * (360 / Math.max(peers.length, 1)) * Math.PI) / 180;
          const radius = 45 + (idx % 3) * 25; // pixels from center
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={peer.peerId}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              className="absolute z-20 flex flex-col items-center cursor-pointer group"
              title={`Peer: ${peer.callsign} (${peer.role}) - ${peer.latencyMs}ms`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-ping opacity-75 absolute" />
              <div className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
              <span className="text-[9px] font-mono text-sky-300 opacity-80 group-hover:opacity-100 whitespace-nowrap mt-0.5">
                {peer.callsign}
              </span>
            </div>
          );
        })}
      </div>

      {/* Peer list footer */}
      <div className="w-full mt-4 space-y-1.5 max-h-36 overflow-y-auto">
        {peers.length === 0 ? (
          <p className="text-xs text-slate-500 font-mono text-center py-2">
            No peer beacons detected. Listening on local mesh channels...
          </p>
        ) : (
          peers.map((p) => (
            <div
              key={p.peerId}
              className="flex items-center justify-between text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-800"
            >
              <span className="text-slate-300 font-semibold">{p.callsign}</span>
              <span className="text-sky-400">{p.role}</span>
              <span className="text-slate-500">{p.latencyMs}ms</span>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
