import React from 'react';
import styles from './header.module.css';

const Header = ({ title, subtitle, actions, children }) => {
  return (
    <div className={styles.header}>
      <div className={styles.titleGroup}>
        {title && <h1 className={styles.title}>{title}</h1>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {(actions || children) && (
        <div className={styles.actions}>
          {actions}
          {children}
        </div>
      )}
    </div>
  );
};

export default Header;
