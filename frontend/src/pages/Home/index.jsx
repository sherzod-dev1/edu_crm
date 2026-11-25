import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components';
import styles from './home.module.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>EDU CRM Tizimiga Xush Kelibsiz</h1>
      <p className={styles.desc}>
        O'quv markazining barcha jarayonlarini — talabalar, o'qituvchilar, darslar va to'lovlarni bitta qulay platformada boshqaring.
      </p>
      <Button variant="primary" size="lg" onClick={() => navigate('/dashboard')}>
        Dashboardga O'tish
      </Button>
    </div>
  );
};

export default Home;
