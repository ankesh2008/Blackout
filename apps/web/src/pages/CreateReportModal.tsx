import React, { useState } from 'react';
import type { Report, SeverityLevel, IncidentCategory } from '@blackout/types';

export interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: Omit<Report, 'createdAt' | 'updatedAt' | 'version' | 'vectorClock'>) => void;
  reporterCallsign: string;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  reporterCallsign,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<SeverityLevel>('CRITICAL');
  const [category, setCategory] = useState<IncidentCategory>('MEDICAL');
  const [casualtiesCount, setCasualtiesCount] = useState(0);
  const [trappedCount, setTrappedCount] = useState(0);
  const [resources, setResources] = useState('');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      id: `rpt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      title,
      description,
      severity,
      category,
      status: 'SUBMITTED',
      syncState: 'LOCAL_PENDING',
      location: { latitude, longitude },
      reporterId: `node_${reporterCallsign.toLowerCase()}`,
      callsign: reporterCallsign,
      casualtiesCount,
      trappedCount,
      resourcesNeeded: resources
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter(Boolean),
    });

    onClose();
  };

  const setGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        () => {
          // Keep current if denied or unavailable
        }
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        style={{ backgroundColor: '#121824', borderColor: '#1f293d' }}
        className="w-full max-w-xl p-6 rounded-xl border shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-lg font-bold font-mono text-white flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>TRANSMIT EMERGENCY REPORT</span>
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-mono text-sm"
          >
            [ESC]
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm font-mono">
          {/* Severity selector */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">INCIDENT SEVERITY</label>
            <div className="grid grid-cols-4 gap-2">
              {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as SeverityLevel[]).map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setSeverity(lvl)}
                  className={`py-2 text-xs font-bold rounded border transition ${
                    severity === lvl
                      ? lvl === 'CRITICAL'
                        ? 'bg-red-600/30 border-red-500 text-red-300'
                        : lvl === 'HIGH'
                        ? 'bg-orange-600/30 border-orange-500 text-orange-300'
                        : lvl === 'MEDIUM'
                        ? 'bg-yellow-600/30 border-yellow-500 text-yellow-300'
                        : 'bg-green-600/30 border-green-500 text-green-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">CATEGORY</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as IncidentCategory)}
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-white focus:border-sky-500 outline-none"
            >
              <option value="MEDICAL">MEDICAL EMERGENCY</option>
              <option value="FIRE">FIRE / EXPLOSION</option>
              <option value="SEARCH_AND_RESCUE">SEARCH AND RESCUE</option>
              <option value="INFRASTRUCTURE">INFRASTRUCTURE FAILURE</option>
              <option value="HAZARD">HAZMAT / BIOHAZARD</option>
              <option value="RESOURCE_NEED">RESOURCE SHORTAGE</option>
              <option value="GENERAL">GENERAL DISPATCH</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">INCIDENT SUMMARY / TITLE</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Structural failure on Sector 3 bridge"
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">SITUATION DESCRIPTION</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide tactical context, hazards, access routes..."
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-white placeholder-slate-600 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Casualties & Trapped */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">CASUALTIES COUNT</label>
              <input
                type="number"
                min={0}
                value={casualtiesCount}
                onChange={(e) => setCasualtiesCount(Number(e.target.value))}
                className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-white"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">TRAPPED PERSONS</label>
              <input
                type="number"
                min={0}
                value={trappedCount}
                onChange={(e) => setTrappedCount(Number(e.target.value))}
                className="w-full p-2 rounded bg-slate-900 border border-slate-800 text-white"
              />
            </div>
          </div>

          {/* Resources */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">RESOURCES NEEDED (COMMA-SEPARATED)</label>
            <input
              type="text"
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              placeholder="PARAMEDICS, GENERATOR, BOAT_RESCUE, TENTS"
              className="w-full p-2.5 rounded bg-slate-900 border border-slate-800 text-white"
            />
          </div>

          {/* Coordinates */}
          <div className="p-3 bg-slate-950 rounded border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">GEO COORDINATES</span>
              <button
                type="button"
                onClick={setGPS}
                className="text-[11px] text-sky-400 hover:underline"
              >
                [GET DEVICE GPS]
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(Number(e.target.value))}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
              />
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(Number(e.target.value))}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
              />
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              CANCEL
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-xs font-bold bg-red-600 hover:bg-red-500 text-white rounded transition tracking-wider uppercase"
            >
              QUEUE FOR MESH BROADCAST
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
