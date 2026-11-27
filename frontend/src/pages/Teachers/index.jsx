import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchTeachers,
  fetchTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  clearError,
} from '../../store/slices/teacherSlice';
import userApi from '../../services/userApi';
import branchApi from '../../services/branchApi';
import groupApi from '../../services/groupApi';
import studentApi from '../../services/studentApi';
import courseApi from '../../services/courseApi';
import groupStudentApi from '../../services/groupStudentApi';
import { Breadcrumbs } from '../../layout';
import { Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './teachers.module.css';


import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Save,
  User,
  Phone,
  Mail,
  Lock,
  Building2,
  Award,
  BookOpen,
  Users,
  DollarSign,
  Eye,
  Copy,
  Check,
  LayoutGrid,
  List,
  Sparkles,
  X,
  ChevronRight,
  Shield,
  Briefcase,
  ClipboardCheck,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'US';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const formatCurrency = (val) => {
  if (!val || isNaN(val)) return '0';
  return Number(val).toLocaleString('uz-UZ');
};

const Teachers = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.teacher || {}
  );
  const { user } = useSelector((state) => state.auth || {});

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT'
  const [layoutStyle, setLayoutStyle] = useState('GRID'); // 'GRID' | 'TABLE'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'active' | 'inactive'
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = layoutStyle === 'GRID' ? 8 : 10;

  // Selected teacher for Details Modal
  const [activeModalTeacher, setActiveModalTeacher] = useState(null);
  const [copiedKey, setCopiedKey] = useState('');

  // Dropdowns & Related Data
  const [branchesList, setBranchesList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [groupStudentsList, setGroupStudentsList] = useState([]);

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    specialization: '',
    experience_year: '',
    bio: '',
    salary_amount: '',
    branch_id: '',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadData = () => {
    dispatch(fetchTeachers());

    branchApi
      .getAll({ limit: 100 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        const isSuperAdminUser =
          (user?.role || '').toUpperCase() === 'SUPER_ADMIN' ||
          (user?.role || '').toUpperCase() === 'SUPERADMIN';
        if (!isSuperAdminUser) {
          const userBranchId = user?.branch_id;
          const userCenterName = user?.branch?.name || user?.full_name;
          const scoped = list.filter(
            (b) =>
              (userBranchId && String(b.id) === String(userBranchId)) ||
              (userCenterName &&
                b.name?.toLowerCase() === userCenterName?.toLowerCase())
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
      })
      .catch(() => {});

    groupApi
      .getAll({ limit: 200 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setGroupsList(list);
      })
      .catch(() => {});

    studentApi
      .getAll({ limit: 500 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setStudentsList(list);
      })
      .catch(() => {});

    courseApi
      .getAll({ limit: 100 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setCoursesList(list);
      })
      .catch(() => {});

    groupStudentApi
      .getAll({ limit: 500 })
      .then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setGroupStudentsList(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [dispatch]);

  const userRole = (user?.role || '').toUpperCase();
  const rawPosition = (
    user?.position ||
    user?.employee?.position ||
    user?.employee_profile?.position ||
    ''
  ).toLowerCase();
  const isSuperAdmin =
    userRole === 'SUPER_ADMIN' ||
    userRole === 'SUPERADMIN';
  const isManager = userRole === 'MANAGER';
  const isTeacher = userRole === 'TEACHER';
  const isStudent = userRole === 'STUDENT' || userRole === 'TALABA';
  const isInspector =
    userRole === 'NAZORATCHI' ||
    userRole === 'INSPECTOR' ||
    userRole === 'SUPERVISOR' ||
    rawPosition.includes('nazoratchi') ||
    rawPosition.includes('inspektor') ||
    rawPosition.includes('supervisor');
  const canManage = !isManager && !isInspector && !isTeacher && !isStudent;
  const userBranchId = user?.branch_id;

  const branchScopedItems = useMemo(() => {
    if (isSuperAdmin || !userBranchId) return items || [];
    return (items || []).filter(
      (item) =>
        String(item.branch_id) === String(userBranchId) ||
        String(item.user?.branch_id) === String(userBranchId)
    );
  }, [items, isSuperAdmin, userBranchId]);

  // Overall analytics calculation
  const stats = useMemo(() => {
    const list = branchScopedItems || [];
    const totalTeachers = list.length;
    const activeTeachers = list.filter(
      (t) => (t.status || 'active').toLowerCase() === 'active'
    ).length;
    const inactiveTeachers = totalTeachers - activeTeachers;

    const totalSalaryFund = list.reduce(
      (acc, t) => acc + (Number(t.salary_amount) || 0),
      0
    );

    // Connected groups & students count
    const teacherUserIds = new Set(
      list.map((t) => String(t.user_id || t.user?.id || ''))
    );
    const teacherIds = new Set(list.map((t) => String(t.id)));

    const matchedGroups = groupsList.filter((g) => {
      const gTeacherId = String(g.teacher_id || g.teacher?.id || '');
      const gTeacherUserId = String(g.teacher?.user_id || '');
      return (
        teacherIds.has(gTeacherId) ||
        (gTeacherUserId && teacherUserIds.has(gTeacherUserId)) ||
        (gTeacherId && teacherUserIds.has(gTeacherId))
      );
    });
    const totalGroups = matchedGroups.length;

    // Real unique students enrolled in these matched groups
    const enrolledStudentIds = new Set();
    matchedGroups.forEach((g) => {
      const gId = String(g.id);
      if (Array.isArray(g.group_students)) {
        g.group_students.forEach((gs) => {
          const sid = gs.student_id || gs.student?.id || gs.id;
          if (sid) enrolledStudentIds.add(String(sid));
        });
      }
      groupStudentsList
        .filter((gs) => String(gs.group_id) === gId)
        .forEach((gs) => {
          const sid = gs.student_id || gs.student?.id;
          if (sid) enrolledStudentIds.add(String(sid));
        });
      studentsList
        .filter((s) => String(s.group_id) === gId)
        .forEach((s) => {
          if (s.id) enrolledStudentIds.add(String(s.id));
        });
    });
    const totalStudents = enrolledStudentIds.size;

    return {
      totalTeachers,
      activeTeachers,
      inactiveTeachers,
      totalGroups,
      totalStudents,
      totalSalaryFund,
    };
  }, [branchScopedItems, groupsList, studentsList, groupStudentsList]);

  // Filtered teachers list
  const filteredItems = useMemo(() => {
    let result = branchScopedItems;

    if (statusFilter !== 'ALL') {
      result = result.filter(
        (t) => (t.status || 'active').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    if (selectedBranchFilter !== 'ALL') {
      result = result.filter(
        (t) =>
          String(t.branch_id) === String(selectedBranchFilter) ||
          String(t.branch?.id) === String(selectedBranchFilter)
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((t) => {
        const name = (t.user?.full_name || t.full_name || t.name || '').toLowerCase();
        const phone = (t.user?.phone || t.phone || '').toLowerCase();
        const spec = (t.specialization || '').toLowerCase();
        const email = (t.user?.email || t.email || '').toLowerCase();
        return (
          name.includes(q) ||
          phone.includes(q) ||
          spec.includes(q) ||
          email.includes(q)
        );
      });
    }

    return result;
  }, [branchScopedItems, statusFilter, selectedBranchFilter, searchQuery]);

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleCopyCredentials = (text, keyId) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const availableCourses = useMemo(() => {
    if (coursesList && coursesList.length > 0) {
      const names = coursesList.map((c) => c.name).filter(Boolean);
      return Array.from(new Set(names));
    }
    return [];
  }, [coursesList]);

  const handleOpenCreate = () => {
    const isSuperAdminUser =
      (user?.role || '').toUpperCase() === 'SUPER_ADMIN' ||
      (user?.role || '').toUpperCase() === 'SUPERADMIN';
    const defaultBranchId = !isSuperAdminUser
      ? user?.branch_id || user?.branch?.id || branchesList[0]?.id || ''
      : branchesList[0]?.id || '';

    setFormData({
      full_name: '',
      phone: '',
      email: '',
      password: '',
      specialization: '',
      experience_year: '',
      bio: '',
      salary_amount: '',
      branch_id: defaultBranchId,
      status: 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenEdit = (teacher, e) => {
    if (e) e.stopPropagation();
    const currentSpec = teacher.specialization || '';
    setFormData({
      id: teacher.id,
      user_id: teacher.user_id || teacher.user?.id || '',
      full_name: teacher.user?.full_name || teacher.full_name || teacher.name || '',
      phone: teacher.user?.phone || teacher.phone || '',
      email: teacher.user?.email || teacher.email || '',
      password: teacher.user?.plain_password || teacher.plain_password || '123456',
      specialization: currentSpec,
      experience_year: teacher.experience_year || '',
      bio: teacher.bio || '',
      salary_amount: teacher.salary_amount || '',
      branch_id: teacher.branch_id || teacher.branch?.id || '',
      status: teacher.status || 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
    setActiveModalTeacher(null);
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "O'qituvchini o'chirish",
      message: "Haqiqatdan ham ushbu o'qituvchini o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteTeacher(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        loadData();
        if (activeModalTeacher?.id === id) setActiveModalTeacher(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.full_name.trim()) {
      setErrorMessage("O'qituvchi ism-familiyasini kiriting");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Telefon raqamini kiriting');
      return;
    }
    if (!formData.specialization?.trim()) {
      setErrorMessage("Mutaxassislik (fan/yo'nalish) nomini kiriting");
      return;
    }

    try {
      if (viewMode === 'CREATE') {
        const generatedEmail = formData.email.trim()
          ? formData.email.trim()
          : `teacher_${Date.now()}@educrm.uz`;

        const userRes = await userApi.create({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: generatedEmail,
          password: formData.password || '123456',
          role: 'TEACHER',
          branch_id: formData.branch_id ? Number(formData.branch_id) : null,
          status: formData.status || 'active',
        });

        const createdUser = userRes.data?.data || userRes.data;
        if (!createdUser?.id) {
          throw new Error("Foydalanuvchi hisobini yaratib bo'lmadi");
        }

        const res = await dispatch(
          createTeacher({
            user_id: createdUser.id,
            specialization: formData.specialization.trim(),
            experience_year: Number(formData.experience_year) || 1,
            bio: formData.bio?.trim() || "O'qituvchi",
            salary_type: 'monthly',
            salary_amount: Number(formData.salary_amount) || 0,
            branch_id: formData.branch_id ? Number(formData.branch_id) : null,
            status: formData.status || 'active',
          })
        );

        if (!res.error) {
          const createdTeacher = res.payload?.data || res.payload;
          const teacherId = createdTeacher?.id;
          if (teacherId && formData.specialization?.trim()) {
            const specTrim = formData.specialization.trim().toLowerCase();
            const matchingCourse = (coursesList || []).find(
              (c) => (c.name || '').trim().toLowerCase() === specTrim
            );
            if (matchingCourse && (!matchingCourse.teacher_id || !matchingCourse.teacher)) {
              try {
                await courseApi.update(matchingCourse.id, { teacher_id: teacherId });
              } catch (e) {
                console.error("Auto-link course teacher error:", e);
              }
            }
          }
          loadData();
          setViewMode('LIST');
        } else {
          setErrorMessage(res.payload || res.error.message || 'Xatolik yuz berdi');
        }
      } else if (viewMode === 'EDIT') {
        if (formData.user_id) {
          const userUpdatePayload = {
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            branch_id: formData.branch_id ? Number(formData.branch_id) : null,
            status: formData.status || 'active',
          };
          if (formData.email && formData.email.trim()) {
            userUpdatePayload.email = formData.email.trim();
          }
          if (formData.password) {
            userUpdatePayload.password = formData.password;
            userUpdatePayload.plain_password = formData.password;
          }
          await userApi.update(formData.user_id, userUpdatePayload);
        }

        const res = await dispatch(
          updateTeacher({
            id: formData.id,
            data: {
              user_id: formData.user_id ? Number(formData.user_id) : undefined,
              specialization: formData.specialization?.trim(),
              experience_year: Number(formData.experience_year) || 1,
              bio: formData.bio?.trim(),
              salary_amount: Number(formData.salary_amount) || 0,
              branch_id: formData.branch_id ? Number(formData.branch_id) : null,
              status: formData.status || 'active',
            },
          })
        );

        if (!res.error) {
          loadData();
          setViewMode('LIST');
        } else {
          setErrorMessage(res.payload || res.error.message || 'Xatolik yuz berdi');
        }
      }
    } catch (err) {
      setErrorMessage(
        err.response?.data?.message || err.response?.data || err.message || 'Xatolik yuz berdi'
      );
    }
  };

  // Helper to compute real groups, students and courses per teacher
  const getTeacherStats = (teacher) => {
    const tId = String(teacher.id);
    const tUserId = String(teacher.user_id || teacher.user?.id || '');

    // Find all groups assigned to this teacher
    const teacherGroups = groupsList.filter((g) => {
      const gTeacherId = String(g.teacher_id || g.teacher?.id || '');
      const gTeacherUserId = String(g.teacher?.user_id || '');
      return (
        (gTeacherId && (gTeacherId === tId || (tUserId && gTeacherId === tUserId))) ||
        (gTeacherUserId && tUserId && gTeacherUserId === tUserId)
      );
    });

    // Also include any groups attached to teacher object from backend if not in groupsList
    if (Array.isArray(teacher.groups) && teacher.groups.length > 0) {
      teacher.groups.forEach((tg) => {
        if (!teacherGroups.some((g) => String(g.id) === String(tg.id))) {
          teacherGroups.push(tg);
        }
      });
    }

    const groupsCount = teacherGroups.length;

    // Collect unique students enrolled in teacher's groups
    const enrolledStudentsMap = new Map();
    // Breakdown per course
    const courseBreakdownMap = new Map();

    teacherGroups.forEach((g) => {
      const gId = String(g.id);
      const cId = String(g.course_id || g.course?.id || '');
      const cName =
        g.course?.name ||
        coursesList.find((c) => String(c.id) === cId)?.name ||
        g.name ||
        'Kurs';

      const groupStudentIds = new Set();

      // 1. from g.group_students
      if (Array.isArray(g.group_students)) {
        g.group_students.forEach((gs) => {
          const sId = gs.student_id || gs.student?.id || gs.id;
          const userObj = gs.student?.user || gs.user || {};
          const name = userObj.full_name || gs.student?.name || `Talaba #${sId}`;
          if (sId) {
            groupStudentIds.add(String(sId));
            if (!enrolledStudentsMap.has(String(sId))) {
              enrolledStudentsMap.set(String(sId), { id: sId, name, courseName: cName });
            }
          }
        });
      }

      // 2. from groupStudentsList
      groupStudentsList
        .filter((gs) => String(gs.group_id) === gId)
        .forEach((gs) => {
          const sId = gs.student_id || gs.student?.id;
          const studentObj = gs.student || studentsList.find((s) => String(s.id) === String(sId)) || {};
          const userObj = studentObj.user || gs.user || {};
          const name = userObj.full_name || studentObj.name || `Talaba #${sId}`;
          if (sId) {
            groupStudentIds.add(String(sId));
            if (!enrolledStudentsMap.has(String(sId))) {
              enrolledStudentsMap.set(String(sId), { id: sId, name, courseName: cName });
            }
          }
        });

      // 3. from studentsList
      studentsList
        .filter((s) => String(s.group_id) === gId)
        .forEach((s) => {
          const sId = s.id;
          const userObj = s.user || {};
          const name = userObj.full_name || s.name || `Talaba #${sId}`;
          if (sId) {
            groupStudentIds.add(String(sId));
            if (!enrolledStudentsMap.has(String(sId))) {
              enrolledStudentsMap.set(String(sId), { id: sId, name, courseName: cName });
            }
          }
        });

      const gCount = Math.max(groupStudentIds.size, Number(g.students_count) || 0);

      if (!courseBreakdownMap.has(cName)) {
        courseBreakdownMap.set(cName, {
          courseName: cName,
          groupsCount: 1,
          studentsCount: gCount,
          studentIds: new Set(groupStudentIds),
        });
      } else {
        const existing = courseBreakdownMap.get(cName);
        existing.groupsCount += 1;
        groupStudentIds.forEach((sid) => existing.studentIds.add(sid));
        existing.studentsCount =
          existing.studentIds.size > 0 ? existing.studentIds.size : existing.studentsCount + gCount;
      }
    });

    let studentsCount = enrolledStudentsMap.size;
    if (studentsCount === 0 && teacherGroups.length > 0) {
      const sumCounts = teacherGroups.reduce((acc, g) => acc + (Number(g.students_count) || 0), 0);
      if (sumCounts > 0) studentsCount = sumCounts;
    }

    // Courses where teacher is assigned directly in courses table
    coursesList
      .filter((c) => String(c.teacher_id) === tId)
      .forEach((c) => {
        if (!courseBreakdownMap.has(c.name)) {
          courseBreakdownMap.set(c.name, {
            courseName: c.name,
            groupsCount: 0,
            studentsCount: 0,
            studentIds: new Set(),
          });
        }
      });

    // If teacher still has no courses in map, use specialization
    if (courseBreakdownMap.size === 0 && teacher.specialization) {
      courseBreakdownMap.set(teacher.specialization, {
        courseName: teacher.specialization,
        groupsCount: 0,
        studentsCount: 0,
        studentIds: new Set(),
      });
    }

    const coursesBreakdown = Array.from(courseBreakdownMap.values());
    const primaryCourseName = coursesBreakdown[0]?.courseName || teacher.specialization || "O'qituvchi";

    return {
      teacherGroups,
      groupsCount,
      studentsCount,
      coursesBreakdown,
      primaryCourseName,
    };
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          {
            label: "O'qituvchilar",
            onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined,
          },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
        ]}
      />

      {/* ======================================================== */}
      {/* 1. MAIN LIST & DASHBOARD VIEW                            */}
      {/* ======================================================== */}
      {viewMode === 'LIST' && (
        <>
          {/* Header Title & CTA */}
          <div className={styles.pageHeader}>
            <div className={styles.headerTitleWrapper}>
              <h1 className={styles.pageTitle}>
                <span>Ustozlar & O'qituvchilar Tarkibi</span>
              </h1>
              <p className={styles.pageSubtitle}>
                O'quv markazingizdagi barcha ustozlar, ularning guruhlari, talabalari va tizimga kirish parollari
              </p>
            </div>

            {!isManager && (
              <div className={styles.headerActions}>
                <button
                  type="button"
                  onClick={() => navigate('/teacher-attendance')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    backgroundColor: '#ffffff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    borderRadius: '10px',
                    padding: '10px 18px',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ClipboardCheck size={18} />
                  <span>O'qituvchilar Davomati</span>
                </button>

                {canManage && (
                  <button
                    type="button"
                    className={styles.createTeacherBtn}
                    onClick={handleOpenCreate}
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    <span>Yangi O'qituvchi Qo'shish</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 4 Metric / KPI Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Jami O'qituvchilar</span>
                <span className={styles.statValue}>{stats.totalTeachers} nafar</span>
                <span className={styles.statMeta}>
                  {stats.activeTeachers} ta faol • {stats.inactiveTeachers} ta nofaol
                </span>
              </div>
              <div className={`${styles.statIconBox} ${styles.iconBlue}`}>
                <User size={24} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Biriktirilgan Guruhlar</span>
                <span className={styles.statValue}>{stats.totalGroups} ta</span>
                <span className={styles.statMeta}>Hozirda dars o'tmoqda</span>
              </div>
              <div className={`${styles.statIconBox} ${styles.iconPurple}`}>
                <BookOpen size={24} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>O'quvchilar Soni</span>
                <span className={styles.statValue}>{stats.totalStudents} nafar</span>
                <span className={styles.statMeta}>Ustozlarga biriktirilgan</span>
              </div>
              <div className={`${styles.statIconBox} ${styles.iconEmerald}`}>
                <Users size={24} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Oylik Maosh Fondi</span>
                <span className={styles.statValue}>
                  {formatCurrency(stats.totalSalaryFund)} <small style={{ fontSize: '13px' }}>UZS</small>
                </span>
                <span className={styles.statMeta}>Belgilangan oylik maoshlar</span>
              </div>
              <div className={`${styles.statIconBox} ${styles.iconAmber}`}>
                <DollarSign size={24} />
              </div>
            </div>
          </div>

          {/* Toolbar & Filter Bar */}
          <div className={styles.toolbarCard}>
            <div className={styles.toolbarLeft}>
              {/* Search */}
              <div className={styles.searchBox}>
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Ism, fan, telefon yoki email bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={styles.searchInput}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status Tabs */}
              <div className={styles.statusFilterTabs}>
                <button
                  type="button"
                  className={`${styles.statusTab} ${statusFilter === 'ALL' ? styles.statusTabActive : ''}`}
                  onClick={() => {
                    setStatusFilter('ALL');
                    setCurrentPage(1);
                  }}
                >
                  Hammasi ({branchScopedItems.length})
                </button>
                <button
                  type="button"
                  className={`${styles.statusTab} ${statusFilter === 'active' ? styles.statusTabActive : ''}`}
                  onClick={() => {
                    setStatusFilter('active');
                    setCurrentPage(1);
                  }}
                >
                  Faol ({stats.activeTeachers})
                </button>
                <button
                  type="button"
                  className={`${styles.statusTab} ${statusFilter === 'inactive' ? styles.statusTabActive : ''}`}
                  onClick={() => {
                    setStatusFilter('inactive');
                    setCurrentPage(1);
                  }}
                >
                  Nofaol ({stats.inactiveTeachers})
                </button>
              </div>

              {/* Branch Filter if multiple branches */}
              {branchesList.length > 1 && (
                <select
                  className={styles.branchSelect}
                  value={selectedBranchFilter}
                  onChange={(e) => {
                    setSelectedBranchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">Barcha Filiallar</option>
                  {branchesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* View Mode Toggle (Grid / Table) */}
            <div className={styles.toolbarRight}>
              <div className={styles.viewToggle}>
                <button
                  type="button"
                  title="Kartochkalar ko'rinishi"
                  className={`${styles.viewToggleBtn} ${layoutStyle === 'GRID' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setLayoutStyle('GRID')}
                >
                  <LayoutGrid size={16} />
                </button>
                <button
                  type="button"
                  title="Jadval ko'rinishi"
                  className={`${styles.viewToggleBtn} ${layoutStyle === 'TABLE' ? styles.viewToggleBtnActive : ''}`}
                  onClick={() => setLayoutStyle('TABLE')}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Teacher Content */}
          {loading ? (
            <Loader text="O'qituvchilar ro'yxati yuklanmoqda..." />
          ) : paginatedItems.length === 0 ? (
            <div className={styles.emptyState}>
              <User size={40} color="#94a3b8" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0' }}>
                Hech qanday o'qituvchi topilmadi
              </h3>
              <p style={{ fontSize: '13.5px', color: '#64748b', margin: '0 0 16px 0' }}>
                Qidiruv so'zini o'zgartiring yoki yangi o'qituvchi qo'shing
              </p>
              {canManage && (
                <button
                  type="button"
                  className={styles.createTeacherBtn}
                  onClick={handleOpenCreate}
                  style={{ padding: '8px 18px', fontSize: '13px' }}
                >
                  <Plus size={15} />
                  <span>O'qituvchi qo'shish</span>
                </button>
              )}
            </div>
          ) : layoutStyle === 'GRID' ? (
            /* ================= GRID VIEW ================= */
            <div className={styles.teachersGrid}>
              {paginatedItems.map((teacher, idx) => {
                const fullName =
                  teacher.user?.full_name ||
                  teacher.full_name ||
                  teacher.name ||
                  `O'qituvchi #${teacher.id}`;
                const phone =
                  teacher.user?.phone || teacher.phone || '+998 90 123 45 67';
                const email =
                  teacher.user?.email || teacher.email || 'Kiritilmagan';
                const plainPassword =
                  teacher.user?.plain_password || teacher.plain_password || '123456';
                const branchName =
                  teacher.branch?.name ||
                  branchesList.find((b) => String(b.id) === String(teacher.branch_id))?.name ||
                  'Asosiy filial';
                const isFaol =
                  (teacher.status || 'active').toLowerCase() === 'active';

                const {
                  groupsCount,
                  studentsCount,
                  coursesBreakdown,
                  primaryCourseName,
                } = getTeacherStats(teacher);

                return (
                  <div key={teacher.id} className={styles.teacherCard}>
                    {/* Top Head */}
                    <div className={styles.cardTop}>
                      <div className={styles.avatarWrapper}>
                        <div className={styles.avatar}>
                          {getInitials(fullName)}
                        </div>
                        <span
                          className={`${styles.statusDot} ${isFaol ? styles.statusActive : styles.statusInactive}`}
                          title={isFaol ? 'Faol (Ishda)' : 'Nofaol'}
                        />
                      </div>

                      <div className={styles.cardHeadInfo}>
                        <h3
                          className={styles.teacherName}
                          onClick={() => setActiveModalTeacher(teacher)}
                          title={fullName}
                        >
                          {fullName}
                        </h3>
                        <span className={styles.specialtyBadge} title={`Kurs / mutaxassislik: ${primaryCourseName}`}>
                          <Sparkles size={12} />
                          {primaryCourseName}
                        </span>
                      </div>
                    </div>

                    {/* Contacts & Branch */}
                    <div className={styles.cardContacts}>
                      <div className={styles.contactItem}>
                        <Phone size={13} className={styles.contactIcon} />
                        <span>{phone}</span>
                      </div>
                      <div className={styles.contactItem}>
                        <Building2 size={13} className={styles.contactIcon} />
                        <span>{branchName}</span>
                      </div>
                    </div>

                    {/* 3-Column Stats */}
                    <div className={styles.cardStatsRow}>
                      <div className={styles.cardStatCol} title={`Biriktirilgan guruhlar soni: ${groupsCount}`}>
                        <span className={styles.cardStatNum}>{groupsCount}</span>
                        <span className={styles.cardStatLbl}>Guruhlar</span>
                      </div>
                      <div className={styles.cardStatCol} title={`Biriktirilgan talabalar soni: ${studentsCount}`}>
                        <span className={styles.cardStatNum}>{studentsCount}</span>
                        <span className={styles.cardStatLbl}>Talabalar</span>
                      </div>
                      <div className={styles.cardStatCol}>
                        <span className={styles.cardStatNum} style={{ color: '#059669', fontSize: '13px' }}>
                          {formatCurrency(teacher.salary_amount || 4500000)}
                        </span>
                        <span className={styles.cardStatLbl}>Maosh (UZS)</span>
                      </div>
                    </div>

                    {/* Kurslar va talabalar taqsimoti */}
                    <div className={styles.cardCoursesBlock}>
                      <div className={styles.cardCoursesHeader}>
                        <BookOpen size={12} color="#4f46e5" />
                        <span className={styles.cardCoursesTitle}>Kurslar va talabalar</span>
                      </div>
                      <div className={styles.cardCoursesList}>
                        {coursesBreakdown.length === 0 ? (
                          <div className={styles.cardCourseChip}>
                            <span className={styles.cardCourseName}>{teacher.specialization || "Kurs biriktirilmagan"}</span>
                            <span className={`${styles.cardCourseBadge} ${styles.cardCourseBadgeEmpty}`}>Guruh yo'q</span>
                          </div>
                        ) : (
                          coursesBreakdown.map((cb, cIdx) => (
                            <div key={cIdx} className={styles.cardCourseChip}>
                              <span className={styles.cardCourseName}>{cb.courseName}</span>
                              <span
                                className={`${styles.cardCourseBadge} ${
                                  cb.studentsCount > 0
                                    ? styles.cardCourseBadgeActive
                                    : cb.groupsCount > 0
                                    ? styles.cardCourseBadgeMuted
                                    : styles.cardCourseBadgeEmpty
                                }`}
                              >
                                {cb.studentsCount > 0
                                  ? `${cb.studentsCount} ta talaba (${cb.groupsCount} guruh)`
                                  : cb.groupsCount > 0
                                  ? `${cb.groupsCount} ta guruh (0 talaba)`
                                  : "Guruh yo'q"}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Login & Password Row with 1-click copy */}
                    <div className={styles.loginInfoRow}>
                      <div className={styles.loginKey}>
                        <Lock size={13} />
                        <span>Parol: <strong>{plainPassword}</strong></span>
                      </div>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() => handleCopyCredentials(plainPassword, `pass_${teacher.id}`)}
                        title="Parolni nusxalash"
                      >
                        {copiedKey === `pass_${teacher.id}` ? (
                          <>
                            <Check size={12} color="#059669" />
                            <span style={{ color: '#059669' }}>Nusxalandi</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>Nusxalash</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Actions */}
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.viewProfileBtn}
                        onClick={() => setActiveModalTeacher(teacher)}
                      >
                        <Eye size={14} />
                        <span>Batafsil</span>
                      </button>

                      {canManage && (
                        <>
                          <button
                            type="button"
                            className={styles.editIconBtn}
                            onClick={(e) => handleOpenEdit(teacher, e)}
                            title="Tahrirlash"
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            className={styles.deleteIconBtn}
                            onClick={(e) => handleDelete(teacher.id, e)}
                            title="O'chirish"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= TABLE VIEW ================= */
            <div className={styles.tableCard}>
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                    <th>O'qituvchi</th>
                    <th>Telefon raqami</th>
                    <th>Filial</th>
                    <th style={{ textAlign: 'center' }}>Guruhlar</th>
                    <th style={{ textAlign: 'center' }}>Talabalar</th>
                    <th>Oylik Maosh</th>
                    <th>Tizim Paroli</th>
                    <th style={{ textAlign: 'center' }}>Holati</th>
                    <th style={{ textAlign: 'center', width: '130px' }}>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((teacher, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const fullName =
                      teacher.user?.full_name ||
                      teacher.full_name ||
                      teacher.name ||
                      `O'qituvchi #${teacher.id}`;
                    const phone =
                      teacher.user?.phone || teacher.phone || '+998 90 123 45 67';
                    const branchName =
                      teacher.branch?.name ||
                      branchesList.find((b) => String(b.id) === String(teacher.branch_id))?.name ||
                      'Asosiy filial';
                    const plainPassword =
                      teacher.user?.plain_password || teacher.plain_password || '123456';
                    const isFaol =
                      (teacher.status || 'active').toLowerCase() === 'active';

                    const {
                      groupsCount,
                      studentsCount,
                      primaryCourseName,
                    } = getTeacherStats(teacher);

                    return (
                      <tr key={teacher.id}>
                        <td style={{ textAlign: 'center', color: '#64748b' }}>{rowNumber}</td>
                        <td>
                          <div className={styles.userCell}>
                            <div className={styles.tableAvatar}>
                              {getInitials(fullName)}
                            </div>
                            <div className={styles.userNameBox}>
                              <span className={styles.tableFullName}>{fullName}</span>
                              <span className={styles.tableSpecialty}>{primaryCourseName}</span>
                            </div>
                          </div>
                        </td>
                        <td>{phone}</td>
                        <td>{branchName}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`${styles.badgePill} ${styles.badgePurple}`}>
                            {groupsCount} ta guruh
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`${styles.badgePill} ${styles.badgeBlue}`}>
                            {studentsCount} nafar
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(teacher.salary_amount || 4500000)} UZS
                        </td>
                        <td>
                          <span className={styles.passwordBadge}>{plainPassword}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={`${styles.badgePill} ${isFaol ? styles.badgeGreen : styles.badgeGray}`}>
                            {isFaol ? 'Faol' : 'Nofaol'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              className={styles.editIconBtn}
                              style={{ width: '30px', height: '30px' }}
                              onClick={() => setActiveModalTeacher(teacher)}
                              title="Batafsil"
                            >
                              <Eye size={13} />
                            </button>
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  className={styles.editIconBtn}
                                  style={{ width: '30px', height: '30px' }}
                                  onClick={(e) => handleOpenEdit(teacher, e)}
                                  title="Tahrirlash"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  type="button"
                                  className={styles.deleteIconBtn}
                                  style={{ width: '30px', height: '30px' }}
                                  onClick={(e) => handleDelete(teacher.id, e)}
                                  title="O'chirish"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
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

          {/* Pagination */}
          {filteredItems.length > pageSize && (
            <div style={{ marginTop: '16px' }}>
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

      {/* ======================================================== */}
      {/* 2. TEACHER DETAILS MODAL (PROFIL KARTASI)                */}
      {/* ======================================================== */}
      {activeModalTeacher && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveModalTeacher(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalAvatar}>
                  {getInitials(
                    activeModalTeacher.user?.full_name ||
                    activeModalTeacher.full_name ||
                    activeModalTeacher.name
                  )}
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>
                    {activeModalTeacher.user?.full_name ||
                      activeModalTeacher.full_name ||
                      activeModalTeacher.name}
                  </h2>
                  <span style={{ fontSize: '13px', opacity: 0.9, fontWeight: 500 }}>
                    {activeModalTeacher.specialization || "O'qituvchi"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setActiveModalTeacher(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              {/* Credentials & Login Card */}
              <div>
                <h4 className={styles.modalSectionTitle}>Tizimga Kirish Ma'lumotlari</h4>
                <div className={styles.credentialsCard}>
                  <div className={styles.credRow}>
                    <span className={styles.credLabel}>Login / Email:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.credValue}>
                        {activeModalTeacher.user?.email || activeModalTeacher.email || 'Mavjud emas'}
                      </span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() =>
                          handleCopyCredentials(
                            activeModalTeacher.user?.email || activeModalTeacher.email,
                            'modal_email'
                          )
                        }
                      >
                        {copiedKey === 'modal_email' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>

                  <div className={styles.credRow}>
                    <span className={styles.credLabel}>Tizim Paroli:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={styles.credValue} style={{ color: '#7c3aed' }}>
                        {activeModalTeacher.user?.plain_password || activeModalTeacher.plain_password || '123456'}
                      </span>
                      <button
                        type="button"
                        className={styles.copyBtn}
                        onClick={() =>
                          handleCopyCredentials(
                            activeModalTeacher.user?.plain_password || activeModalTeacher.plain_password || '123456',
                            'modal_pass'
                          )
                        }
                      >
                        {copiedKey === 'modal_pass' ? <Check size={12} color="#059669" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {(() => {
                const modalStats = getTeacherStats(activeModalTeacher);
                return (
                  <>
                    <div>
                      <h4 className={styles.modalSectionTitle}>Faoliyat Ko'rsatkichlari</h4>
                      <div className={styles.modalStatsGrid}>
                        <div className={styles.modalStatCard}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Guruhlar</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#4f46e5' }}>
                            {modalStats.groupsCount} ta
                          </span>
                        </div>
                        <div className={styles.modalStatCard}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Talabalar</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0284c7' }}>
                            {modalStats.studentsCount} nafar
                          </span>
                        </div>
                        <div className={styles.modalStatCard}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Oylik Maosh</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                            {formatCurrency(activeModalTeacher.salary_amount || 4500000)} UZS
                          </span>
                        </div>
                        <div className={styles.modalStatCard}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Tajriba Yili</span>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                            {activeModalTeacher.experience_year || 3} yil
                          </span>
                        </div>
                        <div className={styles.modalStatCard}>
                          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>Holati</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#059669' }}>
                            {(activeModalTeacher.status || 'active').toLowerCase() === 'active' ? 'Faol (Ishda)' : 'Nofaol'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Kurslar va Guruhlar */}
                    <div>
                      <h4 className={styles.modalSectionTitle}>Biriktirilgan Kurslar va Guruhlar</h4>
                      {modalStats.coursesBreakdown.length === 0 ? (
                        <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
                          Hozircha guruh biriktirilmagan.
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {modalStats.coursesBreakdown.map((cb, idx) => (
                            <div
                              key={idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '10px 14px',
                                background: '#f8fafc',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={14} color="#4f46e5" />
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e293b' }}>{cb.courseName}</span>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: cb.studentsCount > 0 ? '#15803d' : '#64748b' }}>
                                {cb.studentsCount > 0
                                  ? `${cb.studentsCount} ta talaba (${cb.groupsCount} ta guruh)`
                                  : cb.groupsCount > 0
                                  ? `${cb.groupsCount} ta guruh (0 talaba)`
                                  : "Guruh yo'q"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}

              {/* Bio / Izoh */}
              <div>
                <h4 className={styles.modalSectionTitle}>O'qituvchi Haqida Qisqacha</h4>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', fontSize: '13.5px', color: '#334155', border: '1px solid #e2e8f0' }}>
                  {activeModalTeacher.bio || "Ushbu o'qituvchi haqida qo'shimcha ma'lumot kiritilmagan."}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setActiveModalTeacher(null)}
              >
                Yopish
              </button>
              <button
                type="button"
                className={styles.cancelBtn}
                style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  const tId = activeModalTeacher.id;
                  setActiveModalTeacher(null);
                  navigate(`/profile?teacherId=${tId}`);
                }}
              >
                <User size={14} />
                <span>To'liq Profil & Boshqaruv</span>
              </button>
              {!isManager && (
                <button
                  type="button"
                  className={styles.primarySaveBtn}
                  onClick={() => handleOpenEdit(activeModalTeacher)}
                >
                  <Edit2 size={14} />
                  <span>Tahrirlash</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. CREATE & EDIT FORM VIEW                               */}
      {/* ======================================================== */}
      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => setViewMode('LIST')}
              title="Orqaga qaytish"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {viewMode === 'CREATE' ? "Yangi O'qituvchi Qo'shish" : "O'qituvchi Ma'lumotlarini Tahrirlash"}
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                O'qituvchi profili va tizimga kirish parametrlarini to'ldiring
              </p>
            </div>
          </div>

          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                borderRadius: '10px',
                marginBottom: '20px',
                fontSize: '13.5px',
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ism-Familiyasi (F.I.SH) *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Telefon raqami *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email manzil (ixtiyoriy)</label>
                <input
                  type="email"
                  className={styles.formInput}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tizimga kirish paroli *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mutaxassislik (Fan/Yo'nalish) *</label>
                <input
                  type="text"
                  list="specialization-suggestions"
                  className={styles.formInput}
                  value={formData.specialization || ''}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder="Mutaxassislik yoki fan nomini kiriting..."
                  required
                />
                <datalist id="specialization-suggestions">
                  {availableCourses.map((cName) => (
                    <option key={cName} value={cName} />
                  ))}
                </datalist>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Oylik Maosh (UZS)</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formData.salary_amount}
                  onChange={(e) => setFormData({ ...formData, salary_amount: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Filial</label>
                <select
                  className={styles.formInput}
                  value={formData.branch_id}
                  onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                >
                  {branchesList.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Holati</label>
                <select
                  className={styles.formInput}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">Faol (Ishda)</option>
                  <option value="inactive">Nofaol / Ta'tilda</option>
                </select>
              </div>

              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabel}>O'qituvchi haqida qisqacha ma'lumot (Bio)</label>
                <textarea
                  className={styles.formInput}
                  rows={3}
                  placeholder="Tajribasi, sertifikatlari va yutuqlari haqida..."
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setViewMode('LIST')}
              >
                Bekor qilish
              </button>
              <button type="submit" className={styles.primarySaveBtn} disabled={loading}>
                {loading ? (
                  <span>Saqlanmoqda...</span>
                ) : (
                  <>
                    <Save size={16} />
                    <span>{viewMode === 'CREATE' ? "O'qituvchini Saqlash" : "O'zgarishlarni Saqlash"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Teachers;
