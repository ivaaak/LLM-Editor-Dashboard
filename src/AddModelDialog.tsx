import React, { useEffect, useRef, useState } from 'react';
import styles from './AddModelDialog.module.css';
import ui from './common.module.css';
import { BASE_MODELS, MODEL_COLORS } from '../shared/seed';
import type { Dataset, NewModelInput } from '../shared/types';

interface AddModelDialogProps {
    open: boolean;
    datasets: Dataset[];
    existingNames: string[];
    usedColors: string[];
    onClose: () => void;
    /** Rejects with an error whose message is shown in the form. */
    onCreate: (input: NewModelInput) => Promise<void>;
}

const AddModelDialog: React.FC<AddModelDialogProps> = ({ open, datasets, existingNames, usedColors, onClose, onCreate }) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [name, setName] = useState('');
    const [baseModelName, setBaseModelName] = useState(BASE_MODELS[0].name);
    const [datasetId, setDatasetId] = useState('');
    const [color, setColor] = useState(MODEL_COLORS[0]);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        if (!dialog) return;
        if (open && !dialog.open) {
            // Reset the form each time the dialog opens.
            setName('');
            setBaseModelName(BASE_MODELS[0].name);
            setDatasetId(datasets[0]?.id ?? '');
            setColor(MODEL_COLORS.find(c => !usedColors.includes(c)) ?? MODEL_COLORS[0]);
            setError(null);
            setSubmitting(false);
            dialog.showModal();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    }, [open, datasets, usedColors]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return setError('Please enter a name.');
        if (existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase())) return setError('A model with this name already exists.');
        if (!datasetId) return setError('Add a dataset first on the Datasets page.');
        setSubmitting(true);
        try {
            await onCreate({ name: trimmed, baseModelName, datasetId, color });
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <dialog
            ref={dialogRef}
            className={styles.dialog}
            onClose={onClose}
            onClick={(e) => {
                // Clicking the backdrop (the dialog element itself) closes it.
                if (e.target === dialogRef.current) onClose();
            }}
            aria-labelledby="add-model-title"
        >
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
                <h2 id="add-model-title" className={styles.title}>Add Model</h2>

                <label className={ui.field}>
                    Name
                    <input
                        className={ui.input}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Support Assistant v2"
                        autoFocus
                    />
                </label>

                <label className={ui.field}>
                    Base model
                    <select className={ui.select} value={baseModelName} onChange={(e) => setBaseModelName(e.target.value)}>
                        {BASE_MODELS.map(base => (
                            <option key={base.name} value={base.name}>{base.name} ({base.size}, {base.type})</option>
                        ))}
                    </select>
                </label>

                <label className={ui.field}>
                    Dataset
                    <select className={ui.select} value={datasetId} onChange={(e) => setDatasetId(e.target.value)}>
                        {datasets.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </label>

                <fieldset className={styles.colors}>
                    <legend className={styles.colorsLegend}>Colour</legend>
                    {MODEL_COLORS.map(c => (
                        <label key={c} className={styles.colorOption} title={c}>
                            <input
                                type="radio"
                                name="model-color"
                                value={c}
                                checked={color === c}
                                onChange={() => setColor(c)}
                                aria-label={c}
                            />
                            <span className={styles.swatch} style={{ backgroundColor: c }} />
                        </label>
                    ))}
                </fieldset>

                {error && <p className={ui.notice} role="alert">{error}</p>}

                <div className={styles.actions}>
                    <button type="button" className={`${ui.button} ${ui.secondary}`} onClick={onClose}>Cancel</button>
                    <button type="submit" className={ui.button} disabled={submitting}>
                        {submitting ? 'Creating...' : 'Create Model'}
                    </button>
                </div>
            </form>
        </dialog>
    );
};

export default AddModelDialog;
