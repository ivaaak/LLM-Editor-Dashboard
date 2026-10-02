import React from 'react';
import styles from './Header.module.css';

interface HeaderProps {
  isDark: boolean;
  onToggleTheme: () => void;
  onAddModel: () => void;
}

const Header: React.FC<HeaderProps> = ({ isDark, onToggleTheme, onAddModel }) => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon} aria-hidden="true">🧠</span>
        <span className={styles.logoText}>AI Tuner</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionButton} onClick={onAddModel}>
          <span className={styles.icon} aria-hidden="true">+</span> Add Model
        </button>
        <button
          className={styles.themeButton}
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <div className={styles.userProfile}>
          <span className={styles.userAvatar} aria-hidden="true">JD</span>
          <span className={styles.userName}>John Doe</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
