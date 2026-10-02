// navigation.ts
import type { TabId } from '../shared/types';

export const TABS: { id: TabId; name: string; icon: string }[] = [
    { id: 'overview', name: 'Overview', icon: '📊' },
    { id: 'model-detail', name: 'Model Details', icon: '⚙️' },
    { id: 'comparison', name: 'Comparison', icon: '📈' },
    { id: 'datasets', name: 'Datasets', icon: '📁' },
    { id: 'settings', name: 'Settings', icon: '🔧' },
];
