import React from 'react';
import styles from './tooltip.module.css';

const Tooltip = ({ text, children, className = '' }) => {
  if (!text) return children;

  return (
    <div className={`${styles.wrapper} ${className}`}>
      {children}
      <span className={styles.tooltip}>{text}</span>
    </div>
  );
};

export default Tooltip;
