import React, { useState } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import styles from './PerformanceComparison.module.css';
import { Model } from './types';

interface PerformanceComparisonProps {
  models: Model[];
}

const PerformanceComparison: React.FC<PerformanceComparisonProps> = ({ models }) => {
  const [selectedMetric, setSelectedMetric] = useState<string>('accuracy');
  const [selectedModels, setSelectedModels] = useState<string[]>(models.slice(0, 3).map(m => m.id));

  const toggleModelSelection = (modelId: string) => {
    if (selectedModels.includes(modelId)) {
      setSelectedModels(selectedModels.filter(id => id !== modelId));
    } else {
      setSelectedModels([...selectedModels, modelId]);
    }
  };

  const filteredModels = models.filter(model => selectedModels.includes(model.id));

  const radarData = [
    { metric: 'Accuracy', fullMark: 1 },
    { metric: 'F1 Score', fullMark: 1 },
    { metric: 'Precision', fullMark: 1 },
    { metric: 'Recall', fullMark: 1 },
    { metric: 'Speed', fullMark: 100 }
  ].map(item => {
    const result: any = { metric: item.metric, fullMark: item.fullMark };
    filteredModels.forEach(model => {
      switch (item.metric) {
        case 'Accuracy':
          result[model.id] = model.metrics.accuracy;
          break;
        case 'F1 Score':
          result[model.id] = model.metrics.f1;
          break;
        case 'Precision':
          result[model.id] = model.metrics.precision || Math.random() * 0.3 + 0.7; // Mock data
          break;
        case 'Recall':
          result[model.id] = model.metrics.recall || Math.random() * 0.3 + 0.7; // Mock data
          break;
        case 'Speed':
          result[model.id] = (model.metrics.inferenceSpeed || Math.random() * 50 + 50) / 100; // Mock data, normalized
          break;
      }
    });
    return result;
  });

  const metricOptions = [
    { value: 'accuracy', label: 'Accuracy' },
    { value: 'loss', label: 'Loss' },
    { value: 'f1', label: 'F1 Score' },
    { value: 'trainingTime', label: 'Training Time' }
  ];

  const barData = models.map(model => {
    const metricValue = model.metrics[selectedMetric as keyof typeof model.metrics];
    return {
      name: model.name,
      value: typeof metricValue === 'number' ? metricValue : 0,
      color: model.color
    };
  });

  return (
    <div className={styles.comparisonContainer}>
      <h1>Model Performance Comparison</h1>
      
      <div className={styles.controlPanel}>
        <div className={styles.metricSelector}>
          <h3>Select Metric for Bar Chart</h3>
          <select 
            value={selectedMetric} 
            onChange={(e) => setSelectedMetric(e.target.value)}
            className={styles.selectControl}
          >
            {metricOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        <div className={styles.modelSelector}>
          <h3>Select Models to Compare</h3>
          <div className={styles.modelCheckboxes}>
            {models.map(model => (
              <label key={model.id} className={styles.modelCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => toggleModelSelection(model.id)}
                  className={styles.modelCheckbox}
                />
                <div 
                  className={styles.colorIndicator} 
                  style={{ backgroundColor: model.color }}
                ></div>
                {model.name}
              </label>
            ))}
          </div>
        </div>
      </div>
      
      <div className={styles.chartGrid}>
        <div className={styles.chartContainer}>
          <h2>Comparison by {metricOptions.find(m => m.value === selectedMetric)?.label}</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar 
                dataKey="value" 
                name={metricOptions.find(m => m.value === selectedMetric)?.label} 
                fill="#8884d8"
              >
                {barData.map((entry, index) => (
                  <Bar key={`cell-${index}`} fill={entry.color} dataKey={''} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className={styles.chartContainer}>
          <h2>Multi-dimensional Comparison</h2>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart outerRadius={150} data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" />
              <PolarRadiusAxis angle={30} domain={[0, 1]} />
              {filteredModels.map(model => (
                <Radar
                  key={model.id}
                  name={model.name}
                  dataKey={model.id}
                  stroke={model.color}
                  fill={model.color}
                  fillOpacity={0.3}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className={styles.comparisonTable}>
        <h2>Detailed Metrics Comparison</h2>
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Model</th>
                <th>Accuracy</th>
                <th>Loss</th>
                <th>F1 Score</th>
                <th>Training Time</th>
                <th>Inference Speed</th>
              </tr>
            </thead>
            <tbody>
              {filteredModels.map(model => (
                <tr key={model.id}>
                  <td>
                    <div className={styles.modelName}>
                      <div 
                        className={styles.colorIndicator} 
                        style={{ backgroundColor: model.color }}
                      ></div>
                      {model.name}
                    </div>
                  </td>
                  <td>{model.metrics.accuracy.toFixed(4)}</td>
                  <td>{model.metrics.loss.toFixed(4)}</td>
                  <td>{model.metrics.f1.toFixed(4)}</td>
                  <td>{model.metrics.trainingTime}m</td>
                  <td>{model.metrics.inferenceSpeed || "-"} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceComparison;