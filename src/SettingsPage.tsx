import React from 'react';
import styles from './SettingsPage.module.css';
import ui from './common.module.css';
import type { Theme } from '../shared/types';

interface SettingsPageProps {
    theme: Theme;
    epochIntervalMs: number;
    onThemeChange: (theme: Theme) => void;
    onEpochIntervalChange: (epochIntervalMs: number) => void;
    onResetDemoData: () => void;
}

const THEMES: { value: Theme; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
];

const SPEEDS = [
    { value: 250, label: 'Fast (0.25s per epoch)' },
    { value: 800, label: 'Normal (0.8s per epoch)' },
    { value: 2000, label: 'Slow (2s per epoch)' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ theme, epochIntervalMs, onThemeChange, onEpochIntervalChange, onResetDemoData }) => {
    const handleReset = () => {
        if (window.confirm('Replace all models, runs and datasets with the demo data? Your changes will be lost.')) {
            onResetDemoData();
        }
    };

    return (
        <div>
            <div className={ui.pageHeader}>
                <div>
                    <h1 className={ui.pageTitle}>Settings</h1>
                    <p className={ui.pageSubtitle}>The theme is saved in this browser. Everything else is stored on the server.</p>
                </div>
            </div>

            <div className={`${ui.card} ${ui.section}`}>
                <h2 className={`${ui.cardTitle} ${styles.title}`}>Appearance</h2>
                <fieldset className={styles.fieldset}>
                    <legend className={styles.legend}>Theme</legend>
                    <div className={styles.segmented}>
                        {THEMES.map(option => (
                            <label key={option.value} className={`${styles.segment} ${theme === option.value ? styles.segmentActive : ''}`}>
                                <input
                                    type="radio"
                                    name="theme"
                                    value={option.value}
                                    checked={theme === option.value}
                                    onChange={() => onThemeChange(option.value)}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                </fieldset>
            </div>

            <div className={`${ui.card} ${ui.section}`}>
                <h2 className={`${ui.cardTitle} ${styles.title}`}>Training simulation</h2>
                <label className={`${ui.field} ${styles.speedField}`}>
                    Simulation speed
                    <select
                        className={ui.select}
                        value={epochIntervalMs}
                        onChange={(e) => onEpochIntervalChange(Number(e.target.value))}
                    >
                        {!SPEEDS.some(speed => speed.value === epochIntervalMs) && (
                            <option value={epochIntervalMs}>Custom ({epochIntervalMs} ms per epoch)</option>
                        )}
                        {SPEEDS.map(speed => (
                            <option key={speed.value} value={speed.value}>{speed.label}</option>
                        ))}
                    </select>
                </label>
                <p className={`${ui.muted} ${ui.small}`}>
                    Training runs are simulated on the server and keep going when this page is closed. Results
                    depend on the model size, dataset and hyperparameters, and are reproducible for a given run.
                </p>
            </div>

            <div className={`${ui.card} ${styles.row}`}>
                <div>
                    <h2 className={ui.cardTitle}>Reset demo data</h2>
                    <p className={`${ui.muted} ${ui.small}`}>Restores the original models, runs and datasets. Settings are kept.</p>
                </div>
                <button className={`${ui.button} ${ui.danger}`} onClick={handleReset}>Reset Data</button>
            </div>
        </div>
    );
};

export default SettingsPage;
