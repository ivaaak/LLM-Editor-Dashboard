# AI Tuner: LLM Fine-Tuning Dashboard

A React + TypeScript + Vite dashboard for monitoring, tuning and comparing fine-tuned language models, backed
by a small Node/Express API with SQLite storage. Training runs are **simulated on the server**, so they keep
going when the page is closed.

## Features

- **Overview**: KPI cards, validation loss/accuracy curves for each model's latest run, and a searchable, sortable, filterable models table with Train/Retrain/Cancel actions.
- **Model Details**: model info, dataset selection, full metric set, live training progress, per-run training curves, run history, hyperparameter controls (log-scale learning rate), a predicted outcome with warnings (divergence, overfitting, underfitting, too few epochs), and model deletion.
- **Comparison**: bar chart for any metric, radar chart (accuracy, F1, precision, recall, relative speed), a detailed table that highlights the best value per metric, and CSV export.
- **Datasets**: dataset catalogue with usage, plus registering and deleting datasets.
- **Settings**: light/dark/system theme (per browser) and simulation speed (server-wide). You can also reset the demo data.
- Live updates over Server-Sent Events; every open tab stays in sync. The current page is kept in the URL hash.

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts the API on http://localhost:3001 and Vite on http://localhost:5173. Vite forwards `/api`
to the API. The database is created at `data/dashboard.db` and seeded with demo data on first start.

| Script | Purpose |
| --- | --- |
| `npm run dev` | API (with reload on change) and Vite dev server together |
| `npm run dev:server` / `npm run dev:client` | Either one on its own |
| `npm run build` | Type-check everything and build the frontend into `dist/` |
| `npm start` | Run the API and serve the built frontend from `dist/` on one port |
| `npm run lint` | Run ESLint |

Environment variables: `API_PORT` (default `3001`) and `DB_FILE` (default `data/dashboard.db`).
Delete `data/` to start again from the demo data, or use **Settings → Reset Data**.

## API

All responses are JSON. Mutations return the full updated snapshot; errors look like `{ "error": "..." }`
with status 400 (invalid input), 404 (not found) or 409 (conflict, e.g. the model is training).

| Method & path | Description |
| --- | --- |
| `GET /api/state` | Current snapshot: `{ version, models, datasets, simulation }` |
| `GET /api/events` | Server-Sent Events: `state` (snapshot) after every change, `ping` every 10s |
| `POST /api/models` | Create a model: `{ name, baseModelName, datasetId, color }` → `{ model, snapshot }` |
| `PATCH /api/models/:id` | Change the dataset: `{ datasetId }` |
| `DELETE /api/models/:id` | Delete a model and its runs |
| `PUT /api/models/:id/parameters/:name` | Set a hyperparameter: `{ value }` (validated and clamped) |
| `POST /api/models/:id/parameters/reset` | Reset hyperparameters to their defaults |
| `POST /api/models/:id/train` | Start a training run |
| `POST /api/models/:id/cancel` | Cancel the active run |
| `POST /api/datasets` | Register a dataset: `{ name, task, samples, sizeMB, quality, description }` |
| `DELETE /api/datasets/:id` | Delete an unused dataset |
| `PATCH /api/settings` | `{ epochIntervalMs }` (100–10000): real time per simulated epoch |
| `POST /api/reset` | Replace everything with the demo data |

## How the simulation works

`shared/simulation.ts` turns a model's size, dataset (size and quality) and hyperparameters into a `RunProfile`
(achievable accuracy, convergence rate, noise, overfitting and divergence points). The server advances every
running job by one epoch per interval. Each epoch is generated from the profile and a per-run seed, so a run
always reproduces the same curves. A model's metrics always come from its latest completed run.

## Project structure

| Path | Purpose |
| --- | --- |
| `shared/` | Code used by both sides: types, the simulation, and catalogue/demo data (`seed.ts`) |
| `server/index.ts` | Entry point: opens the database, starts the training loop and HTTP server |
| `server/app.ts` | Express routes, event stream, error handling, static file serving |
| `server/store.ts` | In-memory state with write-through persistence, validation and the training loop |
| `server/db.ts` | SQLite schema and queries (`models`, `runs`, `datasets`, `settings`) |
| `src/useDashboard.ts` | Client state: event stream with reconnects, API mutations, optimistic parameter edits |
| `src/api.ts` | Typed API client |
| `src/` (other) | React pages and components |
