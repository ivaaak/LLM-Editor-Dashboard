// mockData.ts
import { MockData } from './types';

// Helper function to generate epochs data
const generateEpochsData = (epochs: number, models: string[]) => {
  return Array.from({ length: epochs }, (_, i) => {
    const entry: { epoch: number; [key: string]: number } = { epoch: i + 1 };
    
    models.forEach(modelId => {
      // Generate loss data that starts higher and decreases
      if (modelId === 'model1') {
        entry[modelId] = 0.8 * Math.exp(-0.1 * i) + 0.15 * Math.random();
      } else if (modelId === 'model2') {
        entry[modelId] = 0.9 * Math.exp(-0.08 * i) + 0.12 * Math.random();
      } else if (modelId === 'model3') {
        entry[modelId] = 0.75 * Math.exp(-0.12 * i) + 0.1 * Math.random();
      } else if (modelId === 'model4') {
        entry[modelId] = 0.85 * Math.exp(-0.09 * i) + 0.13 * Math.random();
      } else {
        entry[modelId] = 0.7 * Math.exp(-0.05 * i) + 0.2 * Math.random();
      }
    });
    
    return entry;
  });
};

// Helper function to generate accuracy data
const generateAccuracyData = (epochs: number, models: string[]) => {
  return Array.from({ length: epochs }, (_, i) => {
    const entry: { epoch: number; [key: string]: number } = { epoch: i + 1 };
    
    models.forEach(modelId => {
      // Generate accuracy data that starts lower and increases
      if (modelId === 'model1') {
        entry[modelId] = 0.7 * (1 - Math.exp(-0.15 * i)) + 0.2 + 0.05 * Math.random();
      } else if (modelId === 'model2') {
        entry[modelId] = 0.65 * (1 - Math.exp(-0.12 * i)) + 0.25 + 0.04 * Math.random();
      } else if (modelId === 'model3') {
        entry[modelId] = 0.75 * (1 - Math.exp(-0.18 * i)) + 0.18 + 0.03 * Math.random();
      } else if (modelId === 'model4') {
        entry[modelId] = 0.68 * (1 - Math.exp(-0.14 * i)) + 0.22 + 0.04 * Math.random();
      } else {
        entry[modelId] = 0.6 * (1 - Math.exp(-0.1 * i)) + 0.3 + 0.05 * Math.random();
      }
      
      // Cap accuracy at 0.99
      entry[modelId] = Math.min(0.99, entry[modelId]);
    });
    
    return entry;
  });
};

export const mockData: MockData = {
  models: [
    {
      id: 'model1',
      name: 'GPT-4 Fine-tuned',
      type: 'Transformer',
      size: '175B',
      status: 'trained',
      lastUpdated: '2025-03-20',
      color: '#3498db',
      metrics: {
        accuracy: 0.941,
        loss: 0.087,
        f1: 0.935,
        precision: 0.928,
        recall: 0.942,
        trainingTime: 180,
        inferenceSpeed: 125
      },
      parameters: [
        {
          name: 'learningRate',
          label: 'Learning Rate',
          type: 'range',
          value: 0.0001,
          defaultValue: 0.0001,
          min: 0.00001,
          max: 0.01,
          step: 0.00001,
          description: 'Controls how much to change the model in response to the estimated error each time the model weights are updated'
        },
        {
          name: 'batchSize',
          label: 'Batch Size',
          type: 'number',
          value: 32,
          defaultValue: 32,
          min: 1,
          max: 128,
          step: 1,
          description: 'Number of training examples used in one iteration'
        },
        {
          name: 'epochs',
          label: 'Epochs',
          type: 'number',
          value: 10,
          defaultValue: 10,
          min: 1,
          max: 100,
          step: 1,
          description: 'Number of complete passes through the training dataset'
        },
        {
          name: 'optimizer',
          label: 'Optimizer',
          type: 'select',
          value: 'Adam',
          defaultValue: 'Adam',
          options: ['Adam', 'SGD', 'RMSprop', 'Adagrad'],
          description: 'Algorithm used to update the network weights'
        },
        {
          name: 'dropout',
          label: 'Dropout Rate',
          type: 'range',
          value: 0.2,
          defaultValue: 0.2,
          min: 0,
          max: 0.5,
          step: 0.01,
          description: 'Regularization technique where randomly selected neurons are ignored during training'
        },
        {
          name: 'useEarlyStopping',
          label: 'Early Stopping',
          type: 'checkbox',
          value: true,
          defaultValue: true,
          description: 'Stop training when validation score stops improving'
        }
      ]
    },
    {
      id: 'model2',
      name: 'BERT Enhanced',
      type: 'Transformer',
      size: '340M',
      status: 'training',
      lastUpdated: '2025-03-21',
      color: '#e74c3c',
      metrics: {
        accuracy: 0.892,
        loss: 0.124,
        f1: 0.878,
        precision: 0.901,
        recall: 0.856,
        trainingTime: 45,
        inferenceSpeed: 28
      },
      parameters: [
        {
          name: 'learningRate',
          label: 'Learning Rate',
          type: 'range',
          value: 0.0005,
          defaultValue: 0.0005,
          min: 0.00001,
          max: 0.01,
          step: 0.00001,
          description: 'Controls how much to change the model in response to the estimated error each time the model weights are updated'
        },
        {
          name: 'batchSize',
          label: 'Batch Size',
          type: 'number',
          value: 16,
          defaultValue: 16,
          min: 1,
          max: 128,
          step: 1,
          description: 'Number of training examples used in one iteration'
        },
        {
          name: 'epochs',
          label: 'Epochs',
          type: 'number',
          value: 5,
          defaultValue: 5,
          min: 1,
          max: 100,
          step: 1,
          description: 'Number of complete passes through the training dataset'
        },
        {
          name: 'optimizer',
          label: 'Optimizer',
          type: 'select',
          value: 'AdamW',
          defaultValue: 'AdamW',
          options: ['Adam', 'AdamW', 'SGD', 'RMSprop'],
          description: 'Algorithm used to update the network weights'
        },
        {
          name: 'dropout',
          label: 'Dropout Rate',
          type: 'range',
          value: 0.1,
          defaultValue: 0.1,
          min: 0,
          max: 0.5,
          step: 0.01,
          description: 'Regularization technique where randomly selected neurons are ignored during training'
        },
        {
          name: 'useEarlyStopping',
          label: 'Early Stopping',
          type: 'checkbox',
          value: true,
          defaultValue: true,
          description: 'Stop training when validation score stops improving'
        }
      ]
    },
    {
      id: 'model3',
      name: 'Llama 3 Tuned',
      type: 'Transformer',
      size: '70B',
      status: 'trained',
      lastUpdated: '2025-03-18',
      color: '#2ecc71',
      metrics: {
        accuracy: 0.935,
        loss: 0.092,
        f1: 0.929,
        precision: 0.922,
        recall: 0.936,
        trainingTime: 120,
        inferenceSpeed: 95
      },
      parameters: [
        {
          name: 'learningRate',
          label: 'Learning Rate',
          type: 'range',
          value: 0.0002,
          defaultValue: 0.0002,
          min: 0.00001,
          max: 0.01,
          step: 0.00001,
          description: 'Controls how much to change the model in response to the estimated error each time the model weights are updated'
        },
        {
          name: 'batchSize',
          label: 'Batch Size',
          type: 'number',
          value: 24,
          defaultValue: 24,
          min: 1,
          max: 128,
          step: 1,
          description: 'Number of training examples used in one iteration'
        },
        {
          name: 'epochs',
          label: 'Epochs',
          type: 'number',
          value: 8,
          defaultValue: 8,
          min: 1,
          max: 100,
          step: 1,
          description: 'Number of complete passes through the training dataset'
        },
        {
          name: 'optimizer',
          label: 'Optimizer',
          type: 'select',
          value: 'Adam',
          defaultValue: 'Adam',
          options: ['Adam', 'SGD', 'RMSprop', 'Adagrad'],
          description: 'Algorithm used to update the network weights'
        },
        {
          name: 'dropout',
          label: 'Dropout Rate',
          type: 'range',
          value: 0.15,
          defaultValue: 0.15,
          min: 0,
          max: 0.5,
          step: 0.01,
          description: 'Regularization technique where randomly selected neurons are ignored during training'
        },
        {
          name: 'useEarlyStopping',
          label: 'Early Stopping',
          type: 'checkbox',
          value: true,
          defaultValue: true,
          description: 'Stop training when validation score stops improving'
        }
      ]
    },
    {
      id: 'model4',
      name: 'Claude 3 Custom',
      type: 'Transformer',
      size: '120B',
      status: 'pending',
      lastUpdated: '2025-03-15',
      color: '#9b59b6',
      metrics: {
        accuracy: 0.925,
        loss: 0.105,
        f1: 0.918,
        precision: 0.912,
        recall: 0.924,
        trainingTime: 160,
        inferenceSpeed: 110
      },
      parameters: [
        {
          name: 'learningRate',
          label: 'Learning Rate',
          type: 'range',
          value: 0.00015,
          defaultValue: 0.00015,
          min: 0.00001,
          max: 0.01,
          step: 0.00001,
          description: 'Controls how much to change the model in response to the estimated error each time the model weights are updated'
        },
        {
          name: 'batchSize',
          label: 'Batch Size',
          type: 'number',
          value: 48,
          defaultValue: 48,
          min: 1,
          max: 128,
          step: 1,
          description: 'Number of training examples used in one iteration'
        },
        {
          name: 'epochs',
          label: 'Epochs',
          type: 'number',
          value: 12,
          defaultValue: 12,
          min: 1,
          max: 100,
          step: 1,
          description: 'Number of complete passes through the training dataset'
        },
        {
          name: 'optimizer',
          label: 'Optimizer',
          type: 'select',
          value: 'Adam',
          defaultValue: 'Adam',
          options: ['Adam', 'SGD', 'RMSprop', 'Adagrad'],
          description: 'Algorithm used to update the network weights'
        },
        {
          name: 'dropout',
          label: 'Dropout Rate',
          type: 'range',
          value: 0.25,
          defaultValue: 0.25,
          min: 0,
          max: 0.5,
          step: 0.01,
          description: 'Regularization technique where randomly selected neurons are ignored during training'
        },
        {
          name: 'useEarlyStopping',
          label: 'Early Stopping',
          type: 'checkbox',
          value: false,
          defaultValue: false,
          description: 'Stop training when validation score stops improving'
        }
      ]
    },
    {
      id: 'model5',
      name: 'Mistral Optimized',
      type: 'Transformer',
      size: '7B',
      status: 'failed',
      lastUpdated: '2025-03-10',
      color: '#f39c12',
      metrics: {
        accuracy: 0.888,
        loss: 0.142,
        f1: 0.872,
        precision: 0.865,
        recall: 0.879,
        trainingTime: 75,
        inferenceSpeed: 42
      },
      parameters: [
        {
          name: 'learningRate',
          label: 'Learning Rate',
          type: 'range',
          value: 0.0003,
          defaultValue: 0.0003,
          min: 0.00001,
          max: 0.01,
          step: 0.00001,
          description: 'Controls how much to change the model in response to the estimated error each time the model weights are updated'
        },
        {
          name: 'batchSize',
          label: 'Batch Size',
          type: 'number',
          value: 64,
          defaultValue: 64,
          min: 1,
          max: 128,
          step: 1,
          description: 'Number of training examples used in one iteration'
        },
        {
          name: 'epochs',
          label: 'Epochs',
          type: 'number',
          value: 15,
          defaultValue: 15,
          min: 1,
          max: 100,
          step: 1,
          description: 'Number of complete passes through the training dataset'
        },
        {
          name: 'optimizer',
          label: 'Optimizer',
          type: 'select',
          value: 'SGD',
          defaultValue: 'SGD',
          options: ['Adam', 'SGD', 'RMSprop', 'Adagrad'],
          description: 'Algorithm used to update the network weights'
        },
        {
          name: 'dropout',
          label: 'Dropout Rate',
          type: 'range',
          value: 0.3,
          defaultValue: 0.3,
          min: 0,
          max: 0.5,
          step: 0.01,
          description: 'Regularization technique where randomly selected neurons are ignored during training'
        },
        {
          name: 'useEarlyStopping',
          label: 'Early Stopping',
          type: 'checkbox',
          value: true,
          defaultValue: true,
          description: 'Stop training when validation score stops improving'
        }
      ]
    }
  ],
  trainingMetrics: {
    loss: generateEpochsData(20, ['model1', 'model2', 'model3', 'model4', 'model5']),
    accuracy: generateAccuracyData(20, ['model1', 'model2', 'model3', 'model4', 'model5'])
  }
};

export default mockData;