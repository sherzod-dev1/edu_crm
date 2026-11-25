import React from 'react';
import styles from './footer.module.css';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <p>© {new Date().getFullYear()} EDU CRM — O'quv Markaz Boshqaruv Tizimi. Barcha huquqlar himoyalangan.</p>
    </footer>
  );
};

export default Footer;
