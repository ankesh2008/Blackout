import React from 'react';
import type { Report } from '@blackout/types';
import { SeverityBadge } from '@blackout/ui';

export interface ReportCardProps {
  report: Report;
  onSelect?: (report: Report) => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onSelect }) => {
  const isCritical = report.severity === 'CRITICAL';

  return (
    <div
      onClick={() => onSelect?.(report)}
      style={{
        backgroundColor: '#121824',
        border: isCritical ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid #1f293d',
        boxShadow: isCritical ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none',
      }}
      className="p-4 rounded-lg cursor-pointer hover:border-sky-500/50 transition relative overflow-hidden"
    >
      {isCritical && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-red-600" />
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-white text-base leading-snug">
          {report.title}
        </h3>
        <SeverityBadge severity={report.severity} />
      </div>

      <p className="text-slate-300 text-sm mb-3 line-clamp-2">
        {report.description}
      </p>

      {/* Meta indicators */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-400 mb-3 bg-slate-900/60 p-2 rounded border border-slate-800">
        <div>
          <span className="text-slate-500">CASUALTIES: </span>
          <span className={report.casualtiesCount > 0 ? 'text-red-400 font-bold' : 'text-slate-300'}>
            {report.casualtiesCount}
          </span>
        </div>
        <div>
          <span className="text-slate-500">TRAPPED: </span>
          <span className={report.trappedCount > 0 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
            {report.trappedCount}
          </span>
        </div>
        <div>
          <span className="text-slate-500">CATEGORY: </span>
          <span className="text-sky-400">{report.category}</span>
        </div>
        <div>
          <span className="text-slate-500">STATE: </span>
          <span className="text-emerald-400">{report.syncState.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Resources Needed Tags */}
      {report.resourcesNeeded.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {report.resourcesNeeded.map((res) => (
            <span
              key={res}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
            >
              {res}
            </span>
          ))}
        </div>
      )}

      {/* Footer Timestamp & Reporter */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
        <span>CALLSIGN: {report.callsign || report.reporterId.slice(0, 8)}</span>
        <span>{new Date(report.createdAt).toLocaleTimeString()}</span>
      </div>
    </div>
  );
};
