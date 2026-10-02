// types.ts
export type ModelStatus = 'pending' | 'training' | 'trained' | 'failed';
export type RunStatus = 'running' | 'completed' | 'failed' | 'cancelled';
export type ParameterValue = number | string | boolean;

export interface ModelMetrics {
    accuracy: number;
    loss: number;
    f1: number;
    precision: number;
    recall: number;
    trainingTime: number; // simulated, in minutes
    inferenceSpeed: number; // latency per request, in milliseconds (lower is better)
}

export interface ModelParameter {
    name: string;
    label: string;
    type: 'range' | 'select' | 'checkbox' | 'number';
    value: ParameterValue;
    defaultValue: ParameterValue;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    scale?: 'linear' | 'log';
    options?: string[];
}

export interface EpochPoint {
    epoch: number;
    trainLoss: number;
    valLoss: number;
    accuracy: number;
}

/** Everything the simulator needs to replay a run deterministically. */
export interface RunProfile {
    ceiling: number;
    rate: number;
    noiseLevel: number;
    divergeAtEpoch: number | null;
    overfitFrom: number | null;
    overfitStrength: number;
    earlyStopping: boolean;
    totalEpochs: number;
    minutesPerEpoch: number;
    latencyMs: number;
    recommendedLearningRate: number;
    warnings: string[];
}

export interface TrainingRun {
    id: string;
    seed: number;
    startedAt: string;
    finishedAt?: string;
    status: RunStatus;
    datasetId: string;
    parameters: Record<string, ParameterValue>;
    totalEpochs: number;
    history: EpochPoint[];
    profile: RunProfile;
    metrics?: ModelMetrics;
    message?: string;
}

export interface Model {
    id: string;
    name: string;
    baseModel: string;
    type: string;
    size: string;
    status: ModelStatus;
    lastUpdated: string;
    color: string;
    datasetId: string;
    /** Metrics of the most recent completed run, or null if the model was never trained successfully. */
    metrics: ModelMetrics | null;
    parameters: ModelParameter[];
    runs: TrainingRun[];
}

export interface Dataset {
    id: string;
    name: string;
    task: string;
    samples: number;
    sizeMB: number;
    quality: number; // 0..1, share of clean / well-labelled samples
    description: string;
}

export type Theme = 'system' | 'light' | 'dark';

/** Server-wide settings that affect how training is simulated. */
export interface SimulationSettings {
    epochIntervalMs: number;
}

/** Full state returned by the API and pushed over the event stream. */
export interface DashboardSnapshot {
    /** Increases with every change; clients ignore snapshots older than the one they have. */
    version: number;
    models: Model[];
    datasets: Dataset[];
    simulation: SimulationSettings;
}

export interface NewModelInput {
    name: string;
    baseModelName: string;
    datasetId: string;
    color: string;
}

export type NewDatasetInput = Omit<Dataset, 'id'>;

export type TabId = 'overview' | 'model-detail' | 'comparison' | 'datasets' | 'settings';
