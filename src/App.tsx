import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import styles from './App.module.css';
import Header from './Header';
import ModelsTable from './ModelsTable';
import ParameterControls from './ParameterControls';
import PerformanceComparison from './PerformanceComparison';
import Sidebar from './Sidebar';
import { Model } from './types';
import mockData from './mockData';

const App: React.FC = () => {
  const [models, setModels] = useState<Model[]>(mockData.models);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(models[0]?.id || null);
  const [trainingMetrics, setTrainingMetrics] = useState(mockData.trainingMetrics);
  const [activeTab, setActiveTab] = useState('overview');

  const selectedModel = models.find(model => model.id === selectedModelId) || null;

  const updateModelParameter = (modelId: string, paramName: string, value: number | string | boolean) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId 
          ? {
              ...model,
              parameters: model.parameters.map(param => 
                param.name === paramName ? { ...param, value } : param
              )
            }
          : model
      )
    );
    
    // In a real app, this would trigger a recalculation or API call
    simulateTrainingUpdate(modelId);
  };

  const simulateTrainingUpdate = (modelId: string) => {
    // Simulate changes in training metrics when parameters change
    setTrainingMetrics(prev => {
      const updated = {...prev};
      
      // Update the loss curve with slight variations
      updated.loss = updated.loss.map(point => ({
        ...point,
        [modelId]: point[modelId] * (0.95 + Math.random() * 0.1)
      }));
      
      // Update the accuracy curve
      updated.accuracy = updated.accuracy.map(point => ({
        ...point,
        [modelId]: Math.min(1, point[modelId] * (1 + (Math.random() * 0.05)))
      }));
      
      return updated;
    });
  };

  const startTraining = (modelId: string) => {
    setModels(prevModels => 
      prevModels.map(model => 
        model.id === modelId 
          ? { ...model, status: 'training' }
          : model
      )
    );
    
    // Simulate training completion after 3 seconds
    setTimeout(() => {
      setModels(prevModels => 
        prevModels.map(model => 
          model.id === modelId 
            ? { ...model, status: 'trained' }
            : model
        )
      );
    }, 3000);
  };

  return (
    <div className={styles.app}>
      <Header />
      <div className={styles.mainContainer}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        <main className={styles.content}>
          {activeTab === 'overview' && (
            <>
              <div className={styles.dashboardHeader}>
                <h1>AI Model Fine-Tuning Dashboard</h1>
                <p>Monitor and adjust your models' training parameters</p>
              </div>
              
              <div className={styles.metricsCards}>
                <div className={styles.metricCard}>
                  <h3>Models</h3>
                  <div className={styles.metricValue}>{models.length}</div>
                </div>
                <div className={styles.metricCard}>
                  <h3>Training</h3>
                  <div className={styles.metricValue}>
                    {models.filter(m => m.status === 'training').length}
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <h3>Completed</h3>
                  <div className={styles.metricValue}>
                    {models.filter(m => m.status === 'trained').length}
                  </div>
                </div>
                <div className={styles.metricCard}>
                  <h3>Best Accuracy</h3>
                  <div className={styles.metricValue}>
                    {Math.max(...models.map(m => m.metrics.accuracy)).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className={styles.chartGrid}>
                <div className={styles.chartContainer}>
                  <h2>Training Loss</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingMetrics.loss}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {models.map(model => (
                        <Line 
                          key={model.id}
                          type="monotone"
                          dataKey={model.id}
                          name={model.name}
                          stroke={model.color}
                          activeDot={{ r: 8 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className={styles.chartContainer}>
                  <h2>Training Accuracy</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingMetrics.accuracy}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="epoch" />
                      <YAxis domain={[0, 1]} />
                      <Tooltip />
                      <Legend />
                      {models.map(model => (
                        <Line 
                          key={model.id}
                          type="monotone"
                          dataKey={model.id}
                          name={model.name}
                          stroke={model.color}
                          activeDot={{ r: 8 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={styles.tableSection}>
                <h2>Models</h2>
                <ModelsTable 
                  models={models} 
                  onSelectModel={setSelectedModelId}
                  selectedModelId={selectedModelId}
                  onStartTraining={startTraining}
                />
              </div>
            </>
          )}

          {activeTab === 'model-detail' && selectedModel && (
            <div className={styles.modelDetail}>
              <h1>{selectedModel.name} Details</h1>
              
              <div className={styles.modelInfo}>
                <div className={styles.modelInfoCard}>
                  <h3>Model Information</h3>
                  <p><strong>Type:</strong> {selectedModel.type}</p>
                  <p><strong>Size:</strong> {selectedModel.size}</p>
                  <p><strong>Status:</strong> {selectedModel.status}</p>
                  <p><strong>Last Updated:</strong> {selectedModel.lastUpdated}</p>
                </div>
                
                <div className={styles.modelMetricsCard}>
                  <h3>Performance Metrics</h3>
                  <div className={styles.metricsGrid}>
                    <div>
                      <p>Accuracy</p>
                      <p className={styles.metricValue}>{selectedModel.metrics.accuracy.toFixed(4)}</p>
                    </div>
                    <div>
                      <p>Loss</p>
                      <p className={styles.metricValue}>{selectedModel.metrics.loss.toFixed(4)}</p>
                    </div>
                    <div>
                      <p>F1 Score</p>
                      <p className={styles.metricValue}>{selectedModel.metrics.f1.toFixed(4)}</p>
                    </div>
                    <div>
                      <p>Training Time</p>
                      <p className={styles.metricValue}>{selectedModel.metrics.trainingTime}m</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.parameterControlsContainer}>
                <h2>Fine-tuning Parameters</h2>
                <ParameterControls 
                  parameters={selectedModel.parameters}
                  onParameterChange={(paramName, value) => 
                    updateModelParameter(selectedModel.id, paramName, value)
                  }
                  onStartTraining={() => startTraining(selectedModel.id)}
                  isTraining={selectedModel.status === 'training'}
                />
              </div>
              
              <div className={styles.modelCharts}>
                <div className={styles.chartContainer}>
                  <h2>Parameter Sensitivity</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={[
                      { name: 'Learning Rate', sensitivity: 0.8 },
                      { name: 'Batch Size', sensitivity: 0.5 },
                      { name: 'Epochs', sensitivity: 0.3 },
                      { name: 'Dropout', sensitivity: 0.7 },
                      { name: 'Hidden Layers', sensitivity: 0.6 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="sensitivity" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'comparison' && (
            <PerformanceComparison models={models} />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;