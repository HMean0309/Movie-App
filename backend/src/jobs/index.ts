import { syncMoviesWorker } from './sync-movies.worker';

export function startWorkers() {
  console.log('[Workers] Đã khởi động sync-movies worker');
  return { syncMoviesWorker };
}
