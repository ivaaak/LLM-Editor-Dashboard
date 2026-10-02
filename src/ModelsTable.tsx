import React, { useMemo, useState } from 'react';
import styles from './ModelsTable.module.css';
import ui from './common.module.css';
import StatusBadge from './StatusBadge';
import { getActiveRun, parseSizeInBillions } from '../shared/simulation';
import { formatDate, formatMetric } from './utils';
import type { Dataset, Model, ModelStatus } from '../shared/types';

interface ModelsTableProps {
    models: Model[];
    datasets: Dataset[];
    selectedModelId: string | null;
    onSelectModel: (id: string) => void;
    onOpenDetails: (id: string) => void;
    onStartTraining: (id: string) => void;
    onCancelTraining: (id: string) => void;
}

type SortKey = 'name' | 'size' | 'status' | 'accuracy' | 'loss' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

const STATUS_ORDER: Record<ModelStatus, number> = { training: 0, trained: 1, pending: 2, failed: 3 };

const COLUMNS: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: 'name', label: 'Name' },
    { key: 'size', label: 'Size', numeric: true },
    { key: 'status', label: 'Status' },
    { key: 'accuracy', label: 'Accuracy', numeric: true },
    { key: 'loss', label: 'Loss', numeric: true },
    { key: 'lastUpdated', label: 'Updated' },
];

function sortValue(model: Model, key: SortKey): string | number | null {
    switch (key) {
        case 'name': return model.name.toLowerCase();
        case 'size': return parseSizeInBillions(model.size);
        case 'status': return STATUS_ORDER[model.status];
        case 'accuracy': return model.metrics?.accuracy ?? null;
        case 'loss': return model.metrics?.loss ?? null;
        case 'lastUpdated': return new Date(model.lastUpdated).getTime();
    }
}

const ModelsTable: React.FC<ModelsTableProps> = ({
    models,
    datasets,
    selectedModelId,
    onSelectModel,
    onOpenDetails,
    onStartTraining,
    onCancelTraining
}) => {
    const [query, setQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ModelStatus | 'all'>('all');
    const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({ key: 'name', direction: 'asc' });

    const visibleModels = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = models.filter(model =>
            (statusFilter === 'all' || model.status === statusFilter) &&
            (!q || model.name.toLowerCase().includes(q) || model.baseModel.toLowerCase().includes(q))
        );
        return filtered.sort((a, b) => {
            const av = sortValue(a, sort.key);
            const bv = sortValue(b, sort.key);
            // Models without a value (e.g. never trained) always go last.
            if (av === null) return bv === null ? 0 : 1;
            if (bv === null) return -1;
            const result = av < bv ? -1 : av > bv ? 1 : 0;
            return sort.direction === 'asc' ? result : -result;
        });
    }, [models, query, statusFilter, sort]);

    const toggleSort = (key: SortKey) => {
        setSort(prev => prev.key === key
            ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
            : { key, direction: key === 'accuracy' || key === 'lastUpdated' ? 'desc' : 'asc' });
    };

    const datasetName = (id: string) => datasets.find(d => d.id === id)?.name ?? 'Unknown dataset';

    return (
        <>
            <div className={styles.toolbar}>
                <input
                    type="search"
                    className={`${ui.input} ${styles.search}`}
                    placeholder="Search by name or base model..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    aria-label="Search models"
                />
                <select
                    className={ui.select}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as ModelStatus | 'all')}
                    aria-label="Filter by status"
                >
                    <option value="all">All statuses</option>
                    <option value="training">Training</option>
                    <option value="trained">Trained</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                </select>
            </div>
            <div className={ui.tableContainer}>
                <table className={ui.table}>
                    <thead>
                        <tr>
                            {COLUMNS.map(column => (
                                <th
                                    key={column.key}
                                    className={column.numeric ? ui.numeric : undefined}
                                    aria-sort={sort.key === column.key ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                                >
                                    <button className={styles.sortButton} onClick={() => toggleSort(column.key)}>
                                        {column.label}
                                        <span className={styles.sortIndicator} aria-hidden="true">
                                            {sort.key === column.key ? (sort.direction === 'asc' ? '▲' : '▼') : ''}
                                        </span>
                                    </button>
                                </th>
                            ))}
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {visibleModels.map(model => {
                            const activeRun = getActiveRun(model);
                            return (
                                <tr
                                    key={model.id}
                                    className={`${styles.tableRow} ${selectedModelId === model.id ? styles.selected : ''}`}
                                    onClick={() => onSelectModel(model.id)}
                                >
                                    <td>
                                        <div className={ui.nameCell}>
                                            <span className={ui.colorDot} style={{ backgroundColor: model.color }} />
                                            <div>
                                                <div className={styles.modelName}>{model.name}</div>
                                                <div className={`${ui.muted} ${ui.small}`}>
                                                    {model.baseModel} · {datasetName(model.datasetId)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={ui.numeric}>{model.size}</td>
                                    <td>
                                        <StatusBadge status={model.status} />
                                        {activeRun && (
                                            <div className={`${ui.muted} ${ui.small}`}>
                                                epoch {activeRun.history.length}/{activeRun.totalEpochs}
                                            </div>
                                        )}
                                    </td>
                                    <td className={ui.numeric}>{formatMetric(model.metrics?.accuracy)}</td>
                                    <td className={ui.numeric}>{formatMetric(model.metrics?.loss)}</td>
                                    <td className={styles.nowrap}>{formatDate(model.lastUpdated)}</td>
                                    <td>
                                        <div className={styles.actions}>
                                            {model.status === 'training' ? (
                                                <button
                                                    className={`${ui.button} ${ui.small} ${ui.danger}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCancelTraining(model.id);
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                            ) : (
                                                <button
                                                    className={`${ui.button} ${ui.small}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onSelectModel(model.id);
                                                        onStartTraining(model.id);
                                                    }}
                                                >
                                                    {model.runs.length > 0 ? 'Retrain' : 'Train'}
                                                </button>
                                            )}
                                            <button
                                                className={`${ui.button} ${ui.small} ${ui.secondary}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenDetails(model.id);
                                                }}
                                            >
                                                Details
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {visibleModels.length === 0 && (
                    <div className={ui.empty}>
                        {models.length === 0 ? 'No models yet. Use "Add Model" to create one.' : 'No models match your filters.'}
                    </div>
                )}
            </div>
        </>
    );
};

export default ModelsTable;
