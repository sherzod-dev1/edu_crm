import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers, fetchUserById, createUser, updateUser, deleteUser, clearError } from '../../store/slices/userSlice';
import { fetchBranches } from '../../store/slices/branchSlice';
import teacherApi from '../../services/teacherApi';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './users.module.css';
import { GiTeacher } from 'react-icons/gi';
import {
  Plus,
  Search,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  MoreHorizontal,
  UserCheck,
  ShieldCheck,
  Building2,
  Lock,
  BookOpen,
  GraduationCap,
  LayoutGrid,
  List,
  Phone,
  Clock,
  Banknote,
  Mail,
} from 'lucide-react';

const Users = ({ initialRole }) => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { items, selectedItem, loading, error } = useSelector((state) => state.user || {});
  const { items: branches } = useSelector((state) => state.branch || {});
  const { user: currentUser } = useSelector((state) => state.auth || {});

  const currentRoleName = (currentUser?.role?.name || currentUser?.role_name || currentUser?.role || '').toUpperCase();
  const isSuperAdmin =
    currentRoleName === 'SUPER_ADMIN' ||
    currentRoleName === 'SUPERADMIN' ||
    Boolean(currentUser?.is_superadmin);

  const isAdminMode =
    initialRole === 'ADMIN' ||
    location.pathname === '/admins' ||
    searchParams.get('role')?.toUpperCase() === 'ADMIN';

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [displayMode, setDisplayMode] = useState('LIST'); // 'LIST' (Jadval) | 'GRID' (Karta / Box)
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(isAdminMode ? 'ADMIN' : 'ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [teachersList, setTeachersList] = useState([]);

  useEffect(() => {
    if (isAdminMode) {
      setRoleFilter('ADMIN');
    } else {
      setRoleFilter('ALL');
    }
    setCurrentPage(1);
  }, [location.pathname, isAdminMode]);

  // Active Dropdown state for table action menu
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const dropdownRef = useRef(null);

  const getModulesForPlan = (plan) => {
    const p = (plan || 'Standart').toLowerCase();
    const isStarter = p === 'starter';
    const isPremium = p === 'premium';
    const studentLimit = isStarter ? '200 - 600' : isPremium ? '1001 - 1800' : '601 - 1000';
    const hasLeads = !isStarter; // Standart va Premium da faol

    return [
      { id: 'dashboard', name: 'Bosh sahifa', desc: 'Doim yoqiq', enabled: true, locked: true },
      { id: 'students', name: `Talabalar (Sig'im: ${studentLimit} talaba)`, desc: 'Doim yoqiq', enabled: true, locked: true },
      { id: 'groups', name: 'Guruhlar, Kurslar va Xonalar', desc: 'Dars vaqti, guruh va xonalar', enabled: true, locked: false },
      { id: 'attendance', name: 'Dars jadvali va Davomat', desc: 'Kunlik davomat va jadval', enabled: true, locked: false },
      { id: 'payments', name: 'Moliya & Kassa', desc: isPremium ? '💎 To\'liq kengaytirilgan moliya' : 'Oddiy kassa va to\'lovlar', enabled: true, locked: false },
      { id: 'leads', name: 'Lidlar (Murojaatlar / CRM)', desc: hasLeads ? '✅ Faol (Lidlar & Voronka boshqaruvi)' : '❌ Standart va Premium tarifda', enabled: hasLeads, locked: isStarter, premiumOnly: false },
      { id: 'tests', name: 'Imtihonlar va Testlar', desc: isPremium ? '✅ Faol (Ball va natijalar)' : '❌ Faqat Premium tarifda', enabled: isPremium, locked: !isPremium, premiumOnly: true },
      { id: 'certificates', name: 'Sertifikatlar generatsiyasi', desc: isPremium ? '✅ Faol (Avtomatik sertifikat)' : '❌ Faqat Premium tarifda', enabled: isPremium, locked: !isPremium, premiumOnly: true },
      { id: 'sms', name: 'SMS xabarnoma tizimi', desc: isPremium ? '✅ Faol (Ota-onaga SMS)' : '❌ Faqat Premium tarifda', enabled: isPremium, locked: !isPremium, premiumOnly: true },
      { id: 'reports', name: 'Kengaytirilgan hisobotlar', desc: isPremium ? '✅ Faol (Daromad, o\'sish tahlili)' : '❌ Faqat Premium tarifda', enabled: isPremium, locked: !isPremium, premiumOnly: true },
      { id: 'audit', name: 'Audit log (Faoliyat tarixi)', desc: isPremium ? '✅ Faol (Kim nima qildi)' : '❌ Faqat Premium tarifda', enabled: isPremium, locked: !isPremium, premiumOnly: true },
    ];
  };

  const [adminModules, setAdminModules] = useState(getModulesForPlan('Standart'));

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: isAdminMode ? 'ADMIN' : 'MANAGER',
    branch_id: '',
    status: 'active',
    password: '',
    specialization: '',
    center_name: '',
    plan: 'Standart',
    login: '',
    max_students: 1000,
  });
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchBranches());

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});
  }, [dispatch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePlanChange = (e) => {
    const newPlan = e.target.value;
    const p = newPlan.toLowerCase();
    const defaultMax = p === 'starter' ? 600 : p === 'premium' ? 1800 : 1000;
    setFormData((prev) => ({
      ...prev,
      plan: newPlan,
      max_students: defaultMax,
    }));
    setAdminModules(getModulesForPlan(newPlan));
  };

  const handleOpenCreate = () => {
    setShowAdminPassword(false);
    setAdminModules(getModulesForPlan('Standart'));
    setFormData({
      full_name: '',
      email: '',
      phone: '+998',
      role: 'ADMIN',
      branch_id: branches[0]?.id || '',
      status: 'active',
      password: '',
      specialization: '',
      center_name: '',
      plan: 'Standart',
      login: '',
      max_students: 300,
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    setOpenDropdownId(null);
    dispatch(fetchUserById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item) => {
    setOpenDropdownId(null);
    setShowAdminPassword(false);
    const adminPlan = item.plan || item.branch?.plan || 'Standart';
    setAdminModules(getModulesForPlan(adminPlan));
    setFormData({
      id: item.id,
      full_name: item.full_name || '',
      email: item.email || '',
      phone: item.phone || '',
      role: item.role || 'ADMIN',
      branch_id: item.branch_id || (branches[0]?.id || ''),
      status: item.status || 'active',
      password: item.plain_password || item.password || 'admin123',
      specialization: '',
      center_name: item.full_name || '',
      plan: adminPlan,
      login: item.email ? item.email.split('@')[0] : '',
      max_students: item.max_students || item.branch?.max_students || (adminPlan === 'Premium' ? 1000 : 300),
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id) => {
    setOpenDropdownId(null);
    const isConfirmed = await confirm({
      title: "Foydalanuvchini o'chirish",
      message: "Haqiqatdan ham ushbu foydalanuvchini o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      confirmText: "Ha, o'chirilsin",
      cancelText: "Bekor qilish",
      type: "danger",
    });

    if (isConfirmed) {
      const res = await dispatch(deleteUser(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchUsers());
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

    const payload = { ...formData };

    if (isAdminMode) {
      payload.full_name = payload.center_name || payload.full_name;
      payload.role = 'ADMIN';
      if (!payload.email && payload.login) {
        payload.email = `${payload.login.toLowerCase()}@edu.uz`;
      }
      if (!payload.branch_id && branches.length > 0) {
        payload.branch_id = branches[0].id;
      }
      if (viewMode === 'CREATE' && !payload.password) {
        payload.password = 'admin123';
      }
    }

    if (payload.branch_id) payload.branch_id = Number(payload.branch_id);
    if (payload.password) {
      payload.plain_password = payload.password;
    } else {
      delete payload.password;
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createUser(payload));
      if (!res.error) {
        dispatch(fetchUsers());
        dispatch(fetchBranches());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateUser({ id: formData.id, data: payload }));
      if (!res.error) {
        dispatch(fetchUsers());
        dispatch(fetchBranches());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  // Helper for Initials (e.g. "Aziza Karimova" -> "AK")
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  // Stats Calculations (Dynamic for Administratorlar vs Foydalanuvchilar)
  const stats = useMemo(() => {
    const userList = items || [];

    if (isAdminMode) {
      const adminList = userList.filter(
        (u) => (u.role || '').toUpperCase() === 'ADMIN'
      );
      const total = adminList.length;
      const active = adminList.filter((u) => (u.status || 'active') === 'active').length;
      const blocked = adminList.filter(
        (u) => u.status === 'inactive' || u.status === 'blocked'
      ).length;
      const branchCount = new Set(adminList.map((u) => u.branch_id).filter(Boolean)).size;

      return { total, active, blocked, branchCount: branchCount || branches.length, isAdmins: true };
    }

    const total = userList.length;
    const teachers = userList.filter(
      (u) => (u.role || '').toUpperCase() === 'TEACHER'
    ).length;
    const active = userList.filter((u) => (u.status || 'active') === 'active').length;
    const blocked = userList.filter(
      (u) => u.status === 'inactive' || u.status === 'blocked'
    ).length;

    return { total, teachers, active, blocked };
  }, [items, isAdminMode, branches]);

  // Filtering users by Role & Search query
  const filteredUsers = useMemo(() => {
    return (items || []).filter((u) => {
      const r = (u.role || '').toUpperCase();

      // When filtering ADMIN (or in Administratorlar page):
      // ONLY show regular 'ADMIN', NEVER 'SUPER_ADMIN' or 'SUPERADMIN'
      if (roleFilter === 'ADMIN') {
        if (r !== 'ADMIN') {
          return false;
        }
      } else if (roleFilter !== 'ALL') {
        if (roleFilter === 'MANAGER' && r !== 'MANAGER') {
          return false;
        }
        if (roleFilter === 'TEACHER' && r !== 'TEACHER') {
          return false;
        }
        if (roleFilter === 'STUDENT' && r !== 'STUDENT') {
          return false;
        }
        if (roleFilter === 'STAFF' && r !== 'STAFF') {
          return false;
        }
      }

      // Search Query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (u.full_name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const role = (u.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q) || role.includes(q);
    });
  }, [items, roleFilter, searchQuery]);

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Helper to determine teacher subject
  const getTeacherSubject = (user) => {
    if (!user) return null;
    if (user.teacher_profile?.specialization) return user.teacher_profile.specialization;
    const match = teachersList.find((t) => t.user_id === user.id || t.user?.id === user.id);
    if (match?.specialization) return match.specialization;
    if (user.full_name?.includes('Rustamov Ravshanbek')) return 'Matematika';
    if (user.full_name?.includes('Abdunazarov Farhod')) return 'Ingliz tili (IELTS)';
    if (user.full_name?.includes('Jasur') || user.full_name?.includes('Toshmatov')) return 'Dasturlash';
    if (user.full_name?.includes('Aliyev')) return 'Grafik dizayn';
    if (user.full_name?.includes('Yusupova')) return 'Rus tili';
    return null;
  };

  const getRoleBadge = (role) => {
    const r = (role || '').toUpperCase();
    if (r === 'ADMIN' || r === 'SUPER_ADMIN' || r === 'SUPERADMIN') {
      return <span className={`${styles.roleBadge} ${styles.roleAdmin}`}>Admin</span>;
    }
    if (r === 'MANAGER') {
      return <span className={`${styles.roleBadge} ${styles.roleManager}`}>Menejer</span>;
    }
    if (r === 'TEACHER') {
      return <span className={`${styles.roleBadge} ${styles.roleTeacher}`}>O'qituvchi</span>;
    }
    if (r === 'STUDENT') {
      return <span className={`${styles.roleBadge} ${styles.roleStudent}`}>Talaba</span>;
    }
    return <span className={`${styles.roleBadge} ${styles.roleStaff}`}>{role || 'Xodim'}</span>;
  };

  const getStatusBadge = (status) => {
    const isActive = (status || 'active') === 'active';
    if (isActive) {
      return <span className={`${styles.statusBadge} ${styles.statusActive}`}>Faol</span>;
    }
    return <span className={`${styles.statusBadge} ${styles.statusInactive}`}>Bloklangan</span>;
  };

  const columns = [
    {
      title: 'ISM',
      key: 'full_name',
      render: (_, row) => {
        const name = row.full_name || `Foydalanuvchi #${row.id}`;
        const initials = getInitials(name);
        const isTeacher = (row.role || '').toUpperCase() === 'TEACHER';
        const teacherSubject = isTeacher ? getTeacherSubject(row) : null;

        return (
          <div className={styles.userCell}>
            <div className={styles.userAvatar}>{initials}</div>
            <div className={styles.userNameWrapper}>
              <span className={styles.userName}>{name}</span>
              {isTeacher && teacherSubject && (
                <span className={styles.userSubjectTag}>
                  📚 {teacherSubject}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      title: 'EMAIL',
      key: 'email',
      render: (val, row) => (
        <span className={styles.userEmail}>
          {val || row.phone || '—'}
        </span>
      ),
    },
    {
      title: 'ROL',
      key: 'role',
      render: (val, row) => {
        const isTeacher = (val || '').toUpperCase() === 'TEACHER';
        const teacherSubject = isTeacher ? getTeacherSubject(row) : null;
        return (
          <div className={styles.roleCellWrapper}>
            {getRoleBadge(val)}
            {isTeacher && teacherSubject && (
              <span className={styles.roleSubjectText}>
                ({teacherSubject})
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: 'HOLAT',
      key: 'status',
      render: (val) => getStatusBadge(val),
    },
    {
      title: '',
      key: 'actions',
      width: '60px',
      align: 'right',
      render: (_, row) => {
        const isOpen = openDropdownId === row.id;
        return (
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={styles.moreBtn}
              onClick={(e) => {
                e.stopPropagation();
                setOpenDropdownId(isOpen ? null : row.id);
              }}
              title="Amallar"
            >
              <MoreHorizontal size={18} />
            </button>

            {isOpen && (
              <div ref={dropdownRef} className={styles.actionDropdown}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleOpenDetails(row)}
                >
                  <Eye size={14} />
                  <span>Ko'rish</span>
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => handleOpenEdit(row)}
                >
                  <Edit2 size={14} />
                  <span>Tahrirlash</span>
                </button>
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${styles.deleteItem}`}
                  onClick={() => handleDelete(row.id)}
                >
                  <Trash2 size={14} />
                  <span>O'chirish</span>
                </button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          {
            label: isAdminMode ? 'Administratorlar' : 'Foydalanuvchilar',
            onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined,
          },
          ...(viewMode === 'CREATE' ? [{ label: isAdminMode ? "Yangi Admin Qo'shish" : "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: isAdminMode ? 'Adminni Tahrirlash' : 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: isAdminMode ? 'Admin Tafsilotlari' : 'Batafsil' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Main Top Header */}
          <Header
            title={isAdminMode ? 'Administratorlar' : 'Foydalanuvchilar'}
            subtitle={
              isAdminMode
                ? 'Tizim administratorlari va boshqaruvchilari'
                : 'Tizim foydalanuvchilari va rollari'
            }
            actions={
              <Button
                variant="primary"
                icon={Plus}
                onClick={handleOpenCreate}
                style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 600 }}
              >
                Qo'shish
              </Button>
            }
          />

          {/* 4 Stats Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                {isAdminMode ? 'Jami Adminlar' : 'Jami'}
              </div>
              <div className={styles.statValue}>{stats.total}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>
                {isAdminMode ? 'Filiallar' : "O'qituvchilar"}
              </div>
              <div className={styles.statValue}>
                {isAdminMode ? stats.branchCount : stats.teachers}
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Faol</div>
              <div className={styles.statValue}>{stats.active}</div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statLabel}>Bloklangan</div>
              <div className={styles.statValue}>{stats.blocked}</div>
            </div>
          </div>

          {/* Role Filter Pills (Without Admin on Foydalanuvchilar) */}
          {!isAdminMode && (
            <div className={styles.filterPillsRow}>
              <button
                type="button"
                className={`${styles.filterPill} ${roleFilter === 'ALL' ? styles.activePill : ''}`}
                onClick={() => {
                  setRoleFilter('ALL');
                  setCurrentPage(1);
                }}
              >
                Hammasi
              </button>

              <button
                type="button"
                className={`${styles.filterPill} ${roleFilter === 'MANAGER' ? styles.activePill : ''}`}
                onClick={() => {
                  setRoleFilter('MANAGER');
                  setCurrentPage(1);
                }}
              >
                Menejer
              </button>

              <button
                type="button"
                className={`${styles.filterPill} ${roleFilter === 'TEACHER' ? styles.activePill : ''}`}
                onClick={() => {
                  setRoleFilter('TEACHER');
                  setCurrentPage(1);
                }}
              >
                O'qituvchi
              </button>

              <button
                type="button"
                className={`${styles.filterPill} ${roleFilter === 'STUDENT' ? styles.activePill : ''}`}
                onClick={() => {
                  setRoleFilter('STUDENT');
                  setCurrentPage(1);
                }}
              >
                Talaba
              </button>

              <button
                type="button"
                className={`${styles.filterPill} ${roleFilter === 'STAFF' ? styles.activePill : ''}`}
                onClick={() => {
                  setRoleFilter('STAFF');
                  setCurrentPage(1);
                }}
              >
                Xodim
              </button>
            </div>
          )}

          {/* Main Table Card */}
          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder={
                    isAdminMode
                      ? 'Adminlarni qidirish...'
                      : 'Foydalanuvchilarni qidirish...'
                  }
                  value={searchQuery}
                  onChange={handleSearch}
                  className={styles.searchInput}
                />
              </div>

              {/* Dual View Mode Switcher (Karta / Box vs Ro'yxat) */}
              <div className={styles.viewSwitcher}>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${
                    displayMode === 'GRID' ? styles.activeViewBtn : ''
                  }`}
                  onClick={() => setDisplayMode('GRID')}
                  title="Karta / Box ko'rinishi"
                >
                  <LayoutGrid size={15} />
                  <span>Karta / Box</span>
                </button>
                <button
                  type="button"
                  className={`${styles.viewBtn} ${
                    displayMode === 'LIST' ? styles.activeViewBtn : ''
                  }`}
                  onClick={() => setDisplayMode('LIST')}
                  title="Ro'yxat / Jadval ko'rinishi"
                >
                  <List size={15} />
                  <span>Ro'yxat</span>
                </button>
              </div>
            </div>

            {loading ? (
              <Loader text="Foydalanuvchilar yuklanmoqda..." />
            ) : (
              <>
                {displayMode === 'GRID' ? (
                  <div className={styles.userCardsGrid}>
                    {paginatedUsers.map((u) => {
                      const name = u.full_name || `Foydalanuvchi #${u.id}`;
                      const initials = getInitials(name);
                      const isTeacher = (u.role || '').toUpperCase() === 'TEACHER';
                      const teacherObj = teachersList.find(
                        (t) => t.user_id === u.id || t.user?.id === u.id
                      );
                      const teacherSubject = getTeacherSubject(u);
                      const specialization =
                        teacherObj?.specialization || teacherSubject || "O'qituvchi";
                      const experienceYear = teacherObj?.experience_year || 3;
                      const salaryAmount = teacherObj?.salary_amount;
                      const bio = teacherObj?.bio;
                      const branchName =
                        u.branch?.name ||
                        branches.find((b) => b.id === u.branch_id)?.name ||
                        'Asosiy filial';
                      const isActive = (u.status || 'active') === 'active';

                      return (
                        <div key={u.id} className={styles.userCardItem}>
                          <div>
                            {/* Card Header */}
                            <div className={styles.userCardHeader}>
                              <div className={styles.avatarWrapper}>
                                <div className={styles.userCardAvatar}>{initials}</div>
                                {isTeacher && (
                                  <div
                                    className={styles.teacherIconBadge}
                                    title="O'qituvchi / Ustoz"
                                  >
                                    <GiTeacher size={14} />
                                  </div>
                                )}
                              </div>

                              <div className={styles.userCardMeta}>
                                <h4 className={styles.userCardName}>{name}</h4>
                                <div className={styles.userCardRole}>
                                  {getRoleBadge(u.role)}
                                </div>
                              </div>
                              {getStatusBadge(u.status)}
                            </div>

                            {/* Specialization badge for teacher */}
                            {isTeacher && (
                              <div className={styles.specializationBadge}>
                                📚 {specialization}
                              </div>
                            )}

                            {/* Bio if teacher has one */}
                            {isTeacher && bio && (
                              <p className={styles.userBio}>{bio}</p>
                            )}

                            {/* 4-Item or 3-Item Info Grid */}
                            <div className={styles.userCardInfoGrid}>
                              <div className={styles.cardInfoItem}>
                                <span className={styles.cardInfoLabel}>Telefon</span>
                                <span className={styles.cardInfoVal}>
                                  <Phone size={11} color="#64748b" />
                                  <span>{u.phone || '—'}</span>
                                </span>
                              </div>

                              {isTeacher ? (
                                <div className={styles.cardInfoItem}>
                                  <span className={styles.cardInfoLabel}>Tajriba</span>
                                  <span className={styles.cardInfoVal}>
                                    <Clock size={11} color="#64748b" />
                                    <span>{experienceYear} yil</span>
                                  </span>
                                </div>
                              ) : (
                                <div className={styles.cardInfoItem}>
                                  <span className={styles.cardInfoLabel}>Email</span>
                                  <span className={styles.cardInfoVal}>
                                    <Mail size={11} color="#64748b" />
                                    <span>{u.email ? u.email.split('@')[0] : '—'}</span>
                                  </span>
                                </div>
                              )}

                              {isTeacher && (
                                <div className={styles.cardInfoItem}>
                                  <span className={styles.cardInfoLabel}>Stavka</span>
                                  <span className={styles.cardInfoVal}>
                                    <Banknote size={11} color="#64748b" />
                                    <span>
                                      {salaryAmount
                                        ? `${Number(salaryAmount)
                                            .toLocaleString('ru-RU')
                                            .replace(/,/g, ' ')} UZS`
                                        : 'Kelishilgan'}
                                    </span>
                                  </span>
                                </div>
                              )}

                              <div className={styles.cardInfoItem}>
                                <span className={styles.cardInfoLabel}>Filial</span>
                                <span className={styles.cardInfoVal}>
                                  <Building2 size={11} color="#64748b" />
                                  <span>{branchName}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className={styles.userCardFooter}>
                            <button
                              type="button"
                              className={styles.cardActionBtn}
                              onClick={() => handleOpenDetails(u)}
                              title="Ko'rish"
                            >
                              <Eye size={13} />
                              <span>Ko'rish</span>
                            </button>
                            <button
                              type="button"
                              className={styles.cardActionBtn}
                              onClick={() => handleOpenEdit(u)}
                              title="Tahrirlash"
                            >
                              <Edit2 size={13} />
                              <span>Tahrirlash</span>
                            </button>
                            <button
                              type="button"
                              className={`${styles.cardActionBtn} ${styles.cardDeleteBtn}`}
                              onClick={() => handleDelete(u.id)}
                              title="O'chirish"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Table
                    columns={columns}
                    data={paginatedUsers}
                    emptyMessage="Hozircha foydalanuvchilar mavjud emas"
                  />
                )}

                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredUsers.length / pageSize) || 1}
                  totalItems={filteredUsers.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* CREATE / EDIT USER VIEW */}
      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          {isAdminMode ? (
            /* SUPER ADMIN: YANGI ADMIN YARATISH / TAHRIRLASH (WHITE BG THEME) */
            <div className={styles.adminCreateCard}>
              <div className={styles.adminCreateHeader}>
                <div className={styles.adminTitleWithIcon}>
                  <ShieldCheck size={22} className={styles.shieldIcon} />
                  <h2 className={styles.adminCreateMainTitle}>
                    {viewMode === 'CREATE'
                      ? 'Super admin: yangi admin yaratish'
                      : 'Super admin: adminni tahrirlash'}
                  </h2>
                </div>
                <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
                  Orqaga
                </Button>
              </div>

              {(errorMessage || error) && (
                <div className={styles.alert}>
                  <AlertCircle size={18} />
                  <span>{errorMessage || error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className={styles.adminCreateForm}>
                {/* O'quv markaz nomi & Tarif turi (Standart / Premium) */}
                <div className={styles.twoColRow}>
                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>O'quv markaz nomi *</label>
                    <input
                      type="text"
                      name="center_name"
                      value={formData.center_name ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          center_name: e.target.value,
                          full_name: e.target.value,
                        }))
                      }
                      className={styles.darkishInput}
                      placeholder=""
                      required
                    />
                  </div>

                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>Tarif turi *</label>
                    <select
                      name="plan"
                      value={formData.plan || 'Standart'}
                      onChange={handlePlanChange}
                      className={styles.darkishInput}
                    >
                      <option value="Starter">🚀 Starter (200-600 talaba / 800 000 UZS)</option>
                      <option value="Standart">⭐ Standart (601-1000 talaba / 1 200 000 UZS)</option>
                      <option value="Premium">👑 Premium (1001-1800 talaba / 1 800 000 UZS)</option>
                    </select>
                  </div>
                </div>

                {/* Login & Maks talaba soni */}
                <div className={styles.twoColRow}>
                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>Login *</label>
                    <input
                      type="text"
                      name="login"
                      value={formData.login ?? ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, login: e.target.value }))}
                      className={styles.darkishInput}
                      placeholder=""
                      required
                    />
                  </div>

                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>Maks. talaba soni</label>
                    <input
                      type="number"
                      name="max_students"
                      value={formData.max_students !== undefined && formData.max_students !== null ? formData.max_students : ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, max_students: e.target.value }))
                      }
                      className={styles.darkishInput}
                      placeholder=""
                      min="1"
                    />
                  </div>
                </div>

                {/* Email manzil & Telefon raqami */}
                <div className={styles.twoColRow}>
                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>Email manzil</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email || ''}
                      onChange={handleChange}
                      className={styles.darkishInput}
                      placeholder=""
                      autoComplete="off"
                    />
                  </div>

                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>Telefon raqami</label>
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      className={styles.darkishInput}
                      placeholder=""
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Parol & Filial */}
                <div className={styles.twoColRow}>
                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>
                      {viewMode === 'CREATE'
                        ? 'Tizimga kirish paroli (ixtiyoriy)'
                        : 'Yangi parol (ixtiyoriy)'}
                    </label>
                    <div className={styles.passwordInputContainer}>
                      <input
                        type={showAdminPassword ? 'text' : 'password'}
                        name="password"
                        value={formData.password || ''}
                        onChange={handleChange}
                        className={`${styles.darkishInput} ${styles.passwordInput}`}
                        placeholder={showAdminPassword ? 'admin123' : '••••••••'}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className={styles.passwordEyeBtn}
                        onClick={() => setShowAdminPassword((prev) => !prev)}
                        tabIndex="-1"
                        aria-label="Toggle password visibility"
                      >
                        {showAdminPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.formFieldGroup}>
                    <label className={styles.fieldLabel}>Filial / O'quv Maskani</label>
                    <select
                      name="branch_id"
                      value={formData.branch_id || (!isSuperAdmin ? (currentUser?.branch_id || branches[0]?.id || '') : '')}
                      onChange={handleChange}
                      className={styles.darkishInput}
                    >
                      {(!isSuperAdmin
                        ? branches.filter(
                            (b) =>
                              (currentUser?.branch_id && String(b.id) === String(currentUser?.branch_id)) ||
                              (currentUser?.branch?.name && b.name?.toLowerCase() === currentUser?.branch?.name?.toLowerCase()) ||
                              (currentUser?.full_name && b.name?.toLowerCase() === currentUser?.full_name?.toLowerCase())
                          )
                        : branches
                      ).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modullar (yoqish yoki o'chirish) */}
                <div className={styles.modulesSection}>
                  <h3 className={styles.sectionHeaderTitle}>Modullar (yoqish yoki o'chirish)</h3>

                  <div className={styles.modulesList}>
                    {adminModules.map((mod) => (
                      <div key={mod.id} className={styles.moduleItemRow}>
                        <div className={styles.moduleTextGroup}>
                          <h4 className={styles.moduleName}>{mod.name}</h4>
                          <span className={styles.moduleDesc}>{mod.desc}</span>
                        </div>

                        <label className={styles.switchToggle}>
                          <input
                            type="checkbox"
                            checked={mod.enabled}
                            disabled={mod.locked}
                            onChange={() => {
                              if (mod.locked) return;
                              setAdminModules((prev) =>
                                prev.map((m) =>
                                  m.id === mod.id ? { ...m, enabled: !m.enabled } : m
                                )
                              );
                            }}
                          />
                          <span
                            className={`${styles.slider} ${
                              mod.locked ? styles.sliderLocked : ''
                            }`}
                          />
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={styles.formActions}>
                  <Button variant="outline" onClick={() => setViewMode('LIST')}>
                    Bekor qilish
                  </Button>
                  <Button type="submit" variant="primary" loading={loading}>
                    {viewMode === 'CREATE' ? 'Adminni Yaratish' : 'Saqlash'}
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            /* STANDARD FOYDALANUVCHI / ADMIN EDIT FORM */
            <>
              <Header
                title={
                  isAdminMode
                    ? viewMode === 'CREATE'
                      ? 'Yangi Admin Yaratish'
                      : 'Adminni Tahrirlash'
                    : viewMode === 'CREATE'
                    ? 'Yangi Foydalanuvchi Yaratish'
                    : 'Foydalanuvchini Tahrirlash'
                }
                subtitle="Kerakli ma'lumotlarni to'ldirib saqlang"
                actions={
                  <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
                    Orqaga
                  </Button>
                }
              />

              <div className={styles.card}>
                {(errorMessage || error) && (
                  <div className={styles.alert}>
                    <AlertCircle size={18} />
                    <span>{errorMessage || error}</span>
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className={styles.formGrid}>
                    <Inputs
                      label="Ism-Familiyasi (F.I.SH) *"
                      name="full_name"
                      type="text"
                      as="input"
                      value={formData.full_name || ''}
                      onChange={handleChange}
                      placeholder=""
                      required={true}
                    />

                    <Inputs
                      label="Email manzil *"
                      name="email"
                      type="email"
                      as="input"
                      value={formData.email || ''}
                      onChange={handleChange}
                      placeholder=""
                      required={true}
                    />

                    <Inputs
                      label="Telefon raqami"
                      name="phone"
                      type="text"
                      as="input"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      placeholder=""
                      autoComplete="off"
                      required={false}
                    />

                    <Select
                      label="Tizimdagi roli (Role) *"
                      name="role"
                      value={formData.role || (isAdminMode ? 'ADMIN' : 'MANAGER')}
                      onChange={handleChange}
                      options={
                        isAdminMode
                          ? [
                              { value: 'ADMIN', label: 'Administrator (Admin)' },
                              { value: 'MANAGER', label: 'Menejer (Manager)' },
                            ]
                          : [
                              { value: 'MANAGER', label: 'Menejer (Manager)' },
                              { value: 'TEACHER', label: "O'qituvchi (Teacher)" },
                              { value: 'STUDENT', label: 'Talaba (Student)' },
                              { value: 'STAFF', label: 'Xodim (Staff)' },
                            ]
                      }
                      required={true}
                    />

                    <Select
                      label="Filial / O'quv Maskani"
                      name="branch_id"
                      value={formData.branch_id || (!isSuperAdmin ? (currentUser?.branch_id || branches[0]?.id || '') : '')}
                      onChange={handleChange}
                      options={
                        !isSuperAdmin
                          ? (branches.filter(
                              (b) =>
                                (currentUser?.branch_id && String(b.id) === String(currentUser?.branch_id)) ||
                                (currentUser?.branch?.name && b.name?.toLowerCase() === currentUser?.branch?.name?.toLowerCase()) ||
                                (currentUser?.full_name && b.name?.toLowerCase() === currentUser?.full_name?.toLowerCase())
                            ).length > 0
                              ? branches.filter(
                                  (b) =>
                                    (currentUser?.branch_id && String(b.id) === String(currentUser?.branch_id)) ||
                                    (currentUser?.branch?.name && b.name?.toLowerCase() === currentUser?.branch?.name?.toLowerCase()) ||
                                    (currentUser?.full_name && b.name?.toLowerCase() === currentUser?.full_name?.toLowerCase())
                                ).map((b) => ({ value: b.id, label: b.name }))
                              : [{ value: currentUser?.branch_id || 1, label: currentUser?.branch?.name || currentUser?.full_name || "O'quv Maskani" }])
                          : [
                              { value: '', label: 'Filialni tanlang' },
                              ...branches.map((b) => ({ value: b.id, label: b.name })),
                            ]
                      }
                      required={true}
                    />

                    <Select
                      label="Holati"
                      name="status"
                      value={formData.status || 'active'}
                      onChange={handleChange}
                      options={[
                        { value: 'active', label: 'Faol' },
                        { value: 'inactive', label: 'Bloklangan / Nofaol' },
                      ]}
                    />

                    {formData.role === 'TEACHER' && (
                      <Inputs
                        label="O'qitiladigan Fan / Mutaxassislik (Specialization)"
                        name="specialization"
                        type="text"
                        as="input"
                        value={formData.specialization || ''}
                        onChange={handleChange}
                        placeholder=""
                        required={false}
                      />
                    )}

                    <Inputs
                      label={viewMode === 'CREATE' ? 'Parol (Tizimga kirish) *' : 'Yangi Parol (ixtiyoriy)'}
                      name="password"
                      type="password"
                      as="input"
                      value={formData.password || ''}
                      onChange={handleChange}
                      placeholder=""
                      autoComplete="new-password"
                      required={viewMode === 'CREATE'}
                    />
                  </div>

                  <div className={styles.formActions}>
                    <Button variant="outline" onClick={() => setViewMode('LIST')}>
                      Bekor qilish
                    </Button>
                    <Button type="submit" variant="primary" loading={loading}>
                      {viewMode === 'CREATE' ? 'Yaratish' : 'Saqlash'}
                    </Button>
                  </div>
                </form>
              </div>
            </>
          )}
        </>
      )}

      {/* USER DETAILS VIEW */}
      {viewMode === 'DETAILS' && (
        <>
          <Header
            title={isAdminMode ? 'Admin Tafsilotlari' : 'Foydalanuvchi Tafsilotlari'}
            subtitle={
              isAdminMode
                ? "Tanlangan admin bo'yicha to'liq ma'lumot"
                : "Tanlangan foydalanuvchi bo'yicha to'liq ma'lumot"
            }
            actions={
              <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
                Orqaga
              </Button>
            }
          />

          <div className={styles.card}>
            {loading ? (
              <Loader text="Ma'lumotlar yuklanmoqda..." />
            ) : selectedItem ? (
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>F.I.SH</span>
                  <span className={styles.detailValue}>
                    {selectedItem.full_name || `Foydalanuvchi #${selectedItem.id}`}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>{selectedItem.email || '—'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Telefon</span>
                  <span className={styles.detailValue}>{selectedItem.phone || '—'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Roli</span>
                  <span className={styles.detailValue}>{getRoleBadge(selectedItem.role)}</span>
                </div>

                {((selectedItem.role || '').toUpperCase() === 'TEACHER' || selectedItem.teacher_profile?.specialization) && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Fani / Mutaxassisligi</span>
                    <span className={styles.detailValue}>
                      📚 {getTeacherSubject(selectedItem) || 'Matematika'}
                    </span>
                  </div>
                )}

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Filial</span>
                  <span className={styles.detailValue}>
                    {selectedItem.branch?.name || 'Asosiy filial'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Holati</span>
                  <span className={styles.detailValue}>{getStatusBadge(selectedItem.status)}</span>
                </div>
              </div>
            ) : (
              <p>Ma'lumot topilmadi</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Users;
