import React from 'react';
import styles from './Sidebar.module.css';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const tabs = [
        { id: 'overview', name: 'Overview', icon: '📊' },
        { id: 'model-detail', name: 'Model Details', icon: '⚙️' },
        { id: 'comparison', name: 'Comparison', icon: '📈' },
        { id: 'datasets', name: 'Datasets', icon: '📁' },
        { id: 'settings', name: 'Settings', icon: '🔧' },
    ];

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    {tabs.map(tab => (
                        <li
                            key={tab.id}
                            className={`${styles.navItem} ${activeTab === tab.id ? styles.active : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className={styles.icon}>{tab.icon}</span>
                            <span className={styles.name}>{tab.name}</span>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};

export default Sidebar;