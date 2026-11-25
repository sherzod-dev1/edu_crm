import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Award,
  ClipboardCheck,
  Calendar,
  User,
  LayoutDashboard,
  Users,
  GraduationCap,
  FolderKanban
} from 'lucide-react';
import styles from './mobileBottomNav.module.css';

const MobileBottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth || {});

  const role = (user?.role || '').toUpperCase();
  const isParent = role === 'PARENT';
  const isStudent = role === 'STUDENT';
  const isTeacher = role === 'TEACHER';

  // Determine current active section for Parent
  const currentTab = searchParams.get('tab') || 'grades';
  const isProfilePage = location.pathname === '/profile';
  const isParentPortalOrDash =
    location.pathname === '/parent-portal' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/';

  // Define navigation items based on user role
  let navItems = [];

  if (isParent) {
    navItems = [
      {
        id: 'grades',
        label: 'Baholar',
        icon: Award,
        isActive: isParentPortalOrDash && currentTab === 'grades' && !isProfilePage,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('parent_tab_switch', { detail: 'grades' }));
          if (location.pathname !== '/parent-portal' && location.pathname !== '/dashboard') {
            navigate('/dashboard?tab=grades');
          } else {
            setSearchParams({ tab: 'grades' });
          }
        }
      },
      {
        id: 'attendance',
        label: 'Davomat',
        icon: ClipboardCheck,
        isActive: isParentPortalOrDash && currentTab === 'attendance' && !isProfilePage,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('parent_tab_switch', { detail: 'attendance' }));
          if (location.pathname !== '/parent-portal' && location.pathname !== '/dashboard') {
            navigate('/dashboard?tab=attendance');
          } else {
            setSearchParams({ tab: 'attendance' });
          }
        }
      },
      {
        id: 'schedule',
        label: 'Dars kunlari',
        icon: Calendar,
        isActive: isParentPortalOrDash && currentTab === 'schedule' && !isProfilePage,
        onClick: () => {
          window.dispatchEvent(new CustomEvent('parent_tab_switch', { detail: 'schedule' }));
          if (location.pathname !== '/parent-portal' && location.pathname !== '/dashboard') {
            navigate('/dashboard?tab=schedule');
          } else {
            setSearchParams({ tab: 'schedule' });
          }
        }
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: User,
        isActive: isProfilePage,
        onClick: () => {
          navigate('/profile');
        }
      }
    ];
  } else if (isStudent) {
    navItems = [
      {
        id: 'dashboard',
        label: 'Bosh sahifa',
        icon: LayoutDashboard,
        isActive: location.pathname === '/dashboard' || location.pathname === '/',
        onClick: () => navigate('/dashboard')
      },
      {
        id: 'lessons',
        label: 'Darslar',
        icon: Calendar,
        isActive: location.pathname === '/lessons',
        onClick: () => navigate('/lessons')
      },
      {
        id: 'grades',
        label: 'Baholar',
        icon: Award,
        isActive: location.pathname === '/grades',
        onClick: () => navigate('/grades')
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: User,
        isActive: isProfilePage,
        onClick: () => navigate('/profile')
      }
    ];
  } else if (isTeacher) {
    navItems = [
      {
        id: 'dashboard',
        label: 'Bosh sahifa',
        icon: LayoutDashboard,
        isActive: location.pathname === '/dashboard' || location.pathname === '/',
        onClick: () => navigate('/dashboard')
      },
      {
        id: 'groups',
        label: 'Guruhlar',
        icon: FolderKanban,
        isActive: location.pathname === '/groups',
        onClick: () => navigate('/groups')
      },
      {
        id: 'attendance',
        label: 'Davomat',
        icon: ClipboardCheck,
        isActive: location.pathname === '/attendance',
        onClick: () => navigate('/attendance')
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: User,
        isActive: isProfilePage,
        onClick: () => navigate('/profile')
      }
    ];
  } else {
    // Admin / Super Admin
    navItems = [
      {
        id: 'dashboard',
        label: 'Bosh sahifa',
        icon: LayoutDashboard,
        isActive: location.pathname === '/dashboard' || location.pathname === '/',
        onClick: () => navigate('/dashboard')
      },
      {
        id: 'employees',
        label: 'Xodimlar',
        icon: Users,
        isActive: location.pathname === '/employees',
        onClick: () => navigate('/employees')
      },
      {
        id: 'students',
        label: 'Talabalar',
        icon: GraduationCap,
        isActive: location.pathname === '/students',
        onClick: () => navigate('/students')
      },
      {
        id: 'profile',
        label: 'Profil',
        icon: User,
        isActive: isProfilePage,
        onClick: () => navigate('/profile')
      }
    ];
  }

  return (
    <nav className={styles.bottomNav} aria-label="Mobil pastki bo'limlar">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            className={`${styles.navItem} ${item.isActive ? styles.activeItem : ''}`}
            onClick={item.onClick}
          >
            <div className={styles.iconBox}>
              <IconComponent size={20} />
            </div>
            <span className={styles.navLabel}>{item.label}</span>
            {item.isActive && <span className={styles.activeDot} />}
          </button>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;

