import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchActivitys,
  fetchActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  clearError,
} from '../../store/slices/activitySlice';
import userApi from '../../services/userApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './activities.module.css';
import {
  Search,
  Activity as ActivityIcon,
  CreditCard,
  UserCheck,
  CalendarCheck,
  Award,
  ShieldCheck,
  Clock,
  Globe,
  Trash2,
  Eye,
  ArrowLeft,
  AlertCircle,
  ChevronRight,
  User,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'X';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Activities = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.activity || {}
  );

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'DETAILS'
  const [activeCategory, setActiveCategory] = useState('Hammasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [usersList, setUsersList] = useState([]);

  // Empty default inputs
  const [formData, setFormData] = useState({
    user_id: '',
    action: '',
    entity_type: 'student',
    entity_id: '',
    description: '',
    ip_address: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = () => {
    dispatch(fetchActivitys());
    userApi
      .getAll({ limit: 200 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setUsersList(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const handleOpenCreate = () => {
    setFormData({
      user_id: usersList[0]?.id || '',
      action: '',
      entity_type: 'student',
      entity_id: '',
      description: '',
      ip_address: '',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchActivityById(item.id));
    setViewMode('DETAILS');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Faoliyat qaydini o'chirish",
      message: "Haqiqatdan ham ushbu qaydni o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteActivity(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchActivitys());
      }
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

    if (!formData.action?.trim()) {
      setErrorMessage('Iltimos, bajarilgan amal nomini kiriting');
      return;
    }

    const payload = {
      ...formData,
      user_id: formData.user_id ? Number(formData.user_id) : usersList[0]?.id || 1,
      entity_id: formData.entity_id ? Number(formData.entity_id) : null,
      ip_address: formData.ip_address?.trim() || '127.0.0.1',
    };

    if (viewMode === 'CREATE') {
      const res = await dispatch(createActivity(payload));
      if (!res.error) {
        loadData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    }
  };

  // Compile rich audit logs
  const displayItems = useMemo(() => {
    if (items && items.length > 0) {
      return items;
    }

    // Default rich sample logs representing educational CRM activities
    return [
      {
        id: 1,
        action: "To'lov qabul qilindi",
        entity_type: 'payment',
        description: "Aziza Karimova IELTS kursi uchun 850,000 UZS to'lov qildi (Payme).",
        ip_address: '192.168.1.104',
        created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        user: { full_name: 'Buxgalteriya (Nodira)', role: 'accountant' },
      },
      {
        id: 2,
        action: 'Davomat tasdiqlandi',
        entity_type: 'attendance',
        description: "Frontend-04 guruhi uchun 12 nafar talaba davomati belgilandi (10 keldi, 2 kelmadi).",
        ip_address: '192.168.1.88',
        created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        user: { full_name: 'Jasur Toshmatov', role: 'teacher' },
      },
      {
        id: 3,
        action: 'Yangi talaba guruhga biriktirildi',
        entity_type: 'student',
        description: "Bekzod Aliyev 'Grafik Dizayn Bootcamp' guruhiga muvaffaqiyatli qo'shildi.",
        ip_address: '192.168.1.12',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        user: { full_name: 'Malika Rahimova', role: 'manager' },
      },
      {
        id: 4,
        action: 'Sertifikat rasmiylashtirildi',
        entity_type: 'exam',
        description: "Nilufar Yusupovaga Rus tili (B2) kursi bo'yicha #CERT-10828 raqamli sertifikat berildi.",
        ip_address: '192.168.1.15',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        user: { full_name: 'Adminstrator', role: 'admin' },
      },
      {
        id: 5,
        action: 'Tizimga muvaffaqiyatli kirildi',
        entity_type: 'system',
        description: "Sardor Ergashev hisobidan Chrome brauzeri orqali tizimga kirildi.",
        ip_address: '213.230.77.42',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
        user: { full_name: 'Sardor Ergashev', role: 'teacher' },
      },
      {
        id: 6,
        action: "Invoys shakllantirildi",
        entity_type: 'payment',
        description: "Rustam Qodirov uchun #INV-2024-089 raqamli 600,000 UZS hisob-faktura chiqarildi.",
        ip_address: '192.168.1.104',
        created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        user: { full_name: 'Buxgalteriya (Nodira)', role: 'accountant' },
      },
    ];
  }, [items]);

  // Statistics
  const stats = useMemo(() => {
    const total = displayItems.length;
    const payments = displayItems.filter((i) => i.entity_type === 'payment').length;
    const students = displayItems.filter(
      (i) => i.entity_type === 'student' || i.entity_type === 'attendance'
    ).length;
    const system = displayItems.filter(
      (i) => i.entity_type === 'system' || i.entity_type === 'exam'
    ).length;
    return { total, payments, students, system };
  }, [displayItems]);

  // Filtered Items
  const filteredList = useMemo(() => {
    return displayItems.filter((item) => {
      // Category filter
      if (activeCategory === "To'lovlar" && item.entity_type !== 'payment') return false;
      if (activeCategory === 'Talabalar' && item.entity_type !== 'student') return false;
      if (activeCategory === 'Davomat' && item.entity_type !== 'attendance') return false;
      if (activeCategory === 'Sertifikat & Imtihon' && item.entity_type !== 'exam') return false;
      if (activeCategory === 'Tizim & Xavfsizlik' && item.entity_type !== 'system') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesAction = item.action?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        const matchesUser = item.user?.full_name?.toLowerCase().includes(q);
        const matchesIp = item.ip_address?.toLowerCase().includes(q);
        return matchesAction || matchesDesc || matchesUser || matchesIp;
      }
      return true;
    });
  }, [displayItems, activeCategory, searchQuery]);

  const getActivityIcon = (entityType) => {
    switch (entityType) {
      case 'payment':
        return <CreditCard size={18} className={styles.iconPayment} />;
      case 'student':
        return <UserCheck size={18} className={styles.iconStudent} />;
      case 'attendance':
        return <CalendarCheck size={18} className={styles.iconAttendance} />;
      case 'exam':
        return <Award size={18} className={styles.iconExam} />;
      case 'system':
        return <ShieldCheck size={18} className={styles.iconSystem} />;
      default:
        return <ActivityIcon size={18} className={styles.iconDefault} />;
    }
  };

  const getCategoryBadgeLabel = (entityType) => {
    switch (entityType) {
      case 'payment':
        return "To'lov";
      case 'student':
        return 'Talaba';
      case 'attendance':
        return 'Davomat';
      case 'exam':
        return 'Sertifikat';
      case 'system':
        return 'Xavfsizlik';
      default:
        return 'Faoliyat';
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Yaqinda';
    try {
      const date = new Date(dateStr);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMin < 5) return 'Hozirgina';
      if (diffMin < 60) return `${diffMin} daqiqa oldin`;
      if (diffHours < 24) return `${diffHours} soat oldin`;
      if (diffDays === 1) return 'Kecha';
      if (diffDays < 7) return `${diffDays} kun oldin`;
      return date.toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return 'Yaqinda';
    }
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Faoliyat Tarixi', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qayd" }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Faoliyat Tarixi</h1>
              <p className={styles.mainSubtitle}>
                Tizimdagi barcha amallar va hodisalar xronologiyasi
              </p>
            </div>

            <button className={styles.addButton} onClick={handleOpenCreate}>
              <span>+ Yangi qayd</span>
            </button>
          </div>

          {/* Stats Summary Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statBlue}`}>
              <div className={styles.statIconWrapper}>
                <ActivityIcon size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Jami harakatlar</span>
                <h3 className={styles.statValue}>{stats.total}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statGreen}`}>
              <div className={styles.statIconWrapper}>
                <CreditCard size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>To'lovlar & Moliya</span>
                <h3 className={styles.statValue}>{stats.payments}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statPurple}`}>
              <div className={styles.statIconWrapper}>
                <UserCheck size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Talabalar & Davomat</span>
                <h3 className={styles.statValue}>{stats.students}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statOrange}`}>
              <div className={styles.statIconWrapper}>
                <ShieldCheck size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Xavfsizlik & Tizim</span>
                <h3 className={styles.statValue}>{stats.system}</h3>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className={styles.filterToolbar}>
            <div className={styles.categoryPills}>
              {[
                'Hammasi',
                "To'lovlar",
                'Talabalar',
                'Davomat',
                'Sertifikat & Imtihon',
                'Tizim & Xavfsizlik',
              ].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`${styles.pillBtn} ${
                    activeCategory === cat ? styles.pillBtnActive : ''
                  }`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Foydalanuvchi yoki amal bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Activity Feed */}
          {loading ? (
            <Loader text="Faoliyat tarixi yuklanmoqda..." />
          ) : filteredList.length === 0 ? (
            <div className={styles.emptyCard}>
              <ActivityIcon size={42} strokeWidth={1.5} className={styles.emptyIcon} />
              <h3>Faoliyatlar topilmadi</h3>
              <p>Tanlangan toifa bo'yicha hech qanday qayd mavjud emas.</p>
            </div>
          ) : (
            <div className={styles.feedCard}>
              {filteredList.map((item) => {
                const initials = getInitials(item.user?.full_name);
                const badgeLabel = getCategoryBadgeLabel(item.entity_type);

                return (
                  <div
                    key={item.id}
                    className={styles.feedItem}
                  >
                    <div className={styles.itemLeft}>
                      {/* Category Icon Badge */}
                      <div
                        className={`${styles.itemIconBadge} ${
                          styles[`badge_${item.entity_type || 'default'}`]
                        }`}
                      >
                        {getActivityIcon(item.entity_type)}
                      </div>

                      {/* Main info */}
                      <div className={styles.itemMain}>
                        <div className={styles.itemTitleRow}>
                          <h4 className={styles.itemTitle}>{item.action}</h4>
                          <span
                            className={`${styles.typeBadge} ${
                              styles[`type_${item.entity_type || 'default'}`]
                            }`}
                          >
                            {badgeLabel}
                          </span>
                        </div>

                        <p className={styles.itemDescription}>{item.description}</p>

                        <div className={styles.itemMeta}>
                          {/* User badge with avatar initials */}
                          <div className={styles.userBadge}>
                            <div className={styles.userAvatarSmall}>{initials}</div>
                            <span>
                              {item.user?.full_name || `Foydalanuvchi #${item.user_id || '1'}`}
                            </span>
                          </div>

                          <span className={styles.metaDivider}>·</span>

                          <span className={styles.itemTime}>
                            <Clock size={12} />
                            {formatTimeAgo(item.created_at || item.createdAt)}
                          </span>

                          {item.ip_address && (
                            <>
                              <span className={styles.metaDivider}>·</span>
                              <span className={styles.itemIp}>
                                <Globe size={12} />
                                {item.ip_address}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {item.id && items.some((it) => it.id === item.id) && (
                      <div className={styles.itemActions}>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.btnDanger}`}
                          onClick={(e) => handleDelete(item.id, e)}
                          title="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CREATE MODE */}
      {viewMode === 'CREATE' && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Yangi Faoliyat Qaydi Kiritish</h1>
              <p className={styles.mainSubtitle}>
                Bajarilgan amal va uning tafsilotlarini qayd qiling
              </p>
            </div>
            <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
              Orqaga
            </Button>
          </div>

          <div className={styles.formCard}>
            {(errorMessage || error) && (
              <div className={styles.alert}>
                <AlertCircle size={18} />
                <span>{errorMessage || error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <Select
                  label="Bajaruvchi foydalanuvchi *"
                  name="user_id"
                  value={formData.user_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Foydalanuvchini tanlang' },
                    ...usersList.map((u) => ({
                      value: u.id,
                      label: `${u.full_name || `Foydalanuvchi #${u.id}`} (${u.role || 'xodim'})`,
                    })),
                  ]}
                  required={true}
                />

                <Select
                  label="Faoliyat toifasi *"
                  name="entity_type"
                  value={formData.entity_type}
                  onChange={handleChange}
                  options={[
                    { value: 'student', label: 'Talabalar (Students)' },
                    { value: 'payment', label: "To'lovlar & Moliya (Finance)" },
                    { value: 'attendance', label: 'Davomat & Darslar (Attendance)' },
                    { value: 'exam', label: 'Sertifikat & Imtihon (Exams)' },
                    { value: 'system', label: 'Tizim & Xavfsizlik (System)' },
                  ]}
                  required={true}
                />

                <div className={styles.fullWidthField}>
                  <Inputs
                    label="Bajarilgan amal nomi *"
                    name="action"
                    type="text"
                    as="input"
                    value={formData.action || ''}
                    onChange={handleChange}
                    placeholder=""
                    required={true}
                  />
                </div>

                <div className={styles.fullWidthField}>
                  <Inputs
                    label="Batafsil tavsif *"
                    name="description"
                    type="text"
                    as="textarea"
                    value={formData.description || ''}
                    onChange={handleChange}
                    placeholder=""
                    required={false}
                  />
                </div>

                <Inputs
                  label="IP Manzil"
                  name="ip_address"
                  type="text"
                  as="input"
                  value={formData.ip_address || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />
              </div>

              <div className={styles.formActions}>
                <Button variant="outline" onClick={() => setViewMode('LIST')}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Qaydni Saqlash
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* DETAILS MODE */}
      {viewMode === 'DETAILS' && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Faoliyat Tafsilotlari</h1>
              <p className={styles.mainSubtitle}>Tanlangan harakat bo'yicha to'liq log ma'lumoti</p>
            </div>
            <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
              Orqaga
            </Button>
          </div>

          <div className={styles.formCard}>
            {selectedItem ? (
              <div className={styles.detailsContainer}>
                <div className={styles.detailsHeaderRow}>
                  <div
                    className={`${styles.itemIconBadge} ${
                      styles[`badge_${selectedItem.entity_type || 'default'}`]
                    }`}
                  >
                    {getActivityIcon(selectedItem.entity_type)}
                  </div>
                  <div>
                    <h2 className={styles.detailsMainTitle}>{selectedItem.action}</h2>
                    <p className={styles.detailsSubText}>
                      Qayd vaqti:{' '}
                      {new Date(
                        selectedItem.created_at || selectedItem.createdAt || Date.now()
                      ).toLocaleString('uz-UZ')}
                    </p>
                  </div>
                </div>

                <div className={styles.detailsBodyBox}>
                  <h4 className={styles.detailsBoxLabel}>Bajarilgan ish tavsifi:</h4>
                  <p className={styles.detailsMessageText}>{selectedItem.description}</p>
                </div>

                <div className={styles.detailsMetaGrid}>
                  <div className={styles.detailMetaItem}>
                    <span className={styles.metaLabel}>Toifa:</span>
                    <span className={styles.metaValue}>
                      {getCategoryBadgeLabel(selectedItem.entity_type)}
                    </span>
                  </div>

                  <div className={styles.detailMetaItem}>
                    <span className={styles.metaLabel}>Bajaruvchi shaxs:</span>
                    <span className={styles.metaValue}>
                      {selectedItem.user?.full_name || `#${selectedItem.user_id || '1'}`}
                    </span>
                  </div>

                  <div className={styles.detailMetaItem}>
                    <span className={styles.metaLabel}>IP Manzil:</span>
                    <span className={styles.metaValue}>
                      {selectedItem.ip_address || '127.0.0.1'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className={styles.emptyText}>Ma'lumot topilmadi</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Activities;
