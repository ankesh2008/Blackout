import type { Report, UserProfile } from '@blackout/types';
import type { DbWorkerAction, DbWorkerRequest, DbWorkerResponse } from '@blackout/db';

/**
 * Native background worker client for React Native (Expo).
 * Offloads heavy database queries, indexing, and CRDT replication computations
 * off the React Native UI/JS thread to keep 60 FPS under heavy mesh synchronization load.
 */
export class MobileDbWorker {
  private inMemoryFallback: Map<string, Report> = new Map();
  private isNativeWorkerAvailable = false;

  constructor() {
    // Detect if native thread / JSI worker module is present
    this.isNativeWorkerAvailable = typeof (global as any).postMessageToNativeWorker === 'function';
  }

  public async upsertReport(report: Report): Promise<Report> {
    if (this.isNativeWorkerAvailable) {
      return this.dispatchNative('UPSERT_REPORT', report);
    }
    this.inMemoryFallback.set(report.id, report);
    return report;
  }

  public async getAllReports(): Promise<Report[]> {
    if (this.isNativeWorkerAvailable) {
      return this.dispatchNative('GET_ALL_REPORTS');
    }
    return Array.from(this.inMemoryFallback.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public async getPendingReports(): Promise<Report[]> {
    if (this.isNativeWorkerAvailable) {
      return this.dispatchNative('GET_PENDING');
    }
    return Array.from(this.inMemoryFallback.values()).filter(
      (r) => r.syncState === 'LOCAL_PENDING'
    );
  }

  private dispatchNative<T>(action: DbWorkerAction, payload?: any): Promise<T> {
    const requestId = `native_req_${Date.now()}`;
    return new Promise((resolve, reject) => {
      const globalAny = global as any;
      if (globalAny.postMessageToNativeWorker) {
        globalAny.postMessageToNativeWorker({
          requestId,
          action,
          payload,
        });

        // Listen for response
        const handler = (event: { data: DbWorkerResponse<T> }) => {
          if (event.data.requestId === requestId) {
            if (event.data.success) {
              resolve(event.data.data as T);
            } else {
              reject(new Error(event.data.error));
            }
          }
        };
        globalAny.addEventListener('nativeWorkerMessage', handler, { once: true });
      } else {
        reject(new Error('Native worker unavailable'));
      }
    });
  }
}

export const mobileDbWorker = new MobileDbWorker();
