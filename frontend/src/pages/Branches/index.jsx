import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBranchs,
  fetchBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  clearError,
} from '../../store/slices/branchSlice';
import studentApi from '../../services/studentApi';
import groupApi from '../../services/groupApi';
import classroomApi from '../../services/classroomApi';
import userApi from '../../services/userApi';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './branches.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Building2,
  MapPin,
  User,
  Users,
  FolderKanban,
  DoorOpen,
  Phone,
} from 'lucide-react';

const Branches = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { user } = useSelector((state) => state.auth || {});
  const { items, selectedItem, loading, error } = useSelector((state) => state.branch || {});

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [searchQuery, setSearchQuery] = useState('');

  // Additional entity lists to compute real per-branch metrics
  const [studentsList, setStudentsList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [classroomsList, setClassroomsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    plan: 'Standart',
    payment_type: "Oylik to'lov",
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadAllMetricsData = () => {
    dispatch(fetchBranchs());

    studentApi.getAll({ limit: 300 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStudentsList(list);
    }).catch(() => {});

    groupApi.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupsList(list);
    }).catch(() => {});

    classroomApi.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setClassroomsList(list);
    }).catch(() => {});

    userApi.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setUsersList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllMetricsData();
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      plan: 'Standart',
      payment_type: "Oylik to'lov",
      status: 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchBranchById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item) => {
    const linkedUser = usersList.find(
      (u) => String(u.branch_id) === String(item.id)
    );
    const resolvedPlan = item.plan || linkedUser?.plan || 'Standart';
    const resolvedPaymentType = item.payment_type || linkedUser?.payment_type || "Oylik to'lov";

    setFormData({
      id: item.id,
      name: item.name || '',
      address: item.address || '',
      phone: item.phone || '',
      plan: resolvedPlan,
      payment_type: resolvedPaymentType,
      status: item.status || 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Filialni o'chirish",
      message: "Haqiqatdan ham ushbu filialni o'chirmoqchimisiz? Filialga tegishli barcha guruhlar va xonalar ma'lumotlariga ta'sir qilishi mumkin.",
      confirmText: "Ha, o'chirilsin",
      cancelText: "Bekor qilish",
      type: "danger",
    });

    if (isConfirmed) {
      const res = await dispatch(deleteBranch(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        loadAllMetricsData();
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
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createBranch(payload));
      if (!res.error) {
        loadAllMetricsData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateBranch({ id: formData.id, data: payload }));
      if (!res.error) {
        loadAllMetricsData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
  const userBranchId = user?.branch_id;
  const userCenterName = user?.branch?.name || user?.full_name || "O'quv Maskani";

  // Filtered branches (Faqat tegishli o'quv maskani)
  const filteredBranches = useMemo(() => {
    let list = items || [];
    if (!isSuperAdmin) {
      list = list.filter((b) =>
        (userBranchId && b.id === userBranchId) ||
        (userCenterName && (b.name.toLowerCase() === userCenterName.toLowerCase() || b.name.toLowerCase().includes(userCenterName.toLowerCase())))
      );
      if (list.length === 0) {
        list = [{
          id: userBranchId || 1,
          name: userCenterName,
          address: user?.branch?.address || "Asosiy bino",
          phone: user?.phone || user?.branch?.phone || "+998 71 200 00 00",
          plan: user?.branch?.plan || 'Standart',
          payment_type: "Oylik to'lov",
          status: 'active',
        }];
      }
    }

    return list.filter((b) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const name = (b.name || '').toLowerCase();
      const address = (b.address || '').toLowerCase();
      const phone = (b.phone || '').toLowerCase();
      return name.includes(q) || address.includes(q) || phone.includes(q);
    });
  }, [items, searchQuery, isSuperAdmin, userBranchId, userCenterName, user]);

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Filiallar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: 'Batafsil' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          <Header
            title="Filiallar"
            subtitle="O'quv markazi filiallari"
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

          {/* Search Toolbar */}
          <div className={styles.toolbar}>
            <div className={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Filiallarni qidirish..."
                value={searchQuery}
                onChange={handleSearch}
                className={styles.searchInput}
              />
            </div>
          </div>

          {loading ? (
            <Loader text="Filiallar yuklanmoqda..." />
          ) : filteredBranches.length === 0 ? (
            <div
              className={styles.card}
              style={{
                textAlign: 'center',
                padding: '48px',
                color: '#64748b',
                fontSize: '14px',
              }}
            >
              Hozircha filiallar mavjud emas. Yuqoridagi "+ Qo'shish" tugmasi orqali yangi filial kiritishingiz mumkin.
            </div>
          ) : (
            /* BRANCHES CARDS GRID (3 Columns) */
            <div className={styles.branchesGrid}>
              {filteredBranches.map((branch) => {
                // Calculate dynamic metrics for this branch
                const branchStudentsCount = studentsList.filter(
                  (s) =>
                    String(s.branch_id) === String(branch.id) ||
                    String(s.user?.branch_id) === String(branch.id)
                ).length;

                const branchGroupsCount = groupsList.filter(
                  (g) => String(g.branch_id) === String(branch.id)
                ).length;

                const branchClassroomsCount = classroomsList.filter(
                  (c) => String(c.branch_id) === String(branch.id)
                ).length;

                // Find manager for this branch
                const manager = usersList.find(
                  (u) =>
                    String(u.branch_id) === String(branch.id) &&
                    (u.role === 'MANAGER' || u.role === 'ADMIN')
                );
                const managerName = manager?.full_name || branch.manager_name || 'Aziza Karimova';

                const isActive = (branch.status || 'active') === 'active';
                const branchPlan = (branch.plan || manager?.plan || 'Standart').toLowerCase();
                const isStarter = branchPlan === 'starter';
                const isPremium = branchPlan === 'premium';

                return (
                  <div key={branch.id} className={styles.branchCard}>
                    {/* Top: Branch Title, Address, Tariff & Manager */}
                    <div className={styles.cardHeader}>
                      <div>
                        <div className={styles.titleWithPlan}>
                          <h3 className={styles.branchTitle}>{branch.name}</h3>
                          <span
                            className={
                              isStarter
                                ? styles.planBadgeStarter
                                : isPremium
                                ? styles.planBadgePremium
                                : styles.planBadgeStandart
                            }
                          >
                            {isStarter
                              ? '🚀 Starter (200-600)'
                              : isPremium
                              ? '👑 Premium (1001-1800)'
                              : '⭐ Standart (601-1000)'}
                          </span>
                        </div>
                        <div className={styles.branchAddress}>
                          {branch.address || "Manzil ko'rsatilmagan"}
                        </div>
                        <div className={styles.branchManager}>
                          Menejer: {managerName} • {branch.payment_type || "Oylik to'lov"}
                        </div>
                      </div>
                    </div>

                    {/* Middle: 3 Metrics Columns */}
                    <div className={styles.metricsRow}>
                      <div className={styles.metricBlock}>
                        <div className={styles.metricCount}>{branchStudentsCount}</div>
                        <div className={styles.metricLabel}>talaba</div>
                      </div>

                      <div className={styles.metricBlock}>
                        <div className={styles.metricCount}>{branchGroupsCount}</div>
                        <div className={styles.metricLabel}>guruh</div>
                      </div>

                      <div className={styles.metricBlock}>
                        <div className={styles.metricCount}>{branchClassroomsCount}</div>
                        <div className={styles.metricLabel}>xona</div>
                      </div>
                    </div>

                    {/* Bottom: Status & Action buttons */}
                    <div className={styles.cardFooter}>
                      <span
                        className={`${styles.statusBadge} ${
                          isActive ? styles.statusActive : styles.statusInactive
                        }`}
                      >
                        {isActive ? 'Faol' : 'Nofaol'}
                      </span>

                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenDetails(branch)}
                          title="Batafsil ko'rish"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleOpenEdit(branch)}
                          title="Tahrirlash"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.deleteBtn}`}
                          onClick={(e) => handleDelete(branch.id, e)}
                          title="O'chirish"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* CREATE / EDIT BRANCH */}
      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <Header
            title={viewMode === 'CREATE' ? 'Yangi Filial Yaratish' : 'Filialni Tahrirlash'}
            subtitle="Kerakli ma'lumotlarni to'ldirib saqlang"
            actions={
              <Button
                variant="outline"
                icon={ArrowLeft}
                onClick={() => setViewMode('LIST')}
              >
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
              {/* Tariff 3-Option Selector (Starter / Standart / Premium) */}
              <div className={styles.tariffSection}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  <label className={styles.tariffMainLabel}>O'quv Markazi Tarifi *</label>
                  {viewMode === 'EDIT' && (
                    <span className={styles.tariffLockedBadge}>
                      🔒 Tahrirlashda o'zgartirib bo'lmaydi
                    </span>
                  )}
                </div>
                {viewMode === 'EDIT' && (
                  <p className={styles.tariffHint}>
                    Filial ro'yxatdan o'tgan tarifida ({formData.plan === 'Starter' ? '🚀 Starter' : formData.plan === 'Premium' ? '👑 Premium' : '⭐ Standart'}) qat'iy saqlanadi.
                  </p>
                )}
                <div className={styles.tariffCardsRow}>
                  {/* STARTER */}
                  <div
                    className={`${styles.tariffCardItem} ${
                      formData.plan === 'Starter' ? styles.tariffCardActiveStarter : ''
                    } ${
                      viewMode === 'EDIT'
                        ? formData.plan === 'Starter'
                          ? styles.tariffCardLocked
                          : styles.tariffCardDisabled
                        : ''
                    }`}
                    onClick={() => {
                      if (viewMode === 'EDIT') return;
                      setFormData((prev) => ({ ...prev, plan: 'Starter' }));
                    }}
                  >
                    <div className={styles.tariffCardTop}>
                      <span className={styles.tariffCardIcon}>🚀</span>
                      <span className={styles.tariffCardName}>Starter (800k)</span>
                      {viewMode === 'EDIT' && formData.plan === 'Starter' && (
                        <span className={styles.tariffLockedBadge}>🔒 Faol</span>
                      )}
                    </div>
                    <p className={styles.tariffCardDesc}>
                      200 - 600 talaba sig'imi. Boshlang'ich markazlar uchun kassa va dars jadvali
                    </p>
                  </div>

                  {/* STANDART */}
                  <div
                    className={`${styles.tariffCardItem} ${
                      formData.plan === 'Standart' ? styles.tariffCardActiveStandart : ''
                    } ${
                      viewMode === 'EDIT'
                        ? formData.plan === 'Standart'
                          ? styles.tariffCardLocked
                          : styles.tariffCardDisabled
                        : ''
                    }`}
                    onClick={() => {
                      if (viewMode === 'EDIT') return;
                      setFormData((prev) => ({ ...prev, plan: 'Standart' }));
                    }}
                  >
                    <div className={styles.tariffCardTop}>
                      <span className={styles.tariffCardIcon}>⭐</span>
                      <span className={styles.tariffCardName}>Standart (1.2M)</span>
                      {viewMode === 'EDIT' && formData.plan === 'Standart' && (
                        <span className={styles.tariffLockedBadge}>🔒 Faol</span>
                      )}
                    </div>
                    <p className={styles.tariffCardDesc}>
                      601 - 1000 talaba sig'imi. Rivojlanayotgan markazlar uchun asosiy modullar
                    </p>
                  </div>

                  {/* PREMIUM */}
                  <div
                    className={`${styles.tariffCardItem} ${
                      formData.plan === 'Premium' ? styles.tariffCardActivePremium : ''
                    } ${
                      viewMode === 'EDIT'
                        ? formData.plan === 'Premium'
                          ? styles.tariffCardLocked
                          : styles.tariffCardDisabled
                        : ''
                    }`}
                    onClick={() => {
                      if (viewMode === 'EDIT') return;
                      setFormData((prev) => ({ ...prev, plan: 'Premium' }));
                    }}
                  >
                    <div className={styles.tariffCardTop}>
                      <span className={styles.tariffCardIcon}>👑</span>
                      <span className={styles.tariffCardName}>Premium (1.8M)</span>
                      {viewMode === 'EDIT' && formData.plan === 'Premium' && (
                        <span className={styles.tariffLockedBadge}>🔒 Faol</span>
                      )}
                    </div>
                    <p className={styles.tariffCardDesc}>
                      1001 - 1800 talaba sig'imi. Imtihonlar, SMS, Invoyslar va barcha imkoniyatlar
                    </p>
                  </div>
                </div>
              </div>

              <div className={styles.formGrid}>
                <Inputs
                  label="Filial Nomi *"
                  name="name"
                  type="text"
                  as="input"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                <Inputs
                  label="Manzil *"
                  name="address"
                  type="text"
                  as="input"
                  value={formData.address || ''}
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
                  required={false}
                />

                <Select
                  label="To'lov Turi (Davri)"
                  name="payment_type"
                  value={formData.payment_type || "Oylik to'lov"}
                  onChange={handleChange}
                  options={[
                    { value: "Oylik to'lov", label: "Oylik to'lov" },
                    { value: "Yillik to'lov", label: "Yillik to'lov" },
                  ]}
                  required={false}
                />

                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Faol' },
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

      {/* BRANCH DETAILS VIEW */}
      {viewMode === 'DETAILS' && (
        <>
          <Header
            title={selectedItem?.name || "Filial Ma'lumotlari"}
            subtitle="Tanlangan filial bo'yicha to'liq ko'rinish"
            actions={
              <Button
                variant="outline"
                icon={ArrowLeft}
                onClick={() => setViewMode('LIST')}
              >
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
                  <span className={styles.detailLabel}>Filial Nomi</span>
                  <span className={styles.detailValue}>{selectedItem.name}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Tarif</span>
                  <span className={styles.detailValue}>
                    {selectedItem.plan === 'Premium' ? '👑 Premium' : '⭐ Standart'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>To'lov Davri</span>
                  <span className={styles.detailValue}>
                    {selectedItem.payment_type || "Oylik to'lov"}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Manzil</span>
                  <span className={styles.detailValue}>{selectedItem.address || '—'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Telefon</span>
                  <span className={styles.detailValue}>{selectedItem.phone || '—'}</span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Holati</span>
                  <span className={styles.detailValue}>
                    {selectedItem.status === 'active' ? 'Faol' : 'Nofaol'}
                  </span>
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

export default Branches;
