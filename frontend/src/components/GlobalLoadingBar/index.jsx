import React, { useState, useEffect } from 'react';
import { subscribeToLoading } from '../../services/api';
import styles from './globalLoadingBar.module.css';

const GlobalLoadingBar = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let progressTimer = null;
    let hideTimer = null;

    const unsubscribe = subscribeToLoading((loading) => {
      setIsLoading(loading);
      if (loading) {
        clearTimeout(hideTimer);
        setVisible(true);
        setProgress((prev) => (prev === 0 ? 25 : prev));
        progressTimer = setInterval(() => {
          setProgress((prev) => {
            if (prev < 80) return prev + Math.random() * 12;
            if (prev < 92) return prev + 1.5;
            return prev;
          });
        }, 180);
      } else {
        clearInterval(progressTimer);
        setProgress(100);
        hideTimer = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 350);
      }
    });

    return () => {
      unsubscribe();
      clearInterval(progressTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.wrapper}>
      <div
        className={styles.progressBar}
        style={{
          width: `${progress}%`,
          opacity: isLoading ? 1 : 0.85,
        }}
      />
      {isLoading && (
        <div className={styles.floatingIndicator}>
          <div className={styles.spinner}></div>
          <span>Jarayon bajarilmoqda...</span>
        </div>
      )}
    </div>
  );
};

export default GlobalLoadingBar;

