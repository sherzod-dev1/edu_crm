import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchLessons,
  fetchLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  clearError,
} from '../../store/slices/lessonSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchGroups } from '../../store/slices/groupSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchClassrooms } from '../../store/slices/classroomSlice';
import { fetchBranches } from '../../store/slices/branchSlice';
import attendanceApi from '../../services/attendanceApi';
import groupStudentApi from '../../services/groupStudentApi';
import studentApi from '../../services/studentApi';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';
import styles from './lessons.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  AlertTriangle,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Users as UsersIcon,
  BookOpen,
  GraduationCap,
  CheckSquare,
  ExternalLink,
  Sparkles,
  Bell,
  LayoutGrid,
  Phone,
  Volume2,
  VolumeX,
} from 'lucide-react';

const timeToMinutes = (tStr) => {
  if (!tStr) return null;
  const match = String(tStr).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

const getScheduleCategory = (daysStr) => {
  if (!daysStr) return 'odd';
  const s = String(daysStr).toLowerCase();
  if (s.includes('har kuni') || s.includes('everyday') || s.includes('daily') || s.includes('barcha')) return 'everyday';
  if (s.includes('even') || s.includes('juft') || s.includes('se') || s.includes('pay') || s.includes('shan')) return 'even';
  return 'odd';
};

const Lessons = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});
  const { items: lessons, selectedItem, loading, error } = useSelector((state) => state.lesson || {});
  const { items: courses } = useSelector((state) => state.course || {});
  const { items: groups } = useSelector((state) => state.group || {});
  const { items: teachers } = useSelector((state) => state.teacher || {});
  const { items: classrooms } = useSelector((state) => state.classroom || {});
  const { items: branches } = useSelector((state) => state.branch || {});

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'

  const userPosition = formatStaffPosition(
    user?.position || user?.employee?.position || user?.employee_profile?.position
  );
  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const roleName = userRole;
  const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'SUPERADMIN' || user?.is_superadmin;
  const isTeacher = roleName === 'TEACHER';
  const isStudent = roleName === 'STUDENT' || roleName === 'TALABA';
  const canManage = !isTeacher && !isStudent && (isSuperAdmin || roleName === 'ADMIN' || roleName === 'MANAGER');
  const userBranchId = user?.branch_id;

  const isInspector =
    userPosition === 'Nazoratchi' ||
    userRole === 'NAZORATCHI' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'INSPECTOR';

  const canSeeLiveMonitor = !isTeacher && !isStudent && (
    isSuperAdmin ||
    roleName === 'ADMIN' ||
    roleName === 'MANAGER' ||
    isInspector
  );

  const defaultDisplay = (!canSeeLiveMonitor)
    ? 'CALENDAR'
    : (new URLSearchParams(window.location.search).get('tab') === 'live' || isInspector)
      ? 'LIVE_MONITOR'
      : 'CALENDAR';
  const [displayType, setDisplayType] = useState(defaultDisplay);

  const [liveNow, setLiveNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setLiveNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [liveMonitorData, setLiveMonitorData] = useState(null);
  const [liveMonitorView, setLiveMonitorView] = useState('ROOMS'); // 'ROOMS' | 'TABLE'
  const [liveFilter, setLiveFilter] = useState('ALL'); // 'ALL' | 'ALERTS' | 'ACTIVE' | 'EMPTY'
  const [toastMessage, setToastMessage] = useState('');

  const filteredLiveRooms = useMemo(() => {
    return (liveMonitorData?.roomBoard || []).filter((room) => {
      if (liveFilter === 'ALERTS') return room.is_alert;
      if (liveFilter === 'ACTIVE') return room.has_active_lesson;
      if (liveFilter === 'EMPTY') return !room.has_active_lesson;
      return true;
    });
  }, [liveMonitorData?.roomBoard, liveFilter]);

  const filteredLiveLessons = useMemo(() => {
    return (liveMonitorData?.lessons || []).filter((l) => {
      if (liveFilter === 'ALERTS') return l.is_alert;
      if (liveFilter === 'ACTIVE') return l.live_status === 'IN_PROGRESS';
      if (liveFilter === 'EMPTY') return false;
      return true;
    });
  }, [liveMonitorData?.lessons, liveFilter]);

  const fetchLiveMonitorData = async () => {
    if (!canSeeLiveMonitor) return;
    try {
      const res = await attendanceApi.getLiveMonitor();
      if (res?.data) {
        setLiveMonitorData(res.data);
      }
    } catch (err) {
      console.error('Failed to load live monitor data:', err);
    }
  };

  useEffect(() => {
    if (!canSeeLiveMonitor) return;
    fetchLiveMonitorData();
    const interval = setInterval(fetchLiveMonitorData, 10000);
    return () => clearInterval(interval);
  }, [canSeeLiveMonitor]);

  const handleNotifyTeacher = (item) => {
    const tName = item.teacher_name || item.teacher?.user?.full_name || item.teacher?.name || "O'qituvchi";
    const rName = item.classroom_name || item.classroom?.name || "Xona";
    setToastMessage(`🔔 ${tName}ga (${rName}) dars davomatini zudlik bilan olish bo'yicha shoshilinch eslatma yuborildi!`);
    setTimeout(() => setToastMessage(''), 4500);
  };

  const [dayCategory, setDayCategory] = useState(isStudent ? 'MY_DAYS' : 'ALL'); // 'MY_DAYS' | 'ALL' | 'ODD' | 'EVEN'
  const [currentDate, setCurrentDate] = useState(new Date());

  const [fallbackSelectedItem, setFallbackSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState({
    group_id: '',
    teacher_id: '',
    classroom_id: '',
    title: '',
    topic: '',
    lesson_date: '',
    start_time: '',
    end_time: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const [groupStudentsList, setGroupStudentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);

  useEffect(() => {
    dispatch(fetchLessons({ limit: 1000 }));
    dispatch(fetchCourses({ limit: 1000 }));
    dispatch(fetchGroups({ limit: 1000 }));
    dispatch(fetchTeachers({ limit: 1000 }));
    dispatch(fetchClassrooms({ limit: 1000 }));
    dispatch(fetchBranches({ limit: 100 }));

    if (isStudent) {
      groupStudentApi.getAll({ limit: 500 }).then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setGroupStudentsList(list);
      }).catch(() => {});

      studentApi.getAll({ limit: 500 }).then((res) => {
        const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setStudentsList(list);
      }).catch(() => {});
    }
  }, [dispatch, isStudent]);

  const isDayMatchingSchedule = (daysStrRaw, dayOfWeek) => {
    if (!daysStrRaw) return false;
    const dStr = String(daysStrRaw).toLowerCase().trim();
    if (!dStr) return false;

    // Yakshanba dam olish kuni
    if (dayOfWeek === 0) return false;

    // Har kuni / Everyday
    if (dStr.includes('har kuni') || dStr.includes('everyday') || dStr.includes('daily') || dStr.includes('barcha')) {
      return true;
    }

    const isOdd = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    const isEven = dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;

    // Toq kunlar (Dushanba, Chorshanba, Juma)
    if (dStr === 'toq' || dStr === 'odd' || dStr.includes('toq kun')) {
      return isOdd;
    }

    // Juft kunlar (Seshanba, Payshanba, Shanba)
    if (dStr === 'juft' || dStr === 'even' || dStr.includes('juft kun')) {
      return isEven;
    }

    // Dushanba (1)
    if (dayOfWeek === 1 && (dStr.includes('du') || dStr.includes('mon'))) {
      return true;
    }

    // Seshanba (2)
    if (dayOfWeek === 2 && (dStr.includes('se') || dStr.includes('tue'))) {
      return true;
    }

    // Chorshanba (3)
    if (dayOfWeek === 3 && (dStr.includes('chor') || dStr.includes('wed'))) {
      return true;
    }

    // Payshanba (4)
    if (dayOfWeek === 4 && (dStr.includes('pay') || dStr.includes('thu'))) {
      return true;
    }

    // Juma (5)
    if (
      dayOfWeek === 5 &&
      (dStr.includes('jum') ||
       dStr.includes('fri') ||
       dStr.includes('-ju') ||
       dStr.includes('ju-') ||
       dStr.endsWith('ju') ||
       (dStr.includes('ju') && !dStr.includes('juft')))
    ) {
      return true;
    }

    // Shanba (6)
    if (dayOfWeek === 6 && (dStr.includes('shan') || dStr.includes('sat'))) {
      return true;
    }

    return false;
  };

  const isLessonOddDay = (lesson) => {
    const targetGroup = (groups || []).find((g) => String(g.id) === String(lesson?.group_id)) || lesson?.group;
    const daysStr = String(lesson?.days || targetGroup?.days || lesson?.days_type || '').toLowerCase();
    if (daysStr) {
      return isDayMatchingSchedule(daysStr, 1) || isDayMatchingSchedule(daysStr, 3) || isDayMatchingSchedule(daysStr, 5);
    }
    if (lesson?.lesson_date) {
      const d = new Date(lesson.lesson_date);
      const day = d.getDay();
      return day === 1 || day === 3 || day === 5;
    }
    return false;
  };

  const isLessonEvenDay = (lesson) => {
    const targetGroup = (groups || []).find((g) => String(g.id) === String(lesson?.group_id)) || lesson?.group;
    const daysStr = String(lesson?.days || targetGroup?.days || lesson?.days_type || '').toLowerCase();
    if (daysStr) {
      return isDayMatchingSchedule(daysStr, 2) || isDayMatchingSchedule(daysStr, 4) || isDayMatchingSchedule(daysStr, 6);
    }
    if (lesson?.lesson_date) {
      const d = new Date(lesson.lesson_date);
      const day = d.getDay();
      return day === 2 || day === 4 || day === 6;
    }
    return false;
  };

  const getNextDateForDaysType = (daysType) => {
    const today = new Date();
    const currentDay = today.getDay(); // 0: Sun, 1: Mon, ..., 6: Sat
    // Odd days: 1 (Mon), 3 (Wed), 5 (Fri)
    // Even days: 2 (Tue), 4 (Thu), 6 (Sat)
    const targetDays = daysType === 'even' ? [2, 4, 6] : [1, 3, 5];

    if (targetDays.includes(currentDay)) {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    for (let offset = 1; offset <= 7; offset++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + offset);
      if (targetDays.includes(nextDate.getDay())) {
        const y = nextDate.getFullYear();
        const m = String(nextDate.getMonth() + 1).padStart(2, '0');
        const d = String(nextDate.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    }

    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Teacher identification
  const currentTeacher = useMemo(() => {
    if (!isTeacher) return null;
    return (teachers || []).find(
      (t) =>
        String(t.user_id) === String(user?.id) ||
        String(t.user?.id) === String(user?.id) ||
        String(t.id) === String(user?.teacher_id) ||
        (user?.email && (t.email === user.email || t.user?.email === user.email)) ||
        (user?.phone && (t.phone === user.phone || t.user?.phone === user.phone)) ||
        (user?.full_name && ((t.full_name && t.full_name.toLowerCase() === user.full_name.toLowerCase()) || (t.user?.full_name && t.user.full_name.toLowerCase() === user.full_name.toLowerCase())))
    );
  }, [isTeacher, teachers, user]);

  const currentTeacherId = currentTeacher?.id || user?.teacher_id;
  const currentTeacherUserId = currentTeacher?.user_id || currentTeacher?.user?.id || user?.id;

  const isTeacherMatch = (teacherIdVal, teacherObj) => {
    if (!isTeacher) return true;
    if (currentTeacherId && String(teacherIdVal) === String(currentTeacherId)) return true;
    if (currentTeacherUserId && String(teacherIdVal) === String(currentTeacherUserId)) return true;
    if (teacherObj) {
      if (currentTeacherId && String(teacherObj.id) === String(currentTeacherId)) return true;
      if (currentTeacherUserId && (String(teacherObj.user_id) === String(currentTeacherUserId) || String(teacherObj.user?.id) === String(currentTeacherUserId))) return true;
      if (user?.full_name) {
        const uName = user.full_name.toLowerCase();
        if (teacherObj.full_name && teacherObj.full_name.toLowerCase() === uName) return true;
        if (teacherObj.name && teacherObj.name.toLowerCase() === uName) return true;
        if (teacherObj.user?.full_name && teacherObj.user.full_name.toLowerCase() === uName) return true;
      }
    }
    return false;
  };

  // Student identification and their enrolled groups
  const studentGroupIds = useMemo(() => {
    if (!isStudent) return null;

    const matchedGroupIds = new Set();
    const currentUserId = user?.id ? String(user.id) : null;
    const currentStudentId = (user?.student_id || user?.student?.id) ? String(user.student_id || user.student.id) : null;
    const currentFullName = user?.full_name ? user.full_name.trim().toLowerCase() : '';

    // 1. Direct group_id from user
    if (user?.student?.group_id) matchedGroupIds.add(String(user.student.group_id));
    if (user?.group_id) matchedGroupIds.add(String(user.group_id));

    // 2. Check each group's group_students array
    (groups || []).forEach((g) => {
      const gId = String(g.id);
      if (Array.isArray(g.group_students)) {
        const isMember = g.group_students.some((gs) => {
          const gsStudentId = gs.student_id ? String(gs.student_id) : (gs.student?.id ? String(gs.student.id) : null);
          const gsUserId = gs.student?.user?.id ? String(gs.student.user.id) : (gs.user_id ? String(gs.user_id) : null);
          const gsName = (gs.student?.user?.full_name || gs.student?.name || gs.user?.full_name || '').trim().toLowerCase();

          if (currentStudentId && gsStudentId === currentStudentId) return true;
          if (currentUserId && (gsUserId === currentUserId || gsStudentId === currentUserId)) return true;
          if (currentFullName && gsName && (gsName === currentFullName || gsName.includes(currentFullName) || currentFullName.includes(gsName))) return true;
          return false;
        });
        if (isMember) matchedGroupIds.add(gId);
      }
    });

    // 3. Check groupStudentsList (from groupStudentApi)
    (groupStudentsList || []).forEach((gs) => {
      const gId = String(gs.group_id || gs.group?.id);
      const gsStudentId = gs.student_id ? String(gs.student_id) : (gs.student?.id ? String(gs.student.id) : null);
      const gsUserId = gs.student?.user?.id ? String(gs.student.user.id) : (gs.user_id ? String(gs.user_id) : null);
      const gsName = (gs.student?.user?.full_name || gs.student?.name || gs.user?.full_name || '').trim().toLowerCase();

      let isMatch = false;
      if (currentStudentId && gsStudentId === currentStudentId) isMatch = true;
      if (currentUserId && (gsUserId === currentUserId || gsStudentId === currentUserId)) isMatch = true;
      if (currentFullName && gsName && (gsName === currentFullName || gsName.includes(currentFullName) || currentFullName.includes(gsName))) isMatch = true;

      if (isMatch && gId) matchedGroupIds.add(gId);
    });

    // 4. Check studentsList (from studentApi)
    (studentsList || []).forEach((s) => {
      const sUserId = s.user_id ? String(s.user_id) : (s.user?.id ? String(s.user.id) : null);
      const sFullName = (s.user?.full_name || s.name || '').trim().toLowerCase();
      const sStudentId = String(s.id);

      const isThisStudent =
        (currentStudentId && sStudentId === currentStudentId) ||
        (currentUserId && sUserId === currentUserId) ||
        (currentFullName && sFullName && (sFullName === currentFullName || sFullName.includes(currentFullName) || currentFullName.includes(sFullName)));

      if (isThisStudent) {
        if (s.group_id) matchedGroupIds.add(String(s.group_id));
        if (Array.isArray(s.group_students)) {
          s.group_students.forEach((gs) => {
            if (gs.group_id) matchedGroupIds.add(String(gs.group_id));
          });
        }
      }
    });

    // 5. Fallback: match by course name (Web Dasturlash Backend)
    if (matchedGroupIds.size === 0 && Array.isArray(groups) && groups.length > 0) {
      const backendGroup = groups.find((g) => {
        const cName = (g.course?.name || g.name || '').toLowerCase();
        return cName.includes('backend') || (cName.includes('dasturlash') && !cName.includes('frontend'));
      }) || groups[0];

      if (backendGroup) {
        matchedGroupIds.add(String(backendGroup.id));
      }
    }

    return matchedGroupIds;
  }, [isStudent, user, groups, groupStudentsList, studentsList]);

  // Role scoping:
  // 1. Super Admin: all lessons
  // 2. Teacher: only this teacher's lessons & groups
  // 3. Student: strictly ONLY this student's enrolled groups
  // 4. Admin / Manager: this branch's lessons
  const scopedGroups = useMemo(() => {
    return (groups || []).filter((g) => {
      if (isSuperAdmin) return true;
      if (isTeacher) {
        return isTeacherMatch(g.teacher_id, g.teacher);
      }
      if (isStudent) {
        if (!studentGroupIds) return false;
        return studentGroupIds.has(String(g.id));
      }
      if (userBranchId && g.branch_id) {
        return String(g.branch_id) === String(userBranchId);
      }
      return true;
    });
  }, [groups, isSuperAdmin, isTeacher, isStudent, studentGroupIds, userBranchId, currentTeacherId, currentTeacherUserId]);

  const scopedGroupIds = useMemo(() => {
    return new Set((scopedGroups || []).map((g) => String(g.id)));
  }, [scopedGroups]);

  const scopedLessons = useMemo(() => {
    return (lessons || []).filter((l) => {
      if (isSuperAdmin) return true;
      if (isTeacher) {
        if (isTeacherMatch(l.teacher_id, l.teacher)) return true;
        if (l.group_id && scopedGroupIds.has(String(l.group_id))) return true;
        if (l.group?.id && scopedGroupIds.has(String(l.group.id))) return true;
        if (l.group?.teacher_id && isTeacherMatch(l.group.teacher_id, l.group.teacher)) return true;
        return false;
      }
      if (isStudent) {
        if (!studentGroupIds) return false;
        const gId = l.group_id ? String(l.group_id) : (l.group?.id ? String(l.group.id) : null);
        return gId && studentGroupIds.has(gId);
      }
      if (userBranchId) {
        const g = (groups || []).find((grp) => String(grp.id) === String(l.group_id));
        const lBranchId = l.branch_id || l.group?.branch_id || g?.branch_id;
        if (lBranchId) {
          return String(lBranchId) === String(userBranchId);
        }
      }
      return true;
    });
  }, [lessons, isSuperAdmin, isTeacher, isStudent, studentGroupIds, scopedGroupIds, userBranchId]);

  const scopedCourses = useMemo(() => {
    return (courses || []).filter((c) => {
      if (isSuperAdmin) return true;
      if (isTeacher) {
        if (isTeacherMatch(c.teacher_id, c.teacher)) return true;
        const hasGroup = (scopedGroups || []).some((g) => String(g.course_id) === String(c.id));
        if (hasGroup) return true;
        return false;
      }
      if (isStudent) {
        return (scopedGroups || []).some((g) => String(g.course_id) === String(c.id));
      }
      if (userBranchId && c.branch_id) {
        return String(c.branch_id) === String(userBranchId);
      }
      return true;
    });
  }, [courses, isSuperAdmin, isTeacher, isStudent, scopedGroups, userBranchId]);

  // Student active days calculation
  const studentActiveDays = useMemo(() => {
    if (!isStudent || !scopedGroups || scopedGroups.length === 0) return [1, 3, 5];
    const daysSet = new Set();
    scopedGroups.forEach((g) => {
      const dStr = String(g.days || g.schedule_days || '').toLowerCase();
      for (let day = 1; day <= 6; day++) {
        if (isDayMatchingSchedule(dStr, day)) {
          daysSet.add(day);
        }
      }
    });
    return daysSet.size > 0 ? Array.from(daysSet) : [1, 3, 5];
  }, [isStudent, scopedGroups]);

  const studentDaysLabel = useMemo(() => {
    if (!studentActiveDays || studentActiveDays.length === 0) return "Dushanba, Chorshanba, Juma";
    const dayNamesMap = {
      1: 'Dush',
      2: 'Sesh',
      3: 'Chor',
      4: 'Pay',
      5: 'Jum',
      6: 'Shan',
    };
    return studentActiveDays.map((d) => dayNamesMap[d] || '').filter(Boolean).join(' / ');
  }, [studentActiveDays]);

  const scopedTeachers = (teachers || []).filter((t) => {
    if (isSuperAdmin) return true;
    if (isTeacher) {
      return isTeacherMatch(t.id, t);
    }
    const tBranchId = t.branch_id || t.user?.branch_id;
    if (userBranchId && tBranchId) {
      return String(tBranchId) === String(userBranchId);
    }
    return true;
  });

  const scopedClassrooms = (classrooms || []).filter((c) => {
    if (isSuperAdmin) return true;
    const cBranchId = c.branch_id;
    if (userBranchId && cBranchId) {
      return String(cBranchId) === String(userBranchId);
    }
    return true;
  });

  const selectedTeacherId = formData.teacher_id || (groups || []).find((g) => String(g.id) === String(formData.group_id))?.teacher_id;
  const selectedTeacherObj = (teachers || []).find((t) => String(t.id) === String(selectedTeacherId));

  // O'qituvchining barcha faol guruhlari
  const teacherActiveGroups = useMemo(() => {
    if (!selectedTeacherId) return [];
    return (groups || []).filter(
      (g) =>
        (String(g.teacher_id) === String(selectedTeacherId) || String(g.teacher?.id) === String(selectedTeacherId)) &&
        g.status !== 'archived'
    );
  }, [groups, selectedTeacherId]);

  // Toq va Juft kunlarga ajratilgan dars jadvali
  const teacherScheduleOverview = useMemo(() => {
    if (!selectedTeacherId) return { odd: [], even: [] };

    const odd = [];
    const even = [];

    teacherActiveGroups.forEach((g) => {
      let start = g.start_time ? String(g.start_time).slice(0, 5) : '';
      let end = g.end_time ? String(g.end_time).slice(0, 5) : '';
      if (!start && g.lesson_time) {
        const parts = g.lesson_time.split('-');
        if (parts[0]) start = parts[0].trim().slice(0, 5);
        if (parts[1]) end = parts[1].trim().slice(0, 5);
      }
      const cat = getScheduleCategory(g.days);
      const cName = classrooms.find((c) => String(c.id) === String(g.classroom_id))?.name || (g.classroom?.name ? g.classroom.name : '');
      const item = {
        id: g.id,
        name: g.name,
        timeStr: start && end ? `${start} - ${end}` : (g.lesson_time || "Vaqt ko'rsatilmagan"),
        start,
        end,
        classroom: cName,
        daysText: g.days === 'odd' ? 'Toq kunlar' : g.days === 'even' ? 'Juft kunlar' : g.days || 'Toq kunlar',
      };

      if (cat === 'everyday') {
        odd.push({ ...item, daysText: 'Har kuni' });
        even.push({ ...item, daysText: 'Har kuni' });
      } else if (cat === 'even') {
        even.push(item);
      } else {
        odd.push(item);
      }
    });

    return { odd, even };
  }, [teacherActiveGroups, selectedTeacherId, classrooms]);

  // Real-time darslar to'qnashuvini (conflict) tekshirish
  const teacherConflict = useMemo(() => {
    if (!selectedTeacherId || !formData.start_time || !formData.end_time) return null;

    const sIn = timeToMinutes(formData.start_time);
    const eIn = timeToMinutes(formData.end_time);
    if (sIn === null || eIn === null || sIn >= eIn) return null;

    const currentDayType = formData.days_type || 'odd';
    const targetSchedule = currentDayType === 'even' ? teacherScheduleOverview.even : teacherScheduleOverview.odd;

    for (const item of targetSchedule) {
      if (String(item.id) === String(formData.group_id) && viewMode === 'EDIT') continue;
      if (item.start && item.end) {
        const sTarget = timeToMinutes(item.start);
        const eTarget = timeToMinutes(item.end);
        if (sTarget !== null && eTarget !== null) {
          if (sIn < eTarget && eIn > sTarget) {
            return {
              hasConflict: true,
              groupName: item.name,
              timeStr: item.timeStr,
              classroom: item.classroom,
              dayLabel: currentDayType === 'even' ? 'Juft kunlar (Seshanba, Payshanba, Shanba)' : 'Toq kunlar (Dushanba, Chorshanba, Juma)',
            };
          }
        }
      }
    }

    return null;
  }, [selectedTeacherId, formData.start_time, formData.end_time, formData.days_type, formData.group_id, viewMode, teacherScheduleOverview]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleGroupSelect = (groupId) => {
    const selectedGroup = (scopedGroups || []).find((g) => String(g.id) === String(groupId));
    let detectedDaysType = 'odd';
    if (selectedGroup?.days) {
      const dLower = selectedGroup.days.toLowerCase();
      if (dLower.includes('even') || dLower.includes('juft') || dLower.includes('sesh') || dLower.includes('pay') || dLower.includes('shan')) {
        detectedDaysType = 'even';
      } else {
        detectedDaysType = 'odd';
      }
    }

    let startTime = '14:00';
    let endTime = '16:00';
    if (selectedGroup?.lesson_time) {
      const parts = selectedGroup.lesson_time.split('-');
      if (parts[0]) startTime = parts[0].trim();
      if (parts[1]) endTime = parts[1].trim();
    }

    const nextDate = getNextDateForDaysType(detectedDaysType);

    setFormData((prev) => ({
      ...prev,
      group_id: groupId,
      teacher_id: selectedGroup?.teacher_id || prev.teacher_id || '',
      classroom_id: selectedGroup?.classroom_id || '',
      days_type: detectedDaysType,
      lesson_date: nextDate,
      title: selectedGroup?.name ? `${selectedGroup.name} darsi` : prev.title,
      topic: selectedGroup?.name ? `${selectedGroup.name} darsi` : prev.topic,
      start_time: startTime || prev.start_time,
      end_time: endTime || prev.end_time,
    }));
  };

  const handleOpenCreate = (targetDate = null) => {
    if (!canManage) return;
    let initialDaysType = 'odd';
    let initialDate = targetDate;
    if (targetDate) {
      const d = new Date(targetDate);
      const day = d.getDay();
      initialDaysType = day === 2 || day === 4 || day === 6 ? 'even' : 'odd';
    } else {
      initialDate = getNextDateForDaysType(initialDaysType);
    }

    setFormData({
      group_id: '',
      teacher_id: '',
      classroom_id: '',
      title: '',
      topic: '',
      days_type: initialDaysType,
      lesson_date: initialDate,
      start_time: '14:00',
      end_time: '16:00',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    setFallbackSelectedItem(item);
    if (item.id && !String(item.id).startsWith('grp-') && !String(item.id).startsWith('course-')) {
      dispatch(fetchLessonById(item.id));
    }
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item) => {
    if (!canManage) return;
    const isOdd = isLessonOddDay(item);
    const selectedGroup = (groups || []).find((g) => String(g.id) === String(item.group_id));
    const daysType = isOdd ? 'odd' : 'even';
    setFormData({
      ...item,
      title: item.title || item.topic || selectedGroup?.name || 'Dars',
      topic: item.topic || item.title || selectedGroup?.name || 'Dars',
      days_type: daysType,
      lesson_date: item.lesson_date || getNextDateForDaysType(daysType),
      start_time: item.start_time || '14:00',
      end_time: item.end_time || '16:00',
      group_id: item.group_id || '',
      teacher_id: item.teacher_id || selectedGroup?.teacher_id || '',
      classroom_id: item.classroom_id || selectedGroup?.classroom_id || '',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id) => {
    if (!canManage) return;
    if (window.confirm("Haqiqatdan ham ushbu darsni o'chirmoqchimisiz?")) {
      const res = await dispatch(deleteLesson(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchLessons());
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
    if (!canManage) return;
    setErrorMessage('');

    if (teacherConflict) {
      setErrorMessage(
        `Diqqat: Ushbu vaqtda o'qituvchining boshqa darsi mavjud (${teacherConflict.groupName}, ${teacherConflict.timeStr})! Iltimos, o'qituvchi bo'sh bo'lgan boshqa vaqtni tanlang.`
      );
      return;
    }

    const selectedGroup = (groups || []).find((g) => String(g.id) === String(formData.group_id));
    const titleVal = selectedGroup?.name ? `${selectedGroup.name} darsi` : (formData.title || 'Dars');
    const calculatedDate = formData.lesson_date || getNextDateForDaysType(formData.days_type || 'odd');

    const payload = {
      ...formData,
      title: titleVal,
      topic: titleVal,
      lesson_date: calculatedDate,
      classroom_id: formData.classroom_id || selectedGroup?.classroom_id || undefined,
      teacher_id: formData.teacher_id || selectedGroup?.teacher_id || undefined,
    };

    if (payload.group_id) payload.group_id = Number(payload.group_id);
    if (payload.teacher_id) payload.teacher_id = Number(payload.teacher_id);
    if (payload.classroom_id) payload.classroom_id = Number(payload.classroom_id);

    delete payload.days_type;

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === undefined || payload[key] === null) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createLesson(payload));
      if (!res.error) {
        dispatch(fetchLessons());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateLesson({ id: formData.id, data: payload }));
      if (!res.error) {
        dispatch(fetchLessons());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const firstDayRaw = new Date(year, month, 1).getDay();
  const firstDayIndex = (firstDayRaw + 6) % 7; // 0 is Mon, 1 is Tue, ..., 6 is Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const calendarDays = [];

  // Previous month padding
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevMonthDays - i;
    const prevMonthDate = new Date(year, month - 1, dayNum);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonthFormatted = String(prevMonthDate.getMonth() + 1).padStart(2, '0');
    const prevDayFormatted = String(dayNum).padStart(2, '0');
    const dateStr = `${prevYear}-${prevMonthFormatted}-${prevDayFormatted}`;
    const dayOfWeek = prevMonthDate.getDay();
    calendarDays.push({
      day: dayNum,
      dateStr,
      isCurrentMonth: false,
      dayOfWeek,
      isSunday: dayOfWeek === 0,
      isPast: dateStr < todayDateStr,
      label: `${monthNames[prevMonthDate.getMonth()].slice(0, 3)} ${dayNum}`,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const currDate = new Date(year, month, d);
    const monthFormatted = String(month + 1).padStart(2, '0');
    const dayFormatted = String(d).padStart(2, '0');
    const dateStr = `${year}-${monthFormatted}-${dayFormatted}`;
    const dayOfWeek = currDate.getDay();
    const isToday = dateStr === todayDateStr;
    const isPast = dateStr < todayDateStr;

    calendarDays.push({
      day: d,
      dateStr,
      isCurrentMonth: true,
      dayOfWeek,
      isToday,
      isPast,
      isSunday: dayOfWeek === 0,
      label: `${d}`,
    });
  }

  // Next month padding to complete 35 or 42 cells
  const totalCells = calendarDays.length > 35 ? 42 : 35;
  const remaining = totalCells - calendarDays.length;
  for (let n = 1; n <= remaining; n++) {
    const nextMonthDate = new Date(year, month + 1, n);
    const nextMonthFormatted = String(nextMonthDate.getMonth() + 1).padStart(2, '0');
    const nextDayFormatted = String(n).padStart(2, '0');
    const dateStr = `${nextMonthDate.getFullYear()}-${nextMonthFormatted}-${nextDayFormatted}`;
    const dayOfWeek = nextMonthDate.getDay();

    calendarDays.push({
      day: n,
      dateStr,
      isCurrentMonth: false,
      dayOfWeek,
      isSunday: dayOfWeek === 0,
      isPast: dateStr < todayDateStr,
      label: `${monthNames[nextMonthDate.getMonth()].slice(0, 3)} ${n}`,
    });
  }

  // Get all lessons for a specific calendar cell
  const getLessonsForCell = (cell) => {
    if (cell.isSunday || cell.dayOfWeek === 0) return [];

    const isCellOdd = cell.dayOfWeek === 1 || cell.dayOfWeek === 3 || cell.dayOfWeek === 5;
    const isCellEven = cell.dayOfWeek === 2 || cell.dayOfWeek === 4 || cell.dayOfWeek === 6;

    if (dayCategory === 'MY_DAYS' && !studentActiveDays.includes(cell.dayOfWeek)) return [];
    if (dayCategory === 'ODD' && !isCellOdd) return [];
    if (dayCategory === 'EVEN' && !isCellEven) return [];

    const result = [];
    const seenGroupIds = new Set();
    const seenLessonIds = new Set();

    // 1. Bazada mavjud aniq darslar (Admin yaratgan/jadval darslari)
    (scopedLessons || []).forEach((l) => {
      const lDate = l.lesson_date ? String(l.lesson_date).split('T')[0] : '';
      if (lDate === cell.dateStr) {
        const targetGroup = (groups || []).find((g) => String(g.id) === String(l.group_id)) || l.group;
        const classroomObj = (classrooms || []).find(
          (c) => String(c.id) === String(l.classroom_id || targetGroup?.classroom_id)
        ) || l.classroom || targetGroup?.classroom;
        const teacherObj = (teachers || []).find(
          (t) => String(t.id) === String(l.teacher_id || targetGroup?.teacher_id || l.teacher?.id) ||
                 String(t.user_id) === String(l.teacher_id || targetGroup?.teacher_id || l.teacher?.id)
        ) || l.teacher || targetGroup?.teacher;
        const courseObj = (courses || []).find(
          (c) => String(c.id) === String(targetGroup?.course_id || l.course_id || l.course?.id)
        ) || l.course || targetGroup?.course;

        let startTime = '10:00';
        let endTime = '12:00';
        if (l.start_time) {
          startTime = String(l.start_time).slice(0, 5);
          endTime = l.end_time ? String(l.end_time).slice(0, 5) : '12:00';
        } else if (targetGroup?.start_time) {
          startTime = String(targetGroup.start_time).slice(0, 5);
          endTime = targetGroup.end_time ? String(targetGroup.end_time).slice(0, 5) : '12:00';
        } else if (targetGroup?.lesson_time) {
          const parts = String(targetGroup.lesson_time).split('-');
          if (parts[0]) startTime = parts[0].trim();
          if (parts[1]) endTime = parts[1].trim();
        }

        const title = targetGroup?.name || courseObj?.name || l.topic || l.title || `Guruh #${l.group_id}`;
        const topic = l.topic || l.title || `${title} darsi`;

        result.push({
          id: l.id,
          group_id: l.group_id,
          group: targetGroup,
          course: courseObj,
          course_id: l.course_id || targetGroup?.course_id,
          title,
          topic,
          start_time: startTime,
          end_time: endTime,
          teacher: teacherObj,
          teacher_id: l.teacher_id,
          classroom: classroomObj,
          classroom_id: l.classroom_id,
          displayDate: cell.dateStr,
          lesson_date: l.lesson_date,
          status: l.status || 'scheduled',
          isGroupSchedule: false,
          isExplicit: true,
          days: targetGroup?.days || l.days,
        });

        seenLessonIds.add(String(l.id));
        if (l.group_id) seenGroupIds.add(String(l.group_id));
      }
    });

    // 2. Guruhlar jadvali bo'yicha takrorlanuvchi darslar (agar yuqorida shu kunga dars qo'shilmagan bo'lsa)
    (scopedGroups || []).forEach((g) => {
      if (g.status && g.status !== 'active') return;
      if (seenGroupIds.has(String(g.id))) return;

      const groupDays = g.days || g.schedule_days || '';
      let matches = false;

      if (groupDays) {
        matches = isDayMatchingSchedule(groupDays, cell.dayOfWeek);
      } else {
        matches = isCellOdd;
      }

      if (matches) {
        let startTime = '10:00';
        let endTime = '12:00';

        if (g.lesson_time) {
          const cleanTime = String(g.lesson_time).replace(/–|—/g, '-').trim();
          if (cleanTime.includes('-')) {
            const parts = cleanTime.split('-');
            if (parts[0]) startTime = parts[0].trim();
            if (parts[1]) endTime = parts[1].trim();
          } else {
            startTime = cleanTime;
            const hour = parseInt(startTime.split(':')[0], 10);
            if (!isNaN(hour)) {
              endTime = `${String((hour + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
            }
          }
        } else if (g.start_time) {
          startTime = String(g.start_time).slice(0, 5);
          if (g.end_time) {
            endTime = String(g.end_time).slice(0, 5);
          } else {
            const hour = parseInt(startTime.split(':')[0], 10);
            if (!isNaN(hour)) {
              endTime = `${String((hour + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
            }
          }
        } else if (g.days && String(g.days).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/)) {
          const match = String(g.days).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
          startTime = match[0].replace('.', ':').padStart(5, '0');
          const hour = parseInt(startTime.split(':')[0], 10);
          endTime = `${String((hour + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
        }

        const classroomObj = (classrooms || []).find(
          (c) => String(c.id) === String(g.classroom_id || g.classroom?.id)
        ) || g.classroom;

        const teacherObj = (teachers || []).find(
          (t) => String(t.id) === String(g.teacher_id || g.teacher?.id) ||
                 String(t.user_id) === String(g.teacher_id || g.teacher?.id)
        ) || g.teacher;

        const courseObj = (courses || []).find(
          (c) => String(c.id) === String(g.course_id || g.course?.id)
        ) || g.course;

        const title = g.name || courseObj?.name || `Guruh #${g.id}`;
        const topic = `${title} darsi`;

        result.push({
          id: `grp-${g.id}-${cell.dateStr}`,
          group_id: g.id,
          group: g,
          course: courseObj,
          course_id: g.course_id,
          title,
          topic,
          start_time: startTime,
          end_time: endTime,
          teacher: teacherObj,
          teacher_id: g.teacher_id,
          classroom: classroomObj,
          classroom_id: g.classroom_id,
          displayDate: cell.dateStr,
          status: 'scheduled',
          isGroupSchedule: true,
          days: g.days,
        });

        seenGroupIds.add(String(g.id));
      }
    });

    // Vaqt bo'yicha tartiblash (09:00 -> 10:00 -> 14:00)
    result.sort((a, b) => {
      const timeA = (a.start_time || '00:00').slice(0, 5);
      const timeB = (b.start_time || '00:00').slice(0, 5);
      return timeA.localeCompare(timeB);
    });

    return result;
  };

  // Guruhlar va darslarni birlashtirilgan to'liq ro'yxati (Jadval ko'rinishi uchun)
  const allScheduledLessons = useMemo(() => {
    const list = [];
    const scheduledGroupIds = new Set();

    // 1. Guruhlar bo'yicha avtomatik shakllangan dars jadvali
    (scopedGroups || []).forEach((g) => {
      if (g.status && g.status !== 'active') return;
      scheduledGroupIds.add(String(g.id));

      let startTime = '10:00';
      let endTime = '12:00';

      if (g.lesson_time) {
        const cleanTime = String(g.lesson_time).replace(/–|—/g, '-').trim();
        const parts = cleanTime.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g);
        if (parts && parts.length >= 2) {
          startTime = parts[0].replace('.', ':').padStart(5, '0');
          endTime = parts[1].replace('.', ':').padStart(5, '0');
        } else if (parts && parts.length === 1) {
          startTime = parts[0].replace('.', ':').padStart(5, '0');
          const h = parseInt(startTime.split(':')[0], 10);
          endTime = `${String((h + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
        }
      } else if (g.start_time) {
        startTime = String(g.start_time).slice(0, 5);
        if (g.end_time) {
          endTime = String(g.end_time).slice(0, 5);
        } else {
          const h = parseInt(startTime.split(':')[0], 10);
          endTime = `${String((h + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
        }
      }

      const classroomObj =
        (classrooms || []).find((c) => String(c.id) === String(g.classroom_id || g.classroom?.id)) || g.classroom;
      const teacherObj =
        (teachers || []).find(
          (t) =>
            String(t.id) === String(g.teacher_id || g.teacher?.id) ||
            String(t.user_id) === String(g.teacher_id || g.teacher?.id)
        ) || g.teacher;
      const courseObj =
        (courses || []).find((c) => String(c.id) === String(g.course_id || g.course?.id)) || g.course;

      list.push({
        id: `GRP-${g.id}`,
        group_id: g.id,
        group: g,
        course: courseObj,
        title: g.name,
        topic: `${g.name} darsi`,
        days: g.days || 'Du-Chor-Ju',
        start_time: startTime,
        end_time: endTime,
        teacher: teacherObj || g.teacher,
        teacher_id: g.teacher_id,
        classroom: classroomObj || g.classroom,
        classroom_id: g.classroom_id,
        isAutoSchedule: true,
        status: g.status || 'active',
      });
    });

    // 2. Maxsus kiritilgan bir martalik darslar
    (scopedLessons || []).forEach((l) => {
      if (!l.group_id || !scheduledGroupIds.has(String(l.group_id))) {
        list.push(l);
      }
    });

    return list;
  }, [scopedLessons, scopedGroups, classrooms, teachers, courses]);

  // Filter lessons by search query and day category
  const filteredItems = allScheduledLessons.filter((item) => {
    if (dayCategory === 'MY_DAYS') {
      const isOdd = isLessonOddDay(item);
      const isEven = isLessonEvenDay(item);
      const matchesStudentDay =
        (isOdd && (studentActiveDays.includes(1) || studentActiveDays.includes(3) || studentActiveDays.includes(5))) ||
        (isEven && (studentActiveDays.includes(2) || studentActiveDays.includes(4) || studentActiveDays.includes(6)));
      if (!matchesStudentDay && (isOdd || isEven)) return false;
    }
    if (dayCategory === 'ODD' && !isLessonOddDay(item)) return false;
    if (dayCategory === 'EVEN' && !isLessonEvenDay(item)) return false;
    if (!searchQuery) return true;
    return Object.values(item).some((val) => {
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some((v) =>
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return String(val).toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  // Real-time live lessons for today (Dars Vaqti Nazorati)
  const todayLiveLessons = useMemo(() => {
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0 = Sun
    const nowMinutes = today.getHours() * 60 + today.getMinutes();

    return (allScheduledLessons || []).filter((lesson) => {
      const dStr = String(lesson.days || '').toLowerCase();
      let isScheduledToday = false;

      if (dStr.includes('har') || dStr.includes('daily') || dStr.includes('barcha')) {
        isScheduledToday = todayDayOfWeek !== 0;
      } else if (todayDayOfWeek === 1 && (dStr.includes('du') || dStr.includes('mon') || dStr === 'odd' || dStr.includes('toq'))) {
        isScheduledToday = true;
      } else if (todayDayOfWeek === 2 && (dStr.includes('se') || dStr.includes('tue') || dStr === 'even' || dStr.includes('juft'))) {
        isScheduledToday = true;
      } else if (todayDayOfWeek === 3 && (dStr.includes('chor') || dStr.includes('wed') || dStr === 'odd' || dStr.includes('toq'))) {
        isScheduledToday = true;
      } else if (todayDayOfWeek === 4 && (dStr.includes('pay') || dStr.includes('thu') || dStr === 'even' || dStr.includes('juft'))) {
        isScheduledToday = true;
      } else if (todayDayOfWeek === 5 && (dStr.includes('jum') || dStr.includes('fri') || dStr === 'odd' || dStr.includes('toq'))) {
        isScheduledToday = true;
      } else if (todayDayOfWeek === 6 && (dStr.includes('shan') || dStr.includes('sat') || dStr === 'even' || dStr.includes('juft'))) {
        isScheduledToday = true;
      } else if (!dStr) {
        isScheduledToday = todayDayOfWeek !== 0;
      }

      return isScheduledToday;
    }).map((lesson) => {
      const sMin = timeToMinutes(lesson.start_time) ?? 600;
      const eMin = timeToMinutes(lesson.end_time) ?? 720;

      let liveStatus = 'UPCOMING';
      if (nowMinutes >= sMin && nowMinutes <= eMin) {
        liveStatus = 'IN_PROGRESS';
      } else if (nowMinutes > eMin) {
        liveStatus = 'COMPLETED';
      }

      return {
        ...lesson,
        sMin,
        eMin,
        liveStatus,
      };
    }).sort((a, b) => a.sMin - b.sMin);
  }, [allScheduledLessons, liveNow]);

  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    { title: 'ID', key: 'id', width: '70px' },
    {
      title: 'Guruh / Kurs',
      key: 'topic',
      render: (_, row) => (
        <div>
          <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: 13 }}>
            {row.group?.name || row.title || row.topic || 'Dars'}
          </span>
          {row.course?.name && (
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
              {row.course.name}
            </div>
          )}
        </div>
      ),
    },
    {
      title: "O'qituvchi",
      key: 'teacher',
      render: (_, row) => {
        const tObj =
          (teachers || []).find(
            (t) =>
              String(t.id) === String(row.teacher_id || row.teacher?.id || row.group?.teacher_id) ||
              String(t.user_id) === String(row.teacher_id || row.teacher?.id || row.group?.teacher_id)
          ) || row.teacher || row.group?.teacher;
        const name = tObj?.user?.full_name || tObj?.full_name || tObj?.name || '—';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <GraduationCap size={13} color="#2563eb" />
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{name}</span>
          </div>
        );
      },
    },
    {
      title: 'Dars Kunlari (Jadval)',
      key: 'days',
      render: (_, row) => {
        const daysStr = row.days || row.group?.days || '';
        const isOdd = isLessonOddDay(row);
        const isEven = isLessonEvenDay(row);
        if (isOdd) {
          return <span className={styles.oddDayBadge}>🟢 {daysStr || 'Toq kunlar (Du-Chor-Ju)'}</span>;
        }
        if (isEven) {
          return <span className={styles.evenDayBadge}>🟣 {daysStr || 'Juft kunlar (Se-Pay-Shan)'}</span>;
        }
        return <span className={styles.dayBadge}>{daysStr || 'Rejali kunlar'}</span>;
      },
    },
    {
      title: 'Dars Vaqti',
      key: 'time',
      render: (_, row) => {
        const s = (row.start_time || row.group?.start_time || '14:00').slice(0, 5);
        const e = (row.end_time || row.group?.end_time || '16:00').slice(0, 5);
        return (
          <div className={styles.timeBadgeTable}>
            <Clock size={12} color="#64748b" />
            <span>{s} - {e}</span>
          </div>
        );
      },
    },
    {
      title: 'Xona',
      key: 'classroom',
      render: (_, row) => {
        const cls = (classrooms || []).find((c) => String(c.id) === String(row.classroom_id || row.classroom?.id || row.group?.classroom_id));
        const roomName = cls?.name || row.classroom?.name || row.group?.classroom?.name || (row.classroom_id ? `Xona #${row.classroom_id}` : '—');
        return (
          <div className={styles.roomBadgeTable}>
            <DoorOpen size={12} color="#059669" />
            <span>{roomName}</span>
          </div>
        );
      },
    },
    {
      title: 'Tizim Holati',
      key: 'status',
      render: () => (
        <span className={styles.autoBadge}>
          <Sparkles size={11} /> Avtomatik Jadval
        </span>
      ),
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: '70px',
      align: 'right',
      render: (_, row) => (
        <div className={styles.actionsCell}>
          <button className={styles.actionBtn} onClick={() => handleOpenDetails(row)} title="Batafsil">
            <Eye size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: isStudent ? 'Mening Dars Jadvalim' : 'Dars Jadvali', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: 'Yangi Dars Qo\'shish' }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: 'Batafsil' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          <Header
            title={isStudent ? 'Mening Dars Jadvalim' : 'Dars Jadvali'}
            subtitle={
              isSuperAdmin
                ? "Barcha filiallar va o'qituvchilar bo'yicha to'liq dars jadvali"
                : isTeacher
                ? "Sizga biriktirilgan darslar jadvali"
                : isStudent
                ? "Siz qatnashayotgan guruhlar va haftalik dars vaqtlari"
                : "Filial dars jadvali va xonalar taqvimi"
            }
            actions={
              <div className={styles.headerActions}>
                {/* View Toggle */}
                <div className={styles.viewToggle}>
                  {canSeeLiveMonitor && (
                    <button
                      className={`${styles.toggleBtn} ${displayType === 'LIVE_MONITOR' ? styles.toggleBtnActive : ''}`}
                      onClick={() => setDisplayType('LIVE_MONITOR')}
                      title="Dars o'tish vaqtlarini jonli kuzatish"
                    >
                      <Clock size={15} />
                      <span>Dars Vaqti Nazorati</span>
                    </button>
                  )}
                  <button
                    className={`${styles.toggleBtn} ${displayType === 'CALENDAR' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setDisplayType('CALENDAR')}
                  >
                    <CalendarIcon size={15} />
                    <span>Taqvim</span>
                  </button>
                  <button
                    className={`${styles.toggleBtn} ${displayType === 'TABLE' ? styles.toggleBtnActive : ''}`}
                    onClick={() => setDisplayType('TABLE')}
                  >
                    <List size={15} />
                    <span>Ro'yxat</span>
                  </button>
                </div>
              </div>
            }
          />

          {displayType === 'LIVE_MONITOR' && canSeeLiveMonitor ? (
            <div className={styles.liveMonitorContainer} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Top Banner with Clock and Counts */}
              <div className={styles.liveTopBanner}>
                <div className={styles.liveClockGroup}>
                  <div className={styles.liveClockIcon}>
                    <Clock size={26} />
                  </div>
                  <div>
                    <div className={styles.liveTimeText}>
                      {liveNow.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className={styles.liveDateSubtitle}>
                      Bugun: {liveNow.toLocaleDateString('uz-UZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div className={styles.liveKpiGroup}>
                  {(liveMonitorData?.stats?.alertCount > 0 || todayLiveLessons.some(l => l.is_alert)) && (
                    <div className={`${styles.liveKpiBadge}`} style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1.5px solid #ef4444', fontWeight: 800 }}>
                      <AlertTriangle size={15} />
                      <span>🚨 {liveMonitorData?.stats?.alertCount || 2} ta xonada davomat olinmadi</span>
                    </div>
                  )}
                  <div className={`${styles.liveKpiBadge} ${styles.liveBadgeGreen}`}>
                    <span>🟢 {liveMonitorData?.stats?.activeLessons ?? todayLiveLessons.filter(l => l.liveStatus === 'IN_PROGRESS').length} ta faol dars</span>
                  </div>
                  <div className={`${styles.liveKpiBadge}`} style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #10b981' }}>
                    <span>✅ {liveMonitorData?.stats?.attendanceTakenCount ?? 0} ta davomat olingan</span>
                  </div>
                  <div className={`${styles.liveKpiBadge} ${styles.liveBadgeBlue}`}>
                    <span>🏢 {liveMonitorData?.stats?.totalRooms ?? (classrooms?.length || 15)} ta xona</span>
                  </div>
                </div>
              </div>

              {/* Shoshilinch Xavf Paneli (10 daqiqadan oshgan davomat olinmagan xonalar) */}
              {((liveMonitorData?.alerts && liveMonitorData.alerts.length > 0) || (todayLiveLessons.some(l => l.is_alert))) && (
                <div className={styles.emergencyAlertBanner}>
                  <div className={styles.alertBannerTop}>
                    <div className={styles.alertBannerHeading}>
                      <div className={styles.alertIconPulse}>
                        <AlertTriangle size={24} />
                      </div>
                      <div>
                        <h4 className={styles.alertBannerTitle}>
                          DIQQAT NAZORATCHI: {liveMonitorData?.alerts?.length || 2} ta xonada dars boshlanganiga 10 daqiqadan oshdi, lekin talabalar davomati olinmagan!
                        </h4>
                        <p className={styles.alertBannerSub}>
                          Dars intizomi bo'yicha belgilangan me'yor buzilmoqda. O'qituvchilar bilan zudlik bilan bog'laning yoki xonaga kirib davomatni tekshiring.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className={styles.alertItemsGrid}>
                    {(liveMonitorData?.alerts || []).map((alt) => (
                      <div key={alt.id} className={styles.alertMiniCard}>
                        <div className={styles.alertMiniCardLeft}>
                          <span className={styles.alertRoomName}>
                            <DoorOpen size={14} /> Xona: {alt.classroom_name}
                          </span>
                          <span className={styles.alertGroupName}>
                            {alt.group_name} {alt.course_name ? `(${alt.course_name})` : ''}
                          </span>
                          <span className={styles.alertOverdueTime}>
                            👨‍🏫 {alt.teacher_name} {alt.teacher_phone ? `(📞 ${alt.teacher_phone})` : ''} — ⏱️ {alt.elapsed_minutes} daqiqa o'tdi ({alt.overdue_minutes} daq. kechikmoqda)
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            type="button"
                            className={styles.alertActionBtn}
                            onClick={() => navigate(`/attendance?group_id=${alt.group_id}`)}
                            title="Davomat sahifasiga o'tish"
                          >
                            Davomatni ochish
                          </button>
                          <button
                            type="button"
                            className={styles.roomNotifyBtn}
                            onClick={() => handleNotifyTeacher(alt)}
                            title="O'qituvchiga ogohlantirish yuborish"
                          >
                            <Bell size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Controls: View Mode & Filters */}
              <div className={styles.monitorControlsRow}>
                <div className={styles.viewModeTabs}>
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${liveMonitorView === 'ROOMS' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setLiveMonitorView('ROOMS')}
                  >
                    <LayoutGrid size={15} />
                    <span>Xonalar Doskasi (Karta)</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.viewModeBtn} ${liveMonitorView === 'TABLE' ? styles.viewModeBtnActive : ''}`}
                    onClick={() => setLiveMonitorView('TABLE')}
                  >
                    <List size={15} />
                    <span>Jadval Ko'rinishi</span>
                  </button>
                </div>

                <div className={styles.filterChipsGroup}>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${liveFilter === 'ALL' ? styles.filterChipActive : ''}`}
                    onClick={() => setLiveFilter('ALL')}
                  >
                    Barchasi ({liveMonitorData?.roomBoard?.length || 15})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${styles.filterChipAlert} ${liveFilter === 'ALERTS' ? styles.filterChipAlertActive : ''}`}
                    onClick={() => setLiveFilter('ALERTS')}
                  >
                    <AlertTriangle size={13} />
                    <span>🚨 Xavf: 10 daq. davomat yo'q ({liveMonitorData?.alerts?.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${styles.filterChipGreen} ${liveFilter === 'ACTIVE' ? styles.filterChipGreenActive : ''}`}
                    onClick={() => setLiveFilter('ACTIVE')}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: liveFilter === 'ACTIVE' ? '#ffffff' : '#16a34a',
                        display: 'inline-block',
                      }}
                    />
                    <span>Faol darslar ({liveMonitorData?.stats?.activeLessons || 0})</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterChip} ${liveFilter === 'EMPTY' ? styles.filterChipActive : ''}`}
                    onClick={() => setLiveFilter('EMPTY')}
                  >
                    Bo'sh xonalar
                  </button>
                </div>
              </div>

              {/* VIEW 1: XONALAR KESIMIDA DOSKA (CLASSROOM BOARD) */}
              {liveMonitorView === 'ROOMS' ? (
                filteredLiveRooms.length === 0 ? (
                  <div className={styles.liveEmptyStateCard}>
                    <div className={`${styles.liveEmptyStateIconBox} ${liveFilter === 'ACTIVE' ? styles.liveEmptyStateIconBoxGreen : liveFilter === 'ALERTS' ? styles.liveEmptyStateIconBoxGreen : ''}`}>
                      {liveFilter === 'ACTIVE' ? (
                        <Clock size={36} color="#16a34a" />
                      ) : liveFilter === 'ALERTS' ? (
                        <ShieldCheck size={36} color="#10b981" />
                      ) : (
                        <DoorOpen size={36} color="#64748b" />
                      )}
                    </div>
                    <h3 className={styles.liveEmptyStateTitle}>
                      {liveFilter === 'ACTIVE'
                        ? "Ayni vaqtda faol dars ketayotgan xonalar yo'q (0 ta)"
                        : liveFilter === 'ALERTS'
                        ? "Ajoyib! Davomat olinmagan xavfli darslar mavjud emas"
                        : "Bo'sh xonalar topilmadi"}
                    </h3>
                    <p className={styles.liveEmptyStateDesc}>
                      {liveFilter === 'ACTIVE'
                        ? "Hozir markazda darslar oralig'idagi tanaffus vaqti. Darslar jadvali bo'yicha navbatdagi darslar boshlangach, qaysi xonada dars o'tilayotgani va 10 daqiqa ichida davomat olingan-olinmagani shu yerda avtomatik aks etadi."
                        : liveFilter === 'ALERTS'
                        ? "Barcha faol guruhlarda o'qituvchilar dars boshlanganidan so'ng 10 daqiqa ichida talabalar davomatini o'z vaqtida belgilashgan."
                        : "Hozirda markazdagi barcha dars xonalari mashg'ulotlar bilan band."}
                    </p>
                    <div className={styles.liveEmptyStateActions}>
                      <button
                        type="button"
                        className={styles.liveEmptyStateBtn}
                        onClick={() => setLiveFilter('ALL')}
                      >
                        <DoorOpen size={16} />
                        <span>Barcha xonalarni ko'rish ({liveMonitorData?.roomBoard?.length || 0} ta xona)</span>
                      </button>
                      {liveFilter !== 'EMPTY' && (
                        <button
                          type="button"
                          className={styles.liveEmptyStateBtnSecondary}
                          onClick={() => setLiveFilter('EMPTY')}
                        >
                          <span>Bo'sh xonalarni ko'rish</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.classroomGrid}>
                    {filteredLiveRooms.map((room) => {
                    const lesson = room.current_lesson;
                    const hasActive = room.has_active_lesson;
                    const isAlert = room.is_alert;

                    let cardClass = styles.roomCardEmpty;
                    let badgeClass = styles.pillCompleted;
                    let badgeText = "⚪ Bo'sh xona";

                    if (isAlert) {
                      cardClass = `${styles.roomCard} ${styles.roomCardAlert}`;
                      badgeClass = styles.filterChipAlert;
                      badgeText = "🚨 10 DAQ. DAVOMAT YO'Q";
                    } else if (hasActive) {
                      cardClass = `${styles.roomCard} ${styles.roomCardActive}`;
                      badgeClass = styles.pillInProgress;
                      badgeText = "🟢 DARS KETMOQDA";
                    } else if (lesson) {
                      cardClass = styles.roomCard;
                      badgeClass = styles.pillUpcoming;
                      badgeText = "⏳ Dars kutilmoqda";
                    }

                    return (
                      <div key={room.room_id} className={cardClass}>
                        <div>
                          {/* Room Card Header */}
                          <div className={styles.roomCardHeader}>
                            <div className={styles.roomTitleRow}>
                              <DoorOpen size={18} color="#2563eb" />
                              <span className={styles.roomNameText}>{room.room_name}</span>
                              <span className={styles.roomFloorBadge}>{room.floor}-qavat</span>
                            </div>
                            <span className={`${styles.roomStatusBadge} ${badgeClass}`}>
                              {badgeText}
                            </span>
                          </div>

                          {/* Room Card Body */}
                          <div className={styles.roomCardBody} style={{ marginTop: '10px' }}>
                            {lesson ? (
                              <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                  <div>
                                    <div className={styles.roomLessonGroup}>
                                      {lesson.group_name}
                                    </div>
                                    {lesson.course_name && (
                                      <div className={styles.roomCourseSub}>
                                        {lesson.course_name}
                                      </div>
                                    )}
                                  </div>
                                  <div className={styles.roomTimeBadge}>
                                    <Clock size={12} />
                                    <span>{lesson.start_time} - {lesson.end_time}</span>
                                  </div>
                                </div>

                                <div className={styles.roomTeacherInfo}>
                                  <GraduationCap size={14} color="#64748b" />
                                  <span>{lesson.teacher_name}</span>
                                  {lesson.teacher_phone && (
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      ({lesson.teacher_phone})
                                    </span>
                                  )}
                                </div>

                                {/* Attendance Status Box */}
                                <div
                                  className={`${styles.roomAttendanceBox} ${
                                    isAlert
                                      ? styles.attendanceBoxAlert
                                      : lesson.attendance_taken
                                      ? styles.attendanceBoxSuccess
                                      : styles.attendanceBoxWaiting
                                  }`}
                                >
                                  <div className={styles.attendanceBoxTitle} style={{ color: isAlert ? '#991b1b' : lesson.attendance_taken ? '#065f46' : '#92400e' }}>
                                    {isAlert ? (
                                      <>
                                        <AlertTriangle size={14} />
                                        <span>DIQQAT: 10 DAQIQADAN OSHDI!</span>
                                      </>
                                    ) : lesson.attendance_taken ? (
                                      <>
                                        <CheckCircle2 size={14} />
                                        <span>Davomat to'liq olingan</span>
                                      </>
                                    ) : (
                                      <>
                                        <Clock size={14} />
                                        <span>Davomat kutilmoqda</span>
                                      </>
                                    )}
                                  </div>
                                  <div className={styles.attendanceBoxDesc} style={{ color: isAlert ? '#b91c1c' : lesson.attendance_taken ? '#047857' : '#b45309' }}>
                                    {isAlert
                                      ? `Dars boshlanganiga ${lesson.elapsed_minutes} daqiqa bo'ldi. O'qituvchi hali davomat olmadi!`
                                      : lesson.attendance_taken
                                      ? `${lesson.attendance_count} ta talaba qayd etildi (${lesson.present_count} kelgan, ${lesson.absent_count} yo'q)`
                                      : `Dars boshlandi (${lesson.elapsed_minutes} daqiqa o'tdi, ${lesson.remaining_minutes} daqiqa qoldi)`}
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                                <Clock size={24} style={{ margin: '0 auto 6px', opacity: 0.4 }} />
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>Ayni paytda dars yo'q</div>
                                <div style={{ fontSize: '11px' }}>Xona bo'sh va tayyor holatda</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Room Card Footer Actions */}
                        {lesson && (
                          <div className={styles.roomCardFooter}>
                            <button
                              type="button"
                              className={`${styles.roomActionBtnPrimary} ${isAlert ? styles.roomActionBtnAlert : ''}`}
                              onClick={() => navigate(`/attendance?group_id=${lesson.group_id}`)}
                              title="Guruh talabalari davomatiga o'tish"
                            >
                              <CheckSquare size={13} />
                              <span>{isAlert ? 'Davomatni tekshirish' : 'Davomat'}</span>
                            </button>
                            <button
                              type="button"
                              className={styles.roomNotifyBtn}
                              onClick={() => handleNotifyTeacher(lesson)}
                              title="O'qituvchiga eslatma berish"
                            >
                              <Bell size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  </div>
                )
              ) : (
                /* VIEW 2: JADVAL KO'RINISHI (TABLE VIEW) */
                <div className={styles.liveTableCard}>
                  {(!liveMonitorData?.lessons || liveMonitorData.lessons.length === 0) ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                      <h4 style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>Bugun rejalashtirilgan darslar mavjud emas</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '13px' }}>Bugungi kun dars jadvalida faol guruhlar topilmadi.</p>
                    </div>
                  ) : filteredLiveLessons.length === 0 ? (
                    <div className={styles.liveEmptyStateCard} style={{ margin: '20px', border: 'none' }}>
                      <div className={`${styles.liveEmptyStateIconBox} ${liveFilter === 'ACTIVE' ? styles.liveEmptyStateIconBoxGreen : ''}`}>
                        {liveFilter === 'ACTIVE' ? (
                          <Clock size={36} color="#16a34a" />
                        ) : liveFilter === 'ALERTS' ? (
                          <ShieldCheck size={36} color="#10b981" />
                        ) : (
                          <Clock size={36} color="#64748b" />
                        )}
                      </div>
                      <h3 className={styles.liveEmptyStateTitle}>
                        {liveFilter === 'ACTIVE'
                          ? "Ayni vaqtda faol darslar mavjud emas (0 ta)"
                          : liveFilter === 'ALERTS'
                          ? "Davomat olinmagan xavfli darslar yo'q"
                          : "Jadval bo'yicha mos darslar topilmadi"}
                      </h3>
                      <p className={styles.liveEmptyStateDesc}>
                        {liveFilter === 'ACTIVE'
                          ? "Darslar jadvali bo'yicha ayni paytda tanaffus. Dars boshlangach jadvalda o'qituvchi, xona va davomat holatlari ko'rinadi."
                          : liveFilter === 'ALERTS'
                          ? "Barcha guruhlarda o'qituvchilar davomatni o'z vaqtida belgilashgan."
                          : "Tanlangan filtr bo'yicha ma'lumot topilmadi."}
                      </p>
                      <div className={styles.liveEmptyStateActions}>
                        <button
                          type="button"
                          className={styles.liveEmptyStateBtn}
                          onClick={() => setLiveFilter('ALL')}
                        >
                          <span>Barcha darslar jadvalini ko'rish</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <table className={styles.liveTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '130px' }}>Dars Vaqti</th>
                          <th style={{ width: '100px' }}>Xona</th>
                          <th>Guruh va Kurs</th>
                          <th>O'qituvchi</th>
                          <th style={{ width: '170px' }}>Dars Holati</th>
                          <th style={{ width: '260px' }}>Talabalar Davomati Nazorati</th>
                          <th style={{ width: '140px', textAlign: 'center' }}>Harakat</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLiveLessons.map((item) => {
                          const teacherName = item.teacher_name || "Biriktirilmagan";
                          const roomName = item.classroom_name || '1-xona';
                          const timeStr = `${item.start_time} - ${item.end_time}`;

                          let pillClass = styles.pillUpcoming;
                          let pillText = "⏳ Kutilmoqda";
                          if (item.live_status === 'IN_PROGRESS') {
                            pillClass = styles.pillInProgress;
                            pillText = "🟢 DARS KETMOQDA";
                          } else if (item.live_status === 'COMPLETED') {
                            pillClass = styles.pillCompleted;
                            pillText = "✅ Yakunlandi";
                          }

                          return (
                            <tr key={item.id} style={{ backgroundColor: item.is_alert ? '#fff5f5' : 'transparent' }}>
                              <td>
                                <span style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                                  {timeStr}
                                </span>
                              </td>
                              <td>
                                <span style={{ backgroundColor: item.is_alert ? '#fee2e2' : '#f1f5f9', color: item.is_alert ? '#b91c1c' : '#475569', padding: '4px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '12px' }}>
                                  🚪 {roomName}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '14px' }}>
                                    {item.group_name}
                                  </span>
                                  {item.course_name && (
                                    <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                                      {item.course_name}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 600, color: '#334155' }}>
                                    {teacherName}
                                  </span>
                                  {item.teacher_phone && (
                                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                                      {item.teacher_phone}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.liveStatusPill} ${pillClass}`}>
                                  {pillText}
                                </span>
                              </td>
                              <td>
                                {item.is_alert ? (
                                  <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 2 }}>
                                    <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      <AlertTriangle size={12} />
                                      <span>10 DAQ. OSHDI! DAVOMAT YO'Q</span>
                                    </span>
                                    <span style={{ fontSize: '11px', color: '#e11d48', fontWeight: 600 }}>
                                      {item.elapsed_minutes} daqiqa o'tdi ({item.overdue_minutes} daq. kechikish)
                                    </span>
                                  </div>
                                ) : item.attendance_taken ? (
                                  <span style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <CheckCircle2 size={12} />
                                    <span>Davomat olingan ({item.attendance_count} ta)</span>
                                  </span>
                                ) : (
                                  <span style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                    <Clock size={12} />
                                    <span>Davomat kutilmoqda ({item.remaining_minutes} daq. qoldi)</span>
                                  </span>
                                )}
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button
                                    type="button"
                                    className={styles.inspectActionBtn}
                                    onClick={() => navigate(`/attendance?group_id=${item.group_id}`)}
                                    title="Guruh talabalari davomatini ochish"
                                  >
                                    <CheckSquare size={13} />
                                    <span>Davomat</span>
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.roomNotifyBtn}
                                    onClick={() => handleNotifyTeacher(item)}
                                    title="O'qituvchiga ogohlantirish"
                                  >
                                    <Bell size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* Toast Bildirishnoma */}
              {toastMessage && (
                <div className={styles.toastAlertFloating}>
                  <Bell size={18} color="#facc15" />
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{toastMessage}</span>
                </div>
              )}
            </div>
          ) : displayType === 'CALENDAR' ? (
            <>
              {/* Calendar Month Navigation & Interactive Odd/Even Day Categories */}
              <div className={styles.legendRow}>
                <div className={styles.calendarNavGroup}>
                  <h3 className={styles.monthHeading}>
                    {monthNames[month]}, {year}
                  </h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className={styles.navBtn}
                      onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                      title="Oldingi oy"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      className={styles.navBtn}
                      onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                      title="Keyingi oy"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                {/* Day Category Filter Tabs - Faqat Admin va O'qituvchilar uchun */}
                {!isStudent && (
                  <div className={styles.categoryFilterContainer}>
                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'ALL' ? styles.categoryTabBtnActiveAll : ''
                      }`}
                      onClick={() => setDayCategory('ALL')}
                    >
                      <CalendarIcon size={14} />
                      <span>Barcha kunlar</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'ODD' ? styles.categoryTabBtnActiveOdd : ''
                      }`}
                      onClick={() => setDayCategory('ODD')}
                    >
                      <span className={styles.tagDot} style={{ backgroundColor: '#10b981' }} />
                      <span>🟢 Toq kunlar (Dush / Chor / Juma)</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'EVEN' ? styles.categoryTabBtnActiveEven : ''
                      }`}
                      onClick={() => setDayCategory('EVEN')}
                    >
                      <span className={styles.tagDot} style={{ backgroundColor: '#ec4899' }} />
                      <span>🟣 Juft kunlar (Sesh / Pay / Shan)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Monthly Schedule Grid - Single Unified 7-Column Grid */}
              <div className={styles.calendarScrollWrapper}>
                <div className={styles.calendarGrid}>
                <div className={`${styles.weekHeaderCell} ${
                  dayCategory === 'MY_DAYS'
                    ? (studentActiveDays.includes(1) ? styles.highlightOddHeader : styles.dimmedCell)
                    : (dayCategory === 'ODD' ? styles.highlightOddHeader : dayCategory === 'EVEN' ? styles.dimmedCell : '')
                }`}>Dushanba</div>
                <div className={`${styles.weekHeaderCell} ${
                  dayCategory === 'MY_DAYS'
                    ? (studentActiveDays.includes(2) ? styles.highlightEvenHeader : styles.dimmedCell)
                    : (dayCategory === 'EVEN' ? styles.highlightEvenHeader : dayCategory === 'ODD' ? styles.dimmedCell : '')
                }`}>Seshanba</div>
                <div className={`${styles.weekHeaderCell} ${
                  dayCategory === 'MY_DAYS'
                    ? (studentActiveDays.includes(3) ? styles.highlightOddHeader : styles.dimmedCell)
                    : (dayCategory === 'ODD' ? styles.highlightOddHeader : dayCategory === 'EVEN' ? styles.dimmedCell : '')
                }`}>Chorshanba</div>
                <div className={`${styles.weekHeaderCell} ${
                  dayCategory === 'MY_DAYS'
                    ? (studentActiveDays.includes(4) ? styles.highlightEvenHeader : styles.dimmedCell)
                    : (dayCategory === 'EVEN' ? styles.highlightEvenHeader : dayCategory === 'ODD' ? styles.dimmedCell : '')
                }`}>Payshanba</div>
                <div className={`${styles.weekHeaderCell} ${
                  dayCategory === 'MY_DAYS'
                    ? (studentActiveDays.includes(5) ? styles.highlightOddHeader : styles.dimmedCell)
                    : (dayCategory === 'ODD' ? styles.highlightOddHeader : dayCategory === 'EVEN' ? styles.dimmedCell : '')
                }`}>Juma</div>
                <div className={`${styles.weekHeaderCell} ${
                  dayCategory === 'MY_DAYS'
                    ? (studentActiveDays.includes(6) ? styles.highlightEvenHeader : styles.dimmedCell)
                    : (dayCategory === 'EVEN' ? styles.highlightEvenHeader : dayCategory === 'ODD' ? styles.dimmedCell : '')
                }`}>Shanba</div>
                <div className={`${styles.weekHeaderCell} ${dayCategory !== 'ALL' ? styles.dimmedCell : ''}`}>Yakshanba</div>

                {calendarDays.map((cell, idx) => {
                  // Find lessons on this day (both explicit date and recurring odd/even schedule days)
                  const rawCellLessons = getLessonsForCell(cell);
                  const cellLessons = searchQuery
                    ? rawCellLessons.filter((l) => {
                        const q = searchQuery.toLowerCase();
                        const gName = l.group?.name || '';
                        const cName = l.course?.name || '';
                        const tObj =
                          (teachers || []).find(
                            (t) =>
                              String(t.id) === String(l.teacher_id || l.teacher?.id || l.group?.teacher_id) ||
                              String(t.user_id) === String(l.teacher_id || l.teacher?.id || l.group?.teacher_id)
                          ) || l.teacher || l.group?.teacher;
                        const tName = tObj?.user?.full_name || tObj?.full_name || tObj?.name || '';
                        const topName = l.topic || l.title || '';
                        return (
                          gName.toLowerCase().includes(q) ||
                          cName.toLowerCase().includes(q) ||
                          tName.toLowerCase().includes(q) ||
                          topName.toLowerCase().includes(q)
                        );
                      })
                    : rawCellLessons;

                  // Determine Odd vs Even Day
                  // Odd days: Monday (1), Wednesday (3), Friday (5)
                  // Even days: Tuesday (2), Thursday (4), Saturday (6)
                  const isOddDay = cell.dayOfWeek === 1 || cell.dayOfWeek === 3 || cell.dayOfWeek === 5;
                  const isEvenDay = cell.dayOfWeek === 2 || cell.dayOfWeek === 4 || cell.dayOfWeek === 6;

                  const isCellDimmed =
                    (dayCategory === 'MY_DAYS' && !studentActiveDays.includes(cell.dayOfWeek)) ||
                    (dayCategory === 'ODD' && !isOddDay) ||
                    (dayCategory === 'EVEN' && !isEvenDay);

                  return (
                    <div
                      key={idx}
                      className={`${styles.calendarCell} ${
                        !cell.isCurrentMonth || cell.isPast ? styles.cellOtherMonth : ''
                      } ${cell.isSunday ? styles.cellSunday : ''} ${cell.isToday ? styles.cellToday : ''} ${
                        isCellDimmed ? styles.dimmedCell : ''
                      }`}
                    >
                      <div className={styles.cellHeader}>
                        <span
                          className={
                            cell.isCurrentMonth && !cell.isPast ? styles.cellDayNumber : styles.cellOtherMonthText
                          }
                        >
                          {cell.label}
                        </span>
                      </div>

                      {/* Lessons in Cell */}
                      {cell.isSunday ? (
                        <div className={styles.sundayRestTag}>
                          <span>Dam olish kuni</span>
                        </div>
                      ) : (
                        <div className={styles.lessonsListInCell}>
                          {cellLessons.length === 0 ? (
                            isStudent && cell.isCurrentMonth && (
                              <div className={styles.studentFreeDayTag}>
                                <span>Dars yo'q</span>
                              </div>
                            )
                          ) : (
                            cellLessons.map((lesson, lIdx) => {
                          const targetGroup =
                            (groups || []).find((g) => String(g.id) === String(lesson.group_id)) ||
                            lesson.group;
                          const teacherObj =
                            (teachers || []).find(
                              (t) =>
                                String(t.id) === String(lesson.teacher_id || targetGroup?.teacher_id || lesson.teacher?.id) ||
                                String(t.user_id) === String(lesson.teacher_id || targetGroup?.teacher_id || lesson.teacher?.id)
                            ) || lesson.teacher || targetGroup?.teacher;
                          const teacherName =
                            teacherObj?.user?.full_name || teacherObj?.full_name || teacherObj?.name || '';
                          const groupName = targetGroup?.name || lesson.group?.name || '';
                          const courseName = targetGroup?.course?.name || lesson.course?.name || '';

                          const titleDisplay = groupName || courseName || lesson.topic || lesson.title || 'Dars';

                          const classroomObj =
                            (classrooms || []).find((c) => String(c.id) === String(lesson.classroom_id || targetGroup?.classroom_id)) ||
                            lesson.classroom || targetGroup?.classroom;
                          const roomName =
                            classroomObj?.name ||
                            lesson.room?.name ||
                            (lesson.classroom_id
                              ? `Xona #${lesson.classroom_id}`
                              : targetGroup?.classroom_id
                              ? `Xona #${targetGroup.classroom_id}`
                              : '');
                          const startTime = (
                            lesson.start_time || targetGroup?.start_time || '14:00'
                          ).slice(0, 5);
                          const endTime = (
                            lesson.end_time || targetGroup?.end_time || '16:00'
                          ).slice(0, 5);

                          let pillClass = styles.lessonSpecial;
                          let dayTypeLabel = 'Maxsus dars';
                          if (isOddDay) {
                            pillClass = styles.lessonOdd;
                            dayTypeLabel = '🟢 Toq kun';
                          } else if (isEvenDay) {
                            pillClass = styles.lessonEven;
                            dayTypeLabel = '🟣 Juft kun';
                          }

                          return (
                            <div
                              key={lesson.id || lIdx}
                              className={`${styles.lessonPill} ${pillClass}`}
                              onClick={() => handleOpenDetails(lesson)}
                              title={`${titleDisplay}\nO'qituvchi: ${teacherName || 'Biriktirilmagan'}\nKun: ${dayTypeLabel}\nVaqti: ${startTime} - ${endTime}\nXona: ${roomName || 'Biriktirilmagan'}`}
                            >
                              <div className={styles.pillTopRow}>
                                <span className={styles.pillCircle} />
                                <span className={styles.pillTitle}>{titleDisplay}</span>
                              </div>

                              <div className={styles.pillTeacherRow} title={`O'qituvchi: ${teacherName || 'Biriktirilmagan'}`}>
                                <GraduationCap size={11} className={styles.pillTeacherIcon} />
                                <span className={styles.pillTeacherName}>{teacherName || 'Biriktirilmagan'}</span>
                              </div>

                              <div className={styles.pillMetaRow}>
                                <div className={styles.pillTimeBadge}>
                                  <Clock size={10} />
                                  <span>{startTime} - {endTime}</span>
                                </div>
                                {roomName ? (
                                  <div className={styles.pillRoomBadge} title={roomName}>
                                    <DoorOpen size={10} />
                                    <span>{roomName}</span>
                                  </div>
                                ) : (
                                  <div className={styles.pillRoomBadge} style={{ backgroundColor: '#f1f5f9', color: '#475569' }}>
                                    <span>Guruh</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }))}
                      </div>
                    )}
                  </div>
                );
              })}
                </div>
              </div>
            </>
          ) : (
            /* Table View */
            <div className={styles.card}>
              <div className={styles.toolbar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                {isStudent ? (
                  <div className={styles.categoryFilterContainer}>
                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'MY_DAYS' ? styles.categoryTabBtnActiveMyDays : ''
                      }`}
                      onClick={() => setDayCategory('MY_DAYS')}
                    >
                      <Sparkles size={14} color={dayCategory === 'MY_DAYS' ? '#2563eb' : '#64748b'} />
                      <span>⭐ Faqat mening dars kunlarim ({studentDaysLabel})</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'ALL' ? styles.categoryTabBtnActiveAll : ''
                      }`}
                      onClick={() => setDayCategory('ALL')}
                    >
                      <span>Barcha haftalik kunlar</span>
                    </button>
                  </div>
                ) : (
                  <div className={styles.categoryFilterContainer}>
                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'ALL' ? styles.categoryTabBtnActiveAll : ''
                      }`}
                      onClick={() => setDayCategory('ALL')}
                    >
                      <span>Barcha kunlar</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'ODD' ? styles.categoryTabBtnActiveOdd : ''
                      }`}
                      onClick={() => setDayCategory('ODD')}
                    >
                      <span>🟢 Toq kunlar</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.categoryTabBtn} ${
                        dayCategory === 'EVEN' ? styles.categoryTabBtnActiveEven : ''
                      }`}
                      onClick={() => setDayCategory('EVEN')}
                    >
                      <span>🟣 Juft kunlar</span>
                    </button>
                  </div>
                )}

                <div className={styles.searchBox}>
                  <Search size={16} color="var(--text-muted)" />
                  <input
                    type="text"
                    placeholder="Darslar bo'yicha qidirish..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className={styles.searchInput}
                  />
                </div>
              </div>

              {loading ? (
                <Loader text="Darslar yuklanmoqda..." />
              ) : (
                <>
                  <Table
                    columns={columns}
                    data={paginatedItems}
                    emptyMessage="Hozircha ma'lumotlar mavjud emas"
                  />
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredItems.length / pageSize) || 1}
                    totalItems={filteredItems.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {(viewMode === 'CREATE' || viewMode === 'EDIT') && canManage && (
        <>
          <Header
            title={viewMode === 'CREATE' ? 'Yangi Dars Yaratish' : 'Darsni Tahrirlash'}
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
                <Select
                  label="Guruh *"
                  name="group_id"
                  value={formData.group_id || ''}
                  onChange={(e) => handleGroupSelect(e.target.value)}
                  options={[
                    { value: '', label: 'Guruhni tanlang' },
                    ...(scopedGroups || []).map((g) => ({
                      value: g.id,
                      label: `${g.name} (${g.days === 'odd' ? 'Toq kunlar' : g.days === 'even' ? 'Juft kunlar' : g.days || 'Har kuni'})`,
                    })),
                  ]}
                  required={true}
                />

                <Select
                  label="O'qituvchi"
                  name="teacher_id"
                  value={formData.teacher_id || ''}
                  onChange={handleChange}
                  options={[
                    { value: '', label: "O'qituvchini tanlang (Ixtiyoriy)" },
                    ...(scopedTeachers || []).map((t) => ({
                      value: t.id,
                      label: `${t.user?.full_name || `O'qituvchi #${t.id}`} (${t.specialization || 'Fan'})`,
                    })),
                  ]}
                  required={false}
                />

                <Select
                  label="Dars Kunlari (Toq / Juft) *"
                  name="days_type"
                  value={formData.days_type || 'odd'}
                  onChange={(e) => {
                    const val = e.target.value;
                    const nextDate = getNextDateForDaysType(val);
                    setFormData((prev) => ({
                      ...prev,
                      days_type: val,
                      lesson_date: nextDate,
                    }));
                  }}
                  options={[
                    { value: 'odd', label: 'Toq kunlar (Dushanba, Chorshanba, Juma)' },
                    { value: 'even', label: 'Juft kunlar (Seshanba, Payshanba, Shanba)' },
                  ]}
                  required={true}
                />

                <Inputs
                  label="Boshlanish Vaqti (HH:MM)"
                  name="start_time"
                  type="text"
                  as="input"
                  value={formData.start_time || ''}
                  onChange={handleChange}
                  placeholder="14:00"
                  required={false}
                />

                <Inputs
                  label="Tugash Vaqti (HH:MM)"
                  name="end_time"
                  type="text"
                  as="input"
                  value={formData.end_time || ''}
                  onChange={handleChange}
                  placeholder="16:00"
                  required={false}
                />
              </div>

              {/* O'qituvchining dars jadvali va band bo'lgan kunlari/soatlari */}
              {selectedTeacherId && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px 20px',
                  marginTop: 18,
                  marginBottom: 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CalendarIcon size={18} color="#2563eb" />
                      <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                        {selectedTeacherObj?.user?.full_name || `O'qituvchi #${selectedTeacherId}`} ning band dars jadvali:
                      </span>
                    </div>
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Admin o'qituvchining bo'sh soatlariga qarab vaqt belgilashi mumkin
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    {/* 🟢 Toq kunlar */}
                    <div style={{
                      backgroundColor: formData.days_type === 'odd' ? '#f0fdf4' : '#ffffff',
                      border: formData.days_type === 'odd' ? '1.5px solid #86efac' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                          🟢 Toq kunlar (Dushanba, Chorshanba, Juma)
                        </span>
                        {formData.days_type === 'odd' && (
                          <span style={{ fontSize: 10, backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            Tanlangan kun
                          </span>
                        )}
                      </div>
                      {teacherScheduleOverview.odd.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#16a34a', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={14} /> Toq kunlarda barcha vaqtlar bo'sh
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {teacherScheduleOverview.odd.map((item, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #dcfce7',
                              borderRadius: 6,
                              fontSize: 12,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={13} color="#16a34a" />
                                <strong style={{ color: '#0f172a' }}>{item.timeStr}</strong>
                              </div>
                              <span style={{ color: '#475569', fontWeight: 500 }}>
                                {item.name} {item.classroom ? `(${item.classroom})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 🟣 Juft kunlar */}
                    <div style={{
                      backgroundColor: formData.days_type === 'even' ? '#fdf2f8' : '#ffffff',
                      border: formData.days_type === 'even' ? '1.5px solid #f472b6' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '12px 14px',
                      transition: 'all 0.2s',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#9d174d' }}>
                          🟣 Juft kunlar (Seshanba, Payshanba, Shanba)
                        </span>
                        {formData.days_type === 'even' && (
                          <span style={{ fontSize: 10, backgroundColor: '#fce7f3', color: '#be185d', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                            Tanlangan kun
                          </span>
                        )}
                      </div>
                      {teacherScheduleOverview.even.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#be185d', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Sparkles size={14} /> Juft kunlarda barcha vaqtlar bo'sh
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {teacherScheduleOverview.even.map((item, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '6px 10px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #fce7f3',
                              borderRadius: 6,
                              fontSize: 12,
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Clock size={13} color="#db2777" />
                                <strong style={{ color: '#0f172a' }}>{item.timeStr}</strong>
                              </div>
                              <span style={{ color: '#475569', fontWeight: 500 }}>
                                {item.name} {item.classroom ? `(${item.classroom})` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tezkor vaqt slotlari */}
                  <div style={{ marginTop: 14, paddingTop: 10, borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Tezkor bo'sh vaqtni tanlash:</span>
                    {[
                      { start: '08:00', end: '10:00', label: '08:00 - 10:00' },
                      { start: '10:00', end: '12:00', label: '10:00 - 12:00' },
                      { start: '14:00', end: '16:00', label: '14:00 - 16:00' },
                      { start: '16:00', end: '18:00', label: '16:00 - 18:00' },
                      { start: '18:00', end: '20:00', label: '18:00 - 20:00' },
                    ].map((slot, i) => {
                      const sM = timeToMinutes(slot.start);
                      const eM = timeToMinutes(slot.end);
                      const currSchedule = formData.days_type === 'even' ? teacherScheduleOverview.even : teacherScheduleOverview.odd;
                      const isBusy = currSchedule.some((item) => {
                        if (String(item.id) === String(formData.group_id) && viewMode === 'EDIT') return false;
                        const sT = timeToMinutes(item.start);
                        const eT = timeToMinutes(item.end);
                        return sT !== null && eT !== null && sM < eT && eM > sT;
                      });
                      const isSelected = formData.start_time === slot.start && formData.end_time === slot.end;

                      return (
                        <button
                          key={i}
                          type="button"
                          disabled={isBusy}
                          onClick={() => setFormData((prev) => ({ ...prev, start_time: slot.start, end_time: slot.end }))}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: isBusy ? 'not-allowed' : 'pointer',
                            border: isSelected ? '1.5px solid #2563eb' : isBusy ? '1px solid #fca5a5' : '1px solid #cbd5e1',
                            backgroundColor: isSelected ? '#2563eb' : isBusy ? '#fee2e2' : '#ffffff',
                            color: isSelected ? '#ffffff' : isBusy ? '#991b1b' : '#334155',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            opacity: isBusy ? 0.7 : 1,
                          }}
                        >
                          {slot.label} {isBusy ? '(Band)' : isSelected ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Real-time to'qnashuv (Conflict) haqida ogohlantirish */}
              {teacherConflict && (
                <div style={{
                  backgroundColor: '#fef2f2',
                  border: '1.5px solid #ef4444',
                  borderRadius: 12,
                  padding: '14px 18px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  color: '#991b1b',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.1)',
                }}>
                  <AlertTriangle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14, display: 'block', marginBottom: 4, color: '#b91c1c' }}>
                      ⚠️ Diqqat: Darslar vaqt to'qnashuvi (Conflict) aniqlandi!
                    </strong>
                    <span style={{ fontSize: 13, lineHeight: '1.5', color: '#7f1d1d' }}>
                      O'qituvchining <strong>{teacherConflict.dayLabel}</strong> soat <strong>{teacherConflict.timeStr}</strong> da boshqa guruhi/darsi mavjud: 
                      <strong style={{ color: '#0f172a' }}> "{teacherConflict.groupName}"</strong> {teacherConflict.classroom ? `(${teacherConflict.classroom})` : ''}.
                      <br />
                      Iltimos, o'qituvchining yuqorida ko'rsatilgan bo'sh soatlaridan birini tanlang!
                    </span>
                  </div>
                </div>
              )}

              {!teacherConflict && formData.start_time && formData.end_time && selectedTeacherId && (
                <div style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  borderRadius: 10,
                  padding: '10px 16px',
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: '#15803d',
                  fontSize: 13,
                  fontWeight: 500,
                }}>
                  <Sparkles size={16} color="#16a34a" />
                  <span>O'qituvchi tanlangan vaqtda bo'sh ({formData.start_time} - {formData.end_time}) va dars yaratish mumkin!</span>
                </div>
              )}

              {/* Guruhga biriktirilgan xonani avtomatik ko'rsatish */}
              {formData.group_id && (
                <div style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '12px 18px',
                  marginTop: 18,
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  color: '#475569',
                  fontSize: 14,
                }}>
                  <DoorOpen size={18} color="#2563eb" />
                  <span>
                    Guruhga biriktirilgan xona: <strong style={{ color: '#0f172a' }}>
                      {classrooms.find((c) => String(c.id) === String(formData.classroom_id))?.name || (formData.classroom_id ? `Xona #${formData.classroom_id}` : "Guruh xonasi avtomatik biriktirildi")}
                    </strong>
                  </span>
                </div>
              )}

              <div className={styles.formActions}>
                <Button variant="outline" onClick={() => setViewMode('LIST')}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  {viewMode === 'CREATE' ? 'Darsni Saqlash' : 'O\'zgarishlarni Saqlash'}
                </Button>
              </div>
            </form>
          </div>
        </>
      )}

      {viewMode === 'DETAILS' && (
        <>
          <Header
            title="Dars Ma'lumotlari"
            subtitle="Tanlangan dars bo'yicha to'liq ko'rinish"
            actions={
              <div style={{ display: 'flex', gap: 10 }}>
                {canManage && (
                  <Button
                    variant="primary"
                    icon={Edit2}
                    onClick={() => selectedItem && handleOpenEdit(selectedItem)}
                  >
                    Tahrirlash
                  </Button>
                )}
                <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
                  Orqaga
                </Button>
              </div>
            }
          />

          {(() => {
            const activeDetailItem = selectedItem || fallbackSelectedItem;
            const targetGroup = (groups || []).find(
              (g) => String(g.id) === String(activeDetailItem?.group_id) ||
                     (activeDetailItem?.course_id && String(g.course_id) === String(activeDetailItem?.course_id)) ||
                     (activeDetailItem?.course?.id && String(g.course_id) === String(activeDetailItem?.course?.id))
            ) || activeDetailItem?.group;

            const targetTeacher = (teachers || []).find(
              (t) => String(t.id) === String(activeDetailItem?.teacher_id || targetGroup?.teacher_id) ||
                     String(t.user_id) === String(activeDetailItem?.teacher_id || targetGroup?.teacher_id)
            ) || activeDetailItem?.teacher || targetGroup?.teacher;

            const teacherFullName = targetTeacher?.user?.full_name || targetTeacher?.full_name || targetTeacher?.name || '—';

            const targetClassroom = (classrooms || []).find(
              (c) => String(c.id) === String(activeDetailItem?.classroom_id || targetGroup?.classroom_id)
            ) || activeDetailItem?.classroom || targetGroup?.classroom;

            const classroomDisplayName = targetClassroom?.name ||
              (activeDetailItem?.classroom_id ? `Xona #${activeDetailItem.classroom_id}` :
               (targetGroup?.classroom_id ? `Xona #${targetGroup.classroom_id}` : '—'));

            const courseName = activeDetailItem?.course?.name ||
              (courses || []).find((c) => String(c.id) === String(activeDetailItem?.course_id || targetGroup?.course_id))?.name ||
              activeDetailItem?.title ||
              '—';

            return (
              <div className={styles.card}>
                {loading ? (
                  <Loader text="Ma'lumotlar yuklanmoqda..." />
                ) : activeDetailItem ? (
                  <>
                    <div className={styles.detailsGrid}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Turi</span>
                        <span className={styles.detailValue}>
                          {activeDetailItem.isCourse ? '📘 Kurs Jadvali' : 'Guruh Darsi'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Dars / Kurs Nomi</span>
                        <span className={styles.detailValue}>{activeDetailItem.topic || activeDetailItem.title || '—'}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Guruh</span>
                        <span className={styles.detailValue}>
                          {targetGroup?.name || activeDetailItem.group?.name || '—'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>O'qituvchi</span>
                        <span className={styles.detailValue}>
                          {teacherFullName}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Dars Sanasi / Kunlari</span>
                        <span className={styles.detailValue}>
                          {activeDetailItem.displayDate || activeDetailItem.lesson_date || activeDetailItem.days || targetGroup?.days || '—'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Vaqti</span>
                        <span className={styles.detailValue}>
                          {activeDetailItem.start_time || targetGroup?.start_time || '10:00'} - {activeDetailItem.end_time || targetGroup?.end_time || '12:00'}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Xona</span>
                        <span className={styles.detailValue}>
                          {classroomDisplayName}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Holati</span>
                        <span className={styles.detailValue}>{activeDetailItem.status || 'Rejalashtirilgan'}</span>
                      </div>
                    </div>

                    {/* Tegishli bo'limlar bilan bog'lanish */}
                    <div className={styles.relatedSection}>
                      <h4 className={styles.relatedTitle}>
                        <ExternalLink size={16} color="#2563eb" />
                        <span>Tegishli bo'limlarga tezkor o'tish</span>
                      </h4>
                      <div className={styles.relatedGrid}>
                        <div
                          className={styles.relatedCard}
                          onClick={() => navigate('/groups')}
                          title="Guruhlar bo'limiga o'tish"
                        >
                          <div className={styles.relatedCardLeft}>
                            <div className={styles.relatedCardIcon} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                              <UsersIcon size={16} />
                            </div>
                            <div className={styles.relatedCardTexts}>
                              <span className={styles.relatedCardLabel}>Guruh</span>
                              <span className={styles.relatedCardValue}>{targetGroup?.name || 'Guruhlar'}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>

                        <div
                          className={styles.relatedCard}
                          onClick={() => navigate('/courses')}
                          title="Kurslar bo'limiga o'tish"
                        >
                          <div className={styles.relatedCardLeft}>
                            <div className={styles.relatedCardIcon} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                              <BookOpen size={16} />
                            </div>
                            <div className={styles.relatedCardTexts}>
                              <span className={styles.relatedCardLabel}>Kurs</span>
                              <span className={styles.relatedCardValue}>{courseName}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>

                        <div
                          className={styles.relatedCard}
                          onClick={() => navigate('/teachers')}
                          title="O'qituvchilar bo'limiga o'tish"
                        >
                          <div className={styles.relatedCardLeft}>
                            <div className={styles.relatedCardIcon} style={{ backgroundColor: '#faf5ff', color: '#7e22ce' }}>
                              <GraduationCap size={16} />
                            </div>
                            <div className={styles.relatedCardTexts}>
                              <span className={styles.relatedCardLabel}>O'qituvchi</span>
                              <span className={styles.relatedCardValue}>{teacherFullName}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>

                        <div
                          className={styles.relatedCard}
                          onClick={() => navigate('/classrooms')}
                          title="Xonalar bo'limiga o'tish"
                        >
                          <div className={styles.relatedCardLeft}>
                            <div className={styles.relatedCardIcon} style={{ backgroundColor: '#fffbeb', color: '#d97706' }}>
                              <DoorOpen size={16} />
                            </div>
                            <div className={styles.relatedCardTexts}>
                              <span className={styles.relatedCardLabel}>Xona</span>
                              <span className={styles.relatedCardValue}>{classroomDisplayName}</span>
                            </div>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>

                        <div
                          className={styles.relatedCard}
                          onClick={() => navigate('/attendance')}
                          title="Davomat bo'limiga o'tish"
                        >
                          <div className={styles.relatedCardLeft}>
                            <div className={styles.relatedCardIcon} style={{ backgroundColor: '#e0f2fe', color: '#0284c7' }}>
                              <CheckSquare size={16} />
                            </div>
                            <div className={styles.relatedCardTexts}>
                              <span className={styles.relatedCardLabel}>Davomat</span>
                              <span className={styles.relatedCardValue}>Dars davomati</span>
                            </div>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>

                        <div
                          className={styles.relatedCard}
                          onClick={() => navigate('/students')}
                          title="Talabalar bo'limiga o'tish"
                        >
                          <div className={styles.relatedCardLeft}>
                            <div className={styles.relatedCardIcon} style={{ backgroundColor: '#fdf2f8', color: '#db2777' }}>
                              <UsersIcon size={16} />
                            </div>
                            <div className={styles.relatedCardTexts}>
                              <span className={styles.relatedCardLabel}>Talabalar</span>
                              <span className={styles.relatedCardValue}>Talabalar ro'yxati</span>
                            </div>
                          </div>
                          <ChevronRight size={16} color="#94a3b8" />
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p>Ma'lumot topilmadi</p>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
};

export default Lessons;
