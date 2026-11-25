import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import employeeApi from '../../services/employeeApi';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';
import styles from './sidebar.module.css';
import { GiTeacher } from "react-icons/gi";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  ShieldCheck,
  BookOpen,
  Layers,
  FolderKanban,
  UserPlus,
  DoorOpen,
  Calendar,
  ClipboardCheck,
  CreditCard,
  Banknote,
  FileCheck2,
  Award,
  Bell,
  Sparkles,
  PlaySquare,
  Activity,
  User,
  LogOut,
  X,
  Bot,
  FileText,
  BarChart3,
  ShoppingBag,
  Coins,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth || {});

  const checkIsActive = (itemPath, defaultIsActive) => {
    if (itemPath.includes('?')) {
      const [pathPart, searchPart] = itemPath.split('?');
      if (location.pathname !== pathPart) return false;
      const currentParams = new URLSearchParams(location.search);
      const targetParams = new URLSearchParams(searchPart);

      const targetTab = targetParams.get('tab');
      if (targetTab) {
        const currentTab = currentParams.get('tab') || (pathPart === '/parent-portal' ? 'grades' : '');
        return currentTab === targetTab;
      }

      for (const [k, v] of targetParams.entries()) {
        if (currentParams.get(k) !== v) return false;
      }
      return true;
    }

    if (itemPath === '/parent-portal') {
      return location.pathname === '/parent-portal' && !location.search;
    }

    return defaultIsActive;
  };

  const role = user?.role || 'STAFF';
  const isSuperAdmin = (role || '').toUpperCase() === 'SUPER_ADMIN' || (role || '').toUpperCase() === 'SUPERADMIN';
  const centerName = isSuperAdmin
    ? 'CRM EDU'
    : user?.branch?.name || user?.full_name || "O'quv Markazi";

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Student specific navigation matching the user's layout
  const studentNavItems = [
    { title: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },
    { title: 'Mening Kurslarim', path: '/courses', icon: BookOpen },
    { title: 'Dars Jadvali', path: '/lessons', icon: Calendar },
    { title: 'Uy Vazifalari', path: '/homework', icon: FileText },
    { title: 'Mening Natijalarim', path: '/exam-results', icon: BarChart3 },
    { title: 'Baholar & Tangalar', path: '/grades', icon: Award },
    { title: "Sizning Tangalaringiz", path: '/market', icon: ShoppingBag },
    { title: 'Profil', path: '/profile', icon: User },
  ];

  // Parent (Ota-ona) maxsus navigatsiyasi - 3 ta asosiy bo'lim + Profil
  const parentNavItems = [
    { title: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },
    { section: "Farzandingiz O'quv Holati" },
    { title: 'Dars Baholari', path: '/parent-portal?tab=grades', icon: Award },
    { title: 'Davomat', path: '/parent-portal?tab=attendance', icon: ClipboardCheck },
    { title: 'Dars Kunlari', path: '/parent-portal?tab=schedule', icon: Calendar },
    { section: 'Shaxsiy' },
    { title: 'Profil', path: '/profile', icon: User },
  ];

  // Teacher specific navigation (excluding courses, finance, certificates, trial lessons, notifications, students)
  const teacherNavItems = [
    { title: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },
    
    // O'quv Bo'limi
    { section: "O'quv Bo'limi" },
    { title: 'Guruhlar', path: '/groups', icon: FolderKanban },
    { title: 'Dars Jadvali', path: '/lessons', icon: Calendar },
    { title: 'Davomat', path: '/attendance', icon: ClipboardCheck },
    { title: 'Uy Vazifalari', path: '/homework', icon: FileText },
    
    // Baholash
    { section: 'Baholash' },
    { title: 'Baholash & Monetlar', path: '/grades', icon: Coins },
    { title: 'Imtihonlar', path: '/exams', icon: FileCheck2 },
    
    // Shaxsiy
    { section: 'Shaxsiy' },
    { title: 'Profil', path: '/profile', icon: User },
  ];

  // Buxgalter (Accountant) specific navigation
  const accountantNavItems = [
    { title: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },

    // Moliya & Kassa (Buxgalterning asosiy mas'uliyati)
    { section: 'Moliya & Kassa' },
    { title: 'Moliya & Kassa', path: '/payments', icon: Banknote },
    { title: "To'lov Usullari", path: '/payment-methods', icon: CreditCard },

    // Talabalar & Guruhlar (To'lovlar, qarzdorliklar, kurs narxlari)
    { section: "Talabalar & Guruhlar" },
    { title: 'Talabalar', path: '/students', icon: GraduationCap },
    { title: 'Guruhlar', path: '/groups', icon: FolderKanban },
    { title: 'Kurslar', path: '/courses', icon: BookOpen },

    // Ish haqi & Xodimlar (Oylik maoshlar va hisob-kitoblar)
    { section: 'Ish haqi & Xodimlar' },
    { title: 'Xodimlar', path: '/employees', icon: Briefcase },
    { title: "O'qituvchilar", path: '/teachers', icon: GiTeacher },
    { title: "O'qituvchilar Oyligi & Davomat", path: '/teacher-attendance', icon: ClipboardCheck },

    // Shaxsiy
    { section: 'Shaxsiy' },
    { title: 'Xabarnomalar', path: '/notifications', icon: Bell },
    { title: 'Profil', path: '/profile', icon: User },
  ];

  // Nazoratchi (Supervisor / Inspector) maxsus menyusi
  const inspectorNavItems = [
    { title: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard },

    // Nazorat & Davomat
    { section: "Nazorat & Davomat" },
    { title: "Davomat", path: '/attendance', icon: ClipboardCheck },
    { title: "Dars Jadvali & Vaqti", path: '/lessons', icon: Calendar },

    // O'quv Monitoringi
    { section: "O'quv Monitoringi" },
    { title: 'Guruhlar', path: '/groups', icon: FolderKanban },
    { title: 'Dars Xonalari', path: '/classrooms', icon: DoorOpen },
    { title: "O'qituvchilar", path: '/teachers', icon: Users },
    { title: 'Talabalar', path: '/students', icon: GraduationCap },

    // Shaxsiy
    { section: "Shaxsiy" },
    { title: 'Profil', path: '/profile', icon: User },
  ];

  // Admin / Staff / Super Admin full navigation
  const defaultNavItems = [
    { title: 'Bosh sahifa', path: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    
    // Boshqaruv
    { section: 'Boshqaruv' },
    { title: 'Administratorlar', path: '/admins', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    { title: isSuperAdmin ? 'Shartnomalar' : 'Markaz Shartnomasi', path: '/contracts', icon: FileText, roles: ['ADMIN'] },
    { title: 'Foydalanuvchilar', path: '/users', icon: Users, roles: ['SUPER_ADMIN'] },
    { title: 'Filiallar', path: '/branches', icon: Building2, roles: ['SUPER_ADMIN'] },
    { title: 'Xodimlar', path: '/employees', icon: Briefcase, roles: ['ADMIN'] },
    { title: "O'qituvchilar", path: '/teachers', icon: GiTeacher, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Talabalar', path: '/students', icon: GraduationCap, roles: ['ADMIN', 'MANAGER'] },
    
    // O'quv Bo'limi
    { section: "O'quv Bo'limi" },
    { title: 'Kurslar', path: '/courses', icon: BookOpen, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Guruhlar', path: '/groups', icon: FolderKanban, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Xonalar', path: '/classrooms', icon: DoorOpen, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Dars Jadvali', path: '/lessons', icon: Calendar, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Davomat', path: '/attendance', icon: ClipboardCheck, roles: ['ADMIN', 'MANAGER'] },
    
    // Moliya
    { section: 'Moliya' },
    { title: 'Moliya & Kassa', path: '/payments', icon: Banknote, roles: ['ADMIN', 'MANAGER'] },
    { title: "To'lov Usullari", path: '/payment-methods', icon: CreditCard, roles: ['ADMIN', 'MANAGER'] },
    
    // Brend Do'kon & Imtihonlar (Baholash va Monetlar faqat o'qituvchida ko'rinadi)
    { section: "Brend Do'kon & Imtihonlar" },
    { title: "Brend Do'kon & Zakazlar", path: '/market', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Imtihonlar', path: '/exams', icon: FileCheck2, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Sertifikatlar', path: '/certificates', icon: Award, roles: ['ADMIN', 'MANAGER'] },
    
    // CRM & Marketing
    { section: 'CRM & Marketing' },
    { title: 'Lidlar (Murojaatlar)', path: '/leads', icon: Sparkles, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { title: 'Sinov Darslari', path: '/trial-lessons', icon: PlaySquare, roles: ['ADMIN', 'MANAGER'] },
    { title: 'Xabarnomalar', path: '/notifications', icon: Bell, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
    { title: 'Faoliyat Tarixi', path: '/activities', icon: Activity, roles: ['ADMIN'] },
    
    // Shaxsiy
    { section: 'Shaxsiy' },
    { title: 'Profil', path: '/profile', icon: User, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
  ];

  const [employeeProfile, setEmployeeProfile] = useState(null);

  useEffect(() => {
    if (user?.id && role !== 'TEACHER' && role !== 'STUDENT' && !isSuperAdmin) {
      if (user.position || user.employee?.position || user.employee_profile?.position) {
        return;
      }
      employeeApi.getAll({ limit: 100 })
        .then((res) => {
          const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          const emp = list.find((e) => String(e.user_id) === String(user.id) || String(e.user?.id) === String(user.id));
          if (emp) setEmployeeProfile(emp);
        })
        .catch(() => {});
    }
  }, [user?.id, role, isSuperAdmin, user?.position]);

  const rawPosition = user?.position || user?.employee?.position || user?.employee_profile?.position || employeeProfile?.position;
  const userPosition = formatStaffPosition(rawPosition);
  const userRoleStr = (user?.role?.name || user?.role_name || role || '').toUpperCase();
  const isAccountant = userPosition === 'Buxgalter' || userRoleStr === 'ACCOUNTANT';
  const isInspector =
    userPosition === 'Nazoratchi' ||
    userRoleStr === 'NAZORATCHI' ||
    userRoleStr === 'SUPERVISOR' ||
    userRoleStr === 'INSPECTOR';

  const navList = !isSuperAdmin
    ? role === 'STUDENT'
      ? studentNavItems
      : role === 'TEACHER'
      ? teacherNavItems
      : role === 'PARENT'
      ? parentNavItems
      : isAccountant
      ? accountantNavItems
      : isInspector
      ? inspectorNavItems
      : defaultNavItems
    : defaultNavItems;

  const displayRole = isSuperAdmin
    ? '👑 Sayt Yaratuvchisi'
    : role === 'ADMIN'
    ? 'Administrator'
    : role === 'TEACHER'
    ? "O'qituvchi"
    : role === 'STUDENT'
    ? 'Talaba'
    : role === 'PARENT'
    ? 'Ota-ona'
    : isInspector
    ? '🛡 Nazoratchi'
    : isAccountant
    ? 'Buxgalter'
    : userPosition || (role === 'MANAGER' ? 'Menejer' : 'Xodim');

  return (
    <>
      {isOpen && <div className={styles.backdrop} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.logoArea}>
          <NavLink to="/dashboard" className={styles.brand} title={centerName}>
            <div className={styles.brandIcon}>
              <GraduationCap size={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, maxWidth: '160px' }}>
              <span style={{ fontSize: '15px', fontWeight: 800, whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: '#ffffff' }}>
                {centerName}
              </span>
              {!isSuperAdmin && (
                <span style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, letterSpacing: '0.02em' }}>
                  O'quv Maskani
                </span>
              )}
            </div>
          </NavLink>
          <button className={styles.closeMobileBtn} onClick={onClose} aria-label="Yopish">
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {(() => {
            const userRole = (role || '').toUpperCase();
            const visibleItems = [];
            let pendingSection = null;

            navList.forEach((item) => {
              if (item.section) {
                pendingSection = item;
                return;
              }

              if (!isSuperAdmin && (item.path === '/branches' || item.path === '/admins' || item.path === '/users')) {
                return;
              }

              // Nazoratchi paneliga umuman tanga / baholash / bozor menyulari kirmasin
              if (isInspector && (item.path === '/grades' || item.path === '/market')) {
                return;
              }

              if (!isSuperAdmin && item.roles && !item.roles.map((r) => r.toUpperCase()).includes(userRole)) {
                if (isInspector && ['/attendance', '/teacher-attendance', '/lessons', '/groups', '/classrooms', '/teachers', '/students'].includes(item.path)) {
                  // allow inspector
                } else {
                  return;
                }
              }

              if (pendingSection) {
                visibleItems.push(pendingSection);
                pendingSection = null;
              }
              visibleItems.push(item);
            });

            return visibleItems.map((item, index) => {
              if (item.section) {
                return (
                  <div key={`sec-${index}`} className={styles.sectionTitle}>
                    {item.section}
                  </div>
                );
              }

              const Icon = item.icon;
              const isPremiumOnly = ['/exams', '/certificates', '/trial-lessons', '/activities'].includes(item.path);

              return (
                <NavLink
                  key={item.path + index}
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `${styles.navLink} ${checkIsActive(item.path, isActive) ? styles.active : ''}`
                  }
                >
                  <Icon size={18} />
                  <span>{item.title}</span>
                  {isPremiumOnly && !isSuperAdmin && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(245, 158, 11, 0.2)',
                        color: '#f59e0b',
                      }}
                    >
                      👑 Premium
                    </span>
                  )}
                </NavLink>
              );
            });
          })()}
        </nav>

        <div className={styles.userFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className={styles.userMeta}>
              <span className={styles.userName}>{user?.full_name || 'Super Admin'}</span>
              <span className={styles.userRole}>{displayRole}</span>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Chiqish">
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
