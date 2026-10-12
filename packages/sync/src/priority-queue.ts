import type { Report, SeverityLevel, OutboxQueueItem } from '@blackout/types';
import { ProtocolCodec } from '@blackout/protocol';

const SEVERITY_SCORES: Record<SeverityLevel, number> = {
  CRITICAL: 10000,
  HIGH: 5000,
  MEDIUM: 1000,
  LOW: 100,
};

export class PriorityOutboxQueue {
  private queue: OutboxQueueItem[] = [];

  /**
   * Enqueues a report into the outbox, serializing its payload into binary format.
   */
  public enqueue(report: Report): OutboxQueueItem {
    // Remove any existing pending item for the same report ID
    this.removeByReportId(report.id);

    const encoded = ProtocolCodec.encodeReport(report);
    const item: OutboxQueueItem = {
      id: `outbox_${report.id}_${Date.now()}`,
      reportId: report.id,
      severity: report.severity,
      attempts: 0,
      createdAt: Date.now(),
      serializedPayload: encoded,
    };

    this.queue.push(item);
    this.sortQueue();
    return item;
  }

  /**
   * Returns the top item for transmission based on severity and backoff eligibility.
   */
  public peek(currentTime: number = Date.now()): OutboxQueueItem | undefined {
    return this.queue.find((item) => this.isEligibleForTransmission(item, currentTime));
  }

  /**
   * Pops the highest priority eligible item.
   */
  public dequeue(currentTime: number = Date.now()): OutboxQueueItem | undefined {
    const index = this.queue.findIndex((item) =>
      this.isEligibleForTransmission(item, currentTime)
    );
    if (index === -1) return undefined;
    const [item] = this.queue.splice(index, 1);
    return item;
  }

  /**
   * Records a failed transmission attempt with exponential backoff.
   */
  public markAttemptFailed(itemId: string): void {
    const item = this.queue.find((i) => i.id === itemId);
    if (item) {
      item.attempts += 1;
      item.lastAttemptAt = Date.now();
      this.sortQueue();
    }
  }

  /**
   * Acknowledges transmission success and removes item from outbox.
   */
  public acknowledge(reportId: string): void {
    this.removeByReportId(reportId);
  }

  public removeByReportId(reportId: string): void {
    this.queue = this.queue.filter((i) => i.reportId !== reportId);
  }

  public size(): number {
    return this.queue.length;
  }

  public getItems(): readonly OutboxQueueItem[] {
    return [...this.queue];
  }

  public clear(): void {
    this.queue = [];
  }

  /**
   * Exponential backoff check: retry interval grows as 2^attempts seconds (max 60s).
   */
  private isEligibleForTransmission(item: OutboxQueueItem, now: number): boolean {
    if (!item.lastAttemptAt || item.attempts === 0) return true;
    const backoffMs = Math.min(Math.pow(2, item.attempts) * 1000, 60000);
    return now >= item.lastAttemptAt + backoffMs;
  }

  /**
   * Higher severity score comes first; ties broken by earliest creation time (FIFO for same urgency).
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      const scoreA = SEVERITY_SCORES[a.severity] || 0;
      const scoreB = SEVERITY_SCORES[b.severity] || 0;

      if (scoreA !== scoreB) {
        return scoreB - scoreA; // descending
      }

      return a.createdAt - b.createdAt; // ascending FIFO
    });
  }
}
