import React from 'react';
import styles from './ParameterControls.module.css';
import { ModelParameter } from './types';

interface ParameterControlsProps {
    parameters: ModelParameter[];
    onParameterChange: (name: string, value: number | string | boolean) => void;
    onStartTraining: () => void;
    isTraining: boolean;
}

const ParameterControls: React.FC<ParameterControlsProps> = ({
    parameters,
    onParameterChange,
    onStartTraining,
    isTraining
}) => {
    const renderControl = (param: ModelParameter) => {
        switch (param.type) {
            case 'range':
                return (
                    <div className={styles.rangeControl}>
                        <input
                            type="range"
                            min={param.min}
                            max={param.max}
                            step={param.step || 0.01}
                            value={param.value as number}
                            onChange={(e) => onParameterChange(param.name, parseFloat(e.target.value))}
                            disabled={isTraining}
                        />
                        <span className={styles.rangeValue}>{(param.value as number).toFixed(4)}</span>
                    </div>
                );

            case 'select':
                return (
                    <select
                        value={param.value as string}
                        onChange={(e) => onParameterChange(param.name, e.target.value)}
                        className={styles.selectControl}
                        disabled={isTraining}
                    >
                        {param.options?.map(option => (
                            <option key={option} value={option}>{option}</option>
                        ))}
                    </select>
                );

            case 'checkbox':
                return (
                    <input
                        type="checkbox"
                        checked={param.value as boolean}
                        onChange={(e) => onParameterChange(param.name, e.target.checked)}
                        className={styles.checkboxControl}
                        disabled={isTraining}
                    />
                );

            case 'number':
                return (
                    <input
                        type="number"
                        min={param.min}
                        max={param.max}
                        step={param.step || 1}
                        value={param.value as number}
                        onChange={(e) => onParameterChange(param.name, parseFloat(e.target.value))}
                        className={styles.numberControl}
                        disabled={isTraining}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <div className={styles.parameterControls}>
            {parameters.map(param => (
                <div key={param.name} className={styles.parameterGroup}>
                    <label className={styles.parameterLabel}>
                        <div className={styles.labelText}>
                            {param.label}
                            {param.description && (
                                <span className={styles.tooltip}>
                                    ℹ️
                                    <span className={styles.tooltipText}>{param.description}</span>
                                </span>
                            )}
                        </div>
                        {renderControl(param)}
                    </label>
                </div>
            ))}

            <div className={styles.actionButtons}>
                <button
                    className={styles.resetButton}
                    onClick={() => {
                        parameters.forEach(param => {
                            onParameterChange(param.name, param.defaultValue);
                        });
                    }}
                    disabled={isTraining}
                >
                    Reset to Defaults
                </button>
                <button
                    className={styles.trainButton}
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