import React, { useState } from 'react';
import styles from './ParameterControls.module.css';
import ui from './common.module.css';
import { formatParameterValue } from './utils';
import type { ModelParameter, ParameterValue } from '../shared/types';

interface ParameterControlsProps {
    parameters: ModelParameter[];
    onParameterChange: (name: string, value: ParameterValue) => void;
    onReset: () => void;
    onStartTraining: () => void;
    isTraining: boolean;
}

const LOG_STEPS = 1000;

/** Maps a log-scale value to a slider position in [0, LOG_STEPS] and back. */
const toLogPosition = (value: number, min: number, max: number) =>
    Math.round((Math.log(value / min) / Math.log(max / min)) * LOG_STEPS);
const fromLogPosition = (position: number, min: number, max: number) =>
    Number((min * Math.pow(max / min, position / LOG_STEPS)).toPrecision(2));

interface NumberInputProps {
    param: ModelParameter;
    disabled: boolean;
    onCommit: (value: number) => void;
}

/** Keeps a local draft so the field can be empty while typing; commits a clamped value on blur/Enter. */
const NumberInput: React.FC<NumberInputProps> = ({ param, disabled, onCommit }) => {
    const [draft, setDraft] = useState<string | null>(null);

    const commit = () => {
        if (draft === null) return;
        const parsed = parseFloat(draft);
        if (Number.isFinite(parsed)) {
            const step = param.step ?? 1;
            const rounded = Math.round(parsed / step) * step;
            onCommit(Math.min(param.max ?? Infinity, Math.max(param.min ?? -Infinity, rounded)));
        }
        setDraft(null);
    };

    return (
        <input
            id={`param-${param.name}`}
            type="number"
            min={param.min}
            max={param.max}
            step={param.step ?? 1}
            value={draft ?? String(param.value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') commit();
                if (e.key === 'Escape') setDraft(null);
            }}
            className={`${ui.input} ${styles.numberControl}`}
            disabled={disabled}
        />
    );
};

const ParameterControls: React.FC<ParameterControlsProps> = ({
    parameters,
    onParameterChange,
    onReset,
    onStartTraining,
    isTraining
}) => {
    const isModified = parameters.some(p => p.value !== p.defaultValue);

    const renderControl = (param: ModelParameter) => {
        const id = `param-${param.name}`;
        switch (param.type) {
            case 'range': {
                const min = param.min ?? 0;
                const max = param.max ?? 1;
                const value = param.value as number;
                const isLog = param.scale === 'log' && min > 0;
                return (
                    <div className={styles.rangeControl}>
                        <input
                            id={id}
                            type="range"
                            min={isLog ? 0 : min}
                            max={isLog ? LOG_STEPS : max}
                            step={isLog ? 1 : param.step ?? 0.01}
                            value={isLog ? toLogPosition(value, min, max) : value}
                            onChange={(e) => {
                                const raw = parseFloat(e.target.value);
                                onParameterChange(param.name, isLog ? fromLogPosition(raw, min, max) : raw);
                            }}
                            aria-valuetext={formatParameterValue(param, value)}
                            disabled={isTraining}
                        />
                        <span className={styles.rangeValue}>{formatParameterValue(param, value)}</span>
                    </div>
                );
            }

            case 'select':
                return (
                    <select
                        id={id}
                        value={param.value as string}
                        onChange={(e) => onParameterChange(param.name, e.target.value)}
                        className={ui.select}
                        disabled={isTraining}
                    >
                        {param.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );

            case 'checkbox':
                return (
                    <label className={styles.checkboxControl}>
                        <input
                            id={id}
                            type="checkbox"
                            checked={param.value as boolean}
                            onChange={(e) => onParameterChange(param.name, e.target.checked)}
                            disabled={isTraining}
                        />
                        {param.value ? 'Enabled' : 'Disabled'}
                    </label>
                );

            case 'number':
                return (
                    <NumberInput
                        param={param}
                        disabled={isTraining}
                        onCommit={(value) => onParameterChange(param.name, value)}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className={styles.parameterControls}>
            <div className={styles.parameterGrid}>
                {parameters.map(param => (
                    <div key={param.name} className={styles.parameterGroup}>
                        <div className={styles.labelRow}>
                            <label htmlFor={`param-${param.name}`} className={styles.parameterLabel}>
                                {param.label}
                            </label>
                            {param.description && (
                                <span className={styles.tooltip} tabIndex={0} aria-label={param.description}>
                                    ?
                                    <span className={styles.tooltipText} role="tooltip">{param.description}</span>
                                </span>
                            )}
                            {param.value !== param.defaultValue && (
                                <span className={styles.modified} title={`Default: ${formatParameterValue(param, param.defaultValue)}`}>
                                    modified
                                </span>
                            )}
                        </div>
                        {renderControl(param)}
                    </div>
                ))}
            </div>

            <div className={styles.actionButtons}>
                <button
                    className={`${ui.button} ${ui.secondary}`}
                    onClick={onReset}
                    disabled={isTraining || !isModified}
                >
                    Reset to Defaults
                </button>
                <button
                    className={ui.button}
                    onClick={onStartTraining}
                    disabled={isTraining}
                >
                    {isTraining ? 'Training in Progress...' : 'Start Training'}
                </button>
            </div>
        </div>
    );
};

export default ParameterControls;
