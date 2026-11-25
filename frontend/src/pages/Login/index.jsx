import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { login, clearError } from '../../store/slices/authSlice';
import styles from './login.module.css';
import { Button, Inputs } from '../../components';
import { GraduationCap, Mail, Lock, AlertCircle, Phone, Users } from 'lucide-react';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth || {});

  // Kirish rejimi: 'staff' (Xodimlar/Email) yoki 'parent' (Ota-ona/Telefon)
  const [loginMode, setLoginMode] = useState('staff');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [parentFormData, setParentFormData] = useState({
    phone: '',
    password: '',
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, navigate, dispatch]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleParentChange = (e) => {
    setParentFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loginMode === 'staff') {
      if (!formData.email || !formData.password) return;
      dispatch(login({ email: formData.email, password: formData.password }));
    } else {
      if (!parentFormData.phone || !parentFormData.password) return;
      dispatch(login({
        email: parentFormData.phone,
        phone: parentFormData.phone,
        password: parentFormData.password
      }));
    }
  };

  const handleModeSwitch = (mode) => {
    dispatch(clearError());
    setLoginMode(mode);
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconCircle}>
            {loginMode === 'parent' ? <Users size={28} /> : <GraduationCap size={28} />}
          </div>
          <h1 className={styles.title}>
            {loginMode === 'parent' ? "Ota-ona Kabineti" : "EDU CRM Tizimi"}
          </h1>
          <p className={styles.subtitle}>
            {loginMode === 'parent'
              ? "Farzandingiz baholari va davomatini ko'rish uchun telefon raqam orqali kiring"
              : "Boshqaruv paneliga kirish uchun ma'lumotlaringizni kiriting"}
          </p>
        </div>

        {error && (
          <div className={styles.alert}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {loginMode === 'staff' ? (
          <form className={styles.form} onSubmit={handleSubmit}>
            <Inputs
              label="Email manzil"
              name="email"
              type="text"
              value={formData.email}
              onChange={handleChange}
              placeholder=""
              icon={Mail}
              required
            />

            <Inputs
              label="Maxfiy parol"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              icon={Lock}
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              Tizimga kirish
            </Button>

            <div className={styles.divider}>
              <span>yoki</span>
            </div>

            <button
              type="button"
              className={styles.parentSwitchBtn}
              onClick={() => handleModeSwitch('parent')}
            >
              <Users size={16} />
              <span>Ota-ona kabinetiga kirish (Telefon raqam orqali)</span>
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <Inputs
              label="Telefon raqam"
              name="phone"
              type="tel"
              value={parentFormData.phone}
              onChange={handleParentChange}
              placeholder="+998 90 123 45 67"
              icon={Phone}
              required
            />

            <Inputs
              label="Maxfiy parol"
              name="password"
              type="password"
              value={parentFormData.password}
              onChange={handleParentChange}
              placeholder="••••••••"
              icon={Lock}
              required
            />

            <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
              Ota-ona sifatida kirish
            </Button>

            <button
              type="button"
              className={styles.backToStaffBtn}
              onClick={() => handleModeSwitch('staff')}
            >
              ← Boshqaruv paneliga qaytish (Email orqali)
            </button>
          </form>
        )}

        <div className={styles.footer}>
          <p>© {new Date().getFullYear()} EDU CRM. Barcha huquqlar himoyalangan.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
