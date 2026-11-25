import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Breadcrumbs } from '../../layout';
import marketApi from '../../services/marketApi';
import gradeApi from '../../services/gradeApi';
import studentApi from '../../services/studentApi';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';
import styles from './market.module.css';
import {
  ShoppingBag,
  Coins,
  BookOpen,
  Coffee,
  Sparkles,
  CheckCircle2,
  Clock,
  Shirt,
  PenTool,
  Check,
  X,
  AlertCircle,
  ArrowRight,
  Gift,
  Users,
  Lock
} from 'lucide-react';

const Market = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const role = (user?.role?.name || user?.role_name || user?.role || 'STAFF').toUpperCase();
  const rawPosition = user?.position || user?.employee?.position || user?.employee_profile?.position;
  const userPosition = formatStaffPosition(rawPosition);
  const isInspector =
    userPosition === 'Nazoratchi' ||
    role === 'NAZORATCHI' ||
    role === 'SUPERVISOR' ||
    role === 'INSPECTOR';

  useEffect(() => {
    if (isInspector) {
      navigate('/dashboard', { replace: true });
    }
  }, [isInspector, navigate]);

  const isStudent = role === 'STUDENT';
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || user?.is_superadmin;
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isManager = role === 'MANAGER' || role === 'MODERATOR';
  const canManage = isAdmin || isManager;

  const centerName = user?.branch?.name || "Yuksalish Ta'limi";

  // Active Tab
  const [activeTab, setActiveTab] = useState(canManage ? 'admin_orders' : 'catalog');
  const [catalog, setCatalog] = useState([]);
  const [studentProfile, setStudentProfile] = useState(null);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [myOrders, setMyOrders] = useState([]);
  const [myGrades, setMyGrades] = useState([]);
  const [loading, setLoading] = useState(true);

  // Admin / Manager Orders State
  const [adminOrders, setAdminOrders] = useState([]);
  const [adminOrdersLoading, setAdminOrdersLoading] = useState(false);
  const [adminStatusFilter, setAdminStatusFilter] = useState('all');

  // Modal order state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorAlert, setErrorAlert] = useState('');

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => fetchInitialData(true), 10000);
    const onCoinsUpdate = () => fetchInitialData(true);
    window.addEventListener('coins_updated', onCoinsUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('coins_updated', onCoinsUpdate);
    };
  }, [user?.id]);

  useEffect(() => {
    if (canManage) {
      fetchAdminOrders();
    }
  }, [canManage, adminStatusFilter]);

  const fetchInitialData = async (silent = false) => {
    const shouldShowLoader = !silent && catalog.length === 0;
    try {
      if (shouldShowLoader) setLoading(true);

      // 1. Fetch Catalog
      const catRes = await marketApi.getCatalog();
      setCatalog(catRes.data?.data || []);

      // 2. Fetch Student Profile & Coins (Faqat talabalar uchun)
      if (!canManage) {
        let currentStudent = null;
        if (user?.student?.id) {
          currentStudent = user.student;
        } else {
          const sRes = await studentApi.getAll({ limit: 100 });
          const list = sRes.data?.data || (Array.isArray(sRes.data) ? sRes.data : []);
          currentStudent = list.find((s) => String(s.user_id) === String(user?.id)) || null;
        }

        if (currentStudent) {
          setStudentProfile(currentStudent);
          setCoinsBalance(currentStudent.coins || 0);

          // Fetch student orders & grades history
          const [ordRes, grdRes] = await Promise.all([
            marketApi.getStudentOrders(currentStudent.id).catch(() => ({ data: { data: [] } })),
            gradeApi.getStudentGrades(currentStudent.id).catch(() => ({ data: { data: { grades: [] } } }))
          ]);

          setMyOrders(ordRes.data?.data || []);
          setMyGrades(grdRes.data?.data?.grades || []);
          if (grdRes.data?.data?.student?.coins !== undefined) {
            setCoinsBalance(grdRes.data.data.student.coins);
          }
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (shouldShowLoader) setLoading(false);
    }
  };

  const fetchAdminOrders = async () => {
    try {
      setAdminOrdersLoading(true);
      const params = {};
      if (adminStatusFilter !== 'all') params.status = adminStatusFilter;
      const res = await marketApi.getAllOrdersForAdmin(params);
      setAdminOrders(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAdminOrdersLoading(false);
    }
  };

  const handleOpenOrderModal = (product) => {
    setErrorAlert('');
    setSelectedProduct(product);
  };

  const handleConfirmOrder = async () => {
    if (!selectedProduct || !studentProfile) return;

    if (coinsBalance < selectedProduct.coins) {
      setErrorAlert(`Kechirasiz, sizda tangalar yetarli emas! Sizda ${coinsBalance} ta monet bor, mahsulot narxi esa ${selectedProduct.coins} monet.`);
      return;
    }

    try {
      setSubmittingOrder(true);
      setErrorAlert('');

      const res = await marketApi.placeOrder({
        student_id: studentProfile.id,
        item_key: selectedProduct.key,
        note: null
      });

      if (res.data?.success) {
        setSelectedProduct(null);
        setSuccessToast(`🎉 "${selectedProduct.name}" buyurtmangiz muvaffaqiyatli jo'natildi! Admin yoki Manager zakazni tasdiqlab topshirgach, hisobingizdan ${selectedProduct.coins} monet yechiladi.`);
        setTimeout(() => setSuccessToast(''), 6000);

        // Refresh orders list
        marketApi.getStudentOrders(studentProfile.id).then((r) => setMyOrders(r.data?.data || []));

        // If admin/manager, also refresh admin orders
        if (canManage) {
          fetchAdminOrders();
        }
      }
    } catch (err) {
      console.error(err);
      setErrorAlert(err.response?.data?.message || "Buyurtma berishda xatolik yuz berdi.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus, ord) => {
    const studentName = ord?.student?.user?.full_name || 'Talaba';
    const groupName = ord?.student?.group_name || ord?.student?.group?.name || 'IT kids';
    const itemName = ord?.item_name || "Sovg'a";
    const coins = ord?.coins_spent || 0;

    let confirmMsg = '';
    if (newStatus === 'delivered') {
      confirmMsg = `Haqiqatan ham "${groupName}" guruhidagi ${studentName}ning "${itemName}" buyurtmasini qabul qilib topshirmoqchimisiz?\n\nTasdiqlasangiz, talaba hisobidan ${coins} monet yechiladi!`;
    } else {
      confirmMsg = `Haqiqatan ham "${groupName}" guruhidagi ${studentName}ning "${itemName}" buyurtmasini bekor qilmoqchimisiz?`;
    }

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await marketApi.updateOrderStatus(orderId, { status: newStatus });
      if (res.data?.success) {
        alert(res.data.message);
        fetchAdminOrders();
        window.dispatchEvent(new Event('coins_updated'));
        if (studentProfile?.id) {
          fetchInitialData();
        }
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  if (isInspector) {
    return null;
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: "O'quv Markazi Brend Magazini" }]} />

      {/* Admin / Manager Header */}
      {canManage && (
        <div style={{ marginBottom: '18px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
            Brend Do'kon & Zakazlar
          </h1>
          <p style={{ fontSize: '13.5px', color: '#64748b', margin: 0 }}>
            Talabalar tomonidan monetlarga berilgan sovg'a buyurtmalarini ko'rish va boshqarish
          </p>
        </div>
      )}

      {/* Hero Banner with Coins Balance - ONLY FOR STUDENTS */}
      {!canManage && (
        <div className={styles.heroBanner}>
          <div className={styles.heroLeft}>
            <div className={styles.brandTag}>
              <Sparkles size={14} color="#fef08a" />
              <span>{centerName} Rasmiy Brend Do'koni</span>
            </div>
            <h1 className={styles.heroTitle}>O'quv Markazi Brend Mahsulotlari</h1>
            <p className={styles.heroDesc}>
              Uy vazifasi va darsdagi faolligingiz evaziga ustozingiz qo'ygan baholardan to'plagan monetlaringizga o'quv markazimizning sifatli brendli sovg'alarini bepul xarid qiling!
            </p>
          </div>

          {/* Real-time Student Coins Balance Card */}
          <div className={styles.balanceCard}>
            <span className={styles.balanceLabel}>Sizning Tangalaringiz</span>
            <div className={styles.balanceAmount}>
              <span>🪙</span>
              <span>{coinsBalance}</span>
            </div>
            <span className={styles.balanceHint}>
              {coinsBalance >= 200
                ? "🎉 Stakan yoki Daftar olishga yetarli!"
                : coinsBalance >= 150
                ? "🎉 Brendli Daftar olishga yetarli!"
                : `Yana ${150 - coinsBalance} monet to'plab daftar oling`}
            </span>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successToast && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '14px 20px',
          borderRadius: '14px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle2 size={20} color="#10b981" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className={styles.tabsBar}>
        {canManage && (
          <button
            type="button"
            className={`${styles.tabItem} ${activeTab === 'admin_orders' ? styles.tabItemActive : ''}`}
            onClick={() => setActiveTab('admin_orders')}
          >
            <ShoppingBag size={16} />
            <span>Tushgan Zakazlar ({adminOrders.length})</span>
            {adminOrders.filter(o => o.status === 'pending').length > 0 && (
              <span style={{
                background: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                padding: '2px 7px',
                borderRadius: '10px',
                fontWeight: 700,
                marginLeft: '6px'
              }}>
                {adminOrders.filter(o => o.status === 'pending').length} yangi
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          className={`${styles.tabItem} ${activeTab === 'catalog' ? styles.tabItemActive : ''}`}
          onClick={() => setActiveTab('catalog')}
        >
          <Gift size={16} />
          <span>Sovg'alar Katalogi</span>
        </button>

        {!canManage && (
          <>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'my_orders' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('my_orders')}
            >
              <ShoppingBag size={16} />
              <span>Mening Buyurtmalarim ({myOrders.length})</span>
            </button>

            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'coin_history' ? styles.tabItemActive : ''}`}
              onClick={() => setActiveTab('coin_history')}
            >
              <Coins size={16} />
              <span>Monetlarim Tarixi ({myGrades.length})</span>
            </button>
          </>
        )}
      </div>

      {/* ========================================================= */}
      {/* 0. ADMIN & MANAGER ORDERS TAB                             */}
      {/* ========================================================= */}
      {activeTab === 'admin_orders' && canManage && (
        <div className={styles.ordersTableCard}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            background: '#ffffff'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569' }}>
                Holat bo'yicha filter:
              </label>
              <select
                value={adminStatusFilter}
                onChange={(e) => setAdminStatusFilter(e.target.value)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  outline: 'none',
                  fontWeight: 600
                }}
              >
                <option value="all">Barchasi</option>
                <option value="pending">⏳ Kutilmoqda</option>
                <option value="delivered">✅ Qabul qilingan & Yechilgan</option>
                <option value="cancelled">❌ Bekor qilingan</option>
              </select>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Jami buyurtmalar: <b>{adminOrders.length} ta</b>
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana & Vaqt</th>
                  <th>Guruh</th>
                  <th>Talaba F.I.SH</th>
                  <th>Joriy Balansi</th>
                  <th>Mahsulot (Sovg'a)</th>
                  <th>Kerakli Tanga</th>
                  <th>Holati</th>
                  <th>Amal (Admin/Manager)</th>
                </tr>
              </thead>
              <tbody>
                {adminOrdersLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      Zakazlar yuklanmoqda...
                    </td>
                  </tr>
                ) : adminOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Hech qanday sovg'a buyurtmasi topilmadi.
                    </td>
                  </tr>
                ) : (
                  adminOrders.map((ord) => {
                    const groupTitle = ord.student?.group_name || ord.student?.group?.name || 'IT kids';
                    const studentTitle = ord.student?.user?.full_name || `Talaba #${ord.student_id}`;
                    const currentBalance = ord.student?.coins !== undefined ? ord.student.coins : 0;

                    return (
                      <tr key={ord.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 600 }}>{new Date(ord.ordered_at).toLocaleDateString('uz-UZ')}</span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              {new Date(ord.ordered_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className={styles.groupBadge}>
                            🏷️ {groupTitle}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{studentTitle}</span>
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {ord.student?.user?.phone || ord.student?.parent_phone || "Tel yo'q"}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: '#fefce8',
                            color: '#854d0e',
                            border: '1px solid #fef08a',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '12.5px'
                          }}>
                            🪙 {currentBalance} monet
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0f172a' }}>
                            {ord.item_name}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#2563eb', fontSize: '13.5px' }}>
                            {ord.coins_spent} monet
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusBadge} ${
                              ord.status === 'delivered'
                                ? styles.statusDelivered
                                : ord.status === 'cancelled'
                                ? styles.statusCancelled
                                : styles.statusPending
                            }`}
                          >
                            {ord.status === 'delivered'
                              ? '✅ Topshirildi (Yechilgan)'
                              : ord.status === 'cancelled'
                              ? '❌ Bekor qilingan'
                              : '⏳ Kutilmoqda (Yechilmagan)'}
                          </span>
                        </td>
                        <td>
                          {ord.status === 'pending' ? (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                className={`${styles.actionBtnSmall} ${styles.deliverBtn}`}
                                onClick={() => handleUpdateOrderStatus(ord.id, 'delivered', ord)}
                                title={`Qabul qilish va talabadan ${ord.coins_spent} monet yechish`}
                              >
                                <Check size={14} />
                                <span>Qabul qilish & Tangani yechish</span>
                              </button>
                              <button
                                type="button"
                                className={`${styles.actionBtnSmall} ${styles.cancelBtn}`}
                                onClick={() => handleUpdateOrderStatus(ord.id, 'cancelled', ord)}
                                title="Bekor qilish"
                              >
                                <X size={14} />
                                <span>Bekor qilish</span>
                              </button>
                            </div>
                          ) : ord.status === 'delivered' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 700 }}>✅ Topshirildi</span>
                              {ord.processor?.full_name && (
                                <span style={{ fontSize: '11px', color: '#64748b' }}>Qabul qildi: {ord.processor.full_name}</span>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>❌ Bekor qilindi</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. PRODUCTS CATALOG                                      */}
      {/* ========================================================= */}
      {activeTab === 'catalog' && (
        <div className={styles.productsGrid}>
          {catalog.map((product) => {
            const canAfford = coinsBalance >= product.coins;
            const missingCoins = product.coins - coinsBalance;

            return (
              <div key={product.key} className={styles.productCard}>
                {/* Visual Area */}
                <div className={styles.productImageArea}>
                  {product.badge && <span className={styles.productBadge}>{product.badge}</span>}
                  <span className={styles.productCoinTag}>
                    🪙 {product.coins} monet
                  </span>

                  {/* Render Visual Branded Mockups */}
                  {product.key === 'notebook' && (
                    <div className={styles.mockupWrapper}>
                      <svg width="102" height="136" viewBox="0 0 102 136" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <linearGradient id="bookCoverGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="50%" stopColor="#0f172a" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>
                          <linearGradient id="bookGoldGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="50%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ca8a04" />
                          </linearGradient>
                          <filter id="bookShadow" x="-10%" y="0%" width="125%" height="125%">
                            <feDropShadow dx="3" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.25" />
                          </filter>
                        </defs>

                        <g filter="url(#bookShadow)">
                          {/* Book pages edge on the right */}
                          <path d="M 88 8 L 94 10 L 94 126 L 88 124 Z" fill="#f8fafc" />
                          <line x1="91" y1="10" x2="91" y2="126" stroke="#cbd5e1" strokeWidth="0.5" />

                          {/* Silk ribbon bookmark */}
                          <path d="M 68 122 L 68 132 L 71 129 L 74 132 L 74 122 Z" fill="#ef4444" />

                          {/* Hardcover Book */}
                          <rect x="6" y="6" width="84" height="118" rx="4" fill="url(#bookCoverGrad)" />
                          {/* Spine strip on the left */}
                          <path d="M 6 6 L 14 6 L 14 124 L 6 124 Z" fill="#334155" />
                          <line x1="14" y1="6" x2="14" y2="124" stroke="#0f172a" strokeWidth="0.8" />

                          {/* Gold Foil Frame */}
                          <rect x="18" y="14" width="66" height="102" rx="3" stroke="url(#bookGoldGrad)" strokeWidth="0.8" strokeDasharray="3 1" fill="none" />

                          {/* Gold Graduation Cap */}
                          <polygon points="51,30 35,37 51,44 67,37" fill="url(#bookGoldGrad)" />
                          <path d="M 40 42 L 40 50 Q 51 55 62 50 L 62 42" fill="url(#bookGoldGrad)" fillOpacity="0.85" />
                          <path d="M 64 38 L 70 43 L 70 53" stroke="url(#bookGoldGrad)" strokeWidth="1" strokeLinecap="round" />

                          {/* Brand Text */}
                          <text x="51" y="66" textAnchor="middle" fill="url(#bookGoldGrad)" fontSize="6.5" fontWeight="800" letterSpacing="0.6">
                            {centerName.toUpperCase()}
                          </text>
                          <text x="51" y="77" textAnchor="middle" fill="#ffffff" fontSize="5.2" fontWeight="700" letterSpacing="0.4">
                            PREMIUM DAFTAR
                          </text>
                          <line x1="34" y1="83" x2="68" y2="83" stroke="url(#bookGoldGrad)" strokeWidth="0.5" />
                          <text x="51" y="91" textAnchor="middle" fill="#94a3b8" fontSize="4.2" fontWeight="600">
                            96 VARAQ • QATTIQ MUQOVA
                          </text>
                          <text x="51" y="99" textAnchor="middle" fill="#64748b" fontSize="3.8" fontWeight="500">
                            A5 FORMAT
                          </text>
                        </g>
                      </svg>
                    </div>
                  )}

                  {product.key === 'cup' && (
                    <div className={styles.mockupWrapper}>
                      <svg width="96" height="138" viewBox="0 0 96 138" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          {/* Metallic cylindrical 3D lighting */}
                          <linearGradient id="cupBodyGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="14%" stopColor="#334155" />
                            <stop offset="36%" stopColor="#475569" />
                            <stop offset="55%" stopColor="#1e293b" />
                            <stop offset="85%" stopColor="#0f172a" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>

                          {/* Stainless steel chrome rims */}
                          <linearGradient id="chromeGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#64748b" />
                            <stop offset="25%" stopColor="#f1f5f9" />
                            <stop offset="50%" stopColor="#ffffff" />
                            <stop offset="75%" stopColor="#cbd5e1" />
                            <stop offset="100%" stopColor="#475569" />
                          </linearGradient>

                          {/* Insulated Lid */}
                          <linearGradient id="lidGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0f172a" />
                            <stop offset="35%" stopColor="#0284c7" />
                            <stop offset="65%" stopColor="#38bdf8" />
                            <stop offset="100%" stopColor="#0f172a" />
                          </linearGradient>

                          <filter id="cupShadow" x="-15%" y="0%" width="130%" height="125%">
                            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.28" />
                          </filter>
                        </defs>

                        <g filter="url(#cupShadow)">
                          {/* 1. Drinking spout flip lock on top */}
                          <rect x="40" y="3" width="16" height="6" rx="3" fill="#38bdf8" />
                          <path d="M 36 9 L 60 9 L 58 13 L 38 13 Z" fill="#0284c7" />

                          {/* 2. Insulated Lid */}
                          <path d="M 14 13 Q 48 9 82 13 L 80 23 Q 48 21 16 23 Z" fill="url(#lidGrad)" />
                          <rect x="22" y="17" width="52" height="2" rx="1" fill="#ffffff" opacity="0.35" />

                          {/* 3. Chrome Collar Ring */}
                          <path d="M 16 23 L 80 23 L 79 27 L 17 27 Z" fill="url(#chromeGrad)" />

                          {/* 4. Tapered Ergonomic Thermo Tumbler Body */}
                          <path d="M 17 27 L 79 27 L 72 120 Q 48 124 24 120 Z" fill="url(#cupBodyGrad)" />

                          {/* Vertical reflection streak down the side */}
                          <path d="M 28 27 L 38 27 L 35 120 L 27 120 Z" fill="#ffffff" opacity="0.1" />

                          {/* 5. Chrome Base Ring */}
                          <path d="M 24 120 L 72 120 L 70 128 Q 48 131 26 128 Z" fill="url(#chromeGrad)" />
                          <ellipse cx="48" cy="128" rx="22" ry="2" fill="#020617" opacity="0.5" />

                          {/* 6. Laser-Engraved Branding */}
                          <circle cx="48" cy="52" r="9" fill="#0284c7" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="0.8" />
                          {/* Steam curves */}
                          <path d="M 44 50 Q 44 47 46 47 Q 48 47 48 50 Q 48 53 50 53" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" fill="none" />
                          <path d="M 48 50 Q 48 47 50 47 Q 52 47 52 50 Q 52 53 54 53" stroke="#38bdf8" strokeWidth="1" strokeLinecap="round" fill="none" />
                          <path d="M 45 54 L 51 54 L 50 58 Q 48 59 46 58 Z" fill="#38bdf8" />

                          {/* Center Text */}
                          <text x="48" y="70" textAnchor="middle" fill="#ffffff" fontSize="6.5" fontWeight="800" letterSpacing="0.6">
                            {centerName.toUpperCase()}
                          </text>
                          <text x="48" y="78" textAnchor="middle" fill="#38bdf8" fontSize="5" fontWeight="700" letterSpacing="0.4">
                            TERMO-STAKAN
                          </text>
                          <line x1="32" y1="83" x2="64" y2="83" stroke="#475569" strokeWidth="0.5" />
                          <text x="48" y="90" textAnchor="middle" fill="#94a3b8" fontSize="4.2" fontWeight="600" letterSpacing="0.2">
                            VACUUM INSULATED
                          </text>
                          <text x="48" y="97" textAnchor="middle" fill="#64748b" fontSize="3.8" fontWeight="500">
                            HOT &amp; COLD • 450 ML
                          </text>
                        </g>
                      </svg>
                    </div>
                  )}

                  {product.key === 'pen_set' && (
                    <div className={styles.mockupWrapper}>
                      <svg width="102" height="136" viewBox="0 0 102 136" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          {/* Deep navy leather cover */}
                          <linearGradient id="padCoverGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="50%" stopColor="#0f172a" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>

                          {/* Gold foil stamp gradient */}
                          <linearGradient id="padGoldGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="40%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ca8a04" />
                          </linearGradient>

                          {/* Chrome spiral wire binding */}
                          <linearGradient id="spiralGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#94a3b8" />
                            <stop offset="35%" stopColor="#ffffff" />
                            <stop offset="65%" stopColor="#cbd5e1" />
                            <stop offset="100%" stopColor="#475569" />
                          </linearGradient>

                          {/* Luxury pen 3D cylindrical body */}
                          <linearGradient id="penBodyGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#020617" />
                            <stop offset="25%" stopColor="#1e3a8a" />
                            <stop offset="50%" stopColor="#3b82f6" />
                            <stop offset="75%" stopColor="#1d4ed8" />
                            <stop offset="100%" stopColor="#020617" />
                          </linearGradient>

                          {/* Pen gold trim & clip */}
                          <linearGradient id="penGoldTrim" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#935a06" />
                            <stop offset="30%" stopColor="#fef08a" />
                            <stop offset="60%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#713f12" />
                          </linearGradient>

                          {/* Shadow filter */}
                          <filter id="setShadow" x="-15%" y="0%" width="130%" height="125%">
                            <feDropShadow dx="3" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.25" />
                          </filter>
                        </defs>

                        <g filter="url(#setShadow)">
                          {/* ========================================= */}
                          {/* 1. NOTEPAD / BLOKNOT                      */}
                          {/* ========================================= */}
                          {/* Paper pages block edge behind */}
                          <rect x="10" y="19" width="54" height="106" rx="4" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="0.6" />
                          <line x1="64" y1="21" x2="64" y2="123" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="1 1" />

                          {/* Front cover */}
                          <rect x="7" y="16" width="55" height="108" rx="4" fill="url(#padCoverGrad)" />

                          {/* Spine wire binding holes & loops */}
                          <line x1="7" y1="23" x2="62" y2="23" stroke="#334155" strokeWidth="0.8" />
                          {[13, 21, 29, 37, 45, 53].map((pos) => (
                            <g key={pos}>
                              <ellipse cx={pos} cy="16" rx="2" ry="1.5" fill="#020617" />
                              <path d={`M ${pos - 1} 10 Q ${pos} 7 ${pos + 2} 10 L ${pos + 2} 18 Q ${pos} 20 ${pos - 1} 18 Z`} fill="url(#spiralGrad)" />
                            </g>
                          ))}

                          {/* Decorative gold foil frame */}
                          <rect x="13" y="32" width="43" height="82" rx="3" stroke="url(#padGoldGrad)" strokeWidth="0.7" strokeDasharray="3 1" fill="none" />

                          {/* Graduation cap on notepad */}
                          <polygon points="34.5,45 23,50 34.5,55 46,50" fill="url(#padGoldGrad)" />
                          <path d="M 27 54 L 27 59 Q 34.5 63 42 59 L 42 54" fill="url(#padGoldGrad)" fillOpacity="0.85" />
                          <path d="M 44 51 L 48 54 L 48 61" stroke="url(#padGoldGrad)" strokeWidth="0.8" strokeLinecap="round" />

                          {/* Notepad Gold branding */}
                          <text x="34.5" y="73" textAnchor="middle" fill="url(#padGoldGrad)" fontSize="5.2" fontWeight="800" letterSpacing="0.5">
                            {centerName.toUpperCase()}
                          </text>
                          <text x="34.5" y="81" textAnchor="middle" fill="#ffffff" fontSize="4.2" fontWeight="700" letterSpacing="0.4">
                            BLOKNOT
                          </text>
                          <line x1="22" y1="86" x2="47" y2="86" stroke="url(#padGoldGrad)" strokeWidth="0.5" />
                          <text x="34.5" y="93" textAnchor="middle" fill="#94a3b8" fontSize="3.6" fontWeight="600">
                            TO'PLAM
                          </text>

                          {/* Elastic bookmark band bottom */}
                          <rect x="48" y="16" width="6" height="108" rx="1" fill="#ca8a04" fillOpacity="0.85" />

                          {/* ========================================= */}
                          {/* 2. 3D LUXURY EXECUTIVE METALLIC PEN       */}
                          {/* ========================================= */}
                          {/* Pen Clicker Top (Gold) */}
                          <rect x="76" y="10" width="7" height="6" rx="1.5" fill="url(#penGoldTrim)" />
                          <rect x="75" y="15" width="9" height="3" rx="1" fill="url(#penGoldTrim)" />

                          {/* Pen Upper Barrel (Deep Blue Metallic) */}
                          <rect x="74.5" y="18" width="10" height="42" rx="1" fill="url(#penBodyGrad)" />

                          {/* Pen Light Streak (Highlight) */}
                          <line x1="78" y1="18" x2="78" y2="108" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.35" />

                          {/* Pen Gold Clip with 3D curve and ball */}
                          <path d="M 74 20 L 71 22 L 71 44 Q 71 47 73 47 L 74 46" fill="url(#penGoldTrim)" />
                          <circle cx="72" cy="46" r="1.6" fill="url(#penGoldTrim)" />
                          <line x1="72" y1="23" x2="72" y2="44" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.6" />

                          {/* Center Gold Band Ring (Engraved) */}
                          <rect x="74" y="60" width="11" height="5" fill="url(#penGoldTrim)" />
                          <line x1="74" y1="62.5" x2="85" y2="62.5" stroke="#713f12" strokeWidth="0.4" />

                          {/* Pen Lower Barrel (Deep Blue Metallic) */}
                          <rect x="75" y="65" width="9" height="43" fill="url(#penBodyGrad)" />

                          {/* Ergonomic grip grooves (Gold Rings) */}
                          <line x1="75" y1="92" x2="84" y2="92" stroke="url(#penGoldTrim)" strokeWidth="0.8" />
                          <line x1="75" y1="96" x2="84" y2="96" stroke="url(#penGoldTrim)" strokeWidth="0.8" />
                          <line x1="75" y1="100" x2="84" y2="100" stroke="url(#penGoldTrim)" strokeWidth="0.8" />

                          {/* Pen Nose Cone (Tapered Gold Tip) */}
                          <polygon points="75,108 84,108 81,122 78,122" fill="url(#penGoldTrim)" />
                          {/* Tungsten ballpoint */}
                          <polygon points="78.5,122 80.5,122 80,126 79,126" fill="#334155" />
                          <circle cx="79.5" cy="126" r="0.7" fill="#cbd5e1" />
                        </g>
                      </svg>
                    </div>
                  )}

                  {product.key === 'tshirt' && (
                    <div className={styles.mockupWrapper}>
                      <svg width="108" height="136" viewBox="0 0 108 136" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          {/* Rich royal navy cotton fabric */}
                          <linearGradient id="shirtBodyGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#1e3a8a" />
                            <stop offset="35%" stopColor="#1d4ed8" />
                            <stop offset="65%" stopColor="#2563eb" />
                            <stop offset="90%" stopColor="#1e40af" />
                            <stop offset="100%" stopColor="#172554" />
                          </linearGradient>

                          {/* Inner collar dark shadow */}
                          <linearGradient id="innerCollarGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#020617" />
                            <stop offset="100%" stopColor="#0f172a" />
                          </linearGradient>

                          {/* Gold emblem / print gradient */}
                          <linearGradient id="shirtGoldGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="#fef08a" />
                            <stop offset="40%" stopColor="#eab308" />
                            <stop offset="100%" stopColor="#ca8a04" />
                          </linearGradient>

                          {/* Drop shadow filter */}
                          <filter id="shirtShadow" x="-15%" y="0%" width="130%" height="125%">
                            <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000000" floodOpacity="0.26" />
                          </filter>
                        </defs>

                        <g filter="url(#shirtShadow)">
                          {/* Inner back collar interior */}
                          <path d="M 37 19 Q 54 26 71 19 L 68 13 Q 54 18 40 13 Z" fill="url(#innerCollarGrad)" />

                          {/* Woven inner size & brand tag */}
                          <rect x="49" y="16" width="10" height="7" rx="1" fill="#f8fafc" />
                          <line x1="51" y1="18" x2="57" y2="18" stroke="#2563eb" strokeWidth="0.8" />
                          <text x="54" y="22" textAnchor="middle" fill="#0f172a" fontSize="3.5" fontWeight="800">M</text>

                          {/* Main T-Shirt Body & Sleeves (Realistic 3D cut) */}
                          <path
                            d="M 37 19
                               L 18 27
                               L 4 48
                               L 17 58
                               L 26 50
                               L 25 116
                               Q 54 122 83 116
                               L 82 50
                               L 91 58
                               L 104 48
                               L 90 27
                               L 71 19
                               Q 54 28 37 19 Z"
                            fill="url(#shirtBodyGrad)"
                          />

                          {/* Left sleeve fold shadow */}
                          <path d="M 26 50 L 17 58 L 19 60 L 28 52 Z" fill="#0f172a" fillOpacity="0.25" />
                          {/* Right sleeve fold shadow */}
                          <path d="M 82 50 L 91 58 L 89 60 L 80 52 Z" fill="#0f172a" fillOpacity="0.25" />

                          {/* Torso side contour shadows for 3D depth */}
                          <path d="M 25 50 Q 28 85 25 116 L 31 116 Q 33 85 30 50 Z" fill="#0f172a" fillOpacity="0.2" />
                          <path d="M 83 50 Q 80 85 83 116 L 77 116 Q 75 85 78 50 Z" fill="#0f172a" fillOpacity="0.2" />

                          {/* Chest highlight reflection (3D volume) */}
                          <ellipse cx="54" cy="62" rx="20" ry="24" fill="#ffffff" fillOpacity="0.08" />

                          {/* Ribbed Front Collar Trim */}
                          <path
                            d="M 37 19 Q 54 29 71 19 Q 54 26 37 19 Z"
                            fill="#1e40af"
                            stroke="#60a5fa"
                            strokeWidth="0.8"
                          />

                          {/* Sleeve hem stitching */}
                          <line x1="7" y1="46" x2="18" y2="55" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />
                          <line x1="101" y1="46" x2="90" y2="55" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="1.5 1" opacity="0.6" />

                          {/* Bottom hem stitching */}
                          <path d="M 26 112 Q 54 118 82 112" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="2 1" fill="none" opacity="0.65" />

                          {/* ========================================= */}
                          {/* CENTER CHEST 3D EMBROIDERY / BRAND LOGO   */}
                          {/* ========================================= */}
                          <g transform="translate(0, 8)">
                            {/* Emblem circle background */}
                            <circle cx="54" cy="52" r="14" fill="#0f172a" fillOpacity="0.45" stroke="url(#shirtGoldGrad)" strokeWidth="0.9" />

                            {/* Graduation cap */}
                            <polygon points="54,44 45,48 54,52 63,48" fill="url(#shirtGoldGrad)" />
                            <path d="M 48 51 L 48 55 Q 54 58 60 55 L 60 51" fill="url(#shirtGoldGrad)" fillOpacity="0.85" />
                            <path d="M 61 49 L 64 51 L 64 57" stroke="url(#shirtGoldGrad)" strokeWidth="0.7" strokeLinecap="round" />

                            {/* Center Brand Text */}
                            <text x="54" y="74" textAnchor="middle" fill="#ffffff" fontSize="5.5" fontWeight="800" letterSpacing="0.6">
                              {centerName.toUpperCase()}
                            </text>
                            <text x="54" y="81" textAnchor="middle" fill="url(#shirtGoldGrad)" fontSize="4.2" fontWeight="700" letterSpacing="0.5">
                              OFFICIAL APPAREL
                            </text>
                            <line x1="40" y1="85" x2="68" y2="85" stroke="url(#shirtGoldGrad)" strokeWidth="0.5" />
                            <text x="54" y="91" textAnchor="middle" fill="#93c5fd" fontSize="3.4" fontWeight="600" letterSpacing="0.3">
                              100% PREMIUM COTTON
                            </text>
                          </g>
                        </g>
                      </svg>
                    </div>
                  )}
                </div>

                {/* Content Area */}
                <div className={styles.productContent}>
                  <div className={styles.productCategory}>{product.category}</div>
                  <h3 className={styles.productTitle}>{product.name}</h3>
                  <p className={styles.productDesc}>{product.description}</p>

                  <div className={styles.productFooter}>
                    <div className={styles.productPriceRow}>
                      <span className={styles.priceLabel}>Narxi</span>
                      <div className={styles.priceCoinsBadge}>
                        <span>🪙</span>
                        <span className={styles.priceCoinsValue}>{product.coins}</span>
                        <span className={styles.priceCoinsUnit}>monet</span>
                      </div>
                    </div>

                    {!canManage ? (
                      canAfford ? (
                        <button
                          type="button"
                          className={styles.buyBtnAffordable}
                          onClick={() => handleOpenOrderModal(product)}
                        >
                          <ShoppingBag size={17} strokeWidth={2.4} />
                          <span>Buyurtma Berish</span>
                          <ArrowRight size={15} />
                        </button>
                      ) : (
                        <div className={styles.progressContainer}>
                          <div className={styles.progressTopRow}>
                            <span className={styles.progressMissingText}>
                              <Lock size={13} strokeWidth={2.4} />
                              <span>Yana <strong>{missingCoins}</strong> ta monet kerak</span>
                            </span>
                            <span className={styles.progressPercentBadge}>
                              {Math.min(100, Math.round((coinsBalance / product.coins) * 100))}%
                            </span>
                          </div>
                          <div className={styles.progressBarTrack}>
                            <div
                              className={styles.progressBarFill}
                              style={{
                                width: `${Math.min(100, Math.round((coinsBalance / product.coins) * 100))}%`
                              }}
                            />
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{
                        padding: '10px 14px',
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        color: '#475569',
                        textAlign: 'center',
                        fontWeight: 600,
                        width: '100%'
                      }}>
                        Talabalar uchun sovg'a ({product.coins} monet)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MY ORDERS (TALABA BUYURTMALARI)                       */}
      {/* ========================================================= */}
      {activeTab === 'my_orders' && (
        <div className={styles.ordersTableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana & Vaqt</th>
                  <th>Mahsulot Nomi</th>
                  <th>Kerakli Monetlar</th>
                  <th>Holati</th>
                  <th>Izoh / Ma'lumot</th>
                </tr>
              </thead>
              <tbody>
                {myOrders.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Siz hali hech qanday sovg'a buyurtma qilmadingiz. Tangalaringizni yig'ib birinchi sovg'angizni xarid qiling!
                    </td>
                  </tr>
                ) : (
                  myOrders.map((ord) => (
                    <tr key={ord.id}>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600 }}>{new Date(ord.ordered_at).toLocaleDateString('uz-UZ')}</span>
                          <span style={{ fontSize: '11px', color: '#64748b' }}>
                            {new Date(ord.ordered_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </td>
                      <td>
                        <b>{ord.item_name}</b>
                      </td>
                      <td>
                        <span style={{ color: ord.status === 'delivered' ? '#dc2626' : '#2563eb', fontWeight: 700 }}>
                          {ord.status === 'delivered' ? `-${ord.coins_spent} 🪙` : `${ord.coins_spent} 🪙`}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            ord.status === 'delivered'
                              ? styles.statusDelivered
                              : ord.status === 'cancelled'
                              ? styles.statusCancelled
                              : styles.statusPending
                          }`}
                        >
                          {ord.status === 'delivered'
                            ? '✅ Topshirildi (Yechilgan)'
                            : ord.status === 'cancelled'
                            ? '❌ Bekor qilindi (Yechilmagan)'
                            : '⏳ Kutilmoqda (Admin tasdiqlashi kutilmoqda)'}
                        </span>
                      </td>
                      <td style={{ color: '#475569', fontSize: '13px' }}>
                        {ord.status === 'delivered'
                          ? "Sovg'a topshirildi va hisobingizdan tangalar yechildi! Muborak bo'lsin!"
                          : ord.status === 'cancelled'
                          ? "Buyurtma bekor qilingan."
                          : `Admin/Manager buyurtmani qabul qilganida ${ord.coins_spent} monet yechiladi.`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. COIN TRANSACTIONS HISTORY                             */}
      {/* ========================================================= */}
      {activeTab === 'coin_history' && (
        <div className={styles.ordersTableCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Mashg'ulot / Topshiriq</th>
                  <th>Guruh</th>
                  <th>Ustoz</th>
                  <th>Qo'yilgan Baho</th>
                  <th>Qo'shilgan Monet</th>
                  <th>Ustoz Izohi</th>
                </tr>
              </thead>
              <tbody>
                {myGrades.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Hozircha baholash yozuvlari mavjud emas.
                    </td>
                  </tr>
                ) : (
                  myGrades.map((g) => (
                    <tr key={g.id}>
                      <td>{g.date}</td>
                      <td>
                        <span style={{ fontWeight: 700 }}>
                          {g.type === 'homework' ? '📝 Uy vazifasi' : '⚡ Darsdagi mashg\'ulot'}
                        </span>
                      </td>
                      <td>{g.group?.name || '—'}</td>
                      <td>{g.teacher?.user?.full_name || 'Ustoz'}</td>
                      <td>
                        <b>{g.score} / 10 ball</b>
                      </td>
                      <td>
                        <span style={{ color: '#16a34a', fontWeight: 800 }}>
                          +{g.coins} 🪙
                        </span>
                      </td>
                      <td style={{ color: '#475569' }}>{g.comment || "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ORDER CONFIRMATION MODAL                                 */}
      {/* ========================================================= */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <Gift size={20} color="#2563eb" />
                <span>Sovg'ani Buyurtma Qilish</span>
              </h3>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setSelectedProduct(null)}
              >
                <X size={20} />
              </button>
            </div>

            <p className={styles.modalDesc}>
              Haqiqatan ham <b>"{selectedProduct.name}"</b> mahsulotini buyurtma qilmoqchimisiz?
            </p>

            <div className={styles.modalHighlight}>
              <Coins size={20} color="#ca8a04" />
              <span>
                Buyurtma Admin va Managerga yuboriladi. Ular tasdiqlab qabul qilgandan so'ng hisobingizdan <b>{selectedProduct.coins} ta monet</b> yechiladi. Qoladigan balansingiz: <b>{coinsBalance - selectedProduct.coins} monet</b>.
              </span>
            </div>

            {errorAlert && (
              <div style={{ color: '#b91c1c', fontSize: '13px', fontWeight: 600 }}>
                {errorAlert}
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelModalBtn}
                onClick={() => setSelectedProduct(null)}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className={styles.confirmModalBtn}
                onClick={handleConfirmOrder}
                disabled={submittingOrder}
              >
                {submittingOrder ? (
                  <span>Yuborilmoqda...</span>
                ) : (
                  <>
                    <Check size={16} />
                    <span>Ha, zakaz qilaman ({selectedProduct.coins} 🪙)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Market;
