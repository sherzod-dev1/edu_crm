import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchAttendances } from '../../store/slices/attendanceSlice';
import groupApi from '../../services/groupApi';
import studentApi from '../../services/studentApi';
import groupStudentApi from '../../services/groupStudentApi';
import lessonApi from '../../services/lessonApi';
import teacherApi from '../../services/teacherApi';
import attendanceApi from '../../services/attendanceApi';
import { Breadcrumbs } from '../../layout';
import { Loader } from '../../components';
import TeacherAttendanceSection from './TeacherAttendanceSection';
import styles from './attendance.module.css';
import { GiTeacher } from 'react-icons/gi';
import {
  Check,
  CheckCircle2,
  X,
  Layers,
  Search,
  Users,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Sparkles,
  BookOpen,
  MapPin,
  Lock,
  CalendarCheck,
  UserPlus,
  GraduationCap,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'TL';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const UZ_DAYS_SHORT = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Shan'];

// Helper to determine active schedule days of week [0=Sun, 1=Mon, ..., 6=Sat]
const getGroupScheduleDays = (group) => {
  if (!group) return [1, 3, 5]; // Default Du-Chor-Jum
  const dStr = String(group.days || '').toLowerCase().trim();

  if (dStr.includes('har') || dStr.includes('daily') || dStr.includes('barcha')) {
    return [1, 2, 3, 4, 5, 6];
  }

  const days = [];
  if (dStr.includes('du') || dStr.includes('mon')) days.push(1);
  if (dStr.includes('se') || dStr.includes('tue')) days.push(2);
  if (dStr.includes('chor') || dStr.includes('wed')) days.push(3);
  if (dStr.includes('pay') || dStr.includes('thu')) days.push(4);
  if (
    dStr.includes('jum') ||
    dStr.includes('fri') ||
    dStr.includes('-ju') ||
    dStr.includes('ju-') ||
    dStr.endsWith('ju') ||
    (dStr.includes('ju') && !dStr.includes('juft'))
  ) {
    days.push(5);
  }
  if (dStr.includes('shan') || dStr.includes('sat')) days.push(6);

  if (days.length === 0) {
    if (dStr.includes('juft') || dStr.includes('even')) return [2, 4, 6];
    return [1, 3, 5];
  }
  return days;
};

const Attendance = ({ defaultTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});

  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isTeacher = userRole === 'TEACHER';
  const isStudent = userRole === 'STUDENT';
  const canSeeTeacherAttendance = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR', 'ACCOUNTANT', 'BUXGALTER', 'STAFF'].includes(userRole);

  const isTeacherRoute = location.pathname.includes('/teacher-attendance');
  const activeMainTab = (!canSeeTeacherAttendance)
    ? 'students'
    : isTeacherRoute
      ? 'teachers'
      : (searchParams.get('tab') === 'teachers' || defaultTab === 'teachers' ? 'teachers' : 'students');

  useEffect(() => {
    if (!canSeeTeacherAttendance && isTeacherRoute) {
      navigate('/attendance', { replace: true });
    }
  }, [canSeeTeacherAttendance, isTeacherRoute, navigate]);

  useEffect(() => {
    const gParam = searchParams.get('group_id');
    if (gParam) {
      setSelectedGroupId(String(gParam));
    }
  }, [searchParams]);

  const { loading: attendanceLoading, items: savedAttendances } = useSelector(
    (state) => state.attendance || {}
  );

  const [isLoading, setIsLoading] = useState(true);
  const [groupsList, setGroupsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');

  const [studentsList, setStudentsList] = useState([]);
  const [groupStudentsList, setGroupStudentsList] = useState([]);
  const [lessonsList, setLessonsList] = useState([]);

  // Attendance matrix: { [`${studentId}_${dateKey}`]: 'K' | 'Y' | 'S' | '' }
  const [attendanceMatrix, setAttendanceMatrix] = useState({});
  const [activePickerKey, setActivePickerKey] = useState(null);
  const [isSavedToast, setIsSavedToast] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Date Filter Mode: 'all' (default, displays full group schedule window) or 'up_to_today'
  const [dateFilterMode, setDateFilterMode] = useState('all');

  // Pagination / Windowing for Dates
  const [windowStartIdx, setWindowStartIdx] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState('');
  const [showAllDates, setShowAllDates] = useState(false);
  const WINDOW_SIZE = 6;

  // Local accurate representation of today's date
  const todayObj = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return {
      year,
      month,
      day,
      iso: `${year}-${month}-${day}`, // e.g. "2026-10-15"
      formatted: `${day}.${month}`,   // e.g. "15.10"
    };
  }, []);

  // Load all foundational data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      dispatch(fetchAttendances());

      const [resGroups, resStudents, resGroupStudents, resLessons, resTeachers] = await Promise.all([
        groupApi.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        studentApi.getAll({ limit: 300 }).catch(() => ({ data: [] })),
        groupStudentApi.getAll({ limit: 500 }).catch(() => ({ data: [] })),
        lessonApi.getAll({ limit: 500 }).catch(() => ({ data: [] })),
        teacherApi.getAll({ limit: 200 }).catch(() => ({ data: [] })),
      ]);

      const gList = resGroups.data?.data || (Array.isArray(resGroups.data) ? resGroups.data : []);
      const sList = resStudents.data?.data || (Array.isArray(resStudents.data) ? resStudents.data : []);
      const gsList = resGroupStudents.data?.data || (Array.isArray(resGroupStudents.data) ? resGroupStudents.data : []);
      const lList = resLessons.data?.data || (Array.isArray(resLessons.data) ? resLessons.data : []);
      const tList = resTeachers.data?.data || (Array.isArray(resTeachers.data) ? resTeachers.data : []);

      setGroupsList(gList);
      setStudentsList(sList);
      setGroupStudentsList(gsList);
      setLessonsList(lList);
      setTeachersList(tList);

      // Select group from URL query if present, otherwise default to first group
      const queryGroupId = searchParams.get('group_id');
      if (queryGroupId && gList.some((g) => String(g.id) === String(queryGroupId))) {
        setSelectedGroupId(String(queryGroupId));
      } else if (gList.length > 0 && !selectedGroupId) {
        setSelectedGroupId(String(gList[0].id));
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  // Current teacher object identification

  const currentTeacher = useMemo(() => {
    if (!isTeacher) return null;
    return (
      (teachersList || []).find((t) => {
        if (user?.teacher_id && String(t.id) === String(user.teacher_id)) return true;
        if (t.user_id && String(t.user_id) === String(user?.id)) return true;
        if (t.user?.id && String(t.user.id) === String(user?.id)) return true;
        if (user?.email && (t.email === user.email || t.user?.email === user.email)) return true;
        if (user?.phone && (t.phone === user.phone || t.user?.phone === user.phone)) return true;
        const tName = (t.full_name || t.name || t.user?.full_name || '').toLowerCase().trim();
        const uName = (user?.full_name || '').toLowerCase().trim();
        return tName && uName && (tName.includes(uName) || uName.includes(tName));
      }) || null
    );
  }, [isTeacher, teachersList, user]);

  const currentTeacherId = currentTeacher?.id || user?.teacher_id;
  const currentTeacherUserId = currentTeacher?.user_id || currentTeacher?.user?.id || user?.id;

  const isTeacherGroup = (group) => {
    if (!isTeacher) return true;
    if (!group) return false;

    // Direct teacher_id match on group
    if (currentTeacherId && String(group.teacher_id) === String(currentTeacherId)) return true;
    if (currentTeacherUserId && String(group.teacher_id) === String(currentTeacherUserId)) return true;

    // Nested teacher object on group
    if (group.teacher) {
      if (currentTeacherId && String(group.teacher.id) === String(currentTeacherId)) return true;
      if (
        currentTeacherUserId &&
        (String(group.teacher.user_id) === String(currentTeacherUserId) ||
          String(group.teacher.user?.id) === String(currentTeacherUserId))
      ) {
        return true;
      }
      const tName = (
        group.teacher.full_name ||
        group.teacher.name ||
        group.teacher.user?.full_name ||
        ''
      )
        .toLowerCase()
        .trim();
      const uName = (user?.full_name || '').toLowerCase().trim();
      if (tName && uName && (tName.includes(uName) || uName.includes(tName))) return true;
    }

    // Check if any scheduled lesson in this group is taught by this teacher
    const hasTeacherLesson = lessonsList.some((l) => {
      if (String(l.group_id) !== String(group.id)) return false;
      if (currentTeacherId && String(l.teacher_id) === String(currentTeacherId)) return true;
      if (currentTeacherUserId && String(l.teacher_id) === String(currentTeacherUserId)) return true;
      if (l.teacher) {
        if (currentTeacherId && String(l.teacher.id) === String(currentTeacherId)) return true;
        if (
          currentTeacherUserId &&
          (String(l.teacher.user_id) === String(currentTeacherUserId) ||
            String(l.teacher.user?.id) === String(currentTeacherUserId))
        ) {
          return true;
        }
      }
      return false;
    });

    return hasTeacherLesson;
  };

  // Filter groups for current branch (and strictly for current teacher if role is TEACHER)
  const branchGroups = useMemo(() => {
    const userBranchId = user?.branch_id || 6;
    let list = groupsList.filter(
      (g) => !g.branch_id || String(g.branch_id) === String(userBranchId)
    );
    if (isTeacher) {
      list = list.filter((g) => isTeacherGroup(g));
    }
    return list;
  }, [groupsList, user, isTeacher, currentTeacherId, currentTeacherUserId, lessonsList]);

  // Ensure a valid selected group
  useEffect(() => {
    if (branchGroups.length > 0) {
      const exists = branchGroups.some((g) => String(g.id) === String(selectedGroupId));
      if (!exists) {
        setSelectedGroupId(String(branchGroups[0].id));
      }
    } else {
      setSelectedGroupId('');
    }
  }, [branchGroups, selectedGroupId]);

  // Selected Group object
  const selectedGroup = useMemo(() => {
    return (
      branchGroups.find((g) => String(g.id) === String(selectedGroupId)) ||
      branchGroups[0] ||
      null
    );
  }, [branchGroups, selectedGroupId]);

  // Filtered groups by search query
  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return branchGroups;
    const q = groupSearchQuery.toLowerCase().trim();
    return branchGroups.filter((g) => {
      const gName = String(g.name || '').toLowerCase();
      const cName = String(g.course?.name || '').toLowerCase();
      const tName = String(g.teacher?.user?.full_name || g.teacher?.name || '').toLowerCase();
      return gName.includes(q) || cName.includes(q) || tName.includes(q);
    });
  }, [branchGroups, groupSearchQuery]);

  // Student Enrollment Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollStudentId, setEnrollStudentId] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Helper to accurately get student count for any group
  const getGroupStudentsCount = (grp) => {
    if (!grp) return 0;
    const seenIds = new Set();
    if (Array.isArray(grp.group_students)) {
      grp.group_students.forEach((gs) => {
        const sid = gs.student_id || gs.student?.id;
        if (sid) seenIds.add(String(sid));
      });
    }
    groupStudentsList.forEach((gs) => {
      if (String(gs.group_id) === String(grp.id)) {
        const sid = gs.student_id || gs.student?.id;
        if (sid) seenIds.add(String(sid));
      }
    });
    studentsList.forEach((s) => {
      if (String(s.group_id) === String(grp.id) && s.id) {
        seenIds.add(String(s.id));
      }
    });
    return seenIds.size > 0 ? seenIds.size : (grp.students_count || 0);
  };

  // STRICTLY STUDENTS ENROLLED IN THE SELECTED GROUP (NO FALLBACK TO ALL STUDENTS!)
  const groupStudents = useMemo(() => {
    if (!selectedGroup) return [];

    const result = [];
    const seenIds = new Set();

    const addStudent = (st, sid) => {
      const id = String(sid || st?.id || '');
      if (!id || id === 'undefined' || seenIds.has(id)) return;
      seenIds.add(id);
      // Merge with full student details from studentsList if available
      const fullSt = studentsList.find((s) => String(s.id) === id);
      const merged = fullSt
        ? { ...fullSt, ...(st || {}), user: fullSt.user || st?.user }
        : st;
      if (merged) result.push(merged);
    };

    // 1. Check selectedGroup.group_students
    if (Array.isArray(selectedGroup.group_students)) {
      selectedGroup.group_students.forEach((gs) => {
        addStudent(gs.student, gs.student_id || gs.student?.id);
      });
    }

    // 2. Check groupStudentsList for this group
    groupStudentsList.forEach((gs) => {
      if (String(gs.group_id) === String(selectedGroup.id)) {
        addStudent(gs.student, gs.student_id || gs.student?.id);
      }
    });

    // 3. Check studentsList for direct group_id match
    studentsList.forEach((s) => {
      if (String(s.group_id) === String(selectedGroup.id)) {
        addStudent(s, s.id);
      }
    });

    return result;
  }, [selectedGroup, groupStudentsList, studentsList]);

  // Available students not yet enrolled in the selected group
  const availableStudents = useMemo(() => {
    const enrolledIds = new Set(groupStudents.map((s) => String(s.id)));
    return (studentsList || []).filter((s) => !enrolledIds.has(String(s.id)));
  }, [studentsList, groupStudents]);

  // Open modal to enroll a student
  const handleOpenEnrollModal = () => {
    setEnrollStudentId(availableStudents[0]?.id ? String(availableStudents[0].id) : '');
    setEnrollError('');
    setIsEnrollModalOpen(true);
  };

  // Save student enrollment to group
  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollStudentId) {
      setEnrollError('Iltimos, talabani tanlang!');
      return;
    }
    if (!selectedGroup?.id) {
      setEnrollError('Guruh tanlanmagan!');
      return;
    }
    setIsEnrolling(true);
    setEnrollError('');
    try {
      await groupStudentApi.create({
        group_id: Number(selectedGroup.id),
        student_id: Number(enrollStudentId),
        status: 'active',
      });
      // Also sync student group_id
      await studentApi.update(Number(enrollStudentId), {
        group_id: Number(selectedGroup.id),
        status: 'active',
      }).catch(() => {});

      setIsEnrollModalOpen(false);
      setEnrollStudentId('');
      await loadAllData();
    } catch (err) {
      setEnrollError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Dynamically compute lesson dates for selected group strictly starting from opening_date
  const allGroupDates = useMemo(() => {
    if (!selectedGroup) return [];

    const groupStartStr = selectedGroup.opening_date
      ? String(selectedGroup.opening_date).split('T')[0]
      : selectedGroup.start_date
      ? String(selectedGroup.start_date).split('T')[0]
      : null;

    // 1. If explicit lessons exist in DB for this group, use them (strictly exclude Sundays & lessons before opening_date)
    const groupLessons = lessonsList
      .filter((l) => {
        if (String(l.group_id) !== String(selectedGroup.id) || !l.lesson_date) return false;
        if (groupStartStr && l.lesson_date < groupStartStr) return false;
        const [ly, lm, ld] = String(l.lesson_date).split('-').map(Number);
        if (ly && lm && ld) {
          const dObj = new Date(ly, lm - 1, ld);
          return dObj.getDay() !== 0; // Exclude Sunday
        }
        return true;
      })
      .sort((a, b) => new Date(a.lesson_date) - new Date(b.lesson_date));

    if (groupLessons.length >= 3) {
      return groupLessons.map((l, idx) => {
        const [ly, lm, ld] = String(l.lesson_date).split('-').map(Number);
        const d = new Date(ly, lm - 1, ld);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dateStr = `${day}.${month}`;
        const dayOfWeek = d.getDay();
        const isToday = l.lesson_date === todayObj.iso || dateStr === todayObj.formatted;
        const isPast = l.lesson_date < todayObj.iso;
        const isFuture = l.lesson_date > todayObj.iso && !isToday;

        return {
          key: `lesson_${l.id || idx}`,
          id: l.id,
          lessonId: l.id,
          dateStr,
          dayName: UZ_DAYS_SHORT[dayOfWeek],
          fullDate: l.lesson_date,
          isToday,
          isPast,
          isFuture,
          lessonNumber: idx + 1,
        };
      });
    }

    // 2. Fallback: Generate calendar dates strictly based on group schedule (strictly exclude Sundays) starting from opening_date
    const scheduleDays = getGroupScheduleDays(selectedGroup).filter((d) => d !== 0);
    const durationMonths = Number(selectedGroup.course?.duration_months || 2);
    const targetCount = Math.max(12, Math.min(durationMonths * 12, 36));
    const generatedDates = [];

    let curDate;
    if (groupStartStr) {
      const [sy, sm, sd] = groupStartStr.split('-').map(Number);
      curDate = new Date(sy, sm - 1, sd);
    } else {
      curDate = new Date(todayObj.year, Number(todayObj.month) - 1, 1);
    }

    let loopGuard = 0;
    while (generatedDates.length < targetCount && loopGuard < 200) {
      loopGuard++;
      const dayOfWeek = curDate.getDay();
      if (dayOfWeek !== 0 && scheduleDays.includes(dayOfWeek)) {
        const y = curDate.getFullYear();
        const m = String(curDate.getMonth() + 1).padStart(2, '0');
        const d = String(curDate.getDate()).padStart(2, '0');
        const dateStr = `${d}.${m}`;
        const isoDate = `${y}-${m}-${d}`;
        const isToday = isoDate === todayObj.iso || dateStr === todayObj.formatted;
        const isPast = isoDate < todayObj.iso;
        const isFuture = isoDate > todayObj.iso && !isToday;

        generatedDates.push({
          key: `date_${isoDate}`,
          id: isoDate,
          lessonId: null,
          dateStr,
          dayName: UZ_DAYS_SHORT[dayOfWeek],
          fullDate: isoDate,
          isToday,
          isPast,
          isFuture,
          lessonNumber: generatedDates.length + 1,
        });
      }
      curDate.setDate(curDate.getDate() + 1);
    }

    return generatedDates;
  }, [selectedGroup, lessonsList, todayObj]);

  // Clean up any future date marks from attendanceMatrix
  useEffect(() => {
    setAttendanceMatrix((prev) => {
      let hasFuture = false;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        const dateKey = key.split('_').slice(1).join('_');
        const matched = allGroupDates.find((d) => d.key === dateKey);
        if (matched && matched.isFuture) {
          delete next[key];
          hasFuture = true;
        }
      });
      return hasFuture ? next : prev;
    });
  }, [allGroupDates]);

  // Filtered dates based on mode ('up_to_today' vs 'all')
  const activeDates = useMemo(() => {
    if (dateFilterMode === 'up_to_today') {
      const upToToday = allGroupDates.filter((d) => !d.isFuture);
      return upToToday.length > 0 ? upToToday : allGroupDates.slice(0, 1);
    }
    return allGroupDates;
  }, [allGroupDates, dateFilterMode]);

  // Visible window of dates
  const visibleDates = useMemo(() => {
    if (showAllDates || activeDates.length <= WINDOW_SIZE) {
      return activeDates;
    }
    return activeDates.slice(windowStartIdx, windowStartIdx + WINDOW_SIZE);
  }, [activeDates, windowStartIdx, showAllDates]);

  // Can navigate back / forward
  const canGoPrev = !showAllDates && windowStartIdx > 0;
  const canGoNext =
    !showAllDates &&
    (dateFilterMode === 'up_to_today'
      ? windowStartIdx + WINDOW_SIZE < activeDates.length || allGroupDates.length > activeDates.length
      : windowStartIdx + WINDOW_SIZE < allGroupDates.length);

  // Auto-center window and selected date to today or latest past date ONLY when group changes or loads initially
  const lastCenteredGroupIdRef = useRef(null);
  useEffect(() => {
    if (allGroupDates.length === 0 || !selectedGroupId) return;
    if (lastCenteredGroupIdRef.current === selectedGroupId) return;
    lastCenteredGroupIdRef.current = selectedGroupId;

    const todayIdx = allGroupDates.findIndex((d) => d.isToday);
    if (todayIdx !== -1) {
      setSelectedDateKey(allGroupDates[todayIdx].key);
      const newStart =
        todayIdx < WINDOW_SIZE
          ? 0
          : Math.max(0, Math.min(todayIdx - 2, allGroupDates.length - WINDOW_SIZE));
      setWindowStartIdx(newStart);
    } else {
      const pastDates = allGroupDates.filter((d) => !d.isFuture);
      const lastPastIdx = pastDates.length > 0 ? pastDates.length - 1 : 0;
      setSelectedDateKey(allGroupDates[lastPastIdx]?.key || allGroupDates[0]?.key);
      const newStart =
        lastPastIdx < WINDOW_SIZE
          ? 0
          : Math.max(0, lastPastIdx - WINDOW_SIZE + 1);
      setWindowStartIdx(newStart);
    }
  }, [allGroupDates, selectedGroupId]);

  // Close popover on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(`.${styles.cellWrapper}`)) {
        setActivePickerKey(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // Hydrate attendance from saved records (ONLY for past or today's dates)
  useEffect(() => {
    const list = Array.isArray(savedAttendances) ? savedAttendances : [];
    if (list.length === 0) return;

    setAttendanceMatrix((prev) => {
      const next = { ...prev };
      list.forEach((att) => {
        if (!att.student_id) return;
        const matchingDate = allGroupDates.find(
          (d) =>
            !d.isFuture &&
            ((att.lesson_id && String(d.lessonId) === String(att.lesson_id)) ||
              (att.lesson?.lesson_date && d.fullDate === att.lesson.lesson_date))
        );
        if (matchingDate) {
          const key = `${att.student_id}_${matchingDate.key}`;
          let statusChar = '';
          if (att.status === 'present') statusChar = 'K';
          else if (att.status === 'absent') statusChar = 'Y';
          else if (att.status === 'late' || att.status === 'excused') statusChar = 'S';
          if (statusChar && !next[key]) {
            next[key] = statusChar;
          }
        }
      });
      return next;
    });
  }, [savedAttendances, allGroupDates]);

  // Bulk mark all students for a specific date (STRICTLY ONLY FOR TODAY'S LESSON)
  const handleBulkMarkDate = (dateKey, status) => {
    const targetDate = allGroupDates.find((d) => d.key === dateKey);
    if (!targetDate || !targetDate.isToday) {
      return; // STRICTLY ONLY TODAY! O'tib ketgan yoki kelajakdagi darslarni o'zgartirib bo'lmaydi!
    }
    setAttendanceMatrix((prev) => {
      const next = { ...prev };
      groupStudents.forEach((st) => {
        next[`${st.id}_${dateKey}`] = status;
      });
      return next;
    });
  };

  // Bulk mark all students for today's lesson
  const handleBulkMarkSelectedDate = (status) => {
    const todayDate = allGroupDates.find((d) => d.isToday);
    if (!todayDate) return;
    handleBulkMarkDate(todayDate.key, status);
  };

  // Handle setting a single student's status (STRICTLY ONLY FOR TODAY'S LESSON)
  const handleSelectStatus = (studentId, dateKey, status) => {
    const targetDate = allGroupDates.find((d) => d.key === dateKey);
    if (!targetDate || !targetDate.isToday) {
      return; // STRICTLY ONLY TODAY! O'tib ketgan yoki kelajakdagi darslarni o'zgartirib bo'lmaydi!
    }
    const key = `${studentId}_${dateKey}`;
    setAttendanceMatrix((prev) => ({
      ...prev,
      [key]: status,
    }));
    setActivePickerKey(null);
  };

  // Live Statistics for the selected group (STRICTLY CALCULATED UP TO TODAY)
  const { presentPercent, absentPercent, latePercent, presentCount, absentCount, lateCount } =
    useMemo(() => {
      let totalMarked = 0;
      let present = 0;
      let absent = 0;
      let late = 0;

      // Only count lessons up to today!
      const pastOrTodayDates = allGroupDates.filter((d) => !d.isFuture);

      groupStudents.forEach((st) => {
        pastOrTodayDates.forEach((dateObj) => {
          const key = `${st.id}_${dateObj.key}`;
          const val = attendanceMatrix[key];
          if (val) {
            totalMarked++;
            if (val === 'K') present++;
            else if (val === 'Y') absent++;
            else if (val === 'S') late++;
          }
        });
      });

      if (totalMarked === 0) {
        return {
          presentPercent: 0,
          absentPercent: 0,
          latePercent: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
        };
      }

      const p = Math.round((present / totalMarked) * 100);
      const a = Math.round((absent / totalMarked) * 100);
      const l = Math.max(0, 100 - p - a);

      return {
        presentPercent: p,
        absentPercent: a,
        latePercent: l,
        presentCount: present,
        absentCount: absent,
        lateCount: late,
      };
    }, [groupStudents, allGroupDates, attendanceMatrix]);

  // Save Attendances (STRICTLY ONLY FOR TODAY'S LESSON)
  const handleSave = async () => {
    const todayDates = allGroupDates.filter((d) => d.isToday);
    if (todayDates.length === 0) {
      alert("Bugun ushbu guruhda dars kuni emas. Davomat faqat bugungi dars uchun saqlanadi.");
      return;
    }

    setIsSaving(true);
    try {
      const savePromises = [];

      groupStudents.forEach((st) => {
        todayDates.forEach((dateObj) => {
          if (!dateObj.lessonId) return;
          const key = `${st.id}_${dateObj.key}`;
          const val = attendanceMatrix[key];
          if (val) {
            let backendStatus = 'present';
            if (val === 'Y') backendStatus = 'absent';
            else if (val === 'S') backendStatus = 'late';

            savePromises.push(
              attendanceApi
                .create({
                  lesson_id: dateObj.lessonId,
                  student_id: st.id,
                  status: backendStatus,
                  marked_by: user?.id || null,
                })
                .catch(() => {})
            );
          }
        });
      });

      if (savePromises.length > 0) {
        await Promise.all(savePromises);
      }

      setIsSavedToast(true);
      setTimeout(() => {
        setIsSavedToast(false);
      }, 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handleJumpToToday = () => {
    const todayIdx = allGroupDates.findIndex((d) => d.isToday);
    if (todayIdx !== -1) {
      setSelectedDateKey(allGroupDates[todayIdx].key);
      const newStart =
        todayIdx < WINDOW_SIZE
          ? 0
          : Math.max(0, Math.min(todayIdx - 2, allGroupDates.length - WINDOW_SIZE));
      setWindowStartIdx(newStart);
    } else if (allGroupDates.length > 0) {
      const pastDates = allGroupDates.filter((d) => !d.isFuture);
      const lastIdx = pastDates.length > 0 ? pastDates.length - 1 : 0;
      setSelectedDateKey(allGroupDates[lastIdx]?.key || allGroupDates[0]?.key);
      const newStart =
        lastIdx < WINDOW_SIZE
          ? 0
          : Math.max(0, lastIdx - WINDOW_SIZE + 1);
      setWindowStartIdx(newStart);
    }
  };

  const handlePrevWindow = () => {
    setWindowStartIdx((prev) => Math.max(0, prev - WINDOW_SIZE));
  };

  const handleNextWindow = () => {
    if (dateFilterMode === 'up_to_today') {
      if (windowStartIdx + WINDOW_SIZE < activeDates.length) {
        setWindowStartIdx((prev) => prev + WINDOW_SIZE);
      } else if (allGroupDates.length > activeDates.length) {
        // Seamlessly switch to all dates mode and show upcoming lessons
        setDateFilterMode('all');
        const nextStart = Math.min(
          activeDates.length,
          Math.max(0, allGroupDates.length - WINDOW_SIZE)
        );
        setWindowStartIdx(nextStart);
      }
    } else {
      setWindowStartIdx((prev) =>
        Math.min(Math.max(0, allGroupDates.length - WINDOW_SIZE), prev + WINDOW_SIZE)
      );
    }
  };

  // Today's date object in group schedule
  const todayDateObj = allGroupDates.find((d) => d.isToday);
  const activeDateObj = todayDateObj || null;

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Davomat' }]} />

      {/* Main Header with Tabs on the right */}
      <div className={styles.headerWrapper}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.mainTitle}>
            {canSeeTeacherAttendance && activeMainTab === 'teachers'
              ? "O'qituvchilar Davomati"
              : isTeacher
                ? "Davomat (Talabalar Davomati)"
                : "Davomat"}
          </h1>
          <p className={styles.mainSubtitle}>
            {canSeeTeacherAttendance && activeMainTab === 'teachers'
              ? "O'qituvchilarning kunlik va oylik davomatini boshqarish"
              : isTeacher
                ? "Sizga biriktirilgan guruhlar bo'yicha talabalar davomatini olish va nazorat qilish"
                : "Guruhlar kesimida talabalar davomatini boshqarish va nazorat qilish"}
          </p>
        </div>

        {/* Main Tab Navigation - Faqat rahbarlar, buxgalter va nazoratchilar uchun */}
        {canSeeTeacherAttendance && (
          <div className={styles.mainTabsContainer}>
            <button
              type="button"
              className={`${styles.mainTabBtn} ${activeMainTab === 'students' ? styles.mainTabBtnActive : ''}`}
              onClick={() => {
                navigate('/attendance');
              }}
            >
              <GraduationCap size={17} />
              <span>Talabalar Davomati</span>
            </button>

            <button
              type="button"
              className={`${styles.mainTabBtn} ${activeMainTab === 'teachers' ? styles.mainTabBtnActive : ''}`}
              onClick={() => {
                navigate('/teacher-attendance');
              }}
            >
              <GiTeacher size={17} />
              <span>O'qituvchilar Davomati</span>
            </button>
          </div>
        )}
      </div>

      {canSeeTeacherAttendance && activeMainTab === 'teachers' ? (
        <TeacherAttendanceSection />
      ) : (
        <>
          {isSavedToast && (
            <div className={styles.toastSuccess}>
              <CheckCircle2 size={18} />
              <span>Davomat muvaffaqiyatli saqlandi!</span>
            </div>
          )}

      {/* ========================================================
          GURUHLAR KESIMI (GROUP SELECTOR SECTION)
          ======================================================== */}
      <div className={styles.groupSection}>
        <div className={styles.groupSectionHeader}>
          <div className={styles.groupSectionTitleGroup}>
            <div className={styles.groupSectionIcon}>
              <Layers size={20} />
            </div>
            <div>
              <h2 className={styles.groupSectionTitle}>
                {isTeacher ? "Mening guruhlarim" : "Guruhlar kesimi"}
              </h2>
              <span className={styles.groupSectionCount}>
                {isTeacher ? "Sizga biriktirilgan: " : "Jami "}
                {branchGroups.length} ta guruh mavjud · Kerakli guruhni tanlang
              </span>
            </div>
          </div>

          <div className={styles.groupSearchWrapper}>
            <Search size={16} className={styles.groupSearchIcon} />
            <input
              type="text"
              placeholder="Guruh yoki kursni qidirish..."
              className={styles.groupSearchInput}
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Group Cards Grid */}
        <div className={styles.groupCardsGrid}>
          {filteredGroups.length === 0 ? (
            <div className={styles.emptyGroupsBox}>
              <p>
                {isTeacher
                  ? "Sizga biriktirilgan faol guruhlar topilmadi."
                  : "Guruhlar topilmadi."}
              </p>
            </div>
          ) : (
            filteredGroups.map((grp) => {
              const isCurrentSelected = String(grp.id) === String(selectedGroupId);
              const enrolledCount = getGroupStudentsCount(grp);
              const teacherName = grp.teacher?.user?.full_name || grp.teacher?.name || "O'qituvchi biriktirilmagan";
              const courseName = grp.course?.name || grp.name;
              const roomName = grp.classroom?.name || '1-xona';
              const scheduleTime = grp.lesson_time || '14:00 - 16:00';

              return (
                <button
                  key={grp.id}
                  type="button"
                  className={`${styles.groupCard} ${isCurrentSelected ? styles.groupCardActive : ''}`}
                  onClick={() => setSelectedGroupId(String(grp.id))}
                >
                  <div className={styles.groupCardHeader}>
                    <span className={styles.groupCodeBadge}>G-[{grp.id}]</span>
                    <span className={styles.groupStatusPill}>
                      {grp.status === 'completed' ? 'Yakunlangan' : 'Faol'}
                    </span>
                  </div>

                  <div className={styles.groupCardBody}>
                    <h3 className={styles.groupCardName}>{grp.name}</h3>

                    <div className={styles.groupCardDetails}>
                      <div className={styles.groupDetailRow}>
                        <BookOpen size={13} />
                        <span>{courseName}</span>
                      </div>
                      <div className={styles.groupDetailRow}>
                        <Users size={13} />
                        <span>{teacherName}</span>
                      </div>
                      <div className={styles.groupDetailRow}>
                        <Clock size={13} />
                        <span>
                          {grp.days || 'Du-Chor-Jum'} · {scheduleTime}
                        </span>
                      </div>
                      <div className={styles.groupDetailRow}>
                        <MapPin size={13} />
                        <span>{roomName}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.groupCardFooter}>
                    <span className={styles.studentCountBadge}>
                      <Users size={13} />
                      <span>{enrolledCount} nafar talaba</span>
                    </span>

                    {isCurrentSelected && (
                      <span className={styles.selectedBadge}>
                        <Check size={13} strokeWidth={3} />
                        <span>Tanlangan</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>


      {/* 4 Summary Stats Cards for Selected Group (Strictly up to today) */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statLabel}>Guruh Talabalari</span>
            <h2 className={styles.statValue}>{groupStudents.length} nafar</h2>
            <span className={styles.statSubtext}>Biriktirilgan faol talabalar</span>
          </div>
          <div className={`${styles.statIconBadge} ${styles.statIconBlue}`}>
            <Users size={22} />
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statLabel}>Keldi (K)</span>
            <h2 className={styles.statValue}>{presentPercent}%</h2>
            <span className={styles.statSubtext}>{presentCount} ta belgilangan dars</span>
          </div>
          <div className={`${styles.statIconBadge} ${styles.statIconGreen}`}>
            <Check size={22} strokeWidth={2.5} />
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statLabel}>Kelmadi (Y)</span>
            <h2 className={styles.statValue}>{absentPercent}%</h2>
            <span className={styles.statSubtext}>{absentCount} ta belgilangan dars</span>
          </div>
          <div className={`${styles.statIconBadge} ${styles.statIconRed}`}>
            <X size={22} strokeWidth={2.5} />
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statCardLeft}>
            <span className={styles.statLabel}>Sababli / Kechikdi (S)</span>
            <h2 className={styles.statValue}>{latePercent}%</h2>
            <span className={styles.statSubtext}>{lateCount} ta belgilangan dars</span>
          </div>
          <div className={`${styles.statIconBadge} ${styles.statIconYellow}`}>
            <Clock size={22} />
          </div>
        </div>
      </div>

      {/* ========================================================
          DATE NAVIGATION & BULK ACTIONS
          ======================================================== */}
      <div className={styles.actionControlRow}>
        {/* Date Window Navigation & Filters */}
        <div className={styles.dateNavWrapper}>
          {/* Filter Tabs: Bugungi kungacha vs Barcha darslar */}
          <div className={styles.filterTabsGroup}>
            <button
              type="button"
              className={`${styles.filterTabBtn} ${dateFilterMode === 'up_to_today' ? styles.filterTabBtnActive : ''}`}
              onClick={() => {
                setDateFilterMode('up_to_today');
                setWindowStartIdx(0);
              }}
              title="Faqat bugungi kungacha bo'lgan darslar"
            >
              <CalendarCheck size={14} />
              <span>
                Bugungi kungacha ({allGroupDates.filter((d) => !d.isFuture).length} ta)
              </span>
            </button>

            <button
              type="button"
              className={`${styles.filterTabBtn} ${dateFilterMode === 'all' ? styles.filterTabBtnActive : ''}`}
              onClick={() => {
                setDateFilterMode('all');
                setWindowStartIdx(0);
              }}
              title="Barcha darslar (bo'lajak darslar bloklangan holda)"
            >
              <Calendar size={14} />
              <span>Barcha darslar ({allGroupDates.length} ta)</span>
            </button>
          </div>

          <div className={styles.dateNavControls}>
            <button
              type="button"
              className={styles.navArrowBtn}
              onClick={handlePrevWindow}
              disabled={!canGoPrev}
              title="Oldingi darslar"
            >
              <ChevronLeft size={18} />
            </button>

            <span className={styles.navWindowInfo}>
              {showAllDates
                ? `Barcha ${activeDates.length} ta dars ko'rsatilmoqda`
                : `${windowStartIdx + 1} - ${Math.min(
                    windowStartIdx + WINDOW_SIZE,
                    activeDates.length
                  )} / ${
                    dateFilterMode === 'up_to_today'
                      ? activeDates.length
                      : allGroupDates.length
                  } ta dars`}
            </span>

            <button
              type="button"
              className={styles.navArrowBtn}
              onClick={handleNextWindow}
              disabled={!canGoNext}
              title="Keyingi darslar"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        {/* Quick Bulk Action Bar (Strictly for TODAY's lesson) */}
        <div className={styles.bulkActionBar}>
          <div className={styles.bulkBarLeft}>
            {todayDateObj ? (
              <>
                <span className={styles.bulkLabel}>Bugungi dars ({todayDateObj.dateStr}):</span>
                <div className={styles.dateSelectorGroup}>
                  <span className={`${styles.datePill} ${styles.datePillActive}`}>
                    {todayDateObj.dateStr} (Bugun)
                  </span>
                  <span className={styles.futureInfoNotice} style={{ color: '#16a34a' }}>
                    Faqat bugungi dars davomatini belgilash mumkin
                  </span>
                </div>
              </>
            ) : (
              <span className={styles.futureInfoNotice}>
                Bugun ({todayObj.formatted}) ushbu guruhda dars kuni emas. O'tib ketgan va bo'lajak darslar davomati yopilgan.
              </span>
            )}
          </div>

          <div className={styles.bulkButtons}>
            <button
              type="button"
              className={styles.todayButton}
              onClick={handleJumpToToday}
              title="Bugungi darsga o'tish"
            >
              <Calendar size={15} />
              <span>Bugun</span>
            </button>

            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isSaving}
              title="Davomatdagi barcha o'zgarishlarni saqlash"
            >
              <Check size={15} strokeWidth={2.5} />
              <span>{isSaving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
            </button>

            <button
              type="button"
              className={styles.bulkPresentBtn}
              onClick={() => handleBulkMarkSelectedDate('K')}
              disabled={!todayDateObj}
              title={
                todayDateObj
                  ? `Bugungi (${todayDateObj.dateStr}) darsga barcha talabalarni 'Keldi' qilish`
                  : "Bugun dars kuni emas"
              }
            >
              <Check size={15} strokeWidth={2.5} />
              <span>Barchasi Keldi (K)</span>
            </button>

            <button
              type="button"
              className={styles.bulkAbsentBtn}
              onClick={() => handleBulkMarkSelectedDate('Y')}
              disabled={!todayDateObj}
              title={
                todayDateObj
                  ? `Bugungi (${todayDateObj.dateStr}) darsga barcha talabalarni 'Kelmadi' qilish`
                  : "Bugun dars kuni emas"
              }
            >
              <X size={15} strokeWidth={2.5} />
              <span>Barchasi Kelmadi (Y)</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          ATTENDANCE TABLE (STRICTLY THIS GROUP'S STUDENTS)
          ======================================================== */}
      <div className={styles.tableCard}>
        {isLoading || attendanceLoading ? (
          <Loader text="Davomat ma'lumotlari yuklanmoqda..." />
        ) : groupStudents.length === 0 ? (
          <div className={styles.emptyStateCard}>
            <div className={styles.emptyStateIcon}>
              <UserCheck size={30} />
            </div>
            <h3 className={styles.emptyStateTitle}>
              {selectedGroup ? `«${selectedGroup.name}» guruhida hali talabalar yo'q` : "Guruh tanlanmagan"}
            </h3>
            <p className={styles.emptyStateDesc}>
              Davomat faqat tanlangan guruhga biriktirilgan talabalar uchun yuritiladi. Ushbu guruhga yangi talabalarni biriktirish uchun Talabalar bo'limidan foydalanishingiz mumkin.
            </p>
            <div className={styles.emptyStateActions}>
              <button
                type="button"
                className={styles.emptyStateAddBtn}
                onClick={handleOpenEnrollModal}
              >
                <UserPlus size={16} />
                <span>Ushbu guruhga talaba qo'shish</span>
              </button>
              <Link to="/students" className={styles.emptyStateAction}>
                <Users size={16} />
                <span>Talabalar bo'limiga o'tish</span>
              </Link>
            </div>
          </div>
        ) : (
          <table className={styles.attendanceTable}>
            <thead>
              <tr>
                <th style={{ width: '280px', minWidth: '220px' }}>TALABA</th>
                {visibleDates.map((dateObj) => {
                  const isCurrentDateSelected = selectedDateKey === dateObj.key;
                  return (
                    <th
                      key={dateObj.key}
                      className={`${styles.centerHeader} ${isCurrentDateSelected ? styles.activeColumnHeader : ''}`}
                    >
                      <div className={styles.colHeaderWrapper}>
                        <div
                          className={styles.colDateTitleGroup}
                          onClick={() => {
                            if (!dateObj.isFuture) {
                              setSelectedDateKey(dateObj.key);
                            }
                          }}
                          title={dateObj.isFuture ? "Bo'lajak dars" : "Ushbu sanani tanlash"}
                        >
                          <span className={styles.colDateTitle}>{dateObj.dateStr}</span>
                          <span className={styles.colDayName}>{dateObj.dayName}</span>
                          {dateObj.isToday && <span className={styles.todayBadge}>Bugun</span>}
                        </div>

                        {/* Quick Column Actions: ONLY enabled for TODAY'S date */}
                        {dateObj.isFuture ? (
                          <span className={styles.futureColBadge} title="Bo'lajak dars — davomat faqat dars kunida olinadi">
                            <Lock size={10} />
                            <span>Bo'lajak</span>
                          </span>
                        ) : dateObj.isToday ? (
                          <div className={styles.quickColActions}>
                            <button
                              type="button"
                              className={`${styles.quickActionBtn} ${styles.quickActionK}`}
                              onClick={() => {
                                setSelectedDateKey(dateObj.key);
                                handleBulkMarkDate(dateObj.key, 'K');
                              }}
                              title={`Bugun: Barchasi Keldi (${dateObj.dateStr})`}
                            >
                              K
                            </button>
                            <button
                              type="button"
                              className={`${styles.quickActionBtn} ${styles.quickActionY}`}
                              onClick={() => {
                                setSelectedDateKey(dateObj.key);
                                handleBulkMarkDate(dateObj.key, 'Y');
                              }}
                              title={`Bugun: Barchasi Kelmadi (${dateObj.dateStr})`}
                            >
                              Y
                            </button>
                          </div>
                        ) : (
                          <span className={styles.closedColBadge} title="O'tib ketgan dars — davomat yopilgan (faqat ko'rish mumkin)">
                            <Lock size={10} />
                            <span>Yopilgan</span>
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {groupStudents.map((st, stIdx) => {
                const fullName = st.user?.full_name || st.name || `Talaba #${st.id}`;
                const phone = st.user?.phone || st.parent_phone || '';
                const initials = getInitials(fullName);
                const avatarClass = styles[`avatarAlt${stIdx % 5}`] || styles.avatar;

                // Calculate this student's individual attendance stats (up to today only)
                let studentPresent = 0;
                let studentTotal = 0;
                allGroupDates.filter((d) => !d.isFuture).forEach((d) => {
                  const val = attendanceMatrix[`${st.id}_${d.key}`];
                  if (val) {
                    studentTotal++;
                    if (val === 'K') studentPresent++;
                  }
                });

                return (
                  <tr key={st.id}>
                    {/* TALABA INFO */}
                    <td>
                      <div className={styles.studentCell}>
                        <div className={`${styles.avatar} ${avatarClass}`}>
                          {initials}
                        </div>
                        <div className={styles.studentInfoText}>
                          <span className={styles.studentName}>{fullName}</span>
                          <div className={styles.studentDetails}>
                            {phone && <span>{phone}</span>}
                            {studentTotal > 0 && (
                              <span className={styles.studentMiniRate}>
                                Keldi: {studentPresent}/{studentTotal}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* DATES ATTENDANCE CELLS */}
                    {visibleDates.map((dateObj) => {
                      const key = `${st.id}_${dateObj.key}`;
                      const status = attendanceMatrix[key];
                      const isPickerOpen = activePickerKey === key;

                      // 1. If date is in the future, strictly disable cell
                      if (dateObj.isFuture) {
                        return (
                          <td key={dateObj.key} className={styles.centerCell}>
                            <div className={styles.cellWrapper}>
                              <button
                                type="button"
                                disabled
                                className={`${styles.badgeCircle} ${styles.badgeDisabled}`}
                                title="Bo'lajak dars — davomat faqat dars kunida olinadi"
                              >
                                <Lock size={12} />
                              </button>
                            </div>
                          </td>
                        );
                      }

                      // 2. If date is in the past (yesterday or earlier), STRICTLY READ-ONLY (CANNOT BE CHANGED!)
                      if (dateObj.isPast && !dateObj.isToday) {
                        let pastBadgeClass = styles.badgeLockedEmpty;
                        let pastContent = '—';
                        let pastTitle = "O'tib ketgan dars — davomat belgilanmagan (o'zgartirish taqiqlangan)";

                        if (status === 'K') {
                          pastBadgeClass = `${styles.badgePresent} ${styles.badgeReadOnly}`;
                          pastContent = 'K';
                          pastTitle = "O'tib ketgan dars — Keldi (K) (o'zgartirish taqiqlangan)";
                        } else if (status === 'Y') {
                          pastBadgeClass = `${styles.badgeAbsent} ${styles.badgeReadOnly}`;
                          pastContent = 'Y';
                          pastTitle = "O'tib ketgan dars — Kelmadi (Y) (o'zgartirish taqiqlangan)";
                        } else if (status === 'S') {
                          pastBadgeClass = `${styles.badgeLate} ${styles.badgeReadOnly}`;
                          pastContent = 'S';
                          pastTitle = "O'tib ketgan dars — Sababli (S) (o'zgartirish taqiqlangan)";
                        }

                        return (
                          <td key={dateObj.key} className={styles.centerCell}>
                            <div className={styles.cellWrapper}>
                              <button
                                type="button"
                                disabled
                                className={`${styles.badgeCircle} ${pastBadgeClass}`}
                                title={pastTitle}
                              >
                                {pastContent}
                              </button>
                            </div>
                          </td>
                        );
                      }

                      // 3. TODAY'S LESSON: STRICTLY ONLY TODAY IS EDITABLE!
                      let badgeContent = '+';
                      let badgeClass = styles.badgeEmpty;

                      if (status === 'K') {
                        badgeContent = 'K';
                        badgeClass = styles.badgePresent;
                      } else if (status === 'Y') {
                        badgeContent = 'Y';
                        badgeClass = styles.badgeAbsent;
                      } else if (status === 'S') {
                        badgeContent = 'S';
                        badgeClass = styles.badgeLate;
                      }

                      return (
                        <td key={dateObj.key} className={styles.centerCell}>
                          <div className={styles.cellWrapper}>
                            <button
                              type="button"
                              className={`${styles.badgeCircle} ${badgeClass}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePickerKey(isPickerOpen ? null : key);
                              }}
                              title={
                                status
                                  ? `${status} (O'zgartirish uchun bosing)`
                                  : "Bugungi davomatni belgilash uchun bosing"
                              }
                            >
                              {badgeContent}
                            </button>

                            {/* Status Popover for Today */}
                            {isPickerOpen && (
                              <div
                                className={styles.popoverMenu}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={`${styles.popoverBtn} ${styles.popoverBtnK}`}
                                  onClick={() => handleSelectStatus(st.id, dateObj.key, 'K')}
                                  title="Keldi (K)"
                                >
                                  K
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.popoverBtn} ${styles.popoverBtnY}`}
                                  onClick={() => handleSelectStatus(st.id, dateObj.key, 'Y')}
                                  title="Kelmadi (Y)"
                                >
                                  Y
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.popoverBtn} ${styles.popoverBtnS}`}
                                  onClick={() => handleSelectStatus(st.id, dateObj.key, 'S')}
                                  title="Sababli / Kechikdi (S)"
                                >
                                  S
                                </button>
                                {status && (
                                  <button
                                    type="button"
                                    className={`${styles.popoverBtn} ${styles.popoverBtnClear}`}
                                    onClick={() => handleSelectStatus(st.id, dateObj.key, '')}
                                    title="Tozalash"
                                  >
                                    <X size={13} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal: Guruhga talaba biriktirish */}
      {isEnrollModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsEnrollModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalHeaderLeft}>
                <div className={styles.modalIconBadge}>
                  <UserPlus size={20} />
                </div>
                <div>
                  <h3 className={styles.modalTitle}>Guruhga talaba biriktirish</h3>
                  <p className={styles.modalSubtitle}>
                    {selectedGroup?.name} ({selectedGroup?.days || 'Du-Chor-Ju'})
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsEnrollModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEnrollStudent} className={styles.modalBody}>
              {enrollError && (
                <div className={styles.modalError}>
                  {enrollError}
                </div>
              )}

              <div className={styles.modalFormGroup}>
                <label className={styles.modalLabel}>Biriktiriladigan talabani tanlang</label>
                {availableStudents.length === 0 ? (
                  <p className={styles.noStudentsText}>
                    Barcha mavjud talabalar ushbu guruhga biriktirilgan yoki boshqa talaba topilmadi.
                  </p>
                ) : (
                  <select
                    className={styles.modalSelect}
                    value={enrollStudentId}
                    onChange={(e) => setEnrollStudentId(e.target.value)}
                  >
                    <option value="">-- Talabani tanlang --</option>
                    {availableStudents.map((st) => {
                      const name = st.user?.full_name || st.name || `Talaba #${st.id}`;
                      const phone = st.user?.phone || st.parent_phone || '';
                      return (
                        <option key={st.id} value={st.id}>
                          {name} {phone ? `(${phone})` : ''}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setIsEnrollModalOpen(false)}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className={styles.modalSubmitBtn}
                  disabled={isEnrolling || !enrollStudentId}
                >
                  {isEnrolling ? 'Biriktirilmoqda...' : 'Biriktirish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Attendance;
