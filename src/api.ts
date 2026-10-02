// api.ts
import type {
    DashboardSnapshot,
    Model,
    NewDatasetInput,
    NewModelInput,
    ParameterValue,
    SimulationSettings
} from '../shared/types';

export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message);
    }
}

async function request<T = DashboardSnapshot>(method: string, path: string, body?: unknown): Promise<T> {
    let response: Response;
    try {
        response = await fetch(`/api${path}`, {
            method,
            headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
            body: body === undefined ? undefined : JSON.stringify(body)
        });
    } catch {
        throw new ApiError(0, 'Cannot reach the API server.');
    }
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload ? String(payload.error) : null;
        throw new ApiError(response.status, message ?? `Request failed (${response.status}).`);
    }
    return payload as T;
}

const segment = encodeURIComponent;

export const api = {
    eventsUrl: '/api/events',
    createModel: (input: NewModelInput) =>
        request<{ model: Model; snapshot: DashboardSnapshot }>('POST', '/models', input),
    deleteModel: (id: string) => request('DELETE', `/models/${segment(id)}`),
    setModelDataset: (id: string, datasetId: string) => request('PATCH', `/models/${segment(id)}`, { datasetId }),
    updateParameter: (id: string, name: string, value: ParameterValue) =>
        request('PUT', `/models/${segment(id)}/parameters/${segment(name)}`, { value }),
    resetParameters: (id: string) => request('POST', `/models/${segment(id)}/parameters/reset`),
    startTraining: (id: string) => request('POST', `/models/${segment(id)}/train`),
    cancelTraining: (id: string) => request('POST', `/models/${segment(id)}/cancel`),
    addDataset: (input: NewDatasetInput) => request('POST', '/datasets', input),
    deleteDataset: (id: string) => request('DELETE', `/datasets/${segment(id)}`),
    updateSimulation: (settings: SimulationSettings) => request('PATCH', '/settings', settings),
    resetDemoData: () => request('POST', '/reset')
};
