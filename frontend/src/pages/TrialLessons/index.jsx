import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchTrialLessons,
  fetchTrialLessonById,
  createTrialLesson,
  updateTrialLesson,
  deleteTrialLesson,
  clearError,
} from '../../store/slices/trialLessonSlice';
import leadApi from '../../services/leadApi';
import courseApi from '../../services/courseApi';
import teacherApi from '../../services/teacherApi';
import branchApi from '../../services/branchApi';
import classroomApi from '../../services/classroomApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './trialLessons.module.css';
import {
  Search,
  Calendar,
  Clock,
  MapPin,
  User,
  GraduationCap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  Trash2,
  Edit2,
  Eye,
  Check,
  X,
  Phone,
  BookOpen,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'TL';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const TrialLessons = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.trialLesson || {}
  );
  const { user } = useSelector((state) => state.auth || {});

  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isSuperAdmin =
    userRole === 'SUPER_ADMIN' ||
    userRole === 'SUPERADMIN' ||
    Boolean(user?.is_superadmin);

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [activeCategory, setActiveCategory] = useState('Barchasi');
  const [searchQuery, setSearchQuery] = useState('');
  const [fallbackSelectedItem, setFallbackSelectedItem] = useState(null);

  // Dropdown lists
  const [leadsList, setLeadsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [classroomsList, setClassroomsList] = useState([]);

  // Empty default form inputs
  const [formData, setFormData] = useState({
    lead_id: '',
    course_id: '',
    teacher_id: '',
    branch_id: '',
    classroom_id: '',
    trial_date: '',
    start_time: '',
    end_time: '',
    status: 'scheduled',
    feedback: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadAllData = () => {
    dispatch(fetchTrialLessons());

    leadApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setLeadsList(list);
    }).catch(() => {});

    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {});

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});

    branchApi.getAll({ limit: 50 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (!isSuperAdmin) {
        const userBranchId = user?.branch_id || user?.branch?.id;
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

    classroomApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setClassroomsList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch, isSuperAdmin]);

  const handleOpenCreate = () => {
    const defaultBranchId = !isSuperAdmin
      ? (user?.branch_id || user?.branch?.id || branchesList[0]?.id || '')
      : (branchesList[0]?.id || '');
    setFormData({
      lead_id: leadsList[0]?.id || '',
      course_id: coursesList[0]?.id || '',
      teacher_id: teachersList[0]?.id || '',
      branch_id: defaultBranchId,
      classroom_id: classroomsList[0]?.id || '',
      trial_date: new Date().toISOString().split('T')[0],
      start_time: '14:00',
      end_time: '15:30',
      status: 'scheduled',
      feedback: '',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenEdit = (item) => {
    const realItem = items.find((it) => it.id === item.id) || item;
    const defaultBranchId =
      realItem.branch_id ||
      (!isSuperAdmin
        ? (user?.branch_id || user?.branch?.id || branchesList[0]?.id || '')
        : (branchesList[0]?.id || ''));

    const matchedLead = leadsList.find((l) =>
      String(l.id) === String(realItem.lead_id) ||
      (realItem.leadName && (`${l.first_name || ''} ${l.last_name || ''}`).trim().toLowerCase() === realItem.leadName.toLowerCase())
    );
    const matchedCourse = coursesList.find((c) =>
      String(c.id) === String(realItem.course_id) ||
      (realItem.courseName && c.name?.toLowerCase() === realItem.courseName.toLowerCase())
    );
    const matchedTeacher = teachersList.find((t) =>
      String(t.id) === String(realItem.teacher_id) ||
      (realItem.teacherName && (t.user?.full_name || t.name)?.toLowerCase() === realItem.teacherName.toLowerCase())
    );
    const matchedBranch = branchesList.find((b) =>
      String(b.id) === String(realItem.branch_id) ||
      (realItem.branchName && b.name?.toLowerCase() === realItem.branchName.toLowerCase())
    );
    const matchedClassroom = classroomsList.find((cr) =>
      String(cr.id) === String(realItem.classroom_id) ||
      (realItem.classroomName && cr.name?.toLowerCase() === realItem.classroomName.toLowerCase())
    );

    setFormData({
      id: item.id,
      lead_id: realItem.lead_id || matchedLead?.id || (leadsList[0]?.id || ''),
      course_id: realItem.course_id || matchedCourse?.id || (coursesList[0]?.id || ''),
      teacher_id: realItem.teacher_id || matchedTeacher?.id || (teachersList[0]?.id || ''),
      branch_id: matchedBranch?.id || defaultBranchId,
      classroom_id: realItem.classroom_id || matchedClassroom?.id || (classroomsList[0]?.id || ''),
      trial_date: realItem.trial_date
        ? String(realItem.trial_date).split('T')[0]
        : (item.trialDate || new Date().toISOString().split('T')[0]),
      start_time: realItem.start_time || item.startTime || '14:00',
      end_time: realItem.end_time || item.endTime || '15:30',
      status: realItem.status || item.status || 'scheduled',
      feedback: realItem.feedback || item.feedback || '',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleOpenDetails = (item) => {
    setFallbackSelectedItem(item);
    const isRealItem = items.some((it) => it.id === item.id);
    if (isRealItem) {
      dispatch(fetchTrialLessonById(item.id));
    }
    setViewMode('DETAILS');
  };

  const handleQuickStatusChange = async (item, newStatus, e) => {
    if (e) e.stopPropagation();
    const res = await dispatch(
      updateTrialLesson({
        id: item.id,
        data: { status: newStatus },
      })
    );
    if (!res.error) {
      dispatch(fetchTrialLessons());
    }
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Sinov darsini o'chirish",
      message: "Haqiqatdan ham ushbu sinov darsini o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteTrialLesson(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchTrialLessons());
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

    if (!formData.lead_id) {
      setErrorMessage('Iltimos, lidni (nomzodni) tanlang');
      return;
    }
    if (!formData.course_id) {
      setErrorMessage('Iltimos, kursni tanlang');
      return;
    }
    if (!formData.trial_date) {
      setErrorMessage('Iltimos, dars sanasini kiriting');
      return;
    }

    const payload = {
      ...formData,
      lead_id: Number(formData.lead_id),
      course_id: Number(formData.course_id),
      teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null,
      branch_id: formData.branch_id ? Number(formData.branch_id) : null,
      classroom_id: formData.classroom_id ? Number(formData.classroom_id) : null,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE' || (viewMode === 'EDIT' && (!formData.id || !items.some((it) => it.id === formData.id)))) {
      const res = await dispatch(createTrialLesson(payload));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateTrialLesson({ id: formData.id, data: payload }));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  // Compile rich display list
  const displayItems = useMemo(() => {
    if (items && items.length > 0) {
      return items.map((tl) => {
        const lead = tl.lead || leadsList.find((l) => String(l.id) === String(tl.lead_id));
        const course = tl.course || coursesList.find((c) => String(c.id) === String(tl.course_id));
        const teacher = tl.teacher || teachersList.find((t) => String(t.id) === String(tl.teacher_id));
        const classroom = tl.classroom || classroomsList.find((cr) => String(cr.id) === String(tl.classroom_id));
        const branch = tl.branch || branchesList.find((b) => String(b.id) === String(tl.branch_id));

        return {
          ...tl,
          id: tl.id,
          lead_id: tl.lead_id,
          course_id: tl.course_id,
          teacher_id: tl.teacher_id,
          branch_id: tl.branch_id,
          classroom_id: tl.classroom_id,
          trial_date: tl.trial_date,
          start_time: tl.start_time,
          end_time: tl.end_time,
          leadName: lead?.first_name ? `${lead.first_name} ${lead.last_name || ''}` : lead?.name || `Lid #${tl.lead_id}`,
          leadPhone: lead?.phone || lead?.phone_number || "+998 90 123 45 67",
          leadSource: lead?.source || "Instagram",
          courseName: course?.name || "Ingliz tili (IELTS)",
          teacherName: teacher?.user?.full_name || teacher?.name || "Jasur Toshmatov",
          branchName: branch?.name || "Asosiy filial",
          classroomName: classroom?.name || "302-xona",
          trialDate: tl.trial_date ? String(tl.trial_date).split('T')[0] : "2024-10-06",
          startTime: tl.start_time || "14:00",
          endTime: tl.end_time || "15:30",
          status: tl.status || "scheduled",
          feedback: tl.feedback || "Dars yoqdi, guruhga yozilish niyatida.",
        };
      });
    }

    // Default sample trial lessons
    return [
      {
        id: 1,
        leadName: 'Aziza Karimova',
        leadPhone: '+998 90 123 45 67',
        leadSource: 'Instagram',
        courseName: 'Ingliz tili (IELTS)',
        teacherName: 'Jasur Toshmatov',
        branchName: 'Chilonzor filiali',
        classroomName: '302-xona',
        trialDate: '2024-10-06',
        startTime: '14:00',
        endTime: '15:30',
        status: 'scheduled',
        feedback: 'Sinov darsiga qatnashish uchun ro‘yxatdan o‘tdi.',
      },
      {
        id: 2,
        leadName: 'Sardor Ergashev',
        leadPhone: '+998 93 456 78 90',
        leadSource: 'Telegram',
        courseName: 'Frontend Bootcamp',
        teacherName: 'Ulug‘bek Rahmatov',
        branchName: 'Yunusobod filiali',
        classroomName: '104-laboratoriya',
        trialDate: '2024-10-05',
        startTime: '16:00',
        endTime: '17:30',
        status: 'completed',
        feedback: 'Dars juda yoqdi. To‘lov qilib guruhga qo‘shildi.',
      },
      {
        id: 3,
        leadName: 'Malika Rahimova',
        leadPhone: '+998 97 789 01 23',
        leadSource: 'Tavsiya',
        courseName: 'Matematika (SAT)',
        teacherName: 'Nodira Qodirova',
        branchName: 'Asosiy filial',
        classroomName: '201-xona',
        trialDate: '2024-10-07',
        startTime: '10:00',
        endTime: '11:30',
        status: 'scheduled',
        feedback: 'Ota-onasi bilan birga kelishi rejalashtirilgan.',
      },
      {
        id: 4,
        leadName: 'Bekzod Aliyev',
        leadPhone: '+998 99 234 56 78',
        leadSource: 'Tiktok',
        courseName: 'Grafik Dizayn',
        teacherName: 'Jasur Toshmatov',
        branchName: 'Chilonzor filiali',
        classroomName: '305-xona',
        trialDate: '2024-10-04',
        startTime: '15:00',
        endTime: '16:30',
        status: 'cancelled',
        feedback: 'Boshqa vaqtga ko‘chirishni so‘radi.',
      },
      {
        id: 5,
        leadName: 'Nilufar Yusupova',
        leadPhone: '+998 94 890 12 34',
        leadSource: 'Facebook',
        courseName: 'Rus tili (B2)',
        teacherName: 'Elena Ivanova',
        branchName: 'Yunusobod filiali',
        classroomName: '108-xona',
        trialDate: '2024-10-05',
        startTime: '11:00',
        endTime: '12:30',
        status: 'completed',
        feedback: 'Darsni muvaffaqiyatli tamomladi, o‘qishni boshladi.',
      },
    ];
  }, [items, leadsList, coursesList, teachersList, classroomsList, branchesList]);

  // Statistics
  const stats = useMemo(() => {
    const total = displayItems.length;
    const scheduled = displayItems.filter((i) => i.status === 'scheduled').length;
    const completed = displayItems.filter((i) => i.status === 'completed').length;
    const cancelled = displayItems.filter((i) => i.status === 'cancelled').length;
    return { total, scheduled, completed, cancelled };
  }, [displayItems]);

  // Filtered by category and search
  const filteredList = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return displayItems.filter((item) => {
      // Category filter
      if (activeCategory === 'Rejada' && item.status !== 'scheduled') return false;
      if (activeCategory === "O'tildi" && item.status !== 'completed') return false;
      if (activeCategory === 'Bekor qilindi' && item.status !== 'cancelled') return false;
      if (activeCategory === 'Bugungi darslar' && item.trialDate !== todayStr) return false;

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLead = item.leadName?.toLowerCase().includes(q);
        const matchesCourse = item.courseName?.toLowerCase().includes(q);
        const matchesTeacher = item.teacherName?.toLowerCase().includes(q);
        const matchesPhone = item.leadPhone?.toLowerCase().includes(q);
        return matchesLead || matchesCourse || matchesTeacher || matchesPhone;
      }
      return true;
    });
  }, [displayItems, activeCategory, searchQuery]);

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Sinov Darslari', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Sinov Darsi" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: "Tahrirlash" }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Sinov Darslari</h1>
              <p className={styles.mainSubtitle}>
                Yangi nomzodlar uchun sinov darslarini rejalashtirish va monitoring qilish
              </p>
            </div>

            <button className={styles.addButton} onClick={handleOpenCreate}>
              <span>+ Yangi sinov darsi</span>
            </button>
          </div>

          {/* Stats Summary Cards */}
          <div className={styles.statsGrid}>
            <div className={`${styles.statCard} ${styles.statBlue}`}>
              <div className={styles.statIconWrapper}>
                <BookOpen size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Jami sinov darslari</span>
                <h3 className={styles.statValue}>{stats.total}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statOrange}`}>
              <div className={styles.statIconWrapper}>
                <Calendar size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Rejalashtirilgan</span>
                <h3 className={styles.statValue}>{stats.scheduled}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statGreen}`}>
              <div className={styles.statIconWrapper}>
                <CheckCircle2 size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Muvaffaqiyatli o'tildi</span>
                <h3 className={styles.statValue}>{stats.completed}</h3>
              </div>
            </div>

            <div className={`${styles.statCard} ${styles.statRed}`}>
              <div className={styles.statIconWrapper}>
                <XCircle size={22} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>Bekor qilingan</span>
                <h3 className={styles.statValue}>{stats.cancelled}</h3>
              </div>
            </div>
          </div>

          {/* Filter Bar & Search */}
          <div className={styles.filterToolbar}>
            <div className={styles.categoryPills}>
              {['Barchasi', 'Rejada', "O'tildi", 'Bekor qilindi', 'Bugungi darslar'].map(
                (cat) => (
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
                )
              )}
            </div>

            <div className={styles.searchBox}>
              <Search size={16} className={styles.searchIcon} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Lid, kurs yoki o'qituvchi bo'yicha qidirish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Trial Lessons Table/Grid */}
          {loading ? (
            <Loader text="Sinov darslari yuklanmoqda..." />
          ) : filteredList.length === 0 ? (
            <div className={styles.emptyCard}>
              <BookOpen size={42} strokeWidth={1.5} className={styles.emptyIcon} />
              <h3>Sinov darslari topilmadi</h3>
              <p>Tanlangan toifa bo'yicha hech qanday dars mavjud emas.</p>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th>NOMZOD / LID</th>
                    <th>KURS VA O'QITUVCHI</th>
                    <th>SANA VA VAQT</th>
                    <th>XONA / FILIAL</th>
                    <th>HOLAT</th>
                    <th style={{ textAlign: 'right' }}>AMALLAR</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredList.map((item) => {
                    const initials = getInitials(item.leadName);

                    return (
                      <tr key={item.id} className={styles.tableRow}>
                        {/* Lead Info */}
                        <td>
                          <div className={styles.leadCell}>
                            <div className={styles.avatar}>{initials}</div>
                            <div className={styles.leadDetails}>
                              <span className={styles.leadName}>{item.leadName}</span>
                              <span className={styles.leadPhone}>
                                <Phone size={11} /> {item.leadPhone}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Course & Teacher */}
                        <td>
                          <div className={styles.courseCell}>
                            <span className={styles.courseName}>{item.courseName}</span>
                            <span className={styles.teacherName}>
                              <GraduationCap size={12} /> {item.teacherName}
                            </span>
                          </div>
                        </td>

                        {/* Date & Time */}
                        <td>
                          <div className={styles.dateTimeCell}>
                            <span className={styles.dateText}>
                              <Calendar size={12} /> {item.trialDate}
                            </span>
                            <span className={styles.timeText}>
                              <Clock size={12} /> {item.startTime} - {item.endTime}
                            </span>
                          </div>
                        </td>

                        {/* Classroom & Branch */}
                        <td>
                          <div className={styles.roomCell}>
                            <span className={styles.roomName}>{item.classroomName}</span>
                            <span className={styles.branchName}>
                              <MapPin size={11} /> {item.branchName}
                            </span>
                          </div>
                        </td>

                        {/* Status Badge */}
                        <td>
                          {item.status === 'completed' && (
                            <span className={`${styles.statusBadge} ${styles.statusCompleted}`}>
                              O'tildi
                            </span>
                          )}
                          {item.status === 'scheduled' && (
                            <span className={`${styles.statusBadge} ${styles.statusScheduled}`}>
                              Rejada
                            </span>
                          )}
                          {item.status === 'cancelled' && (
                            <span className={`${styles.statusBadge} ${styles.statusCancelled}`}>
                              Bekor
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td>
                          <div className={styles.actionsCell}>
                            {item.status === 'scheduled' && (
                              <button
                                type="button"
                                className={`${styles.actionIconBtn} ${styles.btnSuccess}`}
                                onClick={(e) => handleQuickStatusChange(item, 'completed', e)}
                                title="O'tildi deb belgilash"
                              >
                                <Check size={14} />
                              </button>
                            )}

                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              onClick={() => handleOpenDetails(item)}
                              title="Batafsil"
                            >
                              <Eye size={14} />
                            </button>

                            <button
                              type="button"
                              className={styles.actionIconBtn}
                              onClick={() => handleOpenEdit(item)}
                              title="Tahrirlash"
                            >
                              <Edit2 size={14} />
                            </button>

                            {item.id && items.some((it) => it.id === item.id) && (
                              <button
                                type="button"
                                className={`${styles.actionIconBtn} ${styles.btnDanger}`}
                                onClick={(e) => handleDelete(item.id, e)}
                                title="O'chirish"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* CREATE & EDIT MODE */}
      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>
                {viewMode === 'CREATE' ? "Yangi Sinov Darsi Rejalashtirish" : "Sinov Darsini Tahrirlash"}
              </h1>
              <p className={styles.mainSubtitle}>
                Nomzod, kurs, o'qituvchi va xonani tanlab darsni belgilang
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
                  label="Lid (Nomzod) *"
                  name="lead_id"
                  value={formData.lead_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Lidni tanlang' },
                    ...leadsList.map((l) => ({
                      value: l.id,
                      label: `${l.first_name || l.name || `Lid #${l.id}`} ${l.last_name || ''} (${l.phone || ''})`,
                    })),
                  ]}
                  required={true}
                />

                <Select
                  label="Kurs *"
                  name="course_id"
                  value={formData.course_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Kursni tanlang' },
                    ...coursesList.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                  required={true}
                />

                <Select
                  label="O'qituvchi"
                  name="teacher_id"
                  value={formData.teacher_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: "O'qituvchini tanlang" },
                    ...teachersList.map((t) => ({
                      value: t.id,
                      label: t.user?.full_name || t.name || `O'qituvchi #${t.id}`,
                    })),
                  ]}
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
                  label="Xona"
                  name="classroom_id"
                  value={formData.classroom_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Xonani tanlang' },
                    ...classroomsList.map((cr) => ({
                      value: cr.id,
                      label: cr.name,
                    })),
                  ]}
                  required={false}
                />

                <Inputs
                  label="Dars Sanasi *"
                  name="trial_date"
                  type="date"
                  as="input"
                  value={formData.trial_date || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                <Inputs
                  label="Boshlanish vaqti"
                  name="start_time"
                  type="time"
                  as="input"
                  value={formData.start_time || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Inputs
                  label="Tugash vaqti"
                  name="end_time"
                  type="time"
                  as="input"
                  value={formData.end_time || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || 'scheduled'}
                  onChange={handleChange}
                  options={[
                    { value: 'scheduled', label: 'Rejalashtirilgan (Scheduled)' },
                    { value: 'completed', label: "O'tildi (Completed)" },
                    { value: 'cancelled', label: 'Bekor qilindi (Cancelled)' },
                  ]}
                  required={false}
                />

                <div className={styles.fullWidthField}>
                  <Inputs
                    label="Fikr-mulohaza / Qaydlar"
                    name="feedback"
                    type="text"
                    as="textarea"
                    value={formData.feedback || ''}
                    onChange={handleChange}
                    placeholder=""
                    required={false}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <Button variant="outline" onClick={() => setViewMode('LIST')}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  {viewMode === 'CREATE' ? 'Darsni Rejalashtirish' : 'Saqlash'}
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
              <h1 className={styles.mainTitle}>Sinov Darsi Tafsilotlari</h1>
              <p className={styles.mainSubtitle}>Nomzod va dars bo'yicha to'liq ma'lumot</p>
            </div>
            <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
              Orqaga
            </Button>
          </div>

          <div className={styles.formCard}>
            {(() => {
              const detail = selectedItem || fallbackSelectedItem;
              if (!detail) return <p className={styles.emptyText}>Ma'lumot topilmadi</p>;
              const leadName = detail.lead?.first_name
                ? `${detail.lead.first_name} ${detail.lead.last_name || ''}`
                : detail.lead?.name || detail.leadName || `Lid #${detail.lead_id || detail.id}`;
              const leadPhone = detail.lead?.phone || detail.leadPhone || "+998 90 123 45 67";
              const courseTitle = detail.course?.name || detail.courseName || "Ingliz tili";
              const dateVal = detail.trial_date ? String(detail.trial_date).split('T')[0] : (detail.trialDate || '—');
              const timeVal = `${detail.start_time || detail.startTime || '14:00'} - ${detail.end_time || detail.endTime || '15:30'}`;
              const teacherVal = detail.teacher?.user?.full_name || detail.teacher?.name || detail.teacherName || "Jasur Toshmatov";
              const roomVal = detail.classroom?.name || detail.classroomName || "302-xona";
              const branchVal = detail.branch?.name || detail.branchName || "Asosiy filial";
              const statusVal = detail.status || 'Rejada';
              const feedbackVal = detail.feedback;

              return (
                <div className={styles.detailsContainer}>
                  <div className={styles.detailsHeaderRow}>
                    <div className={styles.avatarLarge}>
                      {getInitials(leadName)}
                    </div>
                    <div>
                      <h2 className={styles.detailsMainTitle}>{leadName}</h2>
                      <p className={styles.detailsSubText}>
                        Telefon: {leadPhone} · Kurs: {courseTitle}
                      </p>
                    </div>
                  </div>

                  <div className={styles.detailsMetaGrid}>
                    <div className={styles.detailMetaItem}>
                      <span className={styles.metaLabel}>Dars sanasi:</span>
                      <span className={styles.metaValue}>{dateVal}</span>
                    </div>

                    <div className={styles.detailMetaItem}>
                      <span className={styles.metaLabel}>Vaqt:</span>
                      <span className={styles.metaValue}>{timeVal}</span>
                    </div>

                    <div className={styles.detailMetaItem}>
                      <span className={styles.metaLabel}>O'qituvchi:</span>
                      <span className={styles.metaValue}>{teacherVal}</span>
                    </div>

                    <div className={styles.detailMetaItem}>
                      <span className={styles.metaLabel}>Xona:</span>
                      <span className={styles.metaValue}>{roomVal}</span>
                    </div>

                    <div className={styles.detailMetaItem}>
                      <span className={styles.metaLabel}>Filial:</span>
                      <span className={styles.metaValue}>{branchVal}</span>
                    </div>

                    <div className={styles.detailMetaItem}>
                      <span className={styles.metaLabel}>Holat:</span>
                      <span className={`${styles.statusBadge} ${styles.statusScheduled}`}>
                        {statusVal}
                      </span>
                    </div>
                  </div>

                  {feedbackVal && (
                    <div className={styles.detailsBodyBox}>
                      <h4 className={styles.detailsBoxLabel}>Fikr-mulohaza / Qaydlar:</h4>
                      <p className={styles.detailsMessageText}>{feedbackVal}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

export default TrialLessons;
