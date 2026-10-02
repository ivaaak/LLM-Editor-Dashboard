import React, { useState } from 'react';
import styles from './Datasets.module.css';
import ui from './common.module.css';
import { formatNumber } from './utils';
import type { Dataset, Model, NewDatasetInput } from '../shared/types';

interface DatasetsProps {
    datasets: Dataset[];
    models: Model[];
    /** Rejects with an error whose message is shown in the form. */
    onAddDataset: (dataset: NewDatasetInput) => Promise<void>;
    onDeleteDataset: (id: string) => void;
}

const TASKS = ['Instruction tuning', 'Classification', 'Question answering', 'Summarization', 'Continued pretraining'];

const EMPTY_FORM = { name: '', task: TASKS[0], samples: '10000', sizeMB: '50', quality: '0.9', description: '' };

const Datasets: React.FC<DatasetsProps> = ({ datasets, models, onAddDataset, onDeleteDataset }) => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const usage = (id: string) => models.filter(m => m.datasetId === id);

    const update = (field: keyof typeof EMPTY_FORM) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [field]: e.target.value });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const name = form.name.trim();
        const samples = parseInt(form.samples, 10);
        const sizeMB = parseFloat(form.sizeMB);
        const quality = parseFloat(form.quality);
        if (!name) return setError('Name is required.');
        if (datasets.some(d => d.name.toLowerCase() === name.toLowerCase())) return setError('A dataset with this name already exists.');
        if (!Number.isFinite(samples) || samples < 100) return setError('Samples must be at least 100.');
        if (!Number.isFinite(sizeMB) || sizeMB <= 0) return setError('Size must be a positive number.');
        if (!Number.isFinite(quality) || quality < 0 || quality > 1) return setError('Quality must be between 0 and 1.');

        setSubmitting(true);
        try {
            await onAddDataset({ name, task: form.task, samples, sizeMB, quality, description: form.description.trim() });
            setForm(EMPTY_FORM);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className={ui.pageHeader}>
                <div>
                    <h1 className={ui.pageTitle}>Datasets</h1>
                    <p className={ui.pageSubtitle}>Training data available for fine-tuning. Size and quality affect training time and accuracy.</p>
                </div>
            </div>

            <div className={`${ui.card} ${ui.section}`}>
                <div className={ui.tableContainer}>
                    <table className={ui.table}>
                        <thead>
                            <tr>
                                <th className={styles.nameColumn}>Name</th>
                                <th>Task</th>
                                <th className={ui.numeric}>Samples</th>
                                <th className={ui.numeric}>Size</th>
                                <th>Quality</th>
                                <th>Used by</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {datasets.map(dataset => {
                                const usedBy = usage(dataset.id);
                                return (
                                    <tr key={dataset.id}>
                                        <td>
                                            <div className={styles.name}>{dataset.name}</div>
                                            {dataset.description && <div className={`${ui.muted} ${ui.small}`}>{dataset.description}</div>}
                                        </td>
                                        <td className={styles.nowrap}>{dataset.task}</td>
                                        <td className={ui.numeric}>{formatNumber(dataset.samples)}</td>
                                        <td className={`${ui.numeric} ${styles.nowrap}`}>
                                            {dataset.sizeMB >= 1000 ? `${(dataset.sizeMB / 1000).toFixed(1)} GB` : `${dataset.sizeMB} MB`}
                                        </td>
                                        <td>
                                            <div className={styles.quality}>
                                                <div className={ui.progress} style={{ flex: 1 }}>
                                                    <div className={ui.progressBar} style={{ width: `${dataset.quality * 100}%` }} />
                                                </div>
                                                <span className={ui.small}>{Math.round(dataset.quality * 100)}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            {usedBy.length === 0 ? (
                                                <span className={ui.muted}>—</span>
                                            ) : (
                                                <div className={styles.usedBy}>
                                                    {usedBy.map(m => (
                                                        <span key={m.id} className={ui.nameCell}>
                                                            <span className={ui.colorDot} style={{ backgroundColor: m.color }} />
                                                            {m.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <button
                                                className={`${ui.button} ${ui.small} ${ui.secondary}`}
                                                onClick={() => onDeleteDataset(dataset.id)}
                                                disabled={usedBy.length > 0}
                                                title={usedBy.length > 0 ? 'Datasets in use by a model cannot be deleted' : 'Delete dataset'}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {datasets.length === 0 && <div className={ui.empty}>No datasets yet.</div>}
                </div>
            </div>

            <form className={ui.card} onSubmit={handleSubmit} noValidate>
                <h2 className={`${ui.cardTitle} ${styles.formTitle}`}>Register a dataset</h2>
                <div className={styles.formGrid}>
                    <label className={ui.field}>
                        Name
                        <input className={ui.input} value={form.name} onChange={update('name')} required />
                    </label>
                    <label className={ui.field}>
                        Task
                        <select className={ui.select} value={form.task} onChange={update('task')}>
                            {TASKS.map(task => <option key={task}>{task}</option>)}
                        </select>
                    </label>
                    <label className={ui.field}>
                        Samples
                        <input className={ui.input} type="number" min={100} step={100} value={form.samples} onChange={update('samples')} />
                    </label>
                    <label className={ui.field}>
                        Size (MB)
                        <input className={ui.input} type="number" min={1} value={form.sizeMB} onChange={update('sizeMB')} />
                    </label>
                    <label className={ui.field}>
                        Quality (0-1)
                        <input className={ui.input} type="number" min={0} max={1} step={0.01} value={form.quality} onChange={update('quality')} />
                    </label>
                    <label className={`${ui.field} ${styles.wide}`}>
                        Description
                        <input className={ui.input} value={form.description} onChange={update('description')} />
                    </label>
                </div>
                {error && <p className={ui.notice} role="alert">{error}</p>}
                <div className={styles.formActions}>
                    <button type="submit" className={ui.button} disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add Dataset'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Datasets;
