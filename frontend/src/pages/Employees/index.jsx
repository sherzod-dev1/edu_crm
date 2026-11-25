import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchEmployees,
  fetchEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  clearError,
} from '../../store/slices/employeeSlice';
import userApi from '../../services/userApi';
import branchApi from '../../services/branchApi';
import teacherApi from '../../services/teacherApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './employees.module.css';
import { GiTeacher } from 'react-icons/gi';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Briefcase,
  Phone,
  Building2,
  CheckCircle2,
  BookOpen,
  Award,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Hammasi' },
  { id: 'MANAGERS', label: 'Menejerlar' },
  { id: 'TEACHERS', label: "O'qituvchilar" },
  { id: 'ACCOUNTING', label: 'Buxgalteriya & Moliya' },
  { id: 'STAFF', label: 'Boshqa xodimlar' },
];

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'XO';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Employees = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.employee || {}
  );
  const { user } = useSelector((state) => state.auth || {});

  const [viewMode, setViewMode] = useState('LIST');
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [usersList, setUsersList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [isSelectExistingUser, setIsSelectExistingUser] = useState(false);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    user_id: '',
    position: '',
    specialization: '',
    salary: '',
    branch_id: '',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadAllData = () => {
    dispatch(fetchEmployees());

    userApi.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const staffOnly = list.filter((u) => {
        const r = (u.role || '').toUpperCase();
        return r !== 'TEACHER' && r !== 'STUDENT' && !r.includes('TEACH') && !r.includes('STUD');
      });
      setUsersList(staffOnly);
    }).catch(() => {});

    branchApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
      if (!isSuperAdminUser) {
        const userBranchId = user?.branch_id;
        const userCenterName = user?.branch?.name || user?.full_name;
        const scoped = list.filter(
          (b) => (userBranchId && String(b.id) === String(userBranchId)) ||
                 (userCenterName && b.name?.toLowerCase() === userCenterName?.toLowerCase())
        );
        if (scoped.length > 0) {
          setBranchesList(scoped);
        } else if (userCenterName) {
          setBranchesList([{ id: userBranchId || 1, name: userCenterName }]);
        } else {
          setBranchesList(list);
        }
      } else {
        setBranchesList(list);
      }
    }).catch(() => {});

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
    const defaultBranchId = !isSuperAdminUser ? (user?.branch_id || user?.branch?.id || branchesList[0]?.id || '') : (branchesList[0]?.id || '');
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      password: '',
      user_id: '',
      position: '',
      specialization: '',
      salary: '',
      branch_id: defaultBranchId,
      status: 'active',
    });
    setIsSelectExistingUser(false);
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchEmployeeById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item) => {
    const matchedTeacher = teachersList.find(
      (t) => String(t.user_id) === String(item.user_id || item.user?.id)
    );

    setFormData({
      id: item.id,
      user_id: item.user_id || item.user?.id || '',
      full_name: item.user?.full_name || '',
      phone: item.user?.phone || '',
      email: item.user?.email || '',
      position: item.position || '',
      specialization: matchedTeacher ? matchedTeacher.specialization : '',
      salary: item.salary || '',
      branch_id: item.branch_id || item.branch?.id || '',
      status: item.status || 'active',
    });
    setIsSelectExistingUser(false);
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Xodimni o'chirish",
      message: "Haqiqatdan ham ushbu xodimni o'chirmoqchimisiz? Bu amalni ortga qaytarib bo'lmaydi.",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteEmployee(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchEmployees());
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

    try {
      let finalUserId = formData.user_id;
      const posLower = (formData.position || '').toLowerCase();
      const isTeacher =
        posLower.includes("o'qituvchi") ||
        posLower.includes('ustoz') ||
        posLower.includes('teacher');
      const isManager =
        posLower.includes('menejer') ||
        posLower.includes('manager') ||
        posLower.includes('boshqaruvchi');
      const userRole = isTeacher ? 'TEACHER' : (isManager ? 'MANAGER' : 'STAFF');

      if (viewMode === 'CREATE' && !isSelectExistingUser) {
        if (!formData.full_name.trim()) {
          setErrorMessage('Xodim ism-familiyasini kiriting');
          return;
        }
        if (!formData.phone.trim() || formData.phone === '+998') {
          setErrorMessage('Telefon raqamini kiriting');
          return;
        }

        const generatedEmail = formData.email.trim()
          ? formData.email.trim()
          : `employee_${Date.now()}@educrm.uz`;

        const userRes = await userApi.create({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: generatedEmail,
          password: formData.password || '123456',
          role: userRole,
          branch_id: formData.branch_id ? Number(formData.branch_id) : null,
          status: formData.status || 'active',
        });

        const createdUser = userRes.data?.data || userRes.data;
        if (!createdUser || !createdUser.id) {
          throw new Error("Foydalanuvchi hisobini yaratib bo'lmadi");
        }
        finalUserId = createdUser.id;
      }

      const payload = {
        user_id: Number(finalUserId),
        position: formData.position || 'Xodim',
        salary: formData.salary ? Number(formData.salary) : null,
        branch_id: formData.branch_id ? Number(formData.branch_id) : null,
        status: formData.status || 'active',
        full_name: formData.full_name?.trim(),
        phone: formData.phone?.trim(),
        email: formData.email !== undefined ? formData.email.trim() : undefined,
      };

      if (viewMode === 'CREATE') {
        const res = await dispatch(createEmployee(payload));
        if (!res.error) {
          if (formData.specialization?.trim() || isTeacher) {
            try {
              await teacherApi.create({
                user_id: Number(finalUserId),
                specialization: formData.specialization?.trim() || "O'qituvchi",
                experience_year: 1,
                salary_type: 'monthly',
                salary_amount: formData.salary ? Number(formData.salary) : 0,
                branch_id: formData.branch_id ? Number(formData.branch_id) : null,
                status: formData.status || 'active',
              });
            } catch (tErr) {
              console.warn('Teacher creation warn:', tErr);
            }
          }

          loadAllData();
          setViewMode('LIST');
        } else {
          setErrorMessage(
            res.payload || res.error.message || 'Yaratishda xatolik yuz berdi'
          );
        }
      } else if (viewMode === 'EDIT') {
        const isTeacherOnly = String(formData.id).startsWith('t_');
        let updateFailed = false;

        if (isTeacherOnly) {
          const teacherId = String(formData.id).replace('t_', '');
          if (formData.user_id) {
            try {
              await userApi.update(formData.user_id, {
                full_name: formData.full_name,
                phone: formData.phone,
                email: formData.email || null,
                branch_id: formData.branch_id ? Number(formData.branch_id) : undefined,
                status: formData.status || 'active',
              });
            } catch (uErr) {
              updateFailed = true;
              setErrorMessage(uErr.response?.data?.message || uErr.response?.data || uErr.message);
            }
          }
          if (!updateFailed) {
            try {
              await teacherApi.update(teacherId, {
                specialization: formData.position || formData.specialization || "O'qituvchi",
                salary_amount: formData.salary ? Number(formData.salary) : 0,
                branch_id: formData.branch_id ? Number(formData.branch_id) : undefined,
                status: formData.status || 'active',
              });
            } catch (tErr) {
              updateFailed = true;
              setErrorMessage(tErr.response?.data?.message || tErr.response?.data || tErr.message);
            }
          }
        } else {
          const res = await dispatch(
            updateEmployee({ id: formData.id, data: payload })
          );
          if (res.error) {
            updateFailed = true;
            setErrorMessage(
              res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi'
            );
          } else if (formData.user_id && (formData.full_name || formData.phone)) {
            try {
              await userApi.update(formData.user_id, {
                full_name: formData.full_name,
                phone: formData.phone,
                email: formData.email || null,
                branch_id: formData.branch_id ? Number(formData.branch_id) : undefined,
                status: formData.status || 'active',
              });
            } catch (uErr) {
              console.warn('User sync warning:', uErr);
            }
          }
        }

        if (formData.specialization?.trim() || isTeacher) {
          try {
            const existingTeacher = teachersList.find(
              (t) => String(t.user_id) === String(formData.user_id || finalUserId)
            );
            if (existingTeacher) {
              if (formData.specialization?.trim()) {
                await teacherApi.update(existingTeacher.id, {
                  specialization: formData.specialization.trim(),
                });
              }
            } else if (formData.specialization?.trim()) {
              await teacherApi.create({
                user_id: Number(formData.user_id || finalUserId),
                specialization: formData.specialization.trim(),
                experience_year: 1,
                salary_type: 'monthly',
                salary_amount: formData.salary ? Number(formData.salary) : 0,
                branch_id: formData.branch_id ? Number(formData.branch_id) : null,
                status: formData.status || 'active',
              });
            }
          } catch (tErr) {
            console.warn('Teacher update warn:', tErr);
          }
        }

        if (!updateFailed) {
          loadAllData();
          setViewMode('LIST');
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.response?.data || err.message || 'Xatolik yuz berdi'
      );
    }
  };

  const isSuperAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'SUPERADMIN';
  const userBranchId = user?.branch_id;

  const branchScopedItems = React.useMemo(() => {
    const list = !isSuperAdmin && userBranchId
      ? (items || []).filter(
          (item) => String(item.branch_id) === String(userBranchId) || String(item.user?.branch_id) === String(userBranchId)
        )
      : items || [];

    const existingUserIds = new Set(
      list.map((it) => String(it.user_id || it.user?.id)).filter(Boolean)
    );

    const scopedTeachers = !isSuperAdmin && userBranchId
      ? (teachersList || []).filter(
          (t) => String(t.branch_id) === String(userBranchId) || String(t.user?.branch_id) === String(userBranchId)
        )
      : teachersList || [];

    const extraTeachers = scopedTeachers
      .filter((t) => !existingUserIds.has(String(t.user_id || t.user?.id || t.id)))
      .map((t) => ({
        id: `t_${t.id}`,
        teacher_id: t.id,
        user_id: t.user_id,
        user: t.user || {
          id: t.user_id,
          full_name: t.full_name || t.name,
          phone: t.phone,
          email: t.email,
          role: 'TEACHER',
        },
        position: t.specialization ? `O'qituvchi (${t.specialization})` : "O'qituvchi",
        specialization: t.specialization,
        salary: t.salary_amount,
        branch_id: t.branch_id,
        branch: t.branch,
        status: t.status || 'active',
        isTeacherOnly: true,
      }));

    return [...list, ...extraTeachers];
  }, [items, teachersList, isSuperAdmin, userBranchId]);

  // Filter by category + search query
  const filteredItems = branchScopedItems.filter((item) => {
    const pos = (item.position || '').toLowerCase();
    const role = (item.user?.role || '').toLowerCase();

    // Category check
    if (activeCategory === 'ADMINS') {
      const isAdmin =
        pos.includes('admin') ||
        pos.includes('administrator') ||
        pos.includes('boshqaruvchi') ||
        role.includes('admin') ||
        role.includes('superadmin') ||
        role.includes('super_admin');
      if (!isAdmin) return false;
    } else if (activeCategory === 'MANAGERS') {
      const isManager =
        pos.includes('menejer') ||
        pos.includes('manager') ||
        role.includes('manager');
      if (!isManager) return false;
    } else if (activeCategory === 'TEACHERS') {
      const isTeacher =
        pos.includes("o'qituvchi") ||
        pos.includes("oqituvchi") ||
        pos.includes('teacher') ||
        pos.includes('ustoz') ||
        pos.includes('pedagog') ||
        role.includes('teacher');
      if (!isTeacher) return false;
    } else if (activeCategory === 'ACCOUNTING') {
      const isAccountant =
        pos.includes('buxgalter') ||
        pos.includes('account') ||
        pos.includes('hisobchi') ||
        pos.includes('moliya') ||
        pos.includes('kassir');
      if (!isAccountant) return false;
    } else if (activeCategory === 'STAFF') {
      const isStaff =
        !pos.includes('menejer') &&
        !pos.includes('manager') &&
        !pos.includes("o'qituvchi") &&
        !pos.includes("oqituvchi") &&
        !pos.includes('teacher') &&
        !pos.includes('buxgalter') &&
        !pos.includes('kassir') &&
        !role.includes('manager') &&
        !role.includes('teacher');
      if (!isStaff) return false;
    }

    // Search query check
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.user?.full_name || '').toLowerCase();
    const phone = (item.user?.phone || '').toLowerCase();
    const email = (item.user?.email || '').toLowerCase();
    const branchName = (item.branch?.name || '').toLowerCase();

    return (
      name.includes(q) ||
      phone.includes(q) ||
      email.includes(q) ||
      pos.includes(q) ||
      branchName.includes(q)
    );
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Xodimlar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: 'Batafsil' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header section matching exact UI */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Xodimlar</h1>
              <p className={styles.mainSubtitle}>Jamoa a'zolari</p>
            </div>
            <button className={styles.addButton} onClick={handleOpenCreate}>
              <Plus size={18} strokeWidth={2.5} />
              <span>Qo'shish</span>
            </button>
          </div>

          {/* Categories Pill Tabs and Search */}
          <div className={styles.toolbarSection}>
            <div className={styles.categoriesList}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`${styles.categoryPill} ${
                      isActive ? styles.categoryPillActive : ''
                    }`}
                    onClick={() => handleSelectCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={handleSearch}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Main Content: Cards Grid */}
          {loading ? (
            <Loader text="Xodimlar yuklanmoqda..." />
          ) : paginatedItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Hozircha ushbu toifada xodimlar topilmadi</p>
            </div>
          ) : (
            <>
              <div className={styles.cardsGrid}>
                {paginatedItems.map((item, idx) => {
                  const fullName = item.user?.full_name || `Xodim #${item.id}`;
                  const initials = getInitials(fullName);
                  const matchedTeacher = teachersList.find(
                    (t) => String(t.user_id) === String(item.user_id || item.user?.id)
                  );
                  const isTeacher =
                    (item.position || '').toLowerCase().includes("o'qituvchi") ||
                    (item.position || '').toLowerCase().includes("oqituvchi") ||
                    (item.position || '').toLowerCase().includes('teacher') ||
                    (item.user?.role || '').toUpperCase() === 'TEACHER' ||
                    item.isTeacherOnly ||
                    Boolean(matchedTeacher);

                  const spec = item.specialization || matchedTeacher?.specialization;
                  const position = spec || item.position || (isTeacher ? "Frontend Dasturchi" : 'Xodim');
                  const phone = item.user?.phone || '+998 [raqam]';
                  const isActive = item.status === 'active' || item.status === undefined;
                  const salaryDisplay = item.salary || matchedTeacher?.salary_amount
                    ? `${Number(item.salary || matchedTeacher?.salary_amount).toLocaleString('ru-RU').replace(/,/g, ' ')} UZS`
                    : '4 500 000 UZS';

                  const posLower = (item.position || '').toLowerCase();
                  const isCleaner =
                    posLower.includes('tozalik') ||
                    posLower.includes('farrosh') ||
                    posLower.includes('cleaner') ||
                    posLower.includes('ubor');

                  return (
                    <div
                      key={item.id}
                      className={styles.employeeCard}
                      onClick={() => handleOpenDetails(item)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        {/* Card Top: Avatar with Teacher Icon badge + Status */}
                        <div className={styles.teacherBoxTop}>
                          <div className={styles.avatarWrapper}>
                            <div className={styles.teacherAvatarCircle}>
                              {initials[0] || 'X'}
                            </div>
                            {isTeacher && (
                              <div className={styles.teacherIconBadge} title="O'qituvchi">
                                <GiTeacher size={13} />
                              </div>
                            )}
                          </div>

                          <span
                            className={
                              isActive ? styles.statusActive : styles.statusInactive
                            }
                          >
                            {isActive ? 'FAOL' : 'NOFAOL'}
                          </span>
                        </div>

                        {/* Full Name */}
                        <h3 className={styles.teacherName}>{fullName}</h3>

                        {/* Specialization / Position Badge */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                          <div className={styles.specializationBadge}>
                            {position}
                          </div>
                          {isCleaner && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#b91c1c',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                padding: '2px 7px',
                                borderRadius: 6,
                              }}
                            >
                              🔒 Kirish cheklangan
                            </span>
                          )}
                        </div>

                        {/* Bio / description */}
                        <p className={styles.teacherBio}>
                          {item.bio || (isTeacher ? "Tajribali o'qituvchi" : `${position} mutaxassisi`)}
                        </p>

                        {/* Info Grid */}
                        <div className={styles.teacherInfoGrid}>
                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>TELEFON</span>
                            <span className={styles.infoValue}>
                              <Phone size={11} color="#64748b" />
                              <span>{phone}</span>
                            </span>
                          </div>

                          <div className={styles.infoItem}>
                            <span className={styles.infoLabel}>STAVKA</span>
                            <span className={styles.infoValue}>
                              <Briefcase size={11} color="#64748b" />
                              <span>{salaryDisplay}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div
                        className={styles.teacherBoxFooter}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          className={styles.boxActionBtn}
                          onClick={() => handleOpenEdit(item)}
                        >
                          <Edit2 size={13} />
                          <span>Tahrirlash</span>
                        </button>

                        <button
                          type="button"
                          className={styles.deleteIconBtn}
                          onClick={(e) => handleDelete(item.id, e)}
                          title="O'chirish"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length > pageSize && (
                <div style={{ marginTop: '20px' }}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredItems.length / pageSize) || 1}
                    totalItems={filteredItems.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>
                {viewMode === 'CREATE' ? 'Yangi Xodim Yaratish' : 'Xodimni Tahrirlash'}
              </h1>
              <p className={styles.mainSubtitle}>
                Kerakli ma'lumotlarni to'ldirib saqlang
              </p>
            </div>
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => setViewMode('LIST')}
            >
              Orqaga
            </Button>
          </div>

          <div className={styles.card}>
            {(errorMessage || error) && (
              <div className={styles.alert}>
                <AlertCircle size={18} />
                <span>{errorMessage || error}</span>
              </div>
            )}

            {viewMode === 'CREATE' && (
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  marginBottom: '20px',
                  paddingBottom: '16px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: !isSelectExistingUser ? '#2563eb' : '#64748b',
                  }}
                >
                  <input
                    type="radio"
                    name="employeeInputMode"
                    checked={!isSelectExistingUser}
                    onChange={() => setIsSelectExistingUser(false)}
                  />
                  <span>✍️ Yangi xodim kiritish (qo'lda yozish)</span>
                </label>

                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: isSelectExistingUser ? '#2563eb' : '#64748b',
                  }}
                >
                  <input
                    type="radio"
                    name="employeeInputMode"
                    checked={isSelectExistingUser}
                    onChange={() => setIsSelectExistingUser(true)}
                  />
                  <span>👥 Mavjud foydalanuvchilar orasidan tanlash</span>
                </label>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                {viewMode === 'CREATE' && isSelectExistingUser ? (
                  <Select
                    label="Mavjud Foydalanuvchi *"
                    name="user_id"
                    value={formData.user_id}
                    onChange={handleChange}
                    options={[
                      { value: '', label: 'Xodim foydalanuvchisini tanlang' },
                      ...usersList
                        .filter((u) => {
                          const r = (u.role || '').toUpperCase();
                          return r !== 'TEACHER' && r !== 'STUDENT' && !r.includes('TEACH') && !r.includes('STUD');
                        })
                        .map((u) => ({
                          value: u.id,
                          label: `${u.full_name} (${u.role || 'Xodim'} — ${u.phone || u.email || ''})`,
                        })),
                    ]}
                    required
                  />
                ) : (
                  <>
                    <Inputs
                      label="Xodim Ism-Familiyasi (F.I.SH) *"
                      name="full_name"
                      type="text"
                      as="input"
                      value={formData.full_name || ''}
                      onChange={handleChange}
                      placeholder=""
                      required={true}
                    />

                    <Inputs
                      label="Telefon raqami *"
                      name="phone"
                      type="text"
                      as="input"
                      value={formData.phone || ''}
                      onChange={handleChange}
                      placeholder=""
                      required={true}
                    />

                    <Inputs
                      label="Email manzil (ixtiyoriy)"
                      name="email"
                      type="email"
                      as="input"
                      value={formData.email || ''}
                      onChange={handleChange}
                      placeholder=""
                    />

                    {viewMode === 'CREATE' && (
                      <Inputs
                        label="Tizimga kirish paroli"
                        name="password"
                        type="password"
                        as="input"
                        value={formData.password || ''}
                        onChange={handleChange}
                        placeholder=""
                      />
                    )}
                  </>
                )}

                <Inputs
                  label="Lavozim *"
                  name="position"
                  type="text"
                  as="input"
                  value={formData.position || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                {(formData.position || '').toLowerCase().includes('tozalik') ||
                (formData.position || '').toLowerCase().includes('farrosh') ||
                (formData.position || '').toLowerCase().includes('cleaner') ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12,
                      color: '#991b1b',
                      lineHeight: 1.4,
                    }}
                  >
                    🔒 <strong>Tozalik xodimi uchun qoida:</strong> Ushbu xodim xodimlar ro'yxatida va oylik maosh hisobida saqlanadi, lekin CRM tizimiga kirish ruxsati berilmaydi.
                  </div>
                ) : null}

                <Inputs
                  label="Oylik Maosh (UZS)"
                  name="salary"
                  type="number"
                  as="input"
                  value={formData.salary || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Select
                  label="Filial / O'quv Maskani"
                  name="branch_id"
                  value={formData.branch_id || (!isSuperAdmin ? (user?.branch_id || branchesList[0]?.id || '') : '')}
                  onChange={handleChange}
                  options={
                    !isSuperAdmin && branchesList.length > 0
                      ? branchesList.map((b) => ({ value: b.id, label: b.name }))
                      : [
                          { value: '', label: 'Filialni tanlang' },
                          ...branchesList.map((b) => ({
                            value: b.id,
                            label: b.name,
                          })),
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
                    { value: 'active', label: 'Faol (Ishda)' },
                    { value: 'inactive', label: 'Nofaol' },
                  ]}
                  required={false}
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

      {viewMode === 'DETAILS' && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Xodim Ma'lumotlari</h1>
              <p className={styles.mainSubtitle}>
                Tanlangan xodim bo'yicha to'liq ko'rinish
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="outline"
                icon={ArrowLeft}
                onClick={() => setViewMode('LIST')}
              >
                Orqaga
              </Button>
              {selectedItem && (
                <Button
                  variant="primary"
                  icon={Edit2}
                  onClick={() => handleOpenEdit(selectedItem)}
                >
                  Tahrirlash
                </Button>
              )}
            </div>
          </div>

          <div className={styles.card}>
            {loading ? (
              <Loader text="Ma'lumotlar yuklanmoqda..." />
            ) : selectedItem ? (
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>F.I.SH</span>
                  <span className={styles.detailValue}>
                    {selectedItem.user?.full_name || `Xodim #${selectedItem.id}`}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Lavozim</span>
                  <span className={styles.detailValue}>
                    {selectedItem.position || '—'}
                  </span>
                </div>

                {(() => {
                  const matchedTeacher = teachersList.find(
                    (t) =>
                      String(t.user_id) ===
                      String(selectedItem.user_id || selectedItem.user?.id)
                  );
                  if (matchedTeacher?.specialization) {
                    return (
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>
                          Mutaxassislik (Fan)
                        </span>
                        <span
                          className={styles.detailValue}
                          style={{ color: '#059669', fontWeight: 600 }}
                        >
                          📚 {matchedTeacher.specialization}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Telefon</span>
                  <span className={styles.detailValue}>
                    {selectedItem.user?.phone || '—'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Email</span>
                  <span className={styles.detailValue}>
                    {selectedItem.user?.email || '—'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Filial</span>
                  <span className={styles.detailValue}>
                    {selectedItem.branch?.name || 'Asosiy filial'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Oylik Maosh</span>
                  <span className={styles.detailValue}>
                    {selectedItem.salary
                      ? `${Number(selectedItem.salary)
                          .toLocaleString('ru-RU')
                          .replace(/,/g, ' ')} UZS`
                      : '—'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Holati</span>
                  <span className={styles.detailValue}>
                    {selectedItem.status === 'active' ? 'Ishda' : 'Nofaol'}
                  </span>
                </div>

                {((selectedItem.position || '').toLowerCase().includes('tozalik') ||
                  (selectedItem.position || '').toLowerCase().includes('farrosh') ||
                  (selectedItem.position || '').toLowerCase().includes('cleaner')) && (
                  <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                    <span className={styles.detailLabel}>Tizimga Kirish Ruxsati</span>
                    <span className={styles.detailValue} style={{ color: '#dc2626', fontWeight: 600 }}>
                      🔒 Cheklangan (Tozalik xodimi tizimga kira olmaydi, faqat maosh va xodimlar ro'yxatida hisob yuritiladi)
                    </span>
                  </div>
                )}
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

export default Employees;
