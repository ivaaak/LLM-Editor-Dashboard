import React from 'react';
import styles from './ModelsTable.module.css';
import { Model } from './types';

interface ModelsTableProps {
    models: Model[];
    selectedModelId: string | null;
    onSelectModel: (id: string) => void;
    onStartTraining: (id: string) => void;
}

const ModelsTable: React.FC<ModelsTableProps> = ({
    models,
    selectedModelId,
    onSelectModel,
    onStartTraining
}) => {
    return (
        <div className={styles.tableContainer}>
            <table className={styles.table}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Status</th>
                        <th>Accuracy</th>
                        <th>Loss</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {models.map(model => (
                        <tr
                            key={model.id}
                            className={`${styles.tableRow} ${selectedModelId === model.id ? styles.selected : ''}`}
                            onClick={() => onSelectModel(model.id)}
                        >
                            <td>
                                <div className={styles.modelName}>
                                    <div
                                        className={styles.colorIndicator}
                                        style={{ backgroundColor: model.color }}
                                    ></div>
                                    {model.name}
                                </div>
                            </td>
                            <td>{model.type}</td>
                            <td>{model.size}</td>
                            <td>
                                <span className={`${styles.status} ${styles[model.status]}`}>
                                    {model.status}
                                </span>
                            </td>
                            <td>{model.metrics.accuracy.toFixed(4)}</td>
                            <td>{model.metrics.loss.toFixed(4)}</td>
                            <td>
                                <div className={styles.actions}>
                                    <button
                                        className={styles.actionButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectModel(model.id);
                                            onStartTraining(model.id);
                                        }}
                                        disabled={model.status === 'training'}
                                    >
                                        {model.status === 'training' ? 'Training...' : 'Train'}
                                    </button>
                                    <button
                                        className={`${styles.actionButton} ${styles.detailsButton}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSelectModel(model.id);
                                        }}
                                    >
                                        Details
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ModelsTable;