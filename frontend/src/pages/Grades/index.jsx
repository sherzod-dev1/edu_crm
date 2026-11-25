import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Breadcrumbs } from '../../layout';
import gradeApi from '../../services/gradeApi';
import marketApi from '../../services/marketApi';
import groupApi from '../../services/groupApi';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';
import styles from './grades.module.css';
import {
  Award,
  Coins,
  CheckCircle2,
  Calendar,
  Users,
  ShoppingBag,
  Filter,
  Sparkles,
  Clock,
  Search,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  FolderKanban,
  Trophy,
  Star,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Eye,
  Lock
} from 'lucide-react';

const Grades = () => {
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

  const isTeacher =
    role === 'TEACHER' ||
    userPosition === "O'qituvchi" ||
    userPosition === 'Ustoz' ||
    !!user?.teacher_id ||
    !!user?.teacher?.id;
  const isStudent = role === 'STUDENT';
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || user?.is_superadmin;
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isManager = role === 'MANAGER' || role === 'MODERATOR';
  const canManage = isAdmin || isManager;

  useEffect(() => {
    // Baholash sahifasi faqat o'qituvchi va talabaga tegishli, boshqa rahbarlar uchun yopiq
    if (!isTeacher && !isStudent) {
      navigate('/dashboard', { replace: true });
    }
  }, [isTeacher, isStudent, navigate]);

  // Active Tab
  // 'my_grades': Talaba uchun shaxsiy baholari va tangalari
  // 'grading': O'qituvchilar baholash jadvali
  // 'history': Barcha baholar tarixi (Admin & Teacher)
  // 'leaderboard': Talabalar reytingi / Leaderboard (Faqat xodimlar uchun)
  // 'orders': Sovg'alar & Zakazlar boshqaruvi (Admin)
  const [activeTab, setActiveTab] = useState(isStudent ? 'my_grades' : 'grading');

  // Student Personal Data State
  const [myStudentData, setMyStudentData] = useState(null);
  const [myGrades, setMyGrades] = useState([]);
  const [myGradesLoading, setMyGradesLoading] = useState(false);
  const [myGradeFilter, setMyGradeFilter] = useState('all');

  // Groups list
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Check if a group belongs to the logged-in teacher
  const isTeacherGroup = (group) => {
    if (!group) return false;
    const directTeacherId = group.teacher_id;
    const directUserId = group.teacher?.user_id || group.teacher?.user?.id;
    const myTeacherId = user?.teacher_id || user?.teacher?.id;
    const myUserId = user?.id;
    if (directTeacherId && myTeacherId && String(directTeacherId) === String(myTeacherId)) return true;
    if (directUserId && myUserId && String(directUserId) === String(myUserId)) return true;
    if (
      group.teacher?.user?.full_name &&
      user?.full_name &&
      group.teacher.user.full_name.trim().toLowerCase() === user.full_name.trim().toLowerCase()
    ) {
      return true;
    }
    return false;
  };

  // Only the teacher's own groups for teacher, or all groups for admin/manager
  const availableGroups = isTeacher
    ? groups.filter((g) => isTeacherGroup(g))
    : groups;

  const currentGroup = groups.find((g) => String(g.id) === String(selectedGroupId));

  // Faqat o'zini o'qituvchisi baho qo'ya oladi! Admin va Manager faqat ko'radi (read-only).
  const canEditGrades = isTeacher && isTeacherGroup(currentGroup);

  // Students & Existing Grades in selected group
  const [students, setStudents] = useState([]);
  const [groupGrades, setGroupGrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successToast, setSuccessToast] = useState('');
  const [errorAlert, setErrorAlert] = useState('');

  // Form state for grading each student: { [studentId]: { homework: number, activity: number, homeworkComment: '', activityComment: '' } }
  const [gradeInputs, setGradeInputs] = useState({});

  // Admin History State
  const [allGrades, setAllGrades] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  // Leaderboard State
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);

  // Market Orders State (Admin)
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // Fetch groups on mount
  useEffect(() => {
    groupApi.getAll({ limit: 100 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setGroups(list);
        const myAvail = isTeacher ? list.filter((g) => isTeacherGroup(g)) : list;
        if (myAvail.length > 0 && !selectedGroupId) {
          setSelectedGroupId(String(myAvail[0].id));
        } else if (list.length > 0 && !selectedGroupId) {
          setSelectedGroupId(String(list[0].id));
        }
      })
      .catch((err) => console.error(err));
  }, [isTeacher]);

  // Ensure teacher stays on one of their own groups
  useEffect(() => {
    if (isTeacher && availableGroups.length > 0) {
      const exists = availableGroups.some((g) => String(g.id) === String(selectedGroupId));
      if (!exists) {
        setSelectedGroupId(String(availableGroups[0].id));
      }
    }
  }, [isTeacher, availableGroups, selectedGroupId]);

  // Fetch group data when group or date changes
  useEffect(() => {
    if (!selectedGroupId) return;
    fetchGroupStudentsAndGrades();
  }, [selectedGroupId, selectedDate]);

  // Fetch tab-specific data
  useEffect(() => {
    if (isStudent || activeTab === 'my_grades') {
      fetchMyStudentGrades();
    } else if (activeTab === 'history') {
      fetchAdminGrades();
    } else if (activeTab === 'leaderboard' || activeTab === 'orders') {
      fetchMarketOrders();
    }
  }, [activeTab, filterType, orderStatusFilter, isStudent]);

  const fetchMyStudentGrades = async (silent = false) => {
    const shouldShowLoader = !silent && myGrades.length === 0;
    try {
      if (shouldShowLoader) setMyGradesLoading(true);
      const res = await gradeApi.getStudentGrades();
      if (res.data?.success) {
        const nextStudent = res.data.data?.student || null;
        const nextGrades = res.data.data?.grades || [];
        setMyStudentData((prev) => (JSON.stringify(prev) === JSON.stringify(nextStudent) ? prev : nextStudent));
        setMyGrades((prev) => (JSON.stringify(prev) === JSON.stringify(nextGrades) ? prev : nextGrades));
      }
    } catch (e) {
      console.error("fetchMyStudentGrades error:", e);
    } finally {
      if (shouldShowLoader) setMyGradesLoading(false);
    }
  };

  useEffect(() => {
    if (isStudent) {
      fetchMyStudentGrades();
      const interval = setInterval(() => fetchMyStudentGrades(true), 10000);
      const onCoinsUpdate = () => fetchMyStudentGrades(true);
      window.addEventListener('coins_updated', onCoinsUpdate);
      return () => {
        clearInterval(interval);
        window.removeEventListener('coins_updated', onCoinsUpdate);
      };
    }
  }, [isStudent]);

  const fetchGroupStudentsAndGrades = async () => {
    try {
      setLoading(true);
      setErrorAlert('');
      const res = await gradeApi.getGroupGrades({ group_id: selectedGroupId, date: selectedDate });
      const rawStudents = res.data?.data?.students || [];
      const rawGrades = res.data?.data?.grades || [];

      setStudents(rawStudents);
      setGroupGrades(rawGrades);

      // Pre-fill inputs with existing grades
      const initialInputs = {};
      rawStudents.forEach((st) => {
        const hw = rawGrades.find((g) => String(g.student_id) === String(st.id) && g.type === 'homework');
        const act = rawGrades.find((g) => String(g.student_id) === String(st.id) && g.type === 'activity');

        initialInputs[st.id] = {
          homework: hw ? hw.score : null,
          activity: act ? act.score : null,
          homeworkComment: hw ? hw.comment || '' : '',
          activityComment: act ? act.comment || '' : '',
          currentCoins: st.coins || 0
        };
      });
      setGradeInputs(initialInputs);
    } catch (err) {
      console.error(err);
      setErrorAlert("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminGrades = async () => {
    try {
      setHistoryLoading(true);
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      const res = await gradeApi.getAllForAdmin(params);
      setAllGrades(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLeaderboardLoading(true);
      const res = await gradeApi.getLeaderboard();
      setLeaderboard(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const fetchMarketOrders = async () => {
    try {
      setOrdersLoading(true);
      const params = {};
      if (orderStatusFilter !== 'all') params.status = orderStatusFilter;
      const res = await marketApi.getAllOrdersForAdmin(params);
      setOrders(res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleScoreSelect = (studentId, type, score) => {
    setGradeInputs((prev) => {
      const current = prev[studentId] || {};
      const newScore = current[type] === score ? null : score; // toggle if clicked again
      return {
        ...prev,
        [studentId]: {
          ...current,
          [type]: newScore
        }
      };
    });
  };

  const handleCommentChange = (studentId, type, comment) => {
    setGradeInputs((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type === 'homework' ? 'homeworkComment' : 'activityComment']: comment
      }
    }));
  };

  // Quick fill all students with 10 (A'lo baho)
  const handleQuickFillAll = (score = 10) => {
    setGradeInputs((prev) => {
      const next = { ...prev };
      students.forEach((st) => {
        next[st.id] = {
          ...next[st.id],
          homework: score,
          activity: score,
          homeworkComment: next[st.id]?.homeworkComment || "A'lo darajada bajarildi",
          activityComment: next[st.id]?.activityComment || "Darsda faol qatnashdi"
        };
      });
      return next;
    });
  };

  // Save all grades
  const handleSaveAllGrades = async () => {
    if (!canEditGrades) {
      alert("Baholash faqat ushbu guruh o'qituvchisi tomonidan amalga oshiriladi. Admin va menejerlar baholarni faqat ko'rish huquqiga ega.");
      return;
    }
    try {
      setSaving(true);
      setErrorAlert('');

      const gradesPayload = students.map((st) => {
        const inp = gradeInputs[st.id] || {};
        return {
          student_id: st.id,
          homework_score: inp.homework,
          activity_score: inp.activity,
          homework_comment: inp.homeworkComment,
          activity_comment: inp.activityComment
        };
      });

      const selectedGroup = groups.find((g) => String(g.id) === String(selectedGroupId));
      const effectiveTeacherId = user?.teacher?.id || selectedGroup?.teacher_id || null;

      const res = await gradeApi.bulkSaveGrades({
        group_id: selectedGroupId,
        teacher_id: effectiveTeacherId,
        date: selectedDate,
        grades: gradesPayload
      });

      if (res.data?.success) {
        setSuccessToast("✅ Barcha baholar va monetlar muvaffaqiyatli saqlandi! Talabalar hisobiga tangalar o'tkazildi.");
        setTimeout(() => setSuccessToast(''), 4000);
        window.dispatchEvent(new Event('coins_updated'));
        fetchGroupStudentsAndGrades();
      }
    } catch (err) {
      console.error(err);
      setErrorAlert(err.response?.data?.message || "Baholarni saqlashda xatolik yuz berdi.");
    } finally {
      setSaving(false);
    }
  };

  // Deliver or Cancel market order (Admin / Manager)
  const handleUpdateOrderStatus = async (orderId, newStatus, orderInfo) => {
    const studentName = orderInfo?.student?.user?.full_name || 'Talaba';
    const groupName = orderInfo?.student?.group_name || orderInfo?.student?.group?.name || 'IT kids';
    const itemName = orderInfo?.item_name || "Sovg'a";
    const coins = orderInfo?.coins_spent || 0;

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
        fetchMarketOrders();
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
      <Breadcrumbs items={[{ label: 'Baholash & Monetlar' }]} />

      {/* Main Header */}
      <div className={styles.headerWrapper}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.mainTitle}>
            <Award size={26} color="#2563eb" />
            <span>{isStudent ? "Mening Baholarim & Tangalarim" : "Talabalarni Baholash & Tangalar (Gamification)"}</span>
          </h1>
          {isStudent && (
            <p className={styles.mainSubtitle}>
              Uy vazifasi va darslardagi faolligingiz uchun ustozlaringiz qo'ygan baholar hamda to'plangan tangalaringiz tarixi
            </p>
          )}
        </div>

        {isStudent && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.goToMarketBtn}
              onClick={() => navigate('/market')}
            >
              <ShoppingBag size={16} />
              <span>Sovg'alar Do'koni</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Tabs Bar */}
        <div className={styles.tabsContainer}>
          {isStudent && (
            <button
              type="button"
              className={`${styles.tabBtn} ${styles.tabBtnActive}`}
            >
              <Award size={16} />
              <span>Mening Baholarim & Tangalarim</span>
            </button>
          )}

          {!isStudent && (
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'grading' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('grading')}
            >
              <Award size={16} />
              <span>Dars Baholash</span>
            </button>
          )}

          {!isStudent && (
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'leaderboard' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('leaderboard')}
            >
              <Trophy size={16} />
              <span>Sovg'a Olganlar Ro'yxati</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <Clock size={16} />
              <span>Baholar Jurnali</span>
            </button>
          )}

          {canManage && (
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'orders' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('orders')}
            >
              <ShoppingBag size={16} />
              <span>Sovg'alar & Zakazlar</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  marginLeft: '4px',
                  fontWeight: 700
                }}>
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Success & Error Alerts */}
      {successToast && (
        <div style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{successToast}</span>
        </div>
      )}

      {errorAlert && (
        <div style={{
          background: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '12px 18px',
          borderRadius: '12px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertCircle size={18} />
          <span>{errorAlert}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* 0. TALABANING SHAXSIY BAHOLARI VA TANGALARI (FAQAT O'ZI)  */}
      {/* ========================================================= */}
      {isStudent && (
        <>
          {/* 4 Stats Cards */}
          <div className={styles.studentStatsGrid}>
            <div className={styles.studentStatCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconGold}`}>
                🪙
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Sizning Tangalaringiz</span>
                <span className={styles.statValue}>
                  {myStudentData?.coins !== undefined ? myStudentData.coins : (user?.coins || 0)}{' '}
                  <span style={{ fontSize: '15px', color: '#854d0e', fontWeight: 700 }}>monet</span>
                </span>
                <span className={styles.statSubtext}>Do'kondan sovg'alar xarid qilish uchun</span>
              </div>
            </div>

            <div className={styles.studentStatCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconBlue}`}>
                <TrendingUp size={24} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Jami To'plangan Ballar</span>
                <span className={styles.statValue}>
                  {myStudentData?.total_earned || 0}{' '}
                  <span style={{ fontSize: '15px', color: '#1d4ed8', fontWeight: 700 }}>ball</span>
                </span>
                <span className={styles.statSubtext}>Barcha darslar va vazifalar bo'yicha</span>
              </div>
            </div>

            <div className={styles.studentStatCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconPurple}`}>
                <Star size={24} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>O'rtacha Baho</span>
                <span className={styles.statValue}>
                  {myStudentData?.avg_score || "0.0"}{' '}
                  <span style={{ fontSize: '15px', color: '#7e22ce', fontWeight: 700 }}>/ 10</span>
                </span>
                <span className={styles.statSubtext}>O'quv o'zlashtirish ko'rsatkichi</span>
              </div>
            </div>

            <div className={styles.studentStatCard}>
              <div className={`${styles.statIconWrapper} ${styles.statIconGreen}`}>
                <BookOpen size={24} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Baholangan Darslar</span>
                <span className={styles.statValue}>
                  {myGrades.length}{' '}
                  <span style={{ fontSize: '15px', color: '#15803d', fontWeight: 700 }}>ta dars</span>
                </span>
                <span className={styles.statSubtext}>Ustozlaringiz baholagan darslar</span>
              </div>
            </div>
          </div>

          {/* Student Filter & Info Bar */}
          <div className={styles.filterCard}>
            <div className={styles.filterPillContainer}>
              <button
                type="button"
                className={`${styles.filterPill} ${myGradeFilter === 'all' ? styles.filterPillActive : ''}`}
                onClick={() => setMyGradeFilter('all')}
              >
                Hammasi ({myGrades.length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${myGradeFilter === 'homework' ? styles.filterPillActive : ''}`}
                onClick={() => setMyGradeFilter('homework')}
              >
                📝 Uy vazifasi ({myGrades.filter((g) => g.type === 'homework').length})
              </button>
              <button
                type="button"
                className={`${styles.filterPill} ${myGradeFilter === 'activity' ? styles.filterPillActive : ''}`}
                onClick={() => setMyGradeFilter('activity')}
              >
                ⚡ Darsdagi mashg'ulot ({myGrades.filter((g) => g.type === 'activity').length})
              </button>
            </div>
          </div>

          {/* Student Personal Grades Table */}
          <div className={styles.studentsTableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Sana</th>
                    <th>Mashg'ulot Turi</th>
                    <th>Guruhingiz</th>
                    <th>Ustoz</th>
                    <th>Qo'yilgan Baho</th>
                    <th>Qo'shilgan Tangalar</th>
                    <th>Ustoz Izohi</th>
                  </tr>
                </thead>
                <tbody>
                  {myGradesLoading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                        Yuklanmoqda...
                      </td>
                    </tr>
                  ) : myGrades.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Award size={40} color="#cbd5e1" />
                          <h4 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>Hozircha baholar qo'yilmagan</h4>
                          <p style={{ margin: 0, fontSize: '13px' }}>
                            Ustozingiz dars va uy vazifalariga baho qo'yishi bilan bu yerda aks etadi va tangalaringiz ko'payadi!
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    myGrades
                      .filter((g) => myGradeFilter === 'all' || g.type === myGradeFilter)
                      .map((g, idx) => (
                        <tr key={g.id}>
                          <td>
                            <b>#{idx + 1}</b>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Calendar size={14} color="#64748b" />
                              <span style={{ fontWeight: 600 }}>{g.date}</span>
                            </div>
                          </td>
                          <td>
                            <span className={g.type === 'homework' ? styles.typeBadgeHomework : styles.typeBadgeActivity}>
                              {g.type === 'homework' ? '📝 Uy vazifasi' : '⚡ Darsdagi faollik'}
                            </span>
                          </td>
                          <td>
                            <b>{g.group?.name || myStudentData?.group_name || 'IT kids'}</b>
                          </td>
                          <td>{g.teacher?.user?.full_name || 'Ustoz'}</td>
                          <td>
                            <span className={styles.gradeScoreBadge}>
                              ⭐ <b>{g.score}</b> / 10 ball
                            </span>
                          </td>
                          <td>
                            <span className={styles.gradeCoinBadge}>
                              🪙 +{g.coins} monet
                            </span>
                          </td>
                          <td style={{ color: g.comment ? '#1e293b' : '#94a3b8', fontStyle: g.comment ? 'normal' : 'italic' }}>
                            {g.comment || 'Izoh qoldirilmagan'}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 1. TEACHER / ADMIN GRADING SECTION                       */}
      {/* ========================================================= */}
      {!isStudent && activeTab === 'grading' && (
        <>
          {/* Filter Bar: Select Group & Date */}
          <div className={styles.filterCard}>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Guruhni Tanlang</label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className={styles.selectInput}
                >
                  {availableGroups.length === 0 ? (
                    <option value="">Sizga biriktirilgan guruhlar mavjud emas</option>
                  ) : (
                    availableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.course?.name || "Kurs"})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Dars Sanasi</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>

            {canEditGrades ? (
              <button
                type="button"
                className={styles.quickFillBtn}
                onClick={() => handleQuickFillAll(10)}
                title="Barcha talabalarga 10 ball berish"
              >
                <Sparkles size={16} color="#eab308" />
                <span>Barchasiga 10 ball (A'lo) qo'yish</span>
              </button>
            ) : (
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                padding: '8px 14px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                color: '#334155',
                fontWeight: 600
              }}>
                <Eye size={16} color="#2563eb" />
                <span>
                  Ko'rish rejimi {currentGroup?.teacher?.user?.full_name ? `(Ustoz: ${currentGroup.teacher.user.full_name})` : ''}
                </span>
              </div>
            )}
          </div>

          {/* Admin / Manager Info Notice */}
          {!canEditGrades && (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              padding: '12px 18px',
              borderRadius: '12px',
              marginBottom: '16px',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontWeight: 600
            }}>
              <Lock size={18} color="#2563eb" />
              <span>
                Baholash faqat ushbu guruh o'qituvchisi tomonidan amalga oshiriladi. Admin va menejerlar baholarni faqat ko'rish huquqiga ega.
              </span>
            </div>
          )}

          {/* Students Grading Table */}
          <div className={styles.studentsTableCard}>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Talaba F.I.SH</th>
                    <th>Joriy Tangalari</th>
                    <th>Uy Vazifasi (10 ball max)</th>
                    <th>Darsdagi Mashg'ulot (10 ball max)</th>
                    <th>Jami Beriladigan</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        Ma'lumotlar yuklanmoqda...
                      </td>
                    </tr>
                  ) : students.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                        Ushbu guruhda faol talabalar topilmadi.
                      </td>
                    </tr>
                  ) : (
                    students.map((st, idx) => {
                      const inp = gradeInputs[st.id] || {};
                      const hwScore = inp.homework || 0;
                      const actScore = inp.activity || 0;
                      const totalNewCoins = hwScore + actScore;

                      return (
                        <tr key={st.id}>
                          <td>{idx + 1}</td>
                          <td>
                            <div className={styles.studentCell}>
                              <div className={styles.avatar}>
                                {st.user?.full_name ? st.user.full_name[0].toUpperCase() : 'T'}
                              </div>
                              <div className={styles.studentMeta}>
                                <span className={styles.studentName}>
                                  {st.user?.full_name || `Talaba #${st.id}`}
                                </span>
                                <span className={styles.studentPhone}>
                                  {st.user?.phone || st.parent_phone || "Tel yo'q"}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={styles.coinPill}>
                              🪙 {st.coins || 0} monet
                            </span>
                          </td>
                          {/* Homework Score Column */}
                          <td>
                            {canEditGrades ? (
                              <div className={styles.scoreInputGroup}>
                                <div className={styles.scorePillsRow}>
                                  {[10, 9, 8, 7, 6, 5].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      className={`${styles.scorePill} ${num === 10 ? styles.scorePillTen : ''} ${
                                        inp.homework === num ? styles.scorePillActive : ''
                                      }`}
                                      onClick={() => handleScoreSelect(st.id, 'homework', num)}
                                      title={`${num} ball (+${num} monet)`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Izoh..."
                                  value={inp.homeworkComment || ''}
                                  onChange={(e) => handleCommentChange(st.id, 'homework', e.target.value)}
                                  className={styles.commentInput}
                                />
                              </div>
                            ) : (
                              inp.homework !== null && inp.homework !== undefined ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{
                                    background: '#ecfdf5',
                                    color: '#065f46',
                                    border: '1px solid #a7f3d0',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    width: 'fit-content'
                                  }}>
                                    ⭐ {inp.homework} / 10 ball
                                  </span>
                                  {inp.homeworkComment && (
                                    <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                      💬 "{inp.homeworkComment}"
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                                  Baho qo'yilmagan
                                </span>
                              )
                            )}
                          </td>
                          {/* Activity Score Column */}
                          <td>
                            {canEditGrades ? (
                              <div className={styles.scoreInputGroup}>
                                <div className={styles.scorePillsRow}>
                                  {[10, 9, 8, 7, 6, 5].map((num) => (
                                    <button
                                      key={num}
                                      type="button"
                                      className={`${styles.scorePill} ${num === 10 ? styles.scorePillTen : ''} ${
                                        inp.activity === num ? styles.scorePillActive : ''
                                      }`}
                                      onClick={() => handleScoreSelect(st.id, 'activity', num)}
                                      title={`${num} ball (+${num} monet)`}
                                    >
                                      {num}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Mashg'ulot izohi..."
                                  value={inp.activityComment || ''}
                                  onChange={(e) => handleCommentChange(st.id, 'activity', e.target.value)}
                                  className={styles.commentInput}
                                />
                              </div>
                            ) : (
                              inp.activity !== null && inp.activity !== undefined ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                  <span style={{
                                    background: '#eff6ff',
                                    color: '#1e40af',
                                    border: '1px solid #bfdbfe',
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    width: 'fit-content'
                                  }}>
                                    ⭐ {inp.activity} / 10 ball
                                  </span>
                                  {inp.activityComment && (
                                    <span style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>
                                      💬 "{inp.activityComment}"
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                                  Baho qo'yilmagan
                                </span>
                              )
                            )}
                          </td>
                          {/* Total Awarded Coins */}
                          <td>
                            {totalNewCoins > 0 ? (
                              <span className={styles.totalAwardedCoin}>
                                +{totalNewCoins} 🪙
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '13px' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions Bar */}
            <div className={styles.bottomActionBar}>
              <span style={{ fontSize: '13.5px', color: '#64748b' }}>
                Jami talabalar soni: <b>{students.length} nafar</b>
                {!canEditGrades && (
                  <span style={{ marginLeft: '10px', color: '#2563eb', fontWeight: 600 }}>
                    (Faqat ko'rish rejimi faol)
                  </span>
                )}
              </span>
              {canEditGrades && (
                <button
                  type="button"
                  className={styles.saveBtn}
                  onClick={handleSaveAllGrades}
                  disabled={saving || students.length === 0}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Saqlanmoqda...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Baholarni Saqlash & Tangalarni Qo'shish</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* 2. LEADERBOARD (TALABALAR REYTINGI - FAQAT XODIMLARGA)   */}
      {/* ========================================================= */}
      {!isStudent && activeTab === 'leaderboard' && (
        <div className={styles.studentsTableCard}>
          <div style={{
            padding: '16px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                🎁 Sovg'a Qabul Qilib Olgan Talabalar Ro'yxati
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>
                O'quv markazi do'konidan monetlariga sovg'a buyurtma qilib olgan talabalar
              </p>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 600 }}>
              Jami sovg'a olganlar: <b>{orders.filter(o => o.status === 'delivered' || o.status === 'pending').length} ta</b>
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Talaba F.I.SH</th>
                  <th>Guruhi</th>
                  <th>Olingan Sovg'a (Mahsulot)</th>
                  <th>Sarflangan Tangalar</th>
                  <th>Holati</th>
                  <th>Sana & Vaqt</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                      Ma'lumotlar yuklanmoqda...
                    </td>
                  </tr>
                ) : orders.filter(o => o.status === 'delivered' || o.status === 'pending').length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Hozircha sovg'a buyurtma qilgan yoki olgan talabalar mavjud emas.
                    </td>
                  </tr>
                ) : (
                  orders
                    .filter(o => o.status === 'delivered' || o.status === 'pending')
                    .map((ord, idx) => {
                      const studentName = ord.student?.user?.full_name || `Talaba #${ord.student_id}`;
                      const groupName = ord.student?.group_name || ord.student?.group?.name || 'IT kids';
                      const isDelivered = ord.status === 'delivered';

                      return (
                        <tr key={ord.id}>
                          <td>
                            <b>#{idx + 1}</b>
                          </td>
                          <td>
                            <div className={styles.studentCell}>
                              <div className={styles.avatar}>{studentName ? studentName[0] : 'T'}</div>
                              <div>
                                <span className={styles.studentName}>{studentName}</span>
                                {ord.student?.user?.phone && (
                                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {ord.student.user.phone}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: 600
                            }}>
                              {groupName}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>
                              🎁 {ord.item_name}
                            </span>
                          </td>
                          <td>
                            <span className={styles.coinPill} style={{ fontWeight: 800 }}>
                              🪙 {ord.coins_spent} monet
                            </span>
                          </td>
                          <td>
                            {isDelivered ? (
                              <span style={{
                                color: '#16a34a',
                                background: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                ✅ Topshirildi (Olingan)
                              </span>
                            ) : (
                              <span style={{
                                color: '#d97706',
                                background: '#fffbeb',
                                border: '1px solid #fde68a',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                fontWeight: 700,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                ⏳ Kutilmoqda
                              </span>
                            )}
                          </td>
                          <td style={{ fontSize: '12.5px', color: '#64748b' }}>
                            {ord.delivered_at
                              ? new Date(ord.delivered_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : ord.ordered_at
                              ? new Date(ord.ordered_at).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                              : '—'}
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
      {/* 3. ADMIN HISTORY (BAHOLAR JURNALI)                       */}
      {/* ========================================================= */}
      {!isStudent && activeTab === 'history' && (
        <div className={styles.studentsTableCard}>
          <div className={styles.filterCard} style={{ border: 'none', borderBottom: '1px solid #e2e8f0', borderRadius: 0 }}>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Baholash Turi</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="all">Barcha Turlar</option>
                  <option value="homework">Uy Vazifalari</option>
                  <option value="activity">Darsdagi Mashg'ulotlar</option>
                </select>
              </div>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Jami qaydlar: <b>{allGrades.length} ta</b>
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Talaba</th>
                  <th>Guruh</th>
                  <th>Baholagan Ustoz</th>
                  <th>Turi</th>
                  <th>Baho</th>
                  <th>Berilgan Monet</th>
                  <th>Izoh</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      Yuklanmoqda...
                    </td>
                  </tr>
                ) : allGrades.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Baholash tarixi bo'yicha ma'lumot topilmadi.
                    </td>
                  </tr>
                ) : (
                  allGrades.map((g) => (
                    <tr key={g.id}>
                      <td>{g.date}</td>
                      <td>
                        <b>{g.student?.user?.full_name || `Talaba #${g.student_id}`}</b>
                      </td>
                      <td>{g.group?.name || '—'}</td>
                      <td>{g.teacher?.user?.full_name || "O'qituvchi"}</td>
                      <td>
                        <span
                          style={{
                            background: g.type === 'homework' ? '#eff6ff' : '#f0fdf4',
                            color: g.type === 'homework' ? '#1d4ed8' : '#15803d',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '12px'
                          }}
                        >
                          {g.type === 'homework' ? 'Uy vazifasi' : "Darsdagi mashg'ulot"}
                        </span>
                      </td>
                      <td>
                        <b>{g.score} / 10 ball</b>
                      </td>
                      <td>
                        <span className={styles.coinPill}>+{g.coins} 🪙</span>
                      </td>
                      <td style={{ color: '#475569' }}>{g.comment || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MARKET ORDERS MANAGEMENT (SOVG'ALAR & ZAKAZLAR)        */}
      {/* ========================================================= */}
      {!isStudent && activeTab === 'orders' && (
        <div className={styles.studentsTableCard}>
          <div className={styles.filterCard} style={{ border: 'none', borderBottom: '1px solid #e2e8f0', borderRadius: 0 }}>
            <div className={styles.filterControls}>
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Buyurtma Holati</label>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className={styles.selectInput}
                >
                  <option value="all">Barchasi</option>
                  <option value="pending">⏳ Kutilmoqda</option>
                  <option value="delivered">✅ Topshirildi</option>
                  <option value="cancelled">❌ Bekor qilindi</option>
                </select>
              </div>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b' }}>
              Jami buyurtmalar: <b>{orders.length} ta</b>
            </span>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sana & Vaqt</th>
                  <th>Guruh</th>
                  <th>Talaba F.I.SH</th>
                  <th>Joriy Tangalari</th>
                  <th>Mahsulot (Sovg'a)</th>
                  <th>Kerakli Tanga</th>
                  <th>Holati</th>
                  <th>Amal (Admin/Manager)</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                      Zakazlar yuklanmoqda...
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                      Hech qanday sovg'a buyurtmasi topilmadi.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
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
                          <div className={styles.studentCell}>
                            <div className={styles.avatar}>
                              {studentTitle[0]?.toUpperCase() || 'T'}
                            </div>
                            <div className={styles.studentMeta}>
                              <span className={styles.studentName}>{studentTitle}</span>
                              <span className={styles.studentPhone}>
                                {ord.student?.user?.phone || ord.student?.parent_phone || "Tel yo'q"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={styles.coinPill} style={{ background: '#fefce8', color: '#854d0e', borderColor: '#fef08a' }}>
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
                              ? '✅ Qabul qilindi & Yechildi'
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
    </div>
  );
};

export default Grades;

