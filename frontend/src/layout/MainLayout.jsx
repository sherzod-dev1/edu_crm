import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import Footer from './Footer';
import MobileBottomNav from './MobileBottomNav';
import { ContractReminderBanner } from '../components';
import styles from './mainLayout.module.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.layoutContainer}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <div className={styles.contentWrapper}>
        <Navbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className={styles.mainContent}>
          <ContractReminderBanner />
          <Outlet />
        </main>
        <Footer />
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default MainLayout;
