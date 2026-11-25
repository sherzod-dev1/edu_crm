import React from 'react';
import styles from './loader.module.css';

const Loader = ({
  size = 'md',
  text = 'Yuklanmoqda...',
  fullScreen = false,
  className = '',
}) => {
  return (
    <div
      className={`${styles.container} ${fullScreen ? styles.fullScreen : ''} ${className}`}
    >
      <div className={`${styles.spinner} ${styles[size] || styles.md}`} />
      {text && <p className={styles.text}>{text}</p>}
    </div>
  );
};

export default Loader;
