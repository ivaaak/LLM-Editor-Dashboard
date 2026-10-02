// useDashboard.ts
// Keeps the dashboard in sync with the API: the server pushes a full snapshot over Server-Sent Events after
// every change, and mutations also return the new snapshot. Parameter edits are applied optimistically and
// sent after a short debounce so dragging a slider does not flood the server.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import type { DashboardSnapshot, Model, NewDatasetInput, NewModelInput, ParameterValue } from '../shared/types';

const PARAMETER_DEBOUNCE_MS = 250;
// The server sends a heartbeat every 10s; a stream silent for longer than this is treated as dead.
const STALE_STREAM_MS = 25000;
const MAX_RETRY_DELAY_MS = 10000;

type Overrides = Record<string, { modelId: string; name: string; value: ParameterValue }>;

const overrideKey = (modelId: string, name: string) => `${modelId}\u0000${name}`;
const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

export function useDashboard() {
    const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
    const [connected, setConnected] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    const [overrides, setOverrides] = useState<Overrides>({});
    const versionRef = useRef(-Infinity);
    const timers = useRef(new Map<string, number>());

    const accept = useCallback((next: DashboardSnapshot) => {
        // Responses and pushed events can arrive out of order; keep the newest.
        if (next.version < versionRef.current) return;
        versionRef.current = next.version;
        setSnapshot(next);
    }, []);

    // Event stream with our own reconnect logic: EventSource gives up for good after an HTTP error, and a
    // proxy (like Vite's in development) can keep a dead stream open, so we also watch for the heartbeat.
    useEffect(() => {
        let source: EventSource | null = null;
        let retryTimer: number | undefined;
        let lastEventAt = Date.now();
        let attempt = 0;
        let reconnecting = false;

        const scheduleReconnect = () => {
            source?.close();
            reconnecting = true;
            window.clearTimeout(retryTimer);
            retryTimer = window.setTimeout(connect, Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt++));
        };

        function connect() {
            source?.close();
            reconnecting = false;
            lastEventAt = Date.now();
            source = new EventSource(api.eventsUrl);
            source.addEventListener('state', (event) => {
                lastEventAt = Date.now();
                attempt = 0;
                accept(JSON.parse((event as MessageEvent<string>).data) as DashboardSnapshot);
                setConnected(true);
            });
            source.addEventListener('ping', () => {
                lastEventAt = Date.now();
            });
            source.onerror = () => {
                setConnected(false);
                if (source?.readyState === EventSource.CLOSED) scheduleReconnect();
            };
        }

        const watchdog = window.setInterval(() => {
            if (!reconnecting && Date.now() - lastEventAt > STALE_STREAM_MS) {
                setConnected(false);
                scheduleReconnect();
            }
        }, 5000);

        connect();
        return () => {
            source?.close();
            window.clearTimeout(retryTimer);
            window.clearInterval(watchdog);
        };
    }, [accept]);

    useEffect(() => {
        const pending = timers.current;
        return () => pending.forEach(id => window.clearTimeout(id));
    }, []);

    /** Runs a mutation, applies the returned snapshot and reports failures in the error banner. */
    const mutate = useCallback(async (action: () => Promise<DashboardSnapshot>): Promise<boolean> => {
        try {
            accept(await action());
            setActionError(null);
            return true;
        } catch (error) {
            setActionError(messageOf(error));
            return false;
        }
    }, [accept]);

    const clearOverrides = useCallback((predicate: (key: string) => boolean) => {
        timers.current.forEach((id, key) => {
            if (!predicate(key)) return;
            window.clearTimeout(id);
            timers.current.delete(key);
        });
        setOverrides(prev => Object.fromEntries(Object.entries(prev).filter(([key]) => !predicate(key))));
    }, []);

    const updateParameter = useCallback((modelId: string, name: string, value: ParameterValue) => {
        const key = overrideKey(modelId, name);
        setOverrides(prev => ({ ...prev, [key]: { modelId, name, value } }));
        window.clearTimeout(timers.current.get(key));
        timers.current.set(key, window.setTimeout(async () => {
            timers.current.delete(key);
            await mutate(() => api.updateParameter(modelId, name, value));
            // Drop the optimistic value unless the user has changed it again in the meantime.
            setOverrides(prev => {
                if (prev[key]?.value !== value || timers.current.has(key)) return prev;
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }, PARAMETER_DEBOUNCE_MS));
    }, [mutate]);

    const models = useMemo<Model[]>(() => {
        const list = snapshot?.models ?? [];
        const pending = Object.values(overrides);
        if (pending.length === 0) return list;
        return list.map(model => {
            const own = pending.filter(o => o.modelId === model.id);
            if (own.length === 0 || model.status === 'training') return model;
            return {
                ...model,
                parameters: model.parameters.map(p => {
                    const override = own.find(o => o.name === p.name);
                    return override ? { ...p, value: override.value } : p;
                })
            };
        });
    }, [snapshot, overrides]);

    const actions = useMemo(() => ({
        startTraining: (id: string) => mutate(() => api.startTraining(id)),
        cancelTraining: (id: string) => mutate(() => api.cancelTraining(id)),
        deleteModel: (id: string) => mutate(() => api.deleteModel(id)),
        setModelDataset: (id: string, datasetId: string) => mutate(() => api.setModelDataset(id, datasetId)),
        updateParameter,
        resetParameters: (id: string) => {
            clearOverrides(key => key.startsWith(`${id}\u0000`));
            return mutate(() => api.resetParameters(id));
        },
        deleteDataset: (id: string) => mutate(() => api.deleteDataset(id)),
        setEpochInterval: (epochIntervalMs: number) => mutate(() => api.updateSimulation({ epochIntervalMs })),
        resetDemoData: () => {
            clearOverrides(() => true);
            return mutate(() => api.resetDemoData());
        },
        /** Resolves to the new model's id, or throws with a message suitable for the form. */
        createModel: async (input: NewModelInput): Promise<string> => {
            const result = await api.createModel(input);
            accept(result.snapshot);
            return result.model.id;
        },
        /** Throws with a message suitable for the form. */
        addDataset: async (input: NewDatasetInput): Promise<void> => {
            accept(await api.addDataset(input));
        },
        dismissError: () => setActionError(null)
    }), [accept, clearOverrides, mutate, updateParameter]);

    return {
        loaded: snapshot !== null,
        connected,
        actionError,
        models,
        datasets: snapshot?.datasets ?? [],
        simulation: snapshot?.simulation ?? { epochIntervalMs: 800 },
        actions
    };
}
