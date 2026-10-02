// db.ts
// SQLite persistence. Models, runs and datasets are stored as JSON documents with a few
// indexed columns, which keeps the schema small while the domain model is still evolving.
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import type { Dataset, Model, TrainingRun } from '../shared/types';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS datasets (
    id       TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    data     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
    id       TEXT PRIMARY KEY,
    position INTEGER NOT NULL,
    data     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS runs (
    id         TEXT PRIMARY KEY,
    model_id   TEXT NOT NULL REFERENCES models(id) ON DELETE CASCADE,
    position   INTEGER NOT NULL,
    status     TEXT NOT NULL,
    started_at TEXT NOT NULL,
    data       TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS runs_by_model ON runs(model_id, position);

CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
`;

interface DataRow {
    data: string;
}

interface RunRow extends DataRow {
    model_id: string;
}

export type Db = ReturnType<typeof openDatabase>;

export function openDatabase(file: string) {
    if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
    const db = new Database(file);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA);

    // Upserts use ON CONFLICT ... DO UPDATE rather than INSERT OR REPLACE: a replace deletes the
    // old row first, which would cascade-delete a model's runs.
    const upsertModel = db.prepare(`
        INSERT INTO models (id, position, data) VALUES (@id, @position, @data)
        ON CONFLICT(id) DO UPDATE SET position = excluded.position, data = excluded.data`);
    const upsertRun = db.prepare(`
        INSERT INTO runs (id, model_id, position, status, started_at, data)
        VALUES (@id, @modelId, @position, @status, @startedAt, @data)
        ON CONFLICT(id) DO UPDATE SET position = excluded.position, status = excluded.status, data = excluded.data`);
    const upsertDataset = db.prepare(`
        INSERT INTO datasets (id, position, data) VALUES (@id, @position, @data)
        ON CONFLICT(id) DO UPDATE SET position = excluded.position, data = excluded.data`);
    const deleteModelStmt = db.prepare('DELETE FROM models WHERE id = ?');
    const deleteDatasetStmt = db.prepare('DELETE FROM datasets WHERE id = ?');
    const getSettingStmt = db.prepare<[string], { value: string }>('SELECT value FROM settings WHERE key = ?');
    const setSettingStmt = db.prepare(`
        INSERT INTO settings (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value`);

    const writeModel = (model: Model, position: number, runIds?: Set<string>) => {
        const { runs, ...rest } = model;
        upsertModel.run({ id: model.id, position, data: JSON.stringify(rest) });
        runs.forEach((run, index) => {
            if (runIds && !runIds.has(run.id)) return;
            upsertRun.run({
                id: run.id,
                modelId: model.id,
                position: index,
                status: run.status,
                startedAt: run.startedAt,
                data: JSON.stringify(run)
            });
        });
    };

    const writeDataset = (dataset: Dataset, position: number) =>
        upsertDataset.run({ id: dataset.id, position, data: JSON.stringify(dataset) });

    return {
        load(): { models: Model[]; datasets: Dataset[] } {
            const datasets = db.prepare<[], DataRow>('SELECT data FROM datasets ORDER BY position')
                .all()
                .map(row => JSON.parse(row.data) as Dataset);
            const runsByModel = new Map<string, TrainingRun[]>();
            for (const row of db.prepare<[], RunRow>('SELECT model_id, data FROM runs ORDER BY model_id, position').all()) {
                const list = runsByModel.get(row.model_id) ?? [];
                list.push(JSON.parse(row.data) as TrainingRun);
                runsByModel.set(row.model_id, list);
            }
            const models = db.prepare<[], DataRow>('SELECT data FROM models ORDER BY position')
                .all()
                .map(row => {
                    const model = JSON.parse(row.data) as Omit<Model, 'runs'>;
                    return { ...model, runs: runsByModel.get(model.id) ?? [] };
                });
            return { models, datasets };
        },

        /** Saves a model. Pass `runIds` to only write those runs (e.g. the one that just advanced). */
        saveModels: db.transaction((entries: { model: Model; position: number; runIds?: Set<string> }[]) => {
            for (const { model, position, runIds } of entries) writeModel(model, position, runIds);
        }),

        deleteModel(id: string) {
            deleteModelStmt.run(id);
        },

        saveDataset(dataset: Dataset, position: number) {
            writeDataset(dataset, position);
        },

        deleteDataset(id: string) {
            deleteDatasetStmt.run(id);
        },

        getSetting(key: string): string | undefined {
            return getSettingStmt.get(key)?.value;
        },

        setSetting(key: string, value: string) {
            setSettingStmt.run(key, value);
        },

        /** Replaces all models, runs and datasets in one transaction. */
        replaceAll: db.transaction((models: Model[], datasets: Dataset[]) => {
            db.exec('DELETE FROM runs; DELETE FROM models; DELETE FROM datasets;');
            datasets.forEach(writeDataset);
            models.forEach((model, index) => writeModel(model, index));
        }),

        close() {
            db.close();
        }
    };
}
