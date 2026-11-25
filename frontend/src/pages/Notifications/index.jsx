import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import {
  fetchNotifications,
  fetchNotificationById,
  createNotification,
  updateNotification,
  deleteNotification,
  markAllNotificationsRead,
  clearAllNotifications,
  clearSelectedItem,
  clearError,
} from '../../store/slices/notificationSlice';
import userApi from '../../services/userApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './notifications.module.css';
import {
  Search,
  Bell,
  BellRing,
  CheckCheck,
  Sparkles,
  AlertCircle,
  CreditCard,
  UserCheck,
  Calendar,
  Clock,
  ArrowLeft,
  Trash2,
  Check,
  Info,
  ChevronRight,
  ShieldCheck,
  Send,
  Building2,
  FileText,
  Users,
} from 'lucide-react';

const Notifications = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { user: currentUser } = useSelector((state) => state.auth || {});
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.notification || {}
  );

  const userRole = (currentUser?.role?.name || currentUser?.role_name || currentUser?.role || '').toUpperCase();
  const rawPosition = currentUser?.position || currentUser?.employee?.position || currentUser?.employee_profile?.position;
  const userPosition = (rawPosition || '').toLowerCase();

  const isSuperAdmin =
    userRole === 'SUPER_ADMIN' ||
    userRole === 'SUPERADMIN' ||
    Boolean(currentUser?.is_superadmin);
  const isAdmin = userRole === 'ADMIN';
  const isManager = userRole === 'MANAGER';
  const isInspector =
    userPosition.includes('nazoratchi') ||
    userPosition.includes('inspector') ||
    userPosition.includes('supervisor') ||
    userRole === 'NAZORATCHI' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'INSPECTOR';

  const canAccess = isSuperAdmin || isAdmin || isManager || isInspector;

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'DETAILS'
  const [activeCategory, setActiveCategory] = useState('Hammasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [adminsList, setAdminsList] = useState([]);
  const [sendToAll, setSendToAll] = useState(false);

  // Form inputs for sending message / creating notification
  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    message: '',
    type: 'info',
    is_read: false,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const loadData = () => {
    if (isSuperAdmin) {
      dispatch(fetchNotifications({ admin_only: true }));
    } else {
      dispatch(fetchNotifications());
    }

    userApi
      .getAll({ role: 'ADMIN', limit: 200 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const filteredAdmins = list.filter(
          (u) => (u.role || '').toUpperCase() === 'ADMIN'
        );
        setAdminsList(filteredAdmins);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [dispatch, isSuperAdmin]);

  const handleOpenCreate = () => {
    setFormData({
      user_id: adminsList[0]?.id || '',
      title: '',
      message: '',
      type: 'info',
      is_read: false,
    });
    setSendToAll(false);
    setErrorMessage('');
    setSuccessMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleApplyTemplate = (tpl) => {
    setFormData((prev) => ({
      ...prev,
      title: tpl.title,
      message: tpl.message,
      type: tpl.type,
    }));
  };

  const handleOpenDetails = async (item) => {
    if (!item.is_read) {
      await dispatch(
        updateNotification({
          id: item.id,
          data: { is_read: true, read_at: new Date().toISOString() },
        })
      );
      loadData();
    }
    dispatch(fetchNotificationById(item.id));
    setViewMode('DETAILS');
  };

  const handleToggleRead = async (item, e) => {
    if (e) e.stopPropagation();
    const updatedStatus = !item.is_read;
    const res = await dispatch(
      updateNotification({
        id: item.id,
        data: { is_read: updatedStatus, read_at: updatedStatus ? new Date().toISOString() : null },
      })
    );
    if (!res.error) {
      loadData();
    }
  };

  const handleMarkAllRead = async () => {
    const unreadIds = displayItems.filter((it) => !it.is_read).map((it) => it.id);
    if (unreadIds.length === 0) return;

    await dispatch(markAllNotificationsRead({ ids: unreadIds }));
    loadData();
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Xabarnomani o'chirish",
      message: "Haqiqatdan ham ushbu xabarnomani o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      dispatch(clearSelectedItem());
      if (viewMode === 'DETAILS') {
        setViewMode('LIST');
      }
      await dispatch(deleteNotification(id));
      loadData();
    }
  };

  const handleClearAll = async () => {
    const isConfirmed = await confirm({
      title: "Barcha xabarnomalarni o'chirish",
      message: "Haqiqatdan ham barcha xabarnomalarni tozalab tashlamoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      confirmText: "Ha, barchasini o'chirish",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      dispatch(clearSelectedItem());
      if (viewMode === 'DETAILS') {
        setViewMode('LIST');
      }
      const allIds = displayItems.map((it) => it.id);
      await dispatch(clearAllNotifications({ ids: allIds }));
      loadData();
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!formData.title?.trim()) {
      setErrorMessage('Iltimos, xabar sarlavhasini kiriting');
      return;
    }
    if (!formData.message?.trim()) {
      setErrorMessage('Iltimos, xabar matnini kiriting');
      return;
    }

    let payload;
    if (sendToAll) {
      payload = {
        user_ids: adminsList.map((a) => a.id),
        title: formData.title,
        message: formData.message,
        type: formData.type,
      };
    } else {
      payload = {
        ...formData,
        user_id: formData.user_id ? Number(formData.user_id) : adminsList[0]?.id || 1,
      };
    }

    const res = await dispatch(createNotification(payload));
    if (!res.error) {
      setSuccessMessage("Xabar adminga muvaffaqiyatli jo'natildi! Admin panelida qo'ng'iroqcha xabarnomasi paydo bo'ldi.");
      setTimeout(() => {
        loadData();
        setViewMode('LIST');
      }, 1200);
    } else {
      setErrorMessage(res.payload || res.error.message || 'Xabar jo\'natishda xatolik yuz berdi');
    }
  };

  // Compile final notification list (Faqat so'nggi 1 haftalik - 7 kun)
  const displayItems = useMemo(() => {
    if (items && Array.isArray(items)) {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekItems = items.filter((it) => {
        const createdTime = new Date(it.created_at || Date.now()).getTime();
        return createdTime >= sevenDaysAgo;
      });

      if (isSuperAdmin) {
        // Super admin only sees actions done by or assigned to Admin users
        return weekItems.filter((it) => (it.user?.role || '').toUpperCase() === 'ADMIN');
      }
      // Faqat Admin, Manager va Nazoratchilarga tegishli boshqaruv xabarlari
      return weekItems.filter((it) => {
        const itemRole = (it.user?.role || '').toUpperCase();
        return (
          ['ADMIN', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR', 'SUPER_ADMIN', 'ACCOUNTANT', 'STAFF'].includes(itemRole) ||
          Number(it.user_id) === Number(currentUser?.id)
        );
      });
    }
    return [];
  }, [items, isSuperAdmin, currentUser?.id]);

  // Statistics
  const stats = useMemo(() => {
    const total = displayItems.length;
    const unread = displayItems.filter((i) => !i.is_read).length;
    const read = displayItems.filter((i) => i.is_read).length;
    const payments = displayItems.filter((i) => i.type === 'payment').length;
    return { total, unread, read, payments };
  }, [displayItems]);

  // Filtered by Category and Search
  const filteredList = useMemo(() => {
    return displayItems.filter((item) => {
      // Category filter
      if (activeCategory === "O'qilmagan" && item.is_read) return false;
      if (activeCategory === "O'qilgan" && !item.is_read) return false;
      if (activeCategory === "To'lovlar" && item.type !== 'payment') return false;
      if (activeCategory === "Guruh & Kurslar" && item.type !== 'group' && item.type !== 'course') return false;
      if (activeCategory === "Shartnomalar" && item.type !== 'contract') return false;
      if (activeCategory === "Xodimlar" && item.type !== 'user') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesMsg = item.message?.toLowerCase().includes(q);
        const matchesUser = item.user?.full_name?.toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesUser;
      }
      return true;
    });
  }, [displayItems, activeCategory, searchQuery]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'payment':
        return <CreditCard size={18} className={styles.iconPayment} />;
      case 'contract':
        return <FileText size={18} className={styles.iconInfo} />;
      case 'group':
        return <Sparkles size={18} className={styles.iconSystem} />;
      case 'warning':
        return <AlertCircle size={18} className={styles.iconWarning} />;
      case 'system':
        return <Sparkles size={18} className={styles.iconSystem} />;
      case 'user':
        return <UserCheck size={18} className={styles.iconUser} />;
      default:
        return <Bell size={18} className={styles.iconInfo} />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Hozirgina';
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 3) return 'Hozirgina';
      if (diffMin < 60) return `${diffMin} daqiqa oldin`;
      if (diffHours < 24) return `${diffHours} soat oldin`;
      if (diffDays === 1) return 'Kecha';
      if (diffDays < 7) return `${diffDays} kun oldin`;
      return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Yaqinda';
    }
  };

  // Pre-made quick message templates for Super Admin
  const templates = [
    {
      label: "🔔 Shartnoma to'lovi eslatmasi",
      type: "contract",
      title: "Hurmatli Administrator, oylik shartnoma to'lovi muddati yaqinlashmoqda",
      message: "Hurmatli Administrator, EDU CRM tizimidan uzluksiz foydalanish uchun oylik tarif to'lovini o'z vaqtida amalga oshirishingizni va muddatni uzaytirishingizni so'raymiz."
    },
    {
      label: "🎯 Lidlar moduli ochildi",
      type: "info",
      title: "Standart va Premium tariflarida Lidlar (CRM voronka) moduli ochildi",
      message: "Sizning markazingiz uchun yangi Lidlar & Marketing voronkasi moduli faollashtirildi. Endi o'quv markazingizga kelgan yangi murojaatlarni to'liq nazorat qilishingiz mumkin!"
    },
    {
      label: "⚡ Tizim profilaktikasi",
      type: "system",
      title: "Tizim yangilanishi va yangi qulayliklar",
      message: "Hurmatli Administrator, tizimda yangi qulayliklar joriy etildi, platforma tezligi va xavfsizligi yanada oshirildi."
    },
    {
      label: "✅ To'lov qabul qilindi",
      type: "payment",
      title: "Oylik abonent to'lovingiz qabul qilindi",
      message: "Sizning oylik tarif to'lovingiz muvaffaqiyatli qabul qilindi va tizim xizmat muddati keyingi oyga uzaytirildi. Rahmat!"
    }
  ];

  if (!canAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Xabarnomalar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: isSuperAdmin ? "Adminga Xabar Jo'natish" : "Yangi Xabarnoma" }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil" }] : []),
        ]}
      />

      {/* SUPER ADMIN NOTICE BANNER */}
      {isSuperAdmin && viewMode === 'LIST' && (
        <div className={styles.superAdminBanner}>
          <div className={styles.superAdminBannerLeft}>
            <div className={styles.superAdminIconBox}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <h3 className={styles.superAdminBannerTitle}>
                👑 Super Admin Nazorati: Faqat Administratorlar Harakatlari
              </h3>
              <p className={styles.superAdminBannerDesc}>
                Ushbu bo'limda faqat o'quv markazi administratorlari (Admin) tomonidan amalga oshirilgan to'lovlar, guruh ochish, shartnoma uzaytirish va boshqa amallar monitoring qilinadi.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            icon={Send}
            onClick={handleOpenCreate}
            style={{ background: '#3b82f6', border: 'none' }}
          >
            Adminga Xabar Jo'natish
          </Button>
        </div>
      )}

      {viewMode === 'LIST' && (
        <>
          {/* Header */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>
                {isSuperAdmin ? "Administratorlar Faoliyati & Xabarnomalar" : "Xabarnomalar"}
              </h1>
              <p className={styles.mainSubtitle}>
                {isSuperAdmin
                  ? "Markaz administratorlari bajargan so'nggi 1 haftalik amallar (7 kundan eski xabarlar tizimdan avtomatik tozalanadi)"
                  : "So'nggi 1 haftalik tizim va ma'muriy xabarnomalar (7 kundan eski xabarlar tizimdan avtomatik tozalanadi)"}
              </p>
            </div>

            <div className={styles.headerActions}>
              {stats.unread > 0 && (
                <button
                  type="button"
                  className={styles.markAllBtn}
                  onClick={handleMarkAllRead}
                  title="Hammasini o'qilgan deb belgilash"
                >
                  <CheckCheck size={16} />
                  <span>Barchasini o'qildi qilish</span>
                </button>
              )}
              {displayItems.length > 0 && (
                <button
                  type="button"
                  className={styles.markAllBtn}
                  style={{ color: '#dc2626', borderColor: '#fca5a5', background: '#fef2f2' }}
                  onClick={handleClearAll}
                  title="Barcha xabarnomalarni o'chirish"
                >
                  <Trash2 size={15} />
                  <span>Barchasini tozalash</span>
                </button>
              )}
              <button className={styles.addButton} onClick={handleOpenCreate}>
                <Send size={15} />
                <span>{isSuperAdmin ? "Adminga Xabar Jo'natish" : "Yangi xabar"}</span>
              </button>
            </div>
          </div>

          {/* Stats Summary Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statBlue}`}>
              <div className={styles.statIconWrapper}>
                <Bell size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>
                  {isSuperAdmin ? "So'nggi 7 kunlik amallar" : "So'nggi 7 kunlik xabarlar"}
                </span>
                <h3 className={styles.statValue}>{stats.total}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statOrange}`}>
              <div className={styles.statIconWrapper}>
                <BellRing size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>O'qilmaganlar</span>
                <h3 className={styles.statValue}>{stats.unread}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statGreen}`}>
              <div className={styles.statIconWrapper}>
                <CreditCard size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>To'lov amallari</span>
                <h3 className={styles.statValue}>{stats.payments}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statPurple}`}>
              <div className={styles.statIconWrapper}>
                <CheckCheck size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>O'qilganlar</span>
                <h3 className={styles.statValue}>{stats.read}</h3>
              </div>
            </div>
          </div>

          {/* Category Filter Pills & Search */}
          <div className={styles.filterToolbar}>
            <div className={styles.categoryPills}>
              {[
                { label: 'Hammasi', title: isSuperAdmin ? 'Barcha Admin amallari' : 'Hammasi' },
                { label: "O'qilmagan", title: "O'qilmaganlar" },
                { label: "To'lovlar", title: "To'lov & Kassa" },
                { label: "Guruh & Kurslar", title: "Guruh & Kurslar" },
                { label: "Shartnomalar", title: "Shartnomalar" },
                { label: "Xodimlar", title: "Talaba & O'qituvchilar" },
              ].map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  className={`${styles.pillBtn} ${
                    activeCategory === tab.label ? styles.pillBtnActive : ''
                  }`}
                  onClick={() => setActiveCategory(tab.label)}
                >
                  <span>{tab.title}</span>
                  {tab.label === "O'qilmagan" && stats.unread > 0 && (
                    <span className={styles.pillBadge}>{stats.unread}</span>
                  )}
                </button>
              ))}
            </div>

            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                placeholder={isSuperAdmin ? "Admin nomi yoki amal bo'yicha..." : "Xabarnomalarni qidirish..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Feed List */}
          {filteredList.length === 0 ? (
            <div className={styles.emptyCard}>
              <Bell size={48} className={styles.emptyIcon} />
              <h3>Xabarnomalar topilmadi</h3>
              <p>
                {searchQuery
                  ? "Qidiruv so'rovi bo'yicha hech qanday xabarnoma topilmadi."
                  : isSuperAdmin
                  ? "Hozircha administratorlar tomonidan hech qanday amal bajarilmagan."
                  : "Sizda yangi xabarnomalar mavjud emas."}
              </p>
            </div>
          ) : (
            <div className={styles.feedCard}>
              {filteredList.map((item) => (
                <div
                  key={item.id}
                  className={`${styles.feedItem} ${
                    !item.is_read ? styles.feedItemUnread : ''
                  }`}
                  onClick={() => handleOpenDetails(item)}
                >
                  <div className={styles.itemLeft}>
                    <div
                      className={`${styles.itemIconBadge} ${
                        styles[`badge_${item.type || 'info'}`] || styles.badge_info
                      }`}
                    >
                      {getNotificationIcon(item.type)}
                    </div>

                    <div className={styles.itemMain}>
                      <div className={styles.itemTitleRow}>
                        {!item.is_read && <span className={styles.unreadDot} />}
                        <h4 className={styles.itemTitle}>{item.title}</h4>
                      </div>
                      <p className={styles.itemMessage}>{item.message}</p>

                      <div className={styles.itemMeta}>
                        <span className={styles.itemTime}>
                          <Clock size={13} /> {formatTimeAgo(item.created_at)}
                        </span>

                        {item.user && (
                          <span className={styles.adminBadgeHighlight}>
                            <ShieldCheck size={13} /> Admin: {item.user.full_name}
                          </span>
                        )}

                        <span
                          className={`${styles.typeBadge} ${
                            styles[`type_${item.type || 'info'}`] || styles.type_info
                          }`}
                        >
                          {item.type || 'info'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${
                        item.is_read ? styles.btnMarkUnread : styles.btnMarkRead
                      }`}
                      onClick={(e) => handleToggleRead(item, e)}
                      title={item.is_read ? "O'qilmagan qilish" : "O'qildi deb belgilash"}
                    >
                      {item.is_read ? <Check size={15} /> : <CheckCheck size={15} />}
                    </button>

                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.btnDanger}`}
                      onClick={(e) => handleDelete(item.id, e)}
                      title="O'chirish"
                    >
                      <Trash2 size={15} />
                    </button>

                    <ChevronRight size={18} className={styles.arrowIcon} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* CREATE / SEND MESSAGE TO ADMIN VIEW */}
      {viewMode === 'CREATE' && (
        <div className={styles.formCard}>
          <div className={styles.detailsHeaderRow}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => {
                dispatch(clearSelectedItem());
                setViewMode('LIST');
              }}
              title="Orqaga"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className={styles.detailsMainTitle}>
                {isSuperAdmin ? "✉️ Adminga To'g'ridan-To'g'ri Xabar Jo'natish" : "Yangi Xabarnoma Yaratish"}
              </h2>
              <p className={styles.detailsSubText}>
                {isSuperAdmin
                  ? "Ushbu xabar tanlangan Administrator ekranidagi qo'ng'iroqcha (Bell) belgisida 'Yangi xabar' ogohlantirishi bilan ko'rinadi."
                  : "Tizim foydalanuvchilariga xabar yuborish"}
              </p>
            </div>
          </div>

          {/* Quick Template Chips */}
          {isSuperAdmin && (
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                🚀 Tezkor Tayyor Xabar Shablonlari:
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                {templates.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={styles.pillBtn}
                    onClick={() => handleApplyTemplate(tpl)}
                    style={{ fontSize: '12.5px', padding: '6px 14px' }}
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMessage && (
            <div className={styles.alert}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div style={{ padding: '14px 18px', background: '#ecfdf5', color: '#065f46', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', fontWeight: 600 }}>
              <Check size={18} color="#10b981" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              {/* Target Admin Select */}
              <div className={styles.fullWidthField}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                    Qabul qiluvchi Administrator:
                  </label>
                  {isSuperAdmin && (
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <input
                        type="checkbox"
                        checked={sendToAll}
                        onChange={(e) => setSendToAll(e.target.checked)}
                      />
                      Barcha Administratorlarga yuborish (Ommaviy)
                    </label>
                  )}
                </div>

                {!sendToAll ? (
                  <select
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    className={styles.searchInput}
                    style={{ paddingLeft: '14px' }}
                    required
                  >
                    {adminsList.map((admin) => (
                      <option key={admin.id} value={admin.id}>
                        🏢 {admin.full_name} — {admin.email || admin.phone || 'Admin'}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{ padding: '12px 16px', background: '#eff6ff', borderRadius: '10px', color: '#1d4ed8', fontSize: '13.5px', fontWeight: 600 }}>
                    👥 Tizimdagi barcha ({adminsList.length} ta) o'quv markazi administratorlariga bir vaqtda xabar jo'natiladi.
                  </div>
                )}
              </div>

              {/* Message Type */}
              <div>
                <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Xabar Turi:
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className={styles.searchInput}
                  style={{ paddingLeft: '14px' }}
                >
                  <option value="info">ℹ️ Oddiy Ma'lumot (Info)</option>
                  <option value="contract">📜 Shartnoma & Tarif (Contract)</option>
                  <option value="payment">💳 To'lov & Kassa (Payment)</option>
                  <option value="warning">⚠️ Muhim Ogohlantirish (Warning)</option>
                  <option value="system">⚡ Tizim Yangiligi (System)</option>
                </select>
              </div>

              {/* Message Title */}
              <div className={styles.fullWidthField}>
                <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Xabar Sarlavhasi:
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder=""
                  className={styles.searchInput}
                  style={{ paddingLeft: '14px' }}
                  required
                />
              </div>

              {/* Message Content */}
              <div className={styles.fullWidthField}>
                <label style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                  Xabar Matni:
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Xabar tafsilotlarini batafsil yozing..."
                  rows={5}
                  className={styles.searchInput}
                  style={{ paddingLeft: '14px', resize: 'vertical' }}
                  required
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <Button variant="outline" type="button" onClick={() => setViewMode('LIST')}>
                Bekor qilish
              </Button>
              <Button variant="primary" type="submit" icon={Send} loading={loading}>
                Xabarni Jo'natish
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* DETAILS VIEW */}
      {viewMode === 'DETAILS' && selectedItem && (
        <div className={styles.formCard}>
          <div className={styles.detailsHeaderRow}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => {
                dispatch(clearSelectedItem());
                setViewMode('LIST');
              }}
              title="Orqaga"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h2 className={styles.detailsMainTitle}>{selectedItem.title}</h2>
              <p className={styles.detailsSubText}>
                Yaratilgan vaqti: {new Date(selectedItem.created_at || Date.now()).toLocaleString('uz-UZ')}
              </p>
            </div>
          </div>

          <div className={styles.detailsContainer}>
            <div className={styles.detailsBodyBox}>
              <h5 className={styles.detailsBoxLabel}>XABAR TAFSILOTLARI</h5>
              <p className={styles.detailsMessageText}>{selectedItem.message}</p>
            </div>

            <div className={styles.detailsMetaGrid}>
              <div className={styles.detailMetaItem}>
                <span className={styles.metaLabel}>Tegishli Administrator</span>
                <span className={styles.metaValue}>
                  {selectedItem.user?.full_name || 'Barcha Adminlar'}
                </span>
              </div>

              <div className={styles.detailMetaItem}>
                <span className={styles.metaLabel}>Telefon raqami</span>
                <span className={styles.metaValue}>
                  {selectedItem.user?.phone || selectedItem.user?.email || "Mavjud emas"}
                </span>
              </div>

              <div className={styles.detailMetaItem}>
                <span className={styles.metaLabel}>Xabar Turi</span>
                <span className={styles.metaValue}>
                  <span
                    className={`${styles.typeBadge} ${
                      styles[`type_${selectedItem.type || 'info'}`] || styles.type_info
                    }`}
                  >
                    {selectedItem.type || 'info'}
                  </span>
                </span>
              </div>

              <div className={styles.detailMetaItem}>
                <span className={styles.metaLabel}>Holati</span>
                <span className={styles.metaValue}>
                  <span
                    className={`${styles.statusBadge} ${
                      selectedItem.is_read ? styles.statusRead : styles.statusUnread
                    }`}
                  >
                    {selectedItem.is_read ? "O'qilgan" : "O'qilmagan (Yangi)"}
                  </span>
                </span>
              </div>
            </div>

            <div className={styles.formActions}>
              <Button
                variant={selectedItem.is_read ? "outline" : "primary"}
                icon={selectedItem.is_read ? Check : CheckCheck}
                onClick={() => handleToggleRead(selectedItem)}
              >
                {selectedItem.is_read ? "O'qilmagan deb belgilash" : "O'qildi deb belgilash"}
              </Button>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => handleDelete(selectedItem.id)}
              >
                O'chirish
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
