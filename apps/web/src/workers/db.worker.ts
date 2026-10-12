import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import {
  createBlackoutDatabase,
  BlackoutRepository,
  createWorkerMessageHandler,
  DbWorkerRequest,
} from '@blackout/db';

let repositoryPromise: Promise<BlackoutRepository> | null = null;

async function getRepository(): Promise<BlackoutRepository> {
  if (!repositoryPromise) {
    repositoryPromise = (async () => {
      const db = await createBlackoutDatabase({
        name: 'blackout_web_worker_db',
        storage: getRxStorageMemory(),
      });
      return new BlackoutRepository(db);
    })();
  }
  return repositoryPromise;
}

self.onmessage = async (event: MessageEvent<DbWorkerRequest>) => {
  try {
    const repo = await getRepository();
    const handler = createWorkerMessageHandler(repo);
    await handler(event.data, (response) => {
      self.postMessage(response);
    });
  } catch (err: any) {
    self.postMessage({
      requestId: event.data?.requestId,
      success: false,
      error: err?.message || 'Worker initialization error',
    });
  }
};
