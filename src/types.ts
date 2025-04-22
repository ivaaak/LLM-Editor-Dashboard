// types.ts
export interface ModelMetrics {
    accuracy: number;
    loss: number;
    f1: number;
    precision?: number;
    recall?: number;
    trainingTime: number; // in minutes
    inferenceSpeed?: number; // in milliseconds
}

export interface ModelParameter {
    name: string;
    label: string;
    type: 'range' | 'select' | 'checkbox' | 'number';
    value: number | string | boolean;
    defaultValue: number | string | boolean;
    description?: string;
    min?: number;
    max?: number;
    step?: number;
    options?: string[];
}

export interface Model {
    id: string;
    name: string;
    type: string;
    size: string;
    status: 'pending' | 'training' | 'trained' | 'failed';
    lastUpdated: string;
    color: string;
    metrics: ModelMetrics;
    parameters: ModelParameter[];
}

export interface TrainingMetrics {
    loss: Array<{
        epoch: number;
        [key: string]: number;
    }>;
    accuracy: Array<{
        epoch: number;
        [key: string]: number;
    }>;
}

export interface MockData {
    models: Model[];
    trainingMetrics: TrainingMetrics;
}