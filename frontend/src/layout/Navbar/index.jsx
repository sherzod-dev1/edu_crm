import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchNotifications } from '../../store/slices/notificationSlice';
import attendanceApi from '../../services/attendanceApi';
import gradeApi from '../../services/gradeApi';
import styles from './navbar.module.css';
import { Menu, Bell, Search, ShieldCheck, AlertTriangle } from 'lucide-react';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';

const Navbar = ({ onToggleSidebar }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const { items: notifications = [] } = useSelector((state) => state.notification || {});

  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';

  const userPosition = formatStaffPosition(
    user?.position || user?.employee?.position || user?.employee_profile?.position
  );
  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isStudent = userRole === 'STUDENT';
  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER';
  const isInspector =
    userPosition === 'Nazoratchi' ||
    userRole === 'NAZORATCHI' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'INSPECTOR';

  // Bildirishnomalar faqat Admin, Manager va Nazoratchilarga (hamda Super Adminga) ko'rinsin!
  const canSeeNotifications = isSuperAdmin || isAdmin || isManager || isInspector;

  const [liveAlertCount, setLiveAlertCount] = React.useState(0);
  const [studentCoins, setStudentCoins] = React.useState(user?.coins || user?.student?.coins || 0);

  useEffect(() => {
    if (!isStudent) return;

    const fetchMyCoins = async () => {
      try {
        const res = await gradeApi.getMyCoins();
        if (res.data?.success && res.data?.data?.coins !== undefined) {
          setStudentCoins(res.data.data.coins);
        }
      } catch (e) {
        // quiet fallback
      }
    };

    fetchMyCoins();
    // Poll every 5s so when teacher grades in real-time, coins update live
    const coinsInterval = setInterval(fetchMyCoins, 5000);
    window.addEventListener('coins_updated', fetchMyCoins);

    return () => {
      clearInterval(coinsInterval);
      window.removeEventListener('coins_updated', fetchMyCoins);
    };
  }, [isStudent, user?.id]);

  useEffect(() => {
    if (!isInspector) return;
    const checkLiveAlerts = async () => {
      try {
        const res = await attendanceApi.getLiveMonitor();
        if (res?.data?.stats?.alertCount !== undefined) {
          setLiveAlertCount(res.data.stats.alertCount);
        }
      } catch (e) {
        // quiet error
      }
    };
    checkLiveAlerts();
    const alertInterval = setInterval(checkLiveAlerts, 15000);
    return () => clearInterval(alertInterval);
  }, [isInspector]);

  useEffect(() => {
    if (!canSeeNotifications) return;

    // Initial fetch of notifications
    if (isSuperAdmin) {
      dispatch(fetchNotifications({ admin_only: true }));
    } else {
      dispatch(fetchNotifications());
    }

    // Interval to refresh notifications every 15 seconds for fast updates
    const interval = setInterval(() => {
      if (isSuperAdmin) {
        dispatch(fetchNotifications({ admin_only: true }));
      } else {
        dispatch(fetchNotifications());
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [dispatch, isSuperAdmin, canSeeNotifications]);

  // Calculate unread count (Faqat so'nggi 7 kunlik o'qilmagan xabarlar)
  let unreadCount = 0;
  if (canSeeNotifications && !isSuperAdmin) {
    const currentUserId = user?.id ? Number(user.id) : null;
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    unreadCount = notifications.filter((item) => {
      if (item.is_read) return false;
      const createdTime = new Date(item.created_at || Date.now()).getTime();
      if (createdTime < sevenDaysAgo) return false;
      if (item.user_id && currentUserId) {
        return Number(item.user_id) === currentUserId;
      }
      return false;
    }).length;
  }

  return (
    <header className={styles.navbar}>
      <div className={styles.leftSection}>
        <button className={styles.menuBtn} onClick={onToggleSidebar} aria-label="Menyu">
          <Menu size={22} />
        </button>
        <div className={styles.searchBox}>
          <Search size={16} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Tizim bo'yicha qidirish..."
            className={styles.searchInput}
          />
        </div>
      </div>

      <div className={styles.rightSection}>
        {isInspector && liveAlertCount > 0 && (
          <button
            type="button"
            className={styles.navbarLiveAlertBtn}
            onClick={() => navigate('/lessons?tab=live')}
            title={`${liveAlertCount} ta xonada dars boshlanganiga 10 daqiqadan oshdi, lekin talabalar davomati olinmagan!`}
          >
            <AlertTriangle size={15} />
            <span className={styles.alertFullText}>{liveAlertCount} TA XONADA DAVOMAT YO'Q!</span>
            <span className={styles.alertShortText}>{liveAlertCount}</span>
          </button>
        )}

        {isStudent && (
          <button
            type="button"
            onClick={() => navigate('/market')}
            className={styles.navbarCoinsBtn}
            title="Sizning joriy tangalaringiz balansi. Sovg'alar do'koniga o'tish uchun bosing"
          >
            <span style={{ fontSize: '15px' }}>🪙</span>
            <span className={styles.coinsFullText}>Sizning Tangalaringiz: <strong style={{ color: '#713f12', fontSize: '14px', fontWeight: 800 }}>{studentCoins}</strong></span>
            <span className={styles.coinsShortText}><strong style={{ color: '#713f12', fontSize: '13px', fontWeight: 800 }}>{studentCoins}</strong></span>
          </button>
        )}

        {canSeeNotifications && (
          <button
            className={`${styles.iconButton} ${unreadCount > 0 ? styles.iconButtonWithNotif : ''}`}
            onClick={() => navigate('/notifications')}
            title={unreadCount > 0 ? `${unreadCount} ta yangi xabar mavjud!` : "Xabarnomalar"}
          >
            <Bell size={18} className={unreadCount > 0 ? styles.bellRinging : ''} />
            {unreadCount > 0 && (
              <span className={styles.badge}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        )}

        <div className={styles.userProfile} onClick={() => navigate('/profile')}>
          <div className={styles.avatar}>
            {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className={styles.userInfoCol}>
            <span className={styles.name}>{user?.full_name || 'Foydalanuvchi'}</span>
            {!isSuperAdmin && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                🏢 {user?.branch?.name || user?.full_name || "O'quv Maskani"}
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

