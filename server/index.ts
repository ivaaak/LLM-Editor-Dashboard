// index.ts
import { resolve } from 'node:path';
import { createApp } from './app';
import { openDatabase } from './db';
import { Store } from './store';

const PORT = Number(process.env.API_PORT ?? 3001);
const DB_FILE = process.env.DB_FILE ?? resolve('data', 'dashboard.db');

const db = openDatabase(DB_FILE);
const store = new Store(db);
store.start();

const app = createApp(store, { staticDir: resolve('dist') });
const server = app.listen(PORT, () => {
    console.log(`API server listening on http://localhost:${PORT} (database: ${DB_FILE})`);
});

function shutdown() {
    store.stop();
    server.close();
    // Open SSE connections would otherwise keep the process alive.
    server.closeAllConnections();
    db.close();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
