import React, { useMemo, useState } from 'react';
import styles from './ModelDetail.module.css';
import ui from './common.module.css';
import ParameterControls from './ParameterControls';
import StatusBadge from './StatusBadge';
import TrainingChart from './TrainingChart';
import { buildProfile, estimateRun, getActiveRun, parametersToRecord } from '../shared/simulation';
import { formatDate, formatDuration, formatLearningRate, formatMetric } from './utils';
import type { Dataset, Model, ParameterValue } from '../shared/types';

interface ModelDetailProps {
    models: Model[];
    datasets: Dataset[];
    model: Model | null;
    epochIntervalMs: number;
    onSelectModel: (id: string) => void;
    onParameterChange: (modelId: string, name: string, value: ParameterValue) => void;
    onResetParameters: (modelId: string) => void;
    onSetDataset: (modelId: string, datasetId: string) => void;
    onStartTraining: (modelId: string) => void;
    onCancelTraining: (modelId: string) => void;
    onDeleteModel: (modelId: string) => void;
    onAddModel: () => void;
}

type ContentProps = Omit<ModelDetailProps, 'models' | 'model' | 'onSelectModel' | 'onAddModel'> & { model: Model };

const METRICS: { key: 'accuracy' | 'loss' | 'f1' | 'precision' | 'recall'; label: string }[] = [
    { key: 'accuracy', label: 'Accuracy' },
    { key: 'loss', label: 'Validation Loss' },
    { key: 'f1', label: 'F1 Score' },
    { key: 'precision', label: 'Precision' },
    { key: 'recall', label: 'Recall' },
];

const ModelDetailContent: React.FC<ContentProps> = ({
    model,
    datasets,
    epochIntervalMs,
    onParameterChange,
    onResetParameters,
    onSetDataset,
    onStartTraining,
    onCancelTraining,
    onDeleteModel
}) => {
    // null = follow the latest run, so a newly started run shows up automatically.
    const [viewedRunId, setViewedRunId] = useState<string | null>(null);
    const isTraining = model.status === 'training';
    const activeRun = getActiveRun(model);
    const dataset = datasets.find(d => d.id === model.datasetId);
    const viewedRun = model.runs.find(r => r.id === viewedRunId) ?? model.runs[model.runs.length - 1];

    const profile = useMemo(
        () => buildProfile(parametersToRecord(model.parameters), model.size, dataset),
        [model.parameters, model.size, dataset]
    );
    const estimate = useMemo(() => estimateRun(profile), [profile]);

    const handleDelete = () => {
        if (window.confirm(`Delete "${model.name}" and its ${model.runs.length} training run(s)? This cannot be undone.`)) {
            onDeleteModel(model.id);
        }
    };

    return (
        <>
            <div className={ui.grid}>
                <div className={ui.card}>
                    <h3 className={`${ui.cardTitle} ${styles.cardTitle}`}>Model Information</h3>
                    <dl className={styles.infoList}>
                        <dt>Base model</dt>
                        <dd>{model.baseModel}</dd>
                        <dt>Architecture</dt>
                        <dd>{model.type}</dd>
                        <dt>Size</dt>
                        <dd>{model.size} parameters</dd>
                        <dt>Status</dt>
                        <dd><StatusBadge status={model.status} /></dd>
                        <dt>Last updated</dt>
                        <dd>{formatDate(model.lastUpdated, true)}</dd>
                        <dt>Training runs</dt>
                        <dd>{model.runs.length}</dd>
                        <dt><label htmlFor="model-dataset">Dataset</label></dt>
                        <dd>
                            <select
                                id="model-dataset"
                                className={`${ui.select} ${styles.datasetSelect}`}
                                value={model.datasetId}
                                onChange={(e) => onSetDataset(model.id, e.target.value)}
                                disabled={isTraining}
                            >
                                {!dataset && <option value={model.datasetId}>Unknown dataset</option>}
                                {datasets.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </dd>
                    </dl>
                </div>

                <div className={ui.card}>
                    <h3 className={`${ui.cardTitle} ${styles.cardTitle}`}>Performance Metrics</h3>
                    {model.metrics ? (
                        <div className={styles.metricsGrid}>
                            {METRICS.map(metric => (
                                <div key={metric.key}>
                                    <p className={styles.metricLabel}>{metric.label}</p>
                                    <p className={styles.metricValue}>{formatMetric(model.metrics?.[metric.key])}</p>
                                </div>
                            ))}
                            <div>
                                <p className={styles.metricLabel}>Training Time</p>
                                <p className={styles.metricValue}>{formatDuration(model.metrics.trainingTime)}</p>
                            </div>
                            <div>
                                <p className={styles.metricLabel}>Inference Latency</p>
                                <p className={styles.metricValue}>{model.metrics.inferenceSpeed} ms</p>
                            </div>
                        </div>
                    ) : (
                        <div className={ui.empty}>
                            No successful training run yet. Configure the parameters below and start training.
                        </div>
                    )}
                </div>
            </div>

            {activeRun && (
                <div className={`${ui.card} ${ui.section}`}>
                    <div className={ui.cardHeader}>
                        <h2 className={ui.cardTitle}>Training in Progress</h2>
                        <button className={`${ui.button} ${ui.danger}`} onClick={() => onCancelTraining(model.id)}>
                            Cancel Training
                        </button>
                    </div>
                    <div
                        className={ui.progress}
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={activeRun.totalEpochs}
                        aria-valuenow={activeRun.history.length}
                    >
                        <div
                            className={ui.progressBar}
                            style={{ width: `${(activeRun.history.length / activeRun.totalEpochs) * 100}%` }}
                        />
                    </div>
                    <p className={`${ui.muted} ${styles.progressText}`}>
                        Epoch {activeRun.history.length} of {activeRun.totalEpochs}
                        {' · '}about {Math.ceil(((activeRun.totalEpochs - activeRun.history.length) * epochIntervalMs) / 1000)}s left
                        {' · '}simulated {formatDuration(activeRun.profile.minutesPerEpoch * activeRun.totalEpochs)} of compute
                        {activeRun.profile.earlyStopping && ' · early stopping may finish sooner'}
                    </p>
                </div>
            )}

            <div className={`${ui.card} ${ui.section}`}>
                <div className={ui.cardHeader}>
                    <h2 className={ui.cardTitle}>Training Curves</h2>
                    {model.runs.length > 0 && (
                        <select
                            className={ui.select}
                            value={viewedRun?.id}
                            onChange={(e) => {
                                const isLatest = e.target.value === model.runs[model.runs.length - 1].id;
                                setViewedRunId(isLatest ? null : e.target.value);
                            }}
                            aria-label="Training run to display"
                        >
                            {model.runs.map((run, i) => (
                                <option key={run.id} value={run.id}>
                                    Run #{i + 1} · {run.status} · {formatDate(run.startedAt)}
                                </option>
                            )).reverse()}
                        </select>
                    )}
                </div>
                {viewedRun && viewedRun.history.length > 0 ? (
                    <>
                        <TrainingChart history={viewedRun.history} totalEpochs={viewedRun.totalEpochs} />
                        {viewedRun.message && <p className={`${ui.muted} ${ui.small}`}>{viewedRun.message}</p>}
                    </>
                ) : (
                    <div className={ui.empty}>
                        {viewedRun ? 'Waiting for the first epoch...' : 'This model has not been trained yet.'}
                    </div>
                )}
            </div>

            <div className={`${ui.card} ${ui.section}`}>
                <div className={ui.cardHeader}>
                    <h2 className={ui.cardTitle}>Fine-tuning Parameters</h2>
                    <span className={`${ui.muted} ${ui.small}`}>
                        Recommended learning rate for {model.size}: ~{formatLearningRate(profile.recommendedLearningRate)}
                    </span>
                </div>
                <ParameterControls
                    parameters={model.parameters}
                    onParameterChange={(name, value) => onParameterChange(model.id, name, value)}
                    onReset={() => onResetParameters(model.id)}
                    onStartTraining={() => onStartTraining(model.id)}
                    isTraining={isTraining}
                />
                <div className={styles.estimate}>
                    <h3 className={styles.estimateTitle}>Predicted outcome</h3>
                    <div className={styles.estimateGrid}>
                        <div>
                            <p className={styles.metricLabel}>Accuracy</p>
                            <p className={styles.estimateValue}>
                                {estimate.diverges ? 'Diverges' : `~${formatMetric(estimate.accuracy)}`}
                            </p>
                        </div>
                        <div>
                            <p className={styles.metricLabel}>Epochs</p>
                            <p className={styles.estimateValue}>~{estimate.epochs}</p>
                        </div>
                        <div>
                            <p className={styles.metricLabel}>Compute time</p>
                            <p className={styles.estimateValue}>~{formatDuration(estimate.minutes)}</p>
                        </div>
                        <div>
                            <p className={styles.metricLabel}>Inference latency</p>
                            <p className={styles.estimateValue}>{profile.latencyMs} ms</p>
                        </div>
                    </div>
                    {profile.warnings.length > 0 && (
                        <ul className={styles.warnings}>
                            {profile.warnings.map(warning => (
                                <li key={warning} className={ui.notice}>{warning}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            <div className={`${ui.card} ${ui.section}`}>
                <div className={ui.cardHeader}>
                    <h2 className={ui.cardTitle}>Run History</h2>
                </div>
                {model.runs.length === 0 ? (
                    <div className={ui.empty}>No runs yet.</div>
                ) : (
                    <div className={ui.tableContainer}>
                        <table className={ui.table}>
                            <thead>
                                <tr>
                                    <th>Run</th>
                                    <th>Started</th>
                                    <th>Status</th>
                                    <th className={ui.numeric}>Epochs</th>
                                    <th>Learning rate</th>
                                    <th className={ui.numeric}>Batch</th>
                                    <th>Optimizer</th>
                                    <th className={ui.numeric}>Dropout</th>
                                    <th className={ui.numeric}>Accuracy</th>
                                    <th className={ui.numeric}>Loss</th>
                                </tr>
                            </thead>
                            <tbody>
                                {model.runs.map((run, i) => ({ run, index: i })).reverse().map(({ run, index }) => (
                                    <tr
                                        key={run.id}
                                        className={`${styles.runRow} ${viewedRun?.id === run.id ? styles.runRowActive : ''}`}
                                        onClick={() => setViewedRunId(index === model.runs.length - 1 ? null : run.id)}
                                        title="Show this run's curves"
                                    >
                                        <td>#{index + 1}</td>
                                        <td className={styles.nowrap}>{formatDate(run.startedAt, true)}</td>
                                        <td><StatusBadge status={run.status} /></td>
                                        <td className={ui.numeric}>{run.history.length}/{run.totalEpochs}</td>
                                        <td>{typeof run.parameters.learningRate === 'number' ? formatLearningRate(run.parameters.learningRate) : '—'}</td>
                                        <td className={ui.numeric}>{String(run.parameters.batchSize ?? '—')}</td>
                                        <td>{String(run.parameters.optimizer ?? '—')}</td>
                                        <td className={ui.numeric}>{typeof run.parameters.dropout === 'number' ? run.parameters.dropout.toFixed(2) : '—'}</td>
                                        <td className={ui.numeric}>{formatMetric(run.metrics?.accuracy)}</td>
                                        <td className={ui.numeric}>{formatMetric(run.metrics?.loss)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className={`${ui.card} ${styles.dangerZone}`}>
                <div>
                    <h2 className={ui.cardTitle}>Delete model</h2>
                    <p className={`${ui.muted} ${ui.small}`}>Removes the model and its full run history.</p>
                </div>
                <button className={`${ui.button} ${ui.danger}`} onClick={handleDelete} disabled={isTraining}>
                    Delete Model
                </button>
            </div>
        </>
    );
};

const ModelDetail: React.FC<ModelDetailProps> = ({ models, model, onSelectModel, onAddModel, onStartTraining, onCancelTraining, ...rest }) => {
    if (!model) {
        return (
            <div className={ui.card}>
                <div className={ui.empty}>
                    <p>{models.length ? 'Select a model to see its details.' : 'There are no models yet.'}</p>
                    <button className={ui.button} onClick={onAddModel}>Add Model</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className={ui.pageHeader}>
                <div className={styles.titleBlock}>
                    <span className={styles.colorSwatch} style={{ backgroundColor: model.color }} />
                    <div>
                        <h1 className={ui.pageTitle}>{model.name}</h1>
                        <p className={ui.pageSubtitle}>{model.baseModel} · {model.size}</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <select
                        className={ui.select}
                        value={model.id}
                        onChange={(e) => onSelectModel(e.target.value)}
                        aria-label="Select model"
                    >
                        {models.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                    {model.status === 'training' ? (
                        <button className={`${ui.button} ${ui.danger}`} onClick={() => onCancelTraining(model.id)}>
                            Cancel Training
                        </button>
                    ) : (
                        <button className={ui.button} onClick={() => onStartTraining(model.id)}>
                            {model.runs.length > 0 ? 'Retrain' : 'Start Training'}
                        </button>
                    )}
                </div>
            </div>
            <ModelDetailContent
                key={model.id}
                model={model}
                onStartTraining={onStartTraining}
                onCancelTraining={onCancelTraining}
                {...rest}
            />
        </div>
    );
};

export default ModelDetail;
