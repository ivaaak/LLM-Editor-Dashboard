// store.ts
// Single-user application state. The whole state is small, so it is kept in memory, every change is
// written through to SQLite, and subscribers (the SSE stream) receive a fresh snapshot after each change.
import { randomInt, randomUUID } from 'node:crypto';
import type { Db } from './db';
import { BASE_MODELS, createDefaultParameters, createInitialData } from '../shared/seed';
import { advanceRun, applyRun, createRun, getActiveRun } from '../shared/simulation';
import type {
    DashboardSnapshot,
    Dataset,
    Model,
    ModelParameter,
    NewDatasetInput,
    NewModelInput,
    ParameterValue,
    SimulationSettings
} from '../shared/types';

export class HttpError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

const DEFAULT_SIMULATION: SimulationSettings = { epochIntervalMs: 800 };
const MIN_EPOCH_INTERVAL_MS = 100;
const MAX_EPOCH_INTERVAL_MS = 10000;

const createId = (prefix: string) => `${prefix}-${randomUUID().slice(0, 8)}`;

function requireString(value: unknown, field: string, maxLength = 120): string {
    if (typeof value !== 'string' || !value.trim()) throw new HttpError(400, `"${field}" is required.`);
    const trimmed = value.trim();
    if (trimmed.length > maxLength) throw new HttpError(400, `"${field}" must be at most ${maxLength} characters.`);
    return trimmed;
}

function requireNumber(value: unknown, field: string, min: number, max: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new HttpError(400, `"${field}" must be a number between ${min} and ${max}.`);
    }
    return value;
}

/** Checks a parameter value against its definition and returns the normalised value. */
function normalizeParameterValue(param: ModelParameter, value: unknown): ParameterValue {
    switch (param.type) {
        case 'range':
        case 'number': {
            if (typeof value !== 'number' || !Number.isFinite(value)) {
                throw new HttpError(400, `"${param.label}" must be a number.`);
            }
            let result = Math.min(param.max ?? Infinity, Math.max(param.min ?? -Infinity, value));
            if (param.type === 'number' && param.step) result = Math.round(result / param.step) * param.step;
            return result;
        }
        case 'select':
            if (typeof value !== 'string' || !param.options?.includes(value)) {
                throw new HttpError(400, `"${param.label}" must be one of: ${param.options?.join(', ')}.`);
            }
            return value;
        case 'checkbox':
            if (typeof value !== 'boolean') throw new HttpError(400, `"${param.label}" must be true or false.`);
            return value;
    }
}

export class Store {
    private models: Model[] = [];
    private datasets: Dataset[] = [];
    private simulation: SimulationSettings = DEFAULT_SIMULATION;
    // Starting from the clock keeps versions increasing across server restarts.
    private version = Date.now();
    private positions = new Map<string, number>();
    private nextPosition = 0;
    private listeners = new Set<(snapshot: DashboardSnapshot) => void>();
    private timer: NodeJS.Timeout | undefined;

    constructor(private readonly db: Db) {
        if (db.getSetting('seeded') !== '1') {
            this.seed();
        } else {
            const data = db.load();
            this.models = data.models;
            this.datasets = data.datasets;
            this.models.forEach(model => this.positions.set(model.id, this.nextPosition++));
        }
        const interval = Number(db.getSetting('epochIntervalMs'));
        if (Number.isFinite(interval) && interval > 0) this.simulation = { epochIntervalMs: interval };
    }

    // ----- lifecycle -----

    start(): void {
        this.stop();
        this.timer = setInterval(() => this.tick(), this.simulation.epochIntervalMs);
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        this.timer = undefined;
    }

    snapshot(): DashboardSnapshot {
        return { version: this.version, models: this.models, datasets: this.datasets, simulation: this.simulation };
    }

    subscribe(listener: (snapshot: DashboardSnapshot) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    private commit(): DashboardSnapshot {
        this.version++;
        const snapshot = this.snapshot();
        this.listeners.forEach(listener => listener(snapshot));
        return snapshot;
    }

    private seed(): void {
        const data = createInitialData();
        this.models = data.models;
        this.datasets = data.datasets;
        this.positions.clear();
        this.nextPosition = 0;
        this.models.forEach(model => this.positions.set(model.id, this.nextPosition++));
        this.db.replaceAll(this.models, this.datasets);
        this.db.setSetting('seeded', '1');
    }

    // ----- helpers -----

    private getModel(id: string): Model {
        const model = this.models.find(m => m.id === id);
        if (!model) throw new HttpError(404, 'Model not found.');
        return model;
    }

    private assertNotTraining(model: Model): void {
        if (model.status === 'training') throw new HttpError(409, 'The model is training. Cancel the run first.');
    }

    /** Replaces models in memory and persists them. `runIds` limits which runs are rewritten. */
    private saveModels(updates: { model: Model; runIds?: Set<string> }[]): void {
        const byId = new Map(updates.map(u => [u.model.id, u.model]));
        this.models = this.models.map(m => byId.get(m.id) ?? m);
        this.db.saveModels(updates.map(u => ({
            model: u.model,
            position: this.positions.get(u.model.id) ?? 0,
            runIds: u.runIds
        })));
    }

    private saveModel(model: Model, runIds?: Set<string>): void {
        this.saveModels([{ model, runIds }]);
    }

    // ----- models -----

    createModel(input: Partial<NewModelInput>): { model: Model; snapshot: DashboardSnapshot } {
        const name = requireString(input.name, 'name');
        if (this.models.some(m => m.name.toLowerCase() === name.toLowerCase())) {
            throw new HttpError(409, 'A model with this name already exists.');
        }
        const base = BASE_MODELS.find(b => b.name === input.baseModelName);
        if (!base) throw new HttpError(400, 'Unknown base model.');
        if (!this.datasets.some(d => d.id === input.datasetId)) throw new HttpError(400, 'Unknown dataset.');
        if (typeof input.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(input.color)) {
            throw new HttpError(400, '"color" must be a hex colour such as #3498db.');
        }

        const model: Model = {
            id: createId('model'),
            name,
            baseModel: base.name,
            type: base.type,
            size: base.size,
            status: 'pending',
            lastUpdated: new Date().toISOString(),
            color: input.color,
            datasetId: input.datasetId!,
            metrics: null,
            parameters: createDefaultParameters(),
            runs: []
        };
        this.models = [...this.models, model];
        this.positions.set(model.id, this.nextPosition++);
        this.saveModel(model);
        return { model, snapshot: this.commit() };
    }

    deleteModel(id: string): DashboardSnapshot {
        this.assertNotTraining(this.getModel(id));
        this.models = this.models.filter(m => m.id !== id);
        this.positions.delete(id);
        this.db.deleteModel(id);
        return this.commit();
    }

    setModelDataset(id: string, datasetId: unknown): DashboardSnapshot {
        const model = this.getModel(id);
        this.assertNotTraining(model);
        if (!this.datasets.some(d => d.id === datasetId)) throw new HttpError(400, 'Unknown dataset.');
        this.saveModel({ ...model, datasetId: datasetId as string });
        return this.commit();
    }

    updateParameter(id: string, name: string, value: unknown): DashboardSnapshot {
        const model = this.getModel(id);
        this.assertNotTraining(model);
        const param = model.parameters.find(p => p.name === name);
        if (!param) throw new HttpError(404, 'Parameter not found.');
        const normalized = normalizeParameterValue(param, value);
        this.saveModel({
            ...model,
            parameters: model.parameters.map(p => (p.name === name ? { ...p, value: normalized } : p))
        });
        return this.commit();
    }

    resetParameters(id: string): DashboardSnapshot {
        const model = this.getModel(id);
        this.assertNotTraining(model);
        this.saveModel({ ...model, parameters: model.parameters.map(p => ({ ...p, value: p.defaultValue })) });
        return this.commit();
    }

    // ----- training -----

    startTraining(id: string): DashboardSnapshot {
        const model = this.getModel(id);
        this.assertNotTraining(model);
        const run = createRun({
            id: createId('run'),
            seed: randomInt(2 ** 31),
            startedAt: new Date().toISOString(),
            parameters: model.parameters,
            size: model.size,
            datasetId: model.datasetId,
            dataset: this.datasets.find(d => d.id === model.datasetId)
        });
        this.saveModel(applyRun(model, run), new Set([run.id]));
        return this.commit();
    }

    cancelTraining(id: string): DashboardSnapshot {
        const model = this.getModel(id);
        const run = getActiveRun(model);
        if (!run) throw new HttpError(409, 'The model is not training.');
        const cancelled = { ...run, status: 'cancelled' as const, finishedAt: new Date().toISOString(), message: 'Cancelled by user.' };
        this.saveModel(applyRun(model, cancelled), new Set([run.id]));
        return this.commit();
    }

    /** Advances every running job by one epoch. */
    tick(): void {
        const now = new Date().toISOString();
        const updates: { model: Model; runIds?: Set<string> }[] = [];
        for (const model of this.models) {
            if (model.status !== 'training') continue;
            const run = getActiveRun(model);
            if (!run) {
                // Recover a model left in "training" without an active run.
                updates.push({ model: { ...model, status: model.metrics ? 'trained' : 'pending' }, runIds: new Set() });
                continue;
            }
            updates.push({ model: applyRun(model, advanceRun(run, now)), runIds: new Set([run.id]) });
        }
        if (updates.length === 0) return;
        this.saveModels(updates);
        this.commit();
    }

    // ----- datasets -----

    addDataset(input: Partial<NewDatasetInput>): DashboardSnapshot {
        const name = requireString(input.name, 'name');
        if (this.datasets.some(d => d.name.toLowerCase() === name.toLowerCase())) {
            throw new HttpError(409, 'A dataset with this name already exists.');
        }
        const dataset: Dataset = {
            id: createId('ds'),
            name,
            task: requireString(input.task, 'task', 60),
            samples: Math.round(requireNumber(input.samples, 'samples', 100, 1e9)),
            sizeMB: requireNumber(input.sizeMB, 'sizeMB', 0.001, 1e7),
            quality: requireNumber(input.quality, 'quality', 0, 1),
            description: typeof input.description === 'string' ? input.description.trim().slice(0, 500) : ''
        };
        this.datasets = [...this.datasets, dataset];
        this.db.saveDataset(dataset, this.datasets.length - 1);
        return this.commit();
    }

    deleteDataset(id: string): DashboardSnapshot {
        if (!this.datasets.some(d => d.id === id)) throw new HttpError(404, 'Dataset not found.');
        if (this.models.some(m => m.datasetId === id)) throw new HttpError(409, 'The dataset is used by a model.');
        this.datasets = this.datasets.filter(d => d.id !== id);
        this.db.deleteDataset(id);
        // Keep stored positions in step with the in-memory order.
        this.datasets.forEach((d, index) => this.db.saveDataset(d, index));
        return this.commit();
    }

    // ----- settings -----

    updateSimulation(input: Partial<SimulationSettings>): DashboardSnapshot {
        const epochIntervalMs = Math.round(
            requireNumber(input.epochIntervalMs, 'epochIntervalMs', MIN_EPOCH_INTERVAL_MS, MAX_EPOCH_INTERVAL_MS)
        );
        this.simulation = { epochIntervalMs };
        this.db.setSetting('epochIntervalMs', String(epochIntervalMs));
        if (this.timer) this.start();
        return this.commit();
    }

    resetDemoData(): DashboardSnapshot {
        this.seed();
        return this.commit();
    }
}
