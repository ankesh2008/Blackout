import type { SeverityLevel } from '@blackout/types';

export const BlackoutTheme = {
  colors: {
    background: '#0a0d14',
    surface: '#121824',
    surfaceBorder: '#1f293d',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accent: '#38bdf8',

    severity: {
      CRITICAL: {
        bg: 'rgba(239, 68, 68, 0.2)',
        border: '#ef4444',
        text: '#fca5a5',
        glow: '0 0 12px rgba(239, 68, 68, 0.4)',
      },
      HIGH: {
        bg: 'rgba(249, 115, 22, 0.2)',
        border: '#f97316',
        text: '#fdba74',
        glow: '0 0 10px rgba(249, 115, 22, 0.3)',
      },
      MEDIUM: {
        bg: 'rgba(234, 179, 8, 0.2)',
        border: '#eab308',
        text: '#fde047',
        glow: 'none',
      },
      LOW: {
        bg: 'rgba(34, 197, 94, 0.15)',
        border: '#22c55e',
        text: '#86efac',
        glow: 'none',
      },
    },

    status: {
      offline: '#94a3b8',
      mesh: '#38bdf8',
      cloud: '#22c55e',
    },
  },
} as const;

export function getSeverityStyle(severity: SeverityLevel) {
  return BlackoutTheme.colors.severity[severity] || BlackoutTheme.colors.severity.LOW;
}
