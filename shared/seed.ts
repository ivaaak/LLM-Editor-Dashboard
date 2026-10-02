// seed.ts
// Catalogue data (base models, colours, parameter definitions) and the demo data used to seed the database.
import type { Dataset, Model, ModelParameter, ParameterValue } from './types';
import { applyRun, createRun, simulateRun } from './simulation';

export const MODEL_COLORS = ['#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#e84393'];

export interface BaseModel {
    name: string;
    size: string;
    type: string;
}

export const BASE_MODELS: BaseModel[] = [
    { name: 'Llama 3.1 8B', size: '8B', type: 'Decoder-only' },
    { name: 'Llama 3.1 70B', size: '70B', type: 'Decoder-only' },
    { name: 'Mistral 7B', size: '7B', type: 'Decoder-only' },
    { name: 'Qwen 2.5 14B', size: '14B', type: 'Decoder-only' },
    { name: 'Gemma 2 9B', size: '9B', type: 'Decoder-only' },
    { name: 'Phi-3 Mini', size: '3.8B', type: 'Decoder-only' },
    { name: 'BERT Large', size: '340M', type: 'Encoder-only' },
    { name: 'RoBERTa Base', size: '125M', type: 'Encoder-only' }
];

const DATASETS: Dataset[] = [
    {
        id: 'ds-support',
        name: 'Customer Support Tickets',
        task: 'Instruction tuning',
        samples: 48000,
        sizeMB: 210,
        quality: 0.92,
        description: 'Resolved support conversations paired with agent answers.'
    },
    {
        id: 'ds-code',
        name: 'Code Review Comments',
        task: 'Instruction tuning',
        samples: 125000,
        sizeMB: 640,
        quality: 0.88,
        description: 'Pull request diffs with reviewer feedback.'
    },
    {
        id: 'ds-sentiment',
        name: 'Product Review Sentiment',
        task: 'Classification',
        samples: 25000,
        sizeMB: 38,
        quality: 0.95,
        description: 'Short product reviews labelled positive, neutral or negative.'
    },
    {
        id: 'ds-legal',
        name: 'Legal Clause QA',
        task: 'Question answering',
        samples: 12000,
        sizeMB: 95,
        quality: 0.84,
        description: 'Contract clauses with expert-written questions and answers.'
    },
    {
        id: 'ds-web',
        name: 'Web Crawl Mix',
        task: 'Continued pretraining',
        samples: 400000,
        sizeMB: 2100,
        quality: 0.7,
        description: 'Broad, lightly filtered web text. Large but noisy.'
    }
];

const PARAMETER_DEFINITIONS: ModelParameter[] = [
    {
        name: 'learningRate',
        label: 'Learning Rate',
        type: 'range',
        scale: 'log',
        value: 2e-4,
        defaultValue: 2e-4,
        min: 1e-5,
        max: 1e-2,
        description: 'Controls how much to change the model in response to the estimated error each time the model weights are updated'
    },
    {
        name: 'batchSize',
        label: 'Batch Size',
        type: 'number',
        value: 32,
        defaultValue: 32,
        min: 1,
        max: 128,
        step: 1,
        description: 'Number of training examples used in one iteration'
    },
    {
        name: 'epochs',
        label: 'Epochs',
        type: 'number',
        value: 10,
        defaultValue: 10,
        min: 1,
        max: 100,
        step: 1,
        description: 'Number of complete passes through the training dataset'
    },
    {
        name: 'optimizer',
        label: 'Optimizer',
        type: 'select',
        value: 'AdamW',
        defaultValue: 'AdamW',
        options: ['Adam', 'AdamW', 'SGD', 'RMSprop', 'Adagrad'],
        description: 'Algorithm used to update the network weights'
    },
    {
        name: 'dropout',
        label: 'Dropout Rate',
        type: 'range',
        value: 0.1,
        defaultValue: 0.1,
        min: 0,
        max: 0.5,
        step: 0.01,
        description: 'Regularization technique where randomly selected neurons are ignored during training'
    },
    {
        name: 'useEarlyStopping',
        label: 'Early Stopping',
        type: 'checkbox',
        value: true,
        defaultValue: true,
        description: 'Stop training when validation loss stops improving and keep the best checkpoint'
    }
];

/** Builds a parameter set; overrides become both the current and the default value. */
export function createDefaultParameters(overrides: Record<string, ParameterValue> = {}): ModelParameter[] {
    return PARAMETER_DEFINITIONS.map(def => {
        const value = overrides[def.name] ?? def.defaultValue;
        return { ...def, value, defaultValue: value };
    });
}

interface SeedRun {
    seed: number;
    startedAt: string;
    parameters?: Record<string, ParameterValue>;
    /** Stop after this many epochs and leave the run in progress. */
    partialEpochs?: number;
}

interface SeedModel {
    id: string;
    name: string;
    baseModel: string;
    color: string;
    datasetId: string;
    createdAt: string;
    parameters: Record<string, ParameterValue>;
    runs: SeedRun[];
}

const SEED_MODELS: SeedModel[] = [
    {
        id: 'model1',
        name: 'Support Assistant',
        baseModel: 'Llama 3.1 70B',
        color: '#3498db',
        datasetId: 'ds-support',
        createdAt: '2026-09-02T09:00:00.000Z',
        parameters: { learningRate: 1e-4, batchSize: 32, epochs: 10, optimizer: 'AdamW', dropout: 0.15, useEarlyStopping: true },
        runs: [
            { seed: 11, startedAt: '2026-09-05T08:30:00.000Z', parameters: { learningRate: 3e-4, dropout: 0.05 } },
            { seed: 12, startedAt: '2026-09-18T07:45:00.000Z' }
        ]
    },
    {
        id: 'model2',
        name: 'Sentiment Classifier',
        baseModel: 'BERT Large',
        color: '#e74c3c',
        datasetId: 'ds-sentiment',
        createdAt: '2026-09-10T12:00:00.000Z',
        parameters: { learningRate: 3e-4, batchSize: 16, epochs: 12, optimizer: 'AdamW', dropout: 0.1, useEarlyStopping: true },
        runs: [
            { seed: 21, startedAt: '2026-09-12T10:00:00.000Z', parameters: { epochs: 6 } },
            { seed: 22, startedAt: '2026-09-30T08:00:00.000Z', partialEpochs: 3 }
        ]
    },
    {
        id: 'model3',
        name: 'Code Reviewer',
        baseModel: 'Mistral 7B',
        color: '#2ecc71',
        datasetId: 'ds-code',
        createdAt: '2026-08-28T15:00:00.000Z',
        parameters: { learningRate: 1.5e-4, batchSize: 24, epochs: 8, optimizer: 'Adam', dropout: 0.15, useEarlyStopping: true },
        runs: [{ seed: 31, startedAt: '2026-09-15T13:10:00.000Z' }]
    },
    {
        id: 'model4',
        name: 'Contract QA',
        baseModel: 'Qwen 2.5 14B',
        color: '#9b59b6',
        datasetId: 'ds-legal',
        createdAt: '2026-09-25T10:30:00.000Z',
        parameters: { learningRate: 1.5e-4, batchSize: 48, epochs: 12, optimizer: 'AdamW', dropout: 0.2, useEarlyStopping: false },
        runs: []
    },
    {
        id: 'model5',
        name: 'Web Knowledge Base',
        baseModel: 'Gemma 2 9B',
        color: '#f39c12',
        datasetId: 'ds-web',
        createdAt: '2026-08-20T08:00:00.000Z',
        parameters: { learningRate: 8e-3, batchSize: 64, epochs: 15, optimizer: 'SGD', dropout: 0.3, useEarlyStopping: true },
        runs: [
            { seed: 51, startedAt: '2026-08-22T06:00:00.000Z', parameters: { learningRate: 3e-4 } },
            { seed: 52, startedAt: '2026-09-10T06:00:00.000Z' }
        ]
    }
];

function buildSeedModel(seed: SeedModel, datasets: Dataset[]): Model {
    const base = BASE_MODELS.find(b => b.name === seed.baseModel) ?? BASE_MODELS[0];
    const parameters = createDefaultParameters(seed.parameters);
    const dataset = datasets.find(d => d.id === seed.datasetId);

    let model: Model = {
        id: seed.id,
        name: seed.name,
        baseModel: base.name,
        type: base.type,
        size: base.size,
        status: 'pending',
        lastUpdated: seed.createdAt,
        color: seed.color,
        datasetId: seed.datasetId,
        metrics: null,
        parameters,
        runs: []
    };

    seed.runs.forEach((seedRun, index) => {
        const runParameters = seedRun.parameters ? createDefaultParameters({ ...seed.parameters, ...seedRun.parameters }) : parameters;
        const run = createRun({
            id: `${seed.id}-run${index + 1}`,
            seed: seedRun.seed,
            startedAt: seedRun.startedAt,
            parameters: runParameters,
            size: base.size,
            datasetId: seed.datasetId,
            dataset
        });
        model = applyRun(model, simulateRun(run, seedRun.partialEpochs));
    });

    return model;
}

export function createInitialData(): { models: Model[]; datasets: Dataset[] } {
    const datasets = DATASETS.map(d => ({ ...d }));
    const models = SEED_MODELS.map(seed => buildSeedModel(seed, datasets));
    return { models, datasets };
}
