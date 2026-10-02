import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import styles from './PerformanceComparison.module.css';
import ui from './common.module.css';
import { legendStyle, tooltipContentStyle, tooltipLabelStyle } from './chartStyles';
import { downloadFile, formatDuration, formatMetric, toCsv } from './utils';
import type { Model, ModelMetrics } from '../shared/types';

interface PerformanceComparisonProps {
  models: Model[];
}

type MetricKey = keyof ModelMetrics;
type ComparableModel = Model & { metrics: ModelMetrics };

const METRIC_OPTIONS: { value: MetricKey; label: string; lowerIsBetter?: boolean }[] = [
  { value: 'accuracy', label: 'Accuracy' },
  { value: 'f1', label: 'F1 Score' },
  { value: 'precision', label: 'Precision' },
  { value: 'recall', label: 'Recall' },
  { value: 'loss', label: 'Loss', lowerIsBetter: true },
  { value: 'trainingTime', label: 'Training Time (min)', lowerIsBetter: true },
  { value: 'inferenceSpeed', label: 'Inference Latency (ms)', lowerIsBetter: true }
];

const formatValue = (key: MetricKey, value: number) =>
  key === 'trainingTime' ? formatDuration(value) : key === 'inferenceSpeed' ? `${value} ms` : formatMetric(value);

const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({ models }) => {
  const comparable = useMemo(
    () => models.filter((m): m is ComparableModel => m.metrics !== null),
    [models]
  );
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('accuracy');
  // null until the user changes the selection, so newly trained models are included by default.
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  const effectiveIds = selectedIds ?? comparable.slice(0, 4).map(m => m.id);
  const filteredModels = comparable.filter(m => effectiveIds.includes(m.id));
  const metricOption = METRIC_OPTIONS.find(m => m.value === selectedMetric)!;

  const toggleModelSelection = (modelId: string) => {
    setSelectedIds(effectiveIds.includes(modelId)
      ? effectiveIds.filter(id => id !== modelId)
      : [...effectiveIds, modelId]);
  };

  const barData = filteredModels.map(model => ({
    name: model.name,
    value: model.metrics[selectedMetric],
    color: model.color
  }));

  // Latency is inverted into a 0..1 "speed" score relative to the fastest compared model.
  const fastest = Math.min(...filteredModels.map(m => m.metrics.inferenceSpeed));
  const radarAxes: { label: string; score: (m: ModelMetrics) => number }[] = [
    { label: 'Accuracy', score: m => m.accuracy },
    { label: 'F1 Score', score: m => m.f1 },
    { label: 'Precision', score: m => m.precision },
    { label: 'Recall', score: m => m.recall },
    { label: 'Speed', score: m => fastest / m.inferenceSpeed }
  ];
  const radarData = radarAxes.map(axis => {
    const row: { metric: string; [modelId: string]: number | string } = { metric: axis.label };
    filteredModels.forEach(model => {
      row[model.id] = Number(axis.score(model.metrics).toFixed(4));
    });
    return row;
  });

  const bestByMetric = Object.fromEntries(METRIC_OPTIONS.map(option => {
    const values = filteredModels.map(m => m.metrics[option.value]);
    return [option.value, values.length ? (option.lowerIsBetter ? Math.min(...values) : Math.max(...values)) : null];
  })) as Record<MetricKey, number | null>;

  const exportCsv = () => {
    const header = ['Model', 'Base model', 'Size', ...METRIC_OPTIONS.map(o => o.label)];
    const rows = filteredModels.map(m => [m.name, m.baseModel, m.size, ...METRIC_OPTIONS.map(o => m.metrics[o.value])]);
    downloadFile('model-comparison.csv', toCsv([header, ...rows]));
  };

  if (comparable.length === 0) {
    return (
      <div>
        <h1 className={ui.pageTitle}>Model Performance Comparison</h1>
        <div className={ui.card}>
          <div className={ui.empty}>No model has finished training yet. Train a model to compare results.</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={ui.pageHeader}>
        <div>
          <h1 className={ui.pageTitle}>Model Performance Comparison</h1>
          <p className={ui.pageSubtitle}>Metrics from each model's most recent successful run</p>
        </div>
        <button className={`${ui.button} ${ui.secondary}`} onClick={exportCsv} disabled={filteredModels.length === 0}>
          Export CSV
        </button>
      </div>

      <div className={`${ui.card} ${styles.controlPanel}`}>
        <div className={styles.metricSelector}>
          <label htmlFor="comparison-metric" className={styles.controlTitle}>Metric for bar chart</label>
          <select
            id="comparison-metric"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as MetricKey)}
            className={`${ui.select} ${styles.selectControl}`}
          >
            {METRIC_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <fieldset className={styles.modelSelector}>
          <legend className={styles.controlTitle}>Models to compare</legend>
          <div className={styles.modelCheckboxes}>
            {models.map(model => (
              <label
                key={model.id}
                className={`${styles.modelCheckboxLabel} ${model.metrics ? '' : styles.disabled}`}
                title={model.metrics ? undefined : 'No completed training run yet'}
              >
                <input
                  type="checkbox"
                  checked={effectiveIds.includes(model.id) && model.metrics !== null}
                  onChange={() => toggleModelSelection(model.id)}
                  disabled={!model.metrics}
                />
                <span className={ui.colorDot} style={{ backgroundColor: model.color }} />
                {model.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {filteredModels.length === 0 ? (
        <div className={ui.card}>
          <div className={ui.empty}>Select at least one model to compare.</div>
        </div>
      ) : (
        <>
          <div className={ui.grid}>
            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <h2 className={ui.cardTitle}>Comparison by {metricOption.label}</h2>
                {metricOption.lowerIsBetter && <span className={`${ui.muted} ${ui.small}`}>Lower is better</span>}
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value: number) => [formatValue(selectedMetric, value), metricOption.label]}
                  />
                  <Bar dataKey="value" name={metricOption.label} radius={[4, 4, 0, 0]} maxBarSize={64}>
                    {barData.map(entry => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={ui.card}>
              <div className={ui.cardHeader}>
                <h2 className={ui.cardTitle}>Multi-dimensional Comparison</h2>
                <span className={`${ui.muted} ${ui.small}`}>Speed is relative to the fastest model</span>
              </div>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart outerRadius="70%" data={radarData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="metric" />
                  <PolarRadiusAxis angle={90} domain={[0, 1]} tickCount={6} tick={{ fontSize: 10 }} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipContentStyle}
                    labelStyle={tooltipLabelStyle}
                    formatter={(value: number) => value.toFixed(3)}
                  />
                  {filteredModels.map(model => (
                    <Radar
                      key={model.id}
                      name={model.name}
                      dataKey={model.id}
                      stroke={model.color}
                      fill={model.color}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend wrapperStyle={legendStyle} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={ui.card}>
            <div className={ui.cardHeader}>
              <h2 className={ui.cardTitle}>Detailed Metrics Comparison</h2>
              <span className={`${ui.muted} ${ui.small}`}>Best value per column in bold</span>
            </div>
            <div className={ui.tableContainer}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>Model</th>
                    {METRIC_OPTIONS.map(option => (
                      <th key={option.value} className={ui.numeric}>{option.label.replace(/ \(.*\)$/, '')}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredModels.map(model => (
                    <tr key={model.id}>
                      <td>
                        <div className={ui.nameCell}>
                          <span className={ui.colorDot} style={{ backgroundColor: model.color }} />
                          {model.name}
                        </div>
                      </td>
                      {METRIC_OPTIONS.map(option => {
                        const value = model.metrics[option.value];
                        return (
                          <td
                            key={option.value}
                            className={`${ui.numeric} ${filteredModels.length > 1 && value === bestByMetric[option.value] ? styles.best : ''}`}
                          >
                            {formatValue(option.value, value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PerformanceComparison;
