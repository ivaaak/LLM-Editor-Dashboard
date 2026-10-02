import React, { useCallback, useEffect, useState } from 'react';
import styles from './App.module.css';
import ui from './common.module.css';
import AddModelDialog from './AddModelDialog';
import Datasets from './Datasets';
import Header from './Header';
import ModelDetail from './ModelDetail';
import Overview from './Overview';
import PerformanceComparison from './PerformanceComparison';
import SettingsPage from './SettingsPage';
import Sidebar from './Sidebar';
import { TABS } from './navigation';
import { useDashboard } from './useDashboard';
import { useLocalStorage } from './useLocalStorage';
import type { NewModelInput, TabId, Theme } from '../shared/types';

function readTabFromHash(): TabId {
  const id = window.location.hash.replace(/^#\/?/, '');
  return TABS.find(tab => tab.id === id)?.id ?? 'overview';
}

function useSystemPrefersDark(): boolean {
  const [prefersDark, setPrefersDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setPrefersDark(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return prefersDark;
}

const isTheme = (value: unknown): value is Theme => value === 'system' || value === 'light' || value === 'dark';
const isOptionalString = (value: unknown): value is string | null => value === null || typeof value === 'string';

const App: React.FC = () => {
  const { loaded, connected, actionError, models, datasets, simulation, actions } = useDashboard();
  const [theme, setTheme] = useLocalStorage<Theme>('llm-dashboard:theme', 'system', isTheme);
  const [storedModelId, setSelectedModelId] = useLocalStorage<string | null>('llm-dashboard:selected-model', null, isOptionalString);
  const [activeTab, setActiveTab] = useState<TabId>(readTabFromHash);
  const [isAddModelOpen, setAddModelOpen] = useState(false);

  // Fall back to the first model when the stored selection no longer exists (e.g. it was deleted).
  const selectedModel = models.find(model => model.id === storedModelId) ?? models[0] ?? null;
  const selectedModelId = selectedModel?.id ?? null;
  const trainingCount = models.filter(m => m.status === 'training').length;

  // Theme
  const prefersDark = useSystemPrefersDark();
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  // Tab <-> URL hash, so reloads and the back button keep the current page.
  useEffect(() => {
    const onHashChange = () => setActiveTab(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((tab: TabId) => {
    window.location.hash = `/${tab}`;
    setActiveTab(tab);
  }, []);

  const openDetails = (id: string) => {
    setSelectedModelId(id);
    navigate('model-detail');
  };

  const createModel = async (input: NewModelInput) => {
    const id = await actions.createModel(input);
    setSelectedModelId(id);
    setAddModelOpen(false);
    navigate('model-detail');
  };

  const renderPage = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <Overview
            models={models}
            datasets={datasets}
            selectedModelId={selectedModelId}
            onSelectModel={setSelectedModelId}
            onOpenDetails={openDetails}
            onStartTraining={actions.startTraining}
            onCancelTraining={actions.cancelTraining}
          />
        );
      case 'model-detail':
        return (
          <ModelDetail
            models={models}
            datasets={datasets}
            model={selectedModel}
            epochIntervalMs={simulation.epochIntervalMs}
            onSelectModel={setSelectedModelId}
            onParameterChange={actions.updateParameter}
            onResetParameters={actions.resetParameters}
            onSetDataset={actions.setModelDataset}
            onStartTraining={actions.startTraining}
            onCancelTraining={actions.cancelTraining}
            onDeleteModel={actions.deleteModel}
            onAddModel={() => setAddModelOpen(true)}
          />
        );
      case 'comparison':
        return <PerformanceComparison models={models} />;
      case 'datasets':
        return (
          <Datasets
            datasets={datasets}
            models={models}
            onAddDataset={actions.addDataset}
            onDeleteDataset={actions.deleteDataset}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            theme={theme}
            epochIntervalMs={simulation.epochIntervalMs}
            onThemeChange={setTheme}
            onEpochIntervalChange={actions.setEpochInterval}
            onResetDemoData={actions.resetDemoData}
          />
        );
    }
  };

  return (
    <div className={styles.app}>
      <Header
        isDark={isDark}
        onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
        onAddModel={() => setAddModelOpen(true)}
      />
      <div className={styles.mainContainer}>
        <Sidebar activeTab={activeTab} setActiveTab={navigate} trainingCount={trainingCount} />
        <main className={styles.content}>
          {loaded && !connected && (
            <div className={`${ui.notice} ${styles.banner}`} role="status">
              Lost connection to the API server. Reconnecting...
            </div>
          )}
          {actionError && (
            <div className={`${ui.notice} ${styles.banner}`} role="alert">
              <span>{actionError}</span>
              <button className={`${ui.button} ${ui.small} ${ui.secondary}`} onClick={actions.dismissError}>
                Dismiss
              </button>
            </div>
          )}
          {loaded ? renderPage() : (
            <div className={ui.card}>
              <div className={ui.empty}>
                {connected ? 'Loading...' : (
                  <>
                    <p>Connecting to the API server...</p>
                    <p className={ui.small}>If this doesn't go away, make sure the server is running (<code>npm run dev</code>).</p>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      <AddModelDialog
        open={isAddModelOpen}
        datasets={datasets}
        existingNames={models.map(m => m.name)}
        usedColors={models.map(m => m.color)}
        onClose={() => setAddModelOpen(false)}
        onCreate={createModel}
      />
    </div>
  );
};

export default App;
