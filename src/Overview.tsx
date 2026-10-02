import React, { useMemo } from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styles from './Overview.module.css';
import ui from './common.module.css';
import ModelsTable from './ModelsTable';
import { legendStyle, tooltipContentStyle, tooltipLabelStyle } from './chartStyles';
import { getLatestUsefulRun } from '../shared/simulation';
import { formatMetric } from './utils';
import type { Dataset, EpochPoint, Model } from '../shared/types';

interface OverviewProps {
    models: Model[];
    datasets: Dataset[];
    selectedModelId: string | null;
    onSelectModel: (id: string) => void;
    onOpenDetails: (id: string) => void;
    onStartTraining: (id: string) => void;
    onCancelTraining: (id: string) => void;
}

type CurveRow = { epoch: number; [modelId: string]: number };

/** Merges the latest run of every model into one row per epoch, keyed by model id. */
function buildCurves(models: Model[], key: keyof Omit<EpochPoint, 'epoch'>) {
    const series = models
        .map(model => ({ model, run: getLatestUsefulRun(model) }))
        .filter((s): s is { model: Model; run: NonNullable<typeof s.run> } => s.run !== undefined);
    const length = Math.max(0, ...series.map(s => s.run.history.length));
    const rows: CurveRow[] = Array.from({ length }, (_, i) => {
        const row: CurveRow = { epoch: i + 1 };
        series.forEach(({ model, run }) => {
            const point = run.history[i];
            if (point) row[model.id] = point[key];
        });
        return row;
    });
    return { rows, series: series.map(s => s.model) };
}

const Overview: React.FC<OverviewProps> = ({
    models,
    datasets,
    selectedModelId,
    onSelectModel,
    onOpenDetails,
    onStartTraining,
    onCancelTraining
}) => {
    const lossCurves = useMemo(() => buildCurves(models, 'valLoss'), [models]);
    const accuracyCurves = useMemo(() => buildCurves(models, 'accuracy'), [models]);

    const trainingCount = models.filter(m => m.status === 'training').length;
    const trainedCount = models.filter(m => m.status === 'trained').length;
    const failedCount = models.filter(m => m.status === 'failed').length;
    const bestModel = models
        .filter(m => m.metrics)
        .reduce<Model | null>((best, m) => (!best || m.metrics!.accuracy > best.metrics!.accuracy ? m : best), null);

    const renderCurveChart = (curves: ReturnType<typeof buildCurves>, accuracy: boolean) => {
        if (curves.series.length === 0) {
            return <div className={ui.empty}>No training runs yet.</div>;
        }
        return (
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={curves.rows} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="epoch" type="number" domain={[1, 'dataMax']} allowDecimals={false} />
                    <YAxis
                        domain={accuracy ? [0, 1] : [0, 'auto']}
                        tickFormatter={(v: number) => v.toFixed(accuracy ? 1 : 2)}
                    />
                    <Tooltip
                        contentStyle={tooltipContentStyle}
                        labelStyle={tooltipLabelStyle}
                        labelFormatter={(epoch) => `Epoch ${epoch}`}
                        formatter={(value: number) => value.toFixed(accuracy ? 3 : 4)}
                    />
                    <Legend wrapperStyle={legendStyle} />
                    {curves.series.map(model => (
                        <Line
                            key={model.id}
                            type="monotone"
                            dataKey={model.id}
                            name={model.name}
                            stroke={model.color}
                            strokeWidth={model.id === selectedModelId ? 3 : 2}
                            dot={false}
                            activeDot={{ r: 5 }}
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        );
    };

    return (
        <>
            <div className={ui.pageHeader}>
                <div>
                    <h1 className={ui.pageTitle}>AI Model Fine-Tuning Dashboard</h1>
                    <p className={ui.pageSubtitle}>Monitor and adjust your models' training parameters</p>
                </div>
            </div>

            <div className={styles.metricsCards}>
                <div className={styles.metricCard}>
                    <h3>Models</h3>
                    <div className={styles.metricValue}>{models.length}</div>
                    <div className={styles.metricHint}>{datasets.length} datasets available</div>
                </div>
                <div className={styles.metricCard}>
                    <h3>Training</h3>
                    <div className={styles.metricValue}>{trainingCount}</div>
                    <div className={styles.metricHint}>{trainingCount ? 'Runs in progress' : 'No active runs'}</div>
                </div>
                <div className={styles.metricCard}>
                    <h3>Completed</h3>
                    <div className={styles.metricValue}>{trainedCount}</div>
                    <div className={styles.metricHint}>{failedCount ? `${failedCount} failed` : 'No failures'}</div>
                </div>
                <div className={styles.metricCard}>
                    <h3>Best Accuracy</h3>
                    <div className={styles.metricValue}>{formatMetric(bestModel?.metrics?.accuracy)}</div>
                    <div className={styles.metricHint}>{bestModel ? bestModel.name : 'No trained models'}</div>
                </div>
            </div>

            <div className={ui.grid}>
                <div className={ui.card}>
                    <div className={ui.cardHeader}>
                        <h2 className={ui.cardTitle}>Validation Loss</h2>
                        <span className={`${ui.muted} ${ui.small}`}>Latest run per model</span>
                    </div>
                    {renderCurveChart(lossCurves, false)}
                </div>
                <div className={ui.card}>
                    <div className={ui.cardHeader}>
                        <h2 className={ui.cardTitle}>Validation Accuracy</h2>
                        <span className={`${ui.muted} ${ui.small}`}>Latest run per model</span>
                    </div>
                    {renderCurveChart(accuracyCurves, true)}
                </div>
            </div>

            <div className={ui.card}>
                <div className={ui.cardHeader}>
                    <h2 className={ui.cardTitle}>Models</h2>
                </div>
                <ModelsTable
                    models={models}
                    datasets={datasets}
                    selectedModelId={selectedModelId}
                    onSelectModel={onSelectModel}
                    onOpenDetails={onOpenDetails}
                    onStartTraining={onStartTraining}
                    onCancelTraining={onCancelTraining}
                />
            </div>
        </>
    );
};

export default Overview;
