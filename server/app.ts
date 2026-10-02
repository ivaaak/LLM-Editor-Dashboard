// app.ts
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type ErrorRequestHandler, type Request } from 'express';
import { HttpError, type Store } from './store';
import type { DashboardSnapshot } from '../shared/types';

// Clients treat a stream without any event for a while as dead and reconnect (see useDashboard).
const SSE_HEARTBEAT_MS = 10000;

export function createApp(store: Store, options: { staticDir?: string } = {}) {
    const app = express();
    app.disable('x-powered-by');
    app.use(express.json({ limit: '100kb' }));

    const api = express.Router();
    const body = (req: Request): Record<string, unknown> =>
        req.body && typeof req.body === 'object' ? req.body : {};

    api.get('/health', (_req, res) => {
        res.json({ ok: true });
    });

    api.get('/state', (_req, res) => {
        res.json(store.snapshot());
    });

    // Server-Sent Events: sends the current snapshot on connect and after every change.
    api.get('/events', (req, res) => {
        res.set({
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
            'X-Accel-Buffering': 'no'
        });
        res.flushHeaders();

        const send = (snapshot: DashboardSnapshot) => {
            res.write(`event: state\ndata: ${JSON.stringify(snapshot)}\n\n`);
        };
        send(store.snapshot());
        const unsubscribe = store.subscribe(send);
        const heartbeat = setInterval(() => res.write('event: ping\ndata: {}\n\n'), SSE_HEARTBEAT_MS);
        req.on('close', () => {
            unsubscribe();
            clearInterval(heartbeat);
        });
    });

    // Models
    api.post('/models', (req, res) => {
        res.status(201).json(store.createModel(body(req)));
    });
    api.patch('/models/:id', (req, res) => {
        res.json(store.setModelDataset(req.params.id, body(req).datasetId));
    });
    api.delete('/models/:id', (req, res) => {
        res.json(store.deleteModel(req.params.id));
    });
    api.put('/models/:id/parameters/:name', (req, res) => {
        res.json(store.updateParameter(req.params.id, req.params.name, body(req).value));
    });
    api.post('/models/:id/parameters/reset', (req, res) => {
        res.json(store.resetParameters(req.params.id));
    });
    api.post('/models/:id/train', (req, res) => {
        res.json(store.startTraining(req.params.id));
    });
    api.post('/models/:id/cancel', (req, res) => {
        res.json(store.cancelTraining(req.params.id));
    });

    // Datasets
    api.post('/datasets', (req, res) => {
        res.status(201).json(store.addDataset(body(req)));
    });
    api.delete('/datasets/:id', (req, res) => {
        res.json(store.deleteDataset(req.params.id));
    });

    // Settings & maintenance
    api.patch('/settings', (req, res) => {
        res.json(store.updateSimulation(body(req)));
    });
    api.post('/reset', (_req, res) => {
        res.json(store.resetDemoData());
    });

    api.use((_req, res) => {
        res.status(404).json({ error: 'Not found.' });
    });

    app.use('/api', api);

    // In production, serve the built frontend and fall back to index.html for client-side routes.
    if (options.staticDir && existsSync(join(options.staticDir, 'index.html'))) {
        const staticDir = options.staticDir;
        app.use(express.static(staticDir));
        app.use((req, res, next) => {
            if (req.method !== 'GET') return next();
            res.sendFile(join(staticDir, 'index.html'));
        });
    }

    const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
        void _next;
        if (err instanceof HttpError) {
            res.status(err.status).json({ error: err.message });
        } else if (err instanceof SyntaxError && 'body' in err) {
            res.status(400).json({ error: 'Request body is not valid JSON.' });
        } else {
            console.error(err);
            res.status(500).json({ error: 'Internal server error.' });
        }
    };
    app.use(errorHandler);

    return app;
}
