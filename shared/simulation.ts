// simulation.ts
// A small, deterministic model of fine-tuning behaviour. Given the same parameters and seed a run
// always produces the same curves, so charts, metrics and persisted state stay consistent.
import type {
    Dataset,
    EpochPoint,
    Model,
    ModelMetrics,
    ModelParameter,
    ParameterValue,
    RunProfile,
    TrainingRun
} from './types';

const START_LOSS = 1.2;
const START_ACCURACY = 0.35;
const EARLY_STOPPING_PATIENCE = 3;

const OPTIMIZERS: Record<string, { ceiling: number; rate: number }> = {
    Adam: { ceiling: 0, rate: 1 },
    AdamW: { ceiling: 0.005, rate: 1.05 },
    SGD: { ceiling: -0.01, rate: 0.6 },
    RMSprop: { ceiling: -0.005, rate: 0.9 },
    Adagrad: { ceiling: -0.015, rate: 0.75 }
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number, digits = 4) => Number(value.toFixed(digits));

/** Deterministic pseudo-random number in [-1, 1] for a (seed, epoch, channel) triple. */
function jitter(seed: number, epoch: number, channel: number): number {
    let h = 2166136261;
    for (const v of [seed, epoch, channel]) {
        h ^= v | 0;
        h = Math.imul(h, 16777619);
    }
    let t = (h + 0x6d2b79f5) | 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

/** Parses sizes such as "7B", "340M" or "1.5T" into billions of parameters. */
export function parseSizeInBillions(size: string): number {
    const match = /^\s*([\d.]+)\s*([KMBT])?/i.exec(size);
    if (!match) return 1;
    const n = parseFloat(match[1]);
    switch (match[2]?.toUpperCase()) {
        case 'T': return n * 1000;
        case 'B': return n;
        case 'M': return n / 1000;
        case 'K': return n / 1e6;
        default: return n / 1e9;
    }
}

export function parametersToRecord(parameters: ModelParameter[]): Record<string, ParameterValue> {
    return Object.fromEntries(parameters.map(p => [p.name, p.value]));
}

function numberParam(params: Record<string, ParameterValue>, name: string, fallback: number): number {
    const value = params[name];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function buildProfile(
    params: Record<string, ParameterValue>,
    size: string,
    dataset?: Dataset
): RunProfile {
    const learningRate = Math.max(1e-7, numberParam(params, 'learningRate', 2e-4));
    const batchSize = clamp(Math.round(numberParam(params, 'batchSize', 32)), 1, 1024);
    const totalEpochs = clamp(Math.round(numberParam(params, 'epochs', 10)), 1, 1000);
    const dropout = clamp(numberParam(params, 'dropout', 0.1), 0, 0.9);
    const optimizer = typeof params.optimizer === 'string' ? params.optimizer : 'AdamW';
    const earlyStopping = params.useEarlyStopping === true;
    const sizeB = parseSizeInBillions(size);
    const quality = dataset?.quality ?? 0.85;
    const samples = dataset?.samples ?? 50000;
    const warnings: string[] = [];

    // Larger models and cleaner data raise the achievable accuracy.
    let ceiling = (0.8 + 0.035 * Math.log10(sizeB * 1000 + 1)) * (0.9 + 0.1 * quality);
    let rate = 0.35;

    // Bigger models prefer smaller learning rates.
    const recommendedLearningRate = 3e-4 / (1 + Math.log10(sizeB + 1));
    const lrDistance = Math.log10(learningRate / recommendedLearningRate);
    ceiling -= 0.04 * lrDistance ** 2;
    if (lrDistance < 0) rate *= Math.pow(10, lrDistance * 0.5);

    let divergeAtEpoch: number | null = null;
    if (lrDistance > 1.3) {
        divergeAtEpoch = clamp(Math.round(6 - 3 * (lrDistance - 1.3)), 2, 6);
        warnings.push('Learning rate is far above the recommended range for this model size, so training will likely diverge.');
    } else if (lrDistance > 0.7) {
        warnings.push('Learning rate is high. Expect unstable training and a lower final accuracy.');
    } else if (lrDistance < -1) {
        warnings.push('Learning rate is very low, so the model will converge slowly.');
    }

    const opt = OPTIMIZERS[optimizer] ?? { ceiling: 0, rate: 1 };
    ceiling += opt.ceiling;
    rate *= opt.rate;

    const noiseLevel = 0.012 * Math.sqrt(32 / batchSize);
    ceiling -= 0.01 * Math.max(0, Math.log2(batchSize / 64));
    if (batchSize < 8) warnings.push('A very small batch size makes the loss curve noisy and each epoch slow.');

    ceiling -= 0.15 * Math.max(0, dropout - 0.25);
    if (dropout > 0.35) warnings.push('High dropout will likely cause underfitting.');

    // Low dropout overfits after a while, and sooner on small datasets.
    let overfitFrom: number | null = null;
    let overfitStrength = 0;
    if (dropout < 0.12) {
        const dataFactor = clamp(50000 / samples, 0.5, 4);
        overfitFrom = Math.max(3, Math.round((4 + dropout * 60) / dataFactor));
        overfitStrength = (0.012 + (0.12 - dropout) * 0.08) * dataFactor;
        if (!earlyStopping && overfitFrom < totalEpochs) {
            warnings.push(`Low dropout without early stopping: expect overfitting after roughly epoch ${overfitFrom}.`);
        }
    }

    ceiling = clamp(ceiling, 0.3, 0.99);

    const gapAtEnd = (ceiling - START_ACCURACY) * Math.exp(-rate * totalEpochs);
    if (divergeAtEpoch === null && gapAtEnd > 0.02) {
        warnings.push('Too few epochs for this configuration to converge fully.');
    }

    const minutesPerEpoch = Math.max(
        0.2,
        2 * Math.pow(sizeB, 0.6) * (samples / 50000) * (0.8 + 8 / batchSize)
    );

    return {
        ceiling,
        rate,
        noiseLevel,
        divergeAtEpoch,
        overfitFrom,
        overfitStrength,
        earlyStopping,
        totalEpochs,
        minutesPerEpoch,
        latencyMs: Math.round(20 + 12 * Math.sqrt(sizeB)),
        recommendedLearningRate,
        warnings
    };
}

/** Noise-free value of the curves at a given epoch. */
function expectedPoint(profile: RunProfile, epoch: number): EpochPoint {
    const { ceiling, rate, overfitFrom, overfitStrength } = profile;
    const progress = Math.exp(-rate * epoch);
    const overfit = overfitFrom !== null && epoch > overfitFrom ? (epoch - overfitFrom) * overfitStrength : 0;
    const floorLoss = (1 - ceiling) * 1.5;
    return {
        epoch,
        trainLoss: floorLoss * 0.7 + (START_LOSS - floorLoss * 0.7) * Math.exp(-rate * 1.15 * epoch) - overfit * 0.3,
        valLoss: floorLoss + (START_LOSS - floorLoss) * progress + overfit,
        accuracy: ceiling - (ceiling - START_ACCURACY) * progress - overfit * 0.4
    };
}

export function epochPoint(profile: RunProfile, seed: number, epoch: number): EpochPoint {
    if (profile.divergeAtEpoch !== null && epoch >= profile.divergeAtEpoch) {
        const blowUp = Math.pow(3, epoch - profile.divergeAtEpoch + 1);
        return {
            epoch,
            trainLoss: round(Math.min(20, START_LOSS * blowUp)),
            valLoss: round(Math.min(20, START_LOSS * blowUp * 1.2)),
            accuracy: round(clamp(0.1 + jitter(seed, epoch, 3) * 0.05, 0, 1))
        };
    }
    const base = expectedPoint(profile, epoch);
    const n = profile.noiseLevel;
    return {
        epoch,
        trainLoss: round(Math.max(0.005, base.trainLoss + jitter(seed, epoch, 1) * n * 0.8)),
        valLoss: round(Math.max(0.01, base.valLoss + jitter(seed, epoch, 2) * n)),
        accuracy: round(clamp(base.accuracy + jitter(seed, epoch, 3) * n * 0.5, 0, 0.995))
    };
}

function bestEpochIndex(history: EpochPoint[]): number {
    let best = 0;
    history.forEach((point, i) => {
        if (point.valLoss < history[best].valLoss) best = i;
    });
    return best;
}

function computeMetrics(point: EpochPoint, epochsRun: number, profile: RunProfile, seed: number): ModelMetrics {
    const precision = clamp(point.accuracy + jitter(seed, 0, 10) * 0.012, 0, 1);
    const recall = clamp(point.accuracy + jitter(seed, 0, 11) * 0.012, 0, 1);
    return {
        accuracy: point.accuracy,
        loss: point.valLoss,
        f1: round((2 * precision * recall) / (precision + recall)),
        precision: round(precision),
        recall: round(recall),
        trainingTime: Math.max(1, Math.round(profile.minutesPerEpoch * epochsRun)),
        inferenceSpeed: profile.latencyMs
    };
}

export function createRun(options: {
    id: string;
    seed: number;
    startedAt: string;
    parameters: ModelParameter[];
    size: string;
    datasetId: string;
    dataset?: Dataset;
}): TrainingRun {
    const parameters = parametersToRecord(options.parameters);
    const profile = buildProfile(parameters, options.size, options.dataset);
    return {
        id: options.id,
        seed: options.seed,
        startedAt: options.startedAt,
        status: 'running',
        datasetId: options.datasetId,
        parameters,
        totalEpochs: profile.totalEpochs,
        history: [],
        profile
    };
}

/** Runs one more epoch. Pure: the result only depends on the run itself and `now`. */
export function advanceRun(run: TrainingRun, now: string): TrainingRun {
    if (run.status !== 'running') return run;
    const epoch = run.history.length + 1;
    const history = [...run.history, epochPoint(run.profile, run.seed, epoch)];

    if (run.profile.divergeAtEpoch !== null && epoch >= run.profile.divergeAtEpoch) {
        return {
            ...run,
            history,
            status: 'failed',
            finishedAt: now,
            message: `Loss diverged at epoch ${epoch}. Try a lower learning rate.`
        };
    }

    const bestIndex = bestEpochIndex(history);
    const stoppedEarly = run.profile.earlyStopping && history.length - 1 - bestIndex >= EARLY_STOPPING_PATIENCE;
    if (stoppedEarly || epoch >= run.totalEpochs) {
        const chosen = run.profile.earlyStopping ? bestIndex : history.length - 1;
        return {
            ...run,
            history,
            status: 'completed',
            finishedAt: now,
            metrics: computeMetrics(history[chosen], history.length, run.profile, run.seed),
            message: stoppedEarly
                ? `Early stopping at epoch ${epoch}; restored weights from epoch ${history[chosen].epoch}.`
                : `Completed ${epoch} epochs.`
        };
    }

    return { ...run, history };
}

/** Runs until the run finishes. Used to build the demo data. */
export function simulateRun(run: TrainingRun, maxEpochs = Infinity): TrainingRun {
    let current = run;
    while (current.status === 'running' && current.history.length < maxEpochs) {
        current = advanceRun(current, current.startedAt);
    }
    if (current.status !== 'running' && current.metrics) {
        const finished = new Date(new Date(current.startedAt).getTime() + current.metrics.trainingTime * 60000);
        current = { ...current, finishedAt: finished.toISOString() };
    } else if (current.status === 'failed') {
        const minutes = current.profile.minutesPerEpoch * current.history.length;
        current = { ...current, finishedAt: new Date(new Date(current.startedAt).getTime() + minutes * 60000).toISOString() };
    }
    return current;
}

/** Stores an updated run on its model and derives the model's status/metrics from it. */
export function applyRun(model: Model, run: TrainingRun): Model {
    const exists = model.runs.some(r => r.id === run.id);
    const runs = exists ? model.runs.map(r => (r.id === run.id ? run : r)) : [...model.runs, run];
    const lastUpdated = run.finishedAt ?? run.startedAt;

    switch (run.status) {
        case 'running':
            return { ...model, runs, status: 'training', lastUpdated };
        case 'completed':
            return { ...model, runs, status: 'trained', metrics: run.metrics ?? model.metrics, lastUpdated };
        case 'failed':
            return { ...model, runs, status: 'failed', lastUpdated };
        case 'cancelled':
            return { ...model, runs, status: model.metrics ? 'trained' : 'pending', lastUpdated };
    }
}

export interface RunEstimate {
    diverges: boolean;
    accuracy: number | null;
    epochs: number;
    minutes: number;
}

/** Noise-free prediction of what a run with this profile will produce. */
export function estimateRun(profile: RunProfile): RunEstimate {
    if (profile.divergeAtEpoch !== null) {
        return {
            diverges: true,
            accuracy: null,
            epochs: profile.divergeAtEpoch,
            minutes: profile.minutesPerEpoch * profile.divergeAtEpoch
        };
    }
    const points = Array.from({ length: profile.totalEpochs }, (_, i) => expectedPoint(profile, i + 1));
    let chosen = points.length - 1;
    let epochs = profile.totalEpochs;
    if (profile.earlyStopping) {
        chosen = bestEpochIndex(points);
        epochs = Math.min(profile.totalEpochs, chosen + 1 + EARLY_STOPPING_PATIENCE);
    }
    return {
        diverges: false,
        accuracy: points[chosen].accuracy,
        epochs,
        minutes: profile.minutesPerEpoch * epochs
    };
}

export function getActiveRun(model: Model): TrainingRun | undefined {
    return model.runs.find(r => r.status === 'running');
}

/** Most recent run that is running or finished successfully; used for the overview curves. */
export function getLatestUsefulRun(model: Model): TrainingRun | undefined {
    for (let i = model.runs.length - 1; i >= 0; i--) {
        const run = model.runs[i];
        if ((run.status === 'running' || run.status === 'completed') && run.history.length > 0) return run;
    }
    return undefined;
}
