import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchContracts,
  fetchMyContract,
  createContract,
  updateContract,
  renewContract,
  deleteContract,
  clearError,
} from '../../store/slices/contractSlice';
import userApi from '../../services/userApi';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Loader, ContractModal } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './contracts.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  RefreshCw,
  Printer,
  ShieldCheck,
  Calendar,
  CreditCard,
  Check,
  AlertTriangle,
  AlertCircle,
  Building2,
  Clock,
  Banknote,
  ArrowRight,
  FileText,
} from 'lucide-react';

const Contracts = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { user } = useSelector((state) => state.auth || {});
  const { items, myContract, stats, loading, error } = useSelector((state) => state.contract || {});

  const role = (user?.role || '').toUpperCase();
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN';

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals & View state
  const [selectedContractForModal, setSelectedContractForModal] = useState(null);
  const [isContractDocOpen, setIsContractDocOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [adminsList, setAdminsList] = useState([]);

  // Form Data
  const [formData, setFormData] = useState({
    admin_id: '',
    plan: 'Standart',
    monthly_amount: 1200000,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: 'active',
    payment_status: 'paid',
    notes: '',
  });

  // Calculate default end date (+1 month)
  const computeEndDate = (startDate) => {
    const d = new Date(startDate);
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (isSuperAdmin) {
      dispatch(fetchContracts());
      userApi.getAll({ role: 'ADMIN' }).then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setAdminsList(list.filter((u) => (u.role || '').toUpperCase() === 'ADMIN'));
      }).catch(() => {});
    } else {
      dispatch(fetchMyContract());
    }
  }, [dispatch, isSuperAdmin]);

  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({
      admin_id: adminsList[0]?.id || '',
      plan: 'Standart',
      monthly_amount: 1200000,
      start_date: today,
      end_date: computeEndDate(today),
      status: 'active',
      payment_status: 'paid',
      notes: '',
    });
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (contract) => {
    setFormData({
      id: contract.id,
      admin_id: contract.admin_id,
      plan: contract.plan || 'Standart',
      monthly_amount: contract.monthly_amount || (contract.plan === 'Premium' ? 1800000 : 1200000),
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status || 'active',
      payment_status: contract.payment_status || 'paid',
      notes: contract.notes || '',
    });
    setIsEditModalOpen(true);
  };

  const handlePlanChange = (newPlan) => {
    let amount = 1200000;
    if (newPlan === 'Starter') amount = 800000;
    if (newPlan === 'Premium') amount = 1800000;
    setFormData((prev) => ({
      ...prev,
      plan: newPlan,
      monthly_amount: amount,
    }));
  };

  const handleStartDateChange = (startDate) => {
    setFormData((prev) => ({
      ...prev,
      start_date: startDate,
      end_date: computeEndDate(startDate),
    }));
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    const res = await dispatch(createContract(formData));
    if (!res.error) {
      setIsCreateModalOpen(false);
      dispatch(fetchContracts());
    } else {
      alert("Xatolik: " + (res.payload || res.error.message));
    }
  };

  const handleSubmitEdit = async (e) => {
    e.preventDefault();
    const res = await dispatch(updateContract({ id: formData.id, data: formData }));
    if (!res.error) {
      setIsEditModalOpen(false);
      dispatch(fetchContracts());
    } else {
      alert("Xatolik: " + (res.payload || res.error.message));
    }
  };

  const handleRenew = async (id) => {
    const isConfirmed = await confirm({
      title: "Shartnoma muddatini uzaytirish",
      message: "Ushbu shartnoma muddatini +1 oyga uzaytirib, to'lovni tasdiqlaysizmi?",
      confirmText: "Ha, uzaytirilsin",
      cancelText: "Bekor qilish",
      type: "info",
    });

    if (isConfirmed) {
      const res = await dispatch(renewContract({ id, months: 1 }));
      if (!res.error) {
        if (isSuperAdmin) {
          dispatch(fetchContracts());
        } else {
          dispatch(fetchMyContract());
        }
      } else {
        alert("Xatolik: " + (res.payload || res.error.message));
      }
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: "Shartnomani o'chirish",
      message: "Haqiqatdan ham ushbu shartnomani o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: "Bekor qilish",
      type: "danger",
    });

    if (isConfirmed) {
      const res = await dispatch(deleteContract(id));
      if (!res.error) {
        dispatch(fetchContracts());
      }
    }
  };

  // Filtered list for Super Admin
  const filteredContracts = useMemo(() => {
    return (items || []).filter((c) => {
      if (planFilter !== 'ALL' && c.plan !== planFilter) return false;
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'expiring_soon' && !c.is_expiring_soon) return false;
        if (statusFilter === 'expired' && !c.is_expired) return false;
        if (statusFilter === 'active' && (c.is_expired || c.is_expiring_soon)) return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const num = (c.contract_number || '').toLowerCase();
        const center = (c.center_name || '').toLowerCase();
        const admin = (c.admin?.full_name || '').toLowerCase();
        return num.includes(q) || center.includes(q) || admin.includes(q);
      }
      return true;
    });
  }, [items, planFilter, statusFilter, searchQuery]);

  const columns = [
    {
      title: 'SHARTNOMA №',
      key: 'contract_number',
      render: (val, row) => (
        <div style={{ fontWeight: 700, color: '#1e293b' }}>
          {val}
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500 }}>
            {row.center_name || row.admin?.full_name}
          </div>
        </div>
      ),
    },
    {
      title: 'ADMINISTRATOR',
      key: 'admin',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.admin?.full_name || 'Admin'}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>{row.admin?.phone || row.admin?.email}</div>
        </div>
      ),
    },
    {
      title: 'TARIF',
      key: 'plan',
      render: (val) => {
        const p = (val || 'Standart').toLowerCase();
        if (p === 'starter') {
          return (
            <span className={`${styles.badgePlanTable} ${styles.badgeTableStarter}`}>
              🚀 Starter (200-600)
            </span>
          );
        }
        if (p === 'premium') {
          return (
            <span className={`${styles.badgePlanTable} ${styles.badgeTablePremium}`}>
              👑 Premium (1001-1800)
            </span>
          );
        }
        return (
          <span className={`${styles.badgePlanTable} ${styles.badgeTableStandart}`}>
            ⭐ Standart (601-1000)
          </span>
        );
      },
    },
    {
      title: "OYLIK TO'LOV",
      key: 'monthly_amount',
      render: (val, row) => {
        const p = (row.plan || 'Standart').toLowerCase();
        const amountText = p === 'starter' ? '800 000 so\'m' : p === 'premium' ? '1 800 000 so\'m' : '1 200 000 so\'m';
        const color = p === 'starter' ? '#0284c7' : p === 'premium' ? '#b45309' : '#1e40af';
        return (
          <span style={{ fontWeight: 800, color }}>
            {amountText}
          </span>
        );
      },
    },
    {
      title: 'MUDDATI',
      key: 'dates',
      render: (_, row) => (
        <div style={{ fontSize: '12.5px', color: '#334155' }}>
          <div><strong>Dan:</strong> {row.start_date}</div>
          <div><strong>Gacha:</strong> {row.end_date}</div>
        </div>
      ),
    },
    {
      title: 'QOLGAN VAQT',
      key: 'days_left',
      render: (_, row) => {
        const days = row.days_left;
        if (row.is_expired) {
          return (
            <span className={`${styles.badgeDaysLeft} ${styles.badgeDaysExpired}`}>
              <AlertCircle size={13} /> Tugagan ({Math.abs(days)} kun oldin)
            </span>
          );
        }
        if (row.is_expiring_soon) {
          return (
            <span className={`${styles.badgeDaysLeft} ${styles.badgeDaysWarning}`}>
              <AlertTriangle size={13} /> {days === 0 ? "Bugun oxirgi kun!" : `${days} kun qoldi`}
            </span>
          );
        }
        return (
          <span className={`${styles.badgeDaysLeft} ${styles.badgeDaysActive}`}>
            <Clock size={13} /> {days} kun qoldi
          </span>
        );
      },
    },
    {
      title: 'AMALLAR',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <div className={styles.actionBtnGroup}>
          <button
            type="button"
            className={styles.actionIconBtn}
            onClick={() => {
              setSelectedContractForModal(row);
              setIsContractDocOpen(true);
            }}
            title="Rasmiy shartnomani ko'rish & chop etish"
          >
            <Eye size={15} />
          </button>
          <button
            type="button"
            className={`${styles.actionIconBtn} ${styles.actionRenewBtn}`}
            onClick={() => handleRenew(row.id)}
            title="Muddati uzaytirish (+1 oy)"
          >
            <RefreshCw size={15} />
          </button>
          <button
            type="button"
            className={styles.actionIconBtn}
            onClick={() => handleOpenEdit(row)}
            title="Tahrirlash"
          >
            <Edit2 size={15} />
          </button>
          <button
            type="button"
            className={`${styles.actionIconBtn} ${styles.actionDeleteBtn}`}
            onClick={() => handleDelete(row.id)}
            title="O'chirish"
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Boshqaruv' },
          { label: isSuperAdmin ? 'Shartnomalar' : 'Markaz Shartnomasi' },
        ]}
      />

      <Header
        title={isSuperAdmin ? 'Shartnomalar & Abonent To\'lovlari' : 'Markaz Shartnomasi & Tarif'}
        subtitle={
          isSuperAdmin
            ? 'Super Admin va Adminlar o\'rtasidagi barcha shartnomalar, tariflar va oylik muddatlar nazorati'
            : 'EDU CRM tizimidan foydalanish bo\'yicha o\'quv markazingiz faol shartnomasi va oylik abonent holati'
        }
        actions={
          isSuperAdmin ? (
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleOpenCreate}
              style={{ borderRadius: '12px', padding: '10px 20px', fontWeight: 600 }}
            >
              Yangi Shartnoma Tuzish
            </Button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="outline"
                icon={Printer}
                onClick={() => {
                  setSelectedContractForModal(myContract);
                  setIsContractDocOpen(true);
                }}
              >
                Shartnomani Ko'rish / Chop etish
              </Button>
              <Button
                variant="primary"
                icon={RefreshCw}
                onClick={() => myContract?.id && handleRenew(myContract.id)}
              >
                Muddati Uzaytirish (+1 oy)
              </Button>
            </div>
          )
        }
      />

      {/* 3 TARIFF PLANS SHOWCASE CARDS (STARTER, STANDART, PREMIUM) */}
      <div className={styles.plansComparisonGrid}>
        {/* 1. STARTER PLAN */}
        <div className={`${styles.planCard} ${styles.planCardStarter}`}>
          <div>
            <div className={`${styles.planBadgeTop} ${styles.planBadgeStarter}`}>
              🚀 STARTER TARIF
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#0369a1' }}>Starter Reja</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Kichik hajmdagi boshlang'ich o'quv markazlari uchun
            </p>

            <div className={styles.planPriceRow}>
              <span className={styles.planPriceNumber} style={{ color: '#0284c7' }}>800 000</span>
              <span className={styles.planPricePeriod}>so'm / oy</span>
            </div>

            <ul className={styles.planFeaturesList}>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#0ea5e9" /> <strong>200 — 600</strong> talaba sig'imi
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#0ea5e9" /> Guruhlar va Kurslar boshqaruvi
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#0ea5e9" /> Kunlik dars jadvali va davomat
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#0ea5e9" /> Oddiy kassa va to'lovlar
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#0ea5e9" /> O'qituvchilar kabineti
              </li>
            </ul>
          </div>
          <div style={{ fontSize: '12px', color: '#0369a1', borderTop: '1px solid #bae6fd', paddingTop: '12px' }}>
            Sig'im: <strong>200 - 600 talaba</strong> • Oylik: <strong>800 000 UZS</strong>
          </div>
        </div>

        {/* 2. STANDART PLAN */}
        <div className={`${styles.planCard} ${styles.planCardStandart}`}>
          <div>
            <div className={`${styles.planBadgeTop} ${styles.planBadgeStandart}`}>
              ⭐ STANDART TARIF
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1e40af' }}>Standart Reja</h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              O'rta hajmdagi rivojlanayotgan o'quv markazlari uchun
            </p>

            <div className={styles.planPriceRow}>
              <span className={styles.planPriceNumber} style={{ color: '#1e40af' }}>1 200 000</span>
              <span className={styles.planPricePeriod}>so'm / oy</span>
            </div>

            <ul className={styles.planFeaturesList}>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#3b82f6" /> <strong>601 — 1000</strong> talaba sig'imi
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#3b82f6" /> 🎯 <strong>Lidlar (Murojaatlar & CRM voronka)</strong>
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#3b82f6" /> <strong>Barcha Starter modullar</strong>
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#3b82f6" /> Filiallar va Xonalar boshqaruvi
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#3b82f6" /> Kengaytirilgan moliya & to'lov usullari
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#3b82f6" /> Xodimlar va menejerlar kabineti
              </li>
            </ul>
          </div>
          <div style={{ fontSize: '12px', color: '#1e40af', borderTop: '1px solid #bfdbfe', paddingTop: '12px' }}>
            Sig'im: <strong>601 - 1000 talaba</strong> • Oylik: <strong>1 200 000 UZS</strong>
          </div>
        </div>

        {/* 3. PREMIUM PLAN */}
        <div className={`${styles.planCard} ${styles.planCardPremium}`}>
          <div>
            <div className={`${styles.planBadgeTop} ${styles.planBadgePremium}`}>
              👑 PREMIUM TARIF (VIP)
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#92400e' }}>Premium Reja</h3>
            <p style={{ fontSize: '13px', color: '#92400e', marginTop: '4px' }}>
              Yirik va ilg'or o'quv markazlari uchun to'liq imkoniyatlar
            </p>

            <div className={styles.planPriceRow}>
              <span className={styles.planPriceNumber} style={{ color: '#b45309' }}>1 800 000</span>
              <span className={styles.planPricePeriod}>so'm / oy</span>
            </div>

            <ul className={styles.planFeaturesList}>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#f59e0b" /> <strong>1001 — 1800</strong> talaba sig'imi
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#f59e0b" /> <strong>Barcha Standart modullar</strong>
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#f59e0b" /> <strong>Imtihonlar & Testlar</strong> (ballar va reyting)
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#f59e0b" /> <strong>Sertifikatlar generatsiyasi</strong> (QR-kodli)
              </li>
              <li className={styles.planFeatureItem}>
                <Check size={16} color="#f59e0b" /> <strong>Invoyslar, Lidlar/CRM</strong> va Audit log
              </li>
            </ul>
          </div>
          <div style={{ fontSize: '12px', color: '#92400e', borderTop: '1px solid #fde68a', paddingTop: '12px' }}>
            Sig'im: <strong>1001 - 1800 talaba</strong> • Oylik: <strong>1 800 000 UZS</strong>
          </div>
        </div>
      </div>

      {/* SUPER ADMIN VIEW: FULL CONTRACTS TABLE & STATS */}
      {isSuperAdmin ? (
        <>
          {/* STATS */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Jami Shartnomalar</span>
              <span className={styles.statValue}>{stats.total || items.length}</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Faol Shartnomalar</span>
              <span className={styles.statValue} style={{ color: '#10b981' }}>
                {stats.active || items.filter(c => !c.is_expired).length}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>⚠️ Tugayotganlar (≤ 5 kun)</span>
              <span className={styles.statValue} style={{ color: '#f59e0b' }}>
                {stats.expiring_soon || items.filter(c => c.is_expiring_soon).length}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>⛔ Tugaganlar</span>
              <span className={styles.statValue} style={{ color: '#ef4444' }}>
                {stats.expired || items.filter(c => c.is_expired).length}
              </span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>💰 Kutilayotgan Oylik Tushum</span>
              <span className={styles.statValueRevenue}>
                {((stats.total_monthly_revenue || 0).toLocaleString('ru-RU')).replace(/,/g, ' ')} UZS
              </span>
            </div>
          </div>

          {/* TABLE WITH SEARCH AND FILTERS */}
          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Shartnoma raqami yoki markaz nomini qidirish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.filterGroup}>
                <select
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="ALL">Barcha Tariflar</option>
                  <option value="Starter">🚀 Starter (200-600 talaba / 800 000 UZS)</option>
                  <option value="Standart">⭐ Standart (601-1000 talaba / 1 200 000 UZS)</option>
                  <option value="Premium">👑 Premium (1001-1800 talaba / 1 800 000 UZS)</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={styles.filterSelect}
                >
                  <option value="ALL">Barcha Holatlar</option>
                  <option value="active">Faol</option>
                  <option value="expiring_soon">⚠️ Muddati tugayotgan (≤ 5 kun)</option>
                  <option value="expired">⛔ Muddati o'tgan</option>
                </select>
              </div>
            </div>

            {loading ? (
              <Loader text="Shartnomalar yuklanmoqda..." />
            ) : (
              <Table
                columns={columns}
                data={filteredContracts}
                emptyMessage="Hozircha shartnomalar tuzilmagan. Yuqoridagi 'Yangi Shartnoma Tuzish' tugmasi orqali admin bilan shartnoma shakllantiring."
              />
            )}
          </div>
        </>
      ) : (
        /* ADMIN VIEW: CURRENT CONTRACT DETAILS */
        myContract && (
          <div className={styles.adminContractBox}>
            <div className={styles.adminContractTop}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>AMALDAGI SHARTNOMA</div>
                <h3 className={styles.contractNumberTitle}>
                  № {myContract.contract_number || 'EDU-SH-2026-001'}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span
                  className={`${styles.badgePlanTable} ${
                    myContract.plan === 'Starter'
                      ? styles.badgeTableStarter
                      : myContract.plan === 'Premium'
                      ? styles.badgeTablePremium
                      : styles.badgeTableStandart
                  }`}
                  style={{ fontSize: '14px', padding: '6px 14px' }}
                >
                  {myContract.plan === 'Starter'
                    ? '🚀 Starter (200-600 talaba)'
                    : myContract.plan === 'Premium'
                    ? '👑 Premium (1001-1800 talaba)'
                    : '⭐ Standart (601-1000 talaba)'}
                </span>

                <span
                  className={`${styles.badgeDaysLeft} ${
                    myContract.is_expired
                      ? styles.badgeDaysExpired
                      : myContract.is_expiring_soon
                      ? styles.badgeDaysWarning
                      : styles.badgeDaysActive
                  }`}
                  style={{ fontSize: '14px', padding: '6px 14px' }}
                >
                  {myContract.is_expired
                    ? "⛔ Muddati tugagan"
                    : myContract.days_left === 0
                    ? "⚠️ Bugun oxirgi kun!"
                    : `⏳ ${myContract.days_left} kun qoldi`}
                </span>
              </div>
            </div>

            <div className={styles.contractDatesGrid}>
              <div className={styles.contractDateBlock}>
                <div className={styles.contractDateLabel}>Boshlanish sanasi</div>
                <div className={styles.contractDateValue}>{myContract.start_date}</div>
              </div>
              <div className={styles.contractDateBlock}>
                <div className={styles.contractDateLabel}>Tugash sanasi</div>
                <div className={styles.contractDateValue}>{myContract.end_date}</div>
              </div>
              <div className={styles.contractDateBlock}>
                <div className={styles.contractDateLabel}>Oylik Abonent To'lovi</div>
                <div className={styles.contractDateValue} style={{ color: '#059669' }}>
                  {myContract.plan === 'Starter'
                    ? '800 000 so\'m'
                    : myContract.plan === 'Premium'
                    ? '1 800 000 so\'m'
                    : '1 200 000 so\'m'}
                </div>
              </div>
              <div className={styles.contractDateBlock}>
                <div className={styles.contractDateLabel}>Talabalar Sig'imi</div>
                <div className={styles.contractDateValue} style={{ color: '#3b82f6' }}>
                  {myContract.plan === 'Starter'
                    ? '200 — 600 talaba'
                    : myContract.plan === 'Premium'
                    ? '1001 — 1800 talaba'
                    : '601 — 1000 talaba'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button
                variant="outline"
                icon={Printer}
                onClick={() => {
                  setSelectedContractForModal(myContract);
                  setIsContractDocOpen(true);
                }}
              >
                Shartnomani Yuklab olish / Chop etish
              </Button>
              <Button
                variant="primary"
                icon={RefreshCw}
                onClick={() => handleRenew(myContract.id)}
              >
                Muddati Uzaytirish (+1 oy)
              </Button>
            </div>
          </div>
        )
      )}

      {/* CREATE / EDIT CONTRACT MODAL (SUPER ADMIN) */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className={styles.modalBackdrop} style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '650px',
            padding: '24px 28px',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '16px', color: '#0f172a' }}>
              {isCreateModalOpen ? 'Yangi Shartnoma Shakllantirish' : 'Shartnomani Tahrirlash'}
            </h3>

            <form onSubmit={isCreateModalOpen ? handleSubmitCreate : handleSubmitEdit}>
              <div className={styles.modalFormGrid}>
                {isCreateModalOpen && (
                  <Select
                    label="Administratorni tanlang *"
                    name="admin_id"
                    value={formData.admin_id}
                    onChange={(e) => setFormData((prev) => ({ ...prev, admin_id: e.target.value }))}
                    options={[
                      { value: '', label: 'Adminni tanlang' },
                      ...adminsList.map((a) => ({
                        value: a.id,
                        label: `${a.full_name} (${a.branch?.name || a.email})`,
                      })),
                    ]}
                    required={true}
                  />
                )}

                <Select
                  label="Tarif Rejasi *"
                  name="plan"
                  value={formData.plan}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  options={[
                    { value: 'Starter', label: '🚀 Starter (200-600 talaba) — 800 000 so\'m/oy' },
                    { value: 'Standart', label: '⭐ Standart (601-1000 talaba) — 1 200 000 so\'m/oy' },
                    { value: 'Premium', label: '👑 Premium (1001-1800 talaba) — 1 800 000 so\'m/oy' },
                  ]}
                  required={true}
                />

                <Inputs
                  label="Oylik To'lov Summasi (UZS) *"
                  name="monthly_amount"
                  type="number"
                  as="input"
                  value={formData.monthly_amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, monthly_amount: Number(e.target.value) }))}
                  required={true}
                />

                <Inputs
                  label="Boshlanish Sanasi *"
                  name="start_date"
                  type="date"
                  as="input"
                  value={formData.start_date}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required={true}
                />

                <Inputs
                  label="Tugash Sanasi (Oylik muddat) *"
                  name="end_date"
                  type="date"
                  as="input"
                  value={formData.end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                  required={true}
                />

                <Select
                  label="To'lov Holati"
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={(e) => setFormData((prev) => ({ ...prev, payment_status: e.target.value }))}
                  options={[
                    { value: 'paid', label: 'To\'langan' },
                    { value: 'unpaid', label: 'To\'lanmagan' },
                    { value: 'pending', label: 'Kutilmoqda' },
                  ]}
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <Inputs
                  label="Qo'shimcha Qaydlar / Shartlar"
                  name="notes"
                  type="text"
                  as="textarea"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Shartnoma bo'yicha maxsus shartlar..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setIsEditModalOpen(false);
                  }}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary">
                  {isCreateModalOpen ? 'Shartnoma Tuzish' : 'Saqlash'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OFFICIAL CONTRACT DOCUMENT MODAL */}
      <ContractModal
        contract={selectedContractForModal}
        isOpen={isContractDocOpen}
        onClose={() => setIsContractDocOpen(false)}
        onRenew={handleRenew}
      />
    </div>
  );
};

export default Contracts;
