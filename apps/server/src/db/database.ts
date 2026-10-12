import type { Report, UserProfile, VectorClock } from '@blackout/types';

/**
 * Server database store abstraction.
 * Provides in-memory storage with pluggable hooks for PostgreSQL and Redis PubSub.
 */
export class ServerDatabase {
  private reports: Map<string, Report> = new Map();
  private users: Map<string, UserProfile> = new Map();
  private serverVectorClock: VectorClock = { server_master: 1 };
  private subscribers: Set<(event: { type: string; data: any }) => void> = new Set();

  public async getReport(id: string): Promise<Report | undefined> {
    return this.reports.get(id);
  }

  public async getAllReports(): Promise<Report[]> {
    return Array.from(this.reports.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public async saveReport(report: Report): Promise<void> {
    this.reports.set(report.id, report);
    this.publish({ type: 'REPORT_SAVED', data: report });
  }

  public async saveReportsBatch(reports: Report[]): Promise<void> {
    for (const report of reports) {
      this.reports.set(report.id, report);
    }
    this.publish({ type: 'BATCH_SAVED', data: reports });
  }

  public getVectorClock(): VectorClock {
    return { ...this.serverVectorClock };
  }

  public setVectorClock(clock: VectorClock): void {
    this.serverVectorClock = { ...clock };
  }

  public incrementClock(): VectorClock {
    this.serverVectorClock.server_master = (this.serverVectorClock.server_master || 0) + 1;
    return this.getVectorClock();
  }

  public subscribe(fn: (event: { type: string; data: any }) => void): () => void {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  private publish(event: { type: string; data: any }): void {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch (err) {
        console.error('[ServerDB] Subscriber error', err);
      }
    }
  }
}

export const serverDb = new ServerDatabase();
