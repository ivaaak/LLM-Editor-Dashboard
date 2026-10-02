import React from 'react';
import styles from './Sidebar.module.css';
import { TABS } from './navigation';
import type { TabId } from '../shared/types';

interface SidebarProps {
    activeTab: TabId;
    setActiveTab: (tab: TabId) => void;
    trainingCount: number;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, trainingCount }) => {
    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav} aria-label="Main">
                <ul className={styles.navList}>
                    {TABS.map(tab => (
                        <li key={tab.id}>
                            <button
                                className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                                <span className={styles.icon} aria-hidden="true">{tab.icon}</span>
                                <span className={styles.name}>{tab.name}</span>
                                {tab.id === 'overview' && trainingCount > 0 && (
                                    <span className={styles.counter} title={`${trainingCount} model(s) training`}>
                                        {trainingCount}
                                    </span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;
