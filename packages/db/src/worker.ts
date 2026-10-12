import type { Report, UserProfile } from '@blackout/types';
import type { BlackoutDatabase, BlackoutRepository } from './collections';

export type DbWorkerAction =
  | 'INIT'
  | 'UPSERT_REPORT'
  | 'GET_ALL_REPORTS'
  | 'GET_PENDING'
  | 'GET_REPORT_BY_ID'
  | 'GET_REPORTS_BY_SEVERITY'
  | 'UPSERT_USER'
  | 'GET_USER';

export interface DbWorkerRequest<T = any> {
  requestId: string;
  action: DbWorkerAction;
  payload?: T;
}

export interface DbWorkerResponse<T = any> {
  requestId: string;
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Worker-side request dispatcher. Runs inside a Web Worker (web) or Worker Thread (mobile/node).
 */
export function createWorkerMessageHandler(repo: BlackoutRepository) {
  return async function handleWorkerMessage(
    request: DbWorkerRequest,
    postResponse: (res: DbWorkerResponse) => void
  ) {
    try {
      let result: any = null;

      switch (request.action) {
        case 'UPSERT_REPORT':
          result = await repo.upsertReport(request.payload as Report);
          break;
        case 'GET_ALL_REPORTS':
          result = await repo.getAllReports();
          break;
        case 'GET_PENDING':
          result = await repo.getPendingSyncReports();
          break;
        case 'GET_REPORT_BY_ID':
          result = await repo.getReportById(request.payload as string);
          break;
        case 'GET_REPORTS_BY_SEVERITY':
          result = await repo.getReportsBySeverity(request.payload);
          break;
        case 'UPSERT_USER':
          result = await repo.upsertUser(request.payload as UserProfile);
          break;
        case 'GET_USER':
          result = await repo.getUser(request.payload as string);
          break;
        default:
          throw new Error(`Unsupported DB Worker action: ${request.action}`);
      }

      postResponse({
        requestId: request.requestId,
        success: true,
        data: result,
      });
    } catch (err: any) {
      postResponse({
        requestId: request.requestId,
        success: false,
        error: err?.message || String(err),
      });
    }
  };
}

export interface WorkerChannel {
  postMessage(message: any): void;
  addEventListener?(type: 'message', listener: (event: { data: any }) => void): void;
  onmessage?: ((event: { data: any }) => void) | null;
}

/**
 * Main-thread bridge for asynchronous offloaded database operations.
 */
export class DatabaseWorkerBridge {
  private pendingRequests = new Map<
    string,
    { resolve: (val: any) => void; reject: (err: any) => void }
  >();

  constructor(private worker: WorkerChannel) {
    if (this.worker.addEventListener) {
      this.worker.addEventListener('message', (event) => this.onMessage(event.data));
    } else {
      this.worker.onmessage = (event) => this.onMessage(event.data);
    }
  }

  private onMessage(data: DbWorkerResponse) {
    if (!data || !data.requestId) return;
    const pending = this.pendingRequests.get(data.requestId);
    if (!pending) return;

    this.pendingRequests.delete(data.requestId);
    if (data.success) {
      pending.resolve(data.data);
    } else {
      pending.reject(new Error(data.error || 'Worker operation failed'));
    }
  }

  public send<T = any>(action: DbWorkerAction, payload?: any): Promise<T> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    return new Promise<T>((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject });
      this.worker.postMessage({
        requestId,
        action,
        payload,
      } as DbWorkerRequest);
    });
  }

  public upsertReport(report: Report): Promise<Report> {
    return this.send('UPSERT_REPORT', report);
  }

  public getAllReports(): Promise<Report[]> {
    return this.send('GET_ALL_REPORTS');
  }

  public getPendingReports(): Promise<Report[]> {
    return this.send('GET_PENDING');
  }

  public getReportById(id: string): Promise<Report | null> {
    return this.send('GET_REPORT_BY_ID', id);
  }
}
