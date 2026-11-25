import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styles from './breadcrumbs.module.css';
import { ChevronRight, ArrowLeft } from 'lucide-react';

const Breadcrumbs = ({ items = [] }) => {
  const navigate = useNavigate();

  if (!items || items.length === 0) return null;

  const handleBack = () => {
    // 1. Agar sahifa ichida bir necha bosqich bo'lsa (masalan: Guruhlar > Batafsil, yoki O'qituvchilar > Yangi qo'shish)
    // 1 qadam orqaga qaytish - avvalgi darajaga (ro'yxatga) qaytaradi
    if (items.length > 1) {
      const prevItem = items[items.length - 2];
      if (prevItem) {
        if (typeof prevItem.onClick === 'function') {
          prevItem.onClick();
          return;
        }
        if (prevItem.path && prevItem.path !== '#' && !prevItem.path.startsWith('#')) {
          navigate(prevItem.path);
          return;
        }
      }
    }

    // 2. Agar sahifaning asosiy ro'yxatida bo'lsa, foydalanuvchi qayerdan kelgan bo'lsa
    // aniq o'sha 1 ta oldingi sahifaga qaytadi (navigate(-1))
    const canGoBack =
      window.history.state && typeof window.history.state.idx === 'number'
        ? window.history.state.idx > 0
        : window.history.length > 1;

    if (canGoBack) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <nav className={styles.container} aria-label="Breadcrumb">
      <button
        type="button"
        onClick={handleBack}
        className={styles.backButton}
        title="1 qadam orqaga qaytish"
      >
        <ArrowLeft size={14} className={styles.backIcon} />
        <span>Orqaga</span>
      </button>

      <span className={styles.divider} />

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        if (isLast) {
          return (
            <div key={index} className={styles.item}>
              {index > 0 && <ChevronRight size={14} className={styles.separator} />}
              <span className={styles.current}>{item.label}</span>
            </div>
          );
        }

        if (item.onClick) {
          return (
            <div key={index} className={styles.item}>
              {index > 0 && <ChevronRight size={14} className={styles.separator} />}
              <button
                type="button"
                onClick={item.onClick}
                className={styles.linkButton}
              >
                {item.label}
              </button>
            </div>
          );
        }

        const hasValidPath = item.path && item.path !== '#' && !item.path.startsWith('#');

        return (
          <div key={index} className={styles.item}>
            {index > 0 && <ChevronRight size={14} className={styles.separator} />}
            {hasValidPath ? (
              <Link to={item.path} className={styles.link}>
                {item.label}
              </Link>
            ) : (
              <span className={styles.current}>{item.label}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
