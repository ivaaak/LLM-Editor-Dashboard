import React from 'react';
import styles from './Header.module.css';

const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.logo}>
        <span className={styles.logoIcon}>🧠</span>
        <span className={styles.logoText}>AI Tuner</span>
      </div>
      <div className={styles.actions}>
        <button className={styles.actionButton}>
          <span className={styles.icon}>+</span> Add Model
        </button>
        <div className={styles.userProfile}>
          <span className={styles.userAvatar}>JD</span>
          <span className={styles.userName}>John Doe</span>
        </div>
      </div>
    </header>
  );
};

export default Header;