import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBranches } from '../../store/slices/branchSlice';
import { fetchStudents } from '../../store/slices/studentSlice';
import { fetchTeachers } from '../../store/slices/teacherSlice';
import { fetchCourses } from '../../store/slices/courseSlice';
import { fetchGroups } from '../../store/slices/groupSlice';
import { fetchPayments } from '../../store/slices/paymentSlice';
import { fetchLessons } from '../../store/slices/lessonSlice';
import { fetchActivities } from '../../store/slices/activitySlice';
import { fetchExams } from '../../store/slices/examSlice';
import { fetchLeads } from '../../store/slices/leadSlice';
import { fetchTrialLessons } from '../../store/slices/trialLessonSlice';
import { fetchAttendances } from '../../store/slices/attendanceSlice';
import { fetchGroupStudents } from '../../store/slices/groupStudentSlice';
import {
  loadAllStoredHomeworks,
  getStudentScopedHomeworks,
  saveStudentSubmission,
} from '../../services/homeworkStorage';
import ParentPortal from '../ParentPortal';
import api from '../../services/api';
import { Loader } from '../../components';
import { GiTeacher } from 'react-icons/gi';
import {
  Users,
  BookOpen,
  Calendar,
  BarChart3,
  TrendingUp,
  UserPlus,
  ArrowRight,
  UserCheck,
  Coins,
  Receipt,
  FileCheck2,
  Clock,
  GraduationCap,
  CheckCircle2,
  FolderKanban,
  DoorOpen,
  User,
  Search,
  Bell,
  Sparkles,
  Flame,
  Award,
  Check,
  Download,
  UploadCloud,
  FileText,
  Paperclip,
  AlertCircle,
  AlertTriangle,
  UserMinus,
  CalendarX,
  Monitor,
  Filter,
  X,
  Send,
  CheckCheck,
} from 'lucide-react';
import styles from './dashboard.module.css';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';

const Dashboard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { user } = useSelector((state) => state.auth || {});
  const { items: branches = [] } = useSelector((state) => state.branch || {});
  const { items: students = [] } = useSelector((state) => state.student || {});
  const { items: teachers = [] } = useSelector((state) => state.teacher || {});
  const { items: courses = [] } = useSelector((state) => state.course || {});
  const { items: groups = [] } = useSelector((state) => state.group || {});
  const { items: payments = [] } = useSelector((state) => state.payment || {});
  const { items: lessons = [] } = useSelector((state) => state.lesson || {});
  const { items: activities = [] } = useSelector((state) => state.activity || {});
  const { items: rawExams = [] } = useSelector((state) => state.exam || {});
  const { items: leads = [] } = useSelector((state) => state.lead || {});
  const { items: trialLessons = [] } = useSelector((state) => state.trialLesson || {});
  const { items: attendances = [] } = useSelector((state) => state.attendance || {});
  const { items: groupStudents = [] } = useSelector((state) => state.groupStudent || {});
  const [invoices, setInvoices] = useState([]);

  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [chartPeriod, setChartPeriod] = useState('7_days');
  const [studentSearch, setStudentSearch] = useState('');

  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isTeacher = userRole === 'TEACHER';
  const isStudent = userRole === 'STUDENT';
  const isParent = userRole === 'PARENT';
  const isSuperAdmin =
    userRole === 'SUPER_ADMIN' ||
    userRole === 'SUPERADMIN' ||
    user?.is_superadmin;

  const rawPosition = user?.position || user?.employee?.position || user?.employee_profile?.position;
  const userPosition = formatStaffPosition(rawPosition);
  const isInspector =
    userPosition === 'Nazoratchi' ||
    userRole === 'NAZORATCHI' ||
    userRole === 'SUPERVISOR' ||
    userRole === 'INSPECTOR';

  const userBranchId = user?.branch_id || user?.branch?.id;
  const userCenterName = user?.branch?.name || user?.full_name || "Yuksalish Ta'limi";

  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchBranches());
    if (!isTeacher && !isStudent) {
      dispatch(fetchStudents({ limit: 1000 }));
      dispatch(fetchPayments({ limit: 1000 }));
      dispatch(fetchLeads({ limit: 1000 }));
      dispatch(fetchTrialLessons({ limit: 1000 }));
      dispatch(fetchAttendances({ limit: 1000 }));
      dispatch(fetchGroupStudents({ limit: 1000 }));
      api.get('/invoices').then((res) => {
        const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setInvoices(list);
      }).catch(() => {});
    }
    dispatch(fetchTeachers({ limit: 500 }));
    dispatch(fetchCourses({ limit: 500 }));
    dispatch(fetchGroups({ limit: 1000 }));
    dispatch(fetchLessons({ limit: 1000 }));
    dispatch(fetchActivities({ limit: 50 }));
    dispatch(fetchExams({ limit: 100 }));

    const timer = setTimeout(() => {
      setDashboardLoading(false);
    }, 650);
    return () => clearTimeout(timer);
  }, [dispatch, isTeacher, isStudent]);

  // Uzbek Date String helper
  const getUzbekDateString = () => {
    const monthsUz = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    const now = new Date();
    const day = now.getDate();
    const month = monthsUz[now.getMonth()];
    const year = now.getFullYear();
    return `${day}-${month}, ${year}`;
  };

  // Uzbek Day of week and date for Student overline (e.g. "Chorshanba, 7-oktabr")
  const getStudentDateOverline = () => {
    const daysUz = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    const monthsUz = [
      'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
      'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'
    ];
    const now = new Date();
    const dayName = daysUz[now.getDay()];
    const dayNum = now.getDate();
    const monthName = monthsUz[now.getMonth()];
    return `${dayName}, ${dayNum}-${monthName}`;
  };

  // 1. SCOPED DATA (Admin faqat o'z o'quv markazidagi ma'lumotlarni ko'radi)
  const scopedStudents = useMemo(() => {
    if (isTeacher || isStudent) return [];
    if (isSuperAdmin) return students;
    return students.filter((s) => {
      if (userBranchId && (s.branch_id === userBranchId || s.user?.branch_id === userBranchId || s.branch?.id === userBranchId)) {
        return true;
      }
      if (userCenterName && s.branch?.name && s.branch.name.toLowerCase() === userCenterName.toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [students, isSuperAdmin, userBranchId, userCenterName, isTeacher, isStudent]);

  const scopedTeachers = useMemo(() => {
    if (isSuperAdmin) return teachers;
    return teachers.filter((t) => {
      if (userBranchId && (t.branch_id === userBranchId || t.user?.branch_id === userBranchId || t.branch?.id === userBranchId)) {
        return true;
      }
      if (userCenterName && t.branch?.name && t.branch.name.toLowerCase() === userCenterName.toLowerCase()) {
        return true;
      }
      return false;
    });
  }, [teachers, isSuperAdmin, userBranchId, userCenterName]);

  const scopedCourses = useMemo(() => {
    if (isSuperAdmin) return courses;
    return courses.filter((c) => {
      if (!c.branch_id) return true;
      return String(c.branch_id) === String(userBranchId);
    });
  }, [courses, isSuperAdmin, userBranchId]);

  const scopedGroups = useMemo(() => {
    if (isSuperAdmin) return groups;
    return groups.filter((g) => {
      if (!g.branch_id) return true;
      return String(g.branch_id) === String(userBranchId);
    });
  }, [groups, isSuperAdmin, userBranchId]);

  const scopedPayments = useMemo(() => {
    if (isTeacher || isStudent) return [];
    if (isSuperAdmin) return payments;
    return payments.filter((p) => {
      if (userBranchId && (String(p.branch_id) === String(userBranchId) || String(p.student?.branch_id) === String(userBranchId) || String(p.student?.user?.branch_id) === String(userBranchId))) {
        return true;
      }
      return false;
    });
  }, [payments, isSuperAdmin, userBranchId, isTeacher, isStudent]);

  // ==========================================
  // TEACHER SPECIFIC DATA FILTERING
  // ==========================================
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

  const teacherId = currentTeacher?.id || user?.teacher_id;
  const teacherUserId = currentTeacher?.user_id || currentTeacher?.user?.id || user?.id;

  const isTeacherMatch = (teacherIdVal, teacherObj) => {
    if (!isTeacher) return true;
    if (teacherId && String(teacherIdVal) === String(teacherId)) return true;
    if (teacherUserId && String(teacherIdVal) === String(teacherUserId)) return true;
    if (teacherObj) {
      if (teacherId && String(teacherObj.id) === String(teacherId)) return true;
      if (teacherUserId && (String(teacherObj.user_id) === String(teacherUserId) || String(teacherObj.user?.id) === String(teacherUserId))) return true;
      if (user?.full_name) {
        const uName = user.full_name.toLowerCase();
        if (teacherObj.full_name && teacherObj.full_name.toLowerCase() === uName) return true;
        if (teacherObj.name && teacherObj.name.toLowerCase() === uName) return true;
        if (teacherObj.user?.full_name && teacherObj.user.full_name.toLowerCase() === uName) return true;
      }
    }
    return false;
  };

  const teacherGroupsList = useMemo(() => {
    if (!isTeacher) return [];
    return (groups || []).filter((g) => isTeacherMatch(g.teacher_id, g.teacher));
  }, [groups, isTeacher, teacherId, teacherUserId, user]);

  const teacherGroupIds = useMemo(() => {
    return new Set(teacherGroupsList.map((g) => String(g.id)));
  }, [teacherGroupsList]);

  const teacherLessonsList = useMemo(() => {
    if (!isTeacher) return [];
    return (lessons || []).filter((l) => {
      if (isTeacherMatch(l.teacher_id, l.teacher)) return true;
      if (l.group_id && teacherGroupIds.has(String(l.group_id))) return true;
      if (l.group?.id && teacherGroupIds.has(String(l.group.id))) return true;
      if (l.group?.teacher_id && isTeacherMatch(l.group.teacher_id, l.group.teacher)) return true;
      return false;
    });
  }, [lessons, isTeacher, teacherId, teacherUserId, teacherGroupIds, user]);

  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const todayDayOfWeek = new Date().getDay(); // 0: Sun, 1: Mon, ..., 6: Sat

  const isDayMatchingSchedule = (daysStrRaw, dayOfWeek) => {
    if (!daysStrRaw) return false;
    const dStr = String(daysStrRaw).toLowerCase().trim();
    if (!dStr) return false;
    if (dayOfWeek === 0) return false; // Sunday is off
    if (dStr.includes('har kuni') || dStr.includes('everyday') || dStr.includes('daily') || dStr.includes('barcha')) {
      return true;
    }
    const isOdd = dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5;
    const isEven = dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6;
    if (dStr === 'toq' || dStr === 'odd' || dStr.includes('toq kun')) return isOdd;
    if (dStr === 'juft' || dStr === 'even' || dStr.includes('juft kun')) return isEven;
    if (dayOfWeek === 1 && (dStr.includes('du') || dStr.includes('mon'))) return true;
    if (dayOfWeek === 2 && (dStr.includes('se') || dStr.includes('tue'))) return true;
    if (dayOfWeek === 3 && (dStr.includes('chor') || dStr.includes('wed'))) return true;
    if (dayOfWeek === 4 && (dStr.includes('pay') || dStr.includes('thu'))) return true;
    if (dayOfWeek === 5 && (dStr.includes('jum') || dStr.includes('fri') || dStr.includes('-ju') || dStr.includes('ju-') || dStr.endsWith('ju'))) return true;
    if (dayOfWeek === 6 && (dStr.includes('shan') || dStr.includes('sat'))) return true;
    return false;
  };

  const todayTeacherLessons = useMemo(() => {
    if (!isTeacher) return [];
    const list = [];
    const seenGroupKeys = new Set();

    // 1. Explicit database lessons scheduled for today's date
    teacherLessonsList.forEach((l) => {
      const lDate = l.lesson_date ? String(l.lesson_date).split('T')[0] : '';
      if (lDate === todayDateStr) {
        const groupObj = (groups || []).find((g) => String(g.id) === String(l.group_id)) || l.group;
        const timeSlot = l.start_time
          ? `${String(l.start_time).slice(0, 5)} - ${String(l.end_time || '').slice(0, 5) || '12:00'}`
          : (groupObj?.start_time ? `${String(groupObj.start_time).slice(0, 5)} - ${String(groupObj.end_time || '').slice(0, 5)}` : '10:00 - 12:00');
        const courseTitle = l.course?.name || groupObj?.course?.name || groupObj?.name || 'Kurs darsi';
        const groupTitle = groupObj?.name || l.title || `Guruh #${l.group_id}`;
        const roomTitle = l.classroom?.name || groupObj?.classroom?.name || (l.classroom_id ? `Xona #${l.classroom_id}` : (groupObj?.classroom_id ? `Xona #${groupObj.classroom_id}` : '101-xona'));

        list.push({
          id: l.id,
          time: timeSlot,
          course: courseTitle,
          group: groupTitle,
          room: roomTitle,
          topic: l.topic || `${groupTitle} darsi`,
          date: lDate,
          status: l.status || 'scheduled',
          group_id: l.group_id,
        });

        if (l.group_id) seenGroupKeys.add(String(l.group_id));
      }
    });

    // 2. Scheduled recurring group lessons if today is a scheduled day
    teacherGroupsList.forEach((g) => {
      if (g.status && g.status !== 'active') return;
      if (seenGroupKeys.has(String(g.id))) return;

      const groupDays = g.days || g.schedule_days || '';
      let matches = false;
      if (groupDays) {
        matches = isDayMatchingSchedule(groupDays, todayDayOfWeek);
      } else {
        matches = todayDayOfWeek === 1 || todayDayOfWeek === 3 || todayDayOfWeek === 5;
      }

      if (matches) {
        let timeSlot = '10:00 - 12:00';
        if (g.lesson_time) {
          timeSlot = g.lesson_time;
        } else if (g.start_time) {
          timeSlot = `${String(g.start_time).slice(0, 5)} - ${String(g.end_time || '').slice(0, 5) || '12:00'}`;
        }

        const roomTitle = g.classroom?.name || (g.classroom_id ? `Xona #${g.classroom_id}` : '101-xona');
        const courseTitle = g.course?.name || g.name || "O'quv kursi";

        list.push({
          id: `grp-${g.id}`,
          time: timeSlot,
          course: courseTitle,
          group: g.name,
          room: roomTitle,
          topic: `${g.name} darsi`,
          date: todayDateStr,
          status: 'scheduled',
          group_id: g.id,
        });

        seenGroupKeys.add(String(g.id));
      }
    });

    return list;
  }, [isTeacher, teacherLessonsList, teacherGroupsList, todayDateStr, todayDayOfWeek, groups]);

  // Upcoming lessons if today has no lessons
  const upcomingTeacherLessons = useMemo(() => {
    if (!isTeacher) return [];
    const upcoming = teacherLessonsList
      .filter((l) => {
        const lDate = l.lesson_date ? String(l.lesson_date).split('T')[0] : '';
        return lDate >= todayDateStr;
      })
      .sort((a, b) => {
        const dateA = a.lesson_date || '';
        const dateB = b.lesson_date || '';
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.start_time || '').localeCompare(b.start_time || '');
      });

    if (upcoming.length > 0) {
      return upcoming.slice(0, 5).map((l) => {
        const groupObj = (groups || []).find((g) => String(g.id) === String(l.group_id)) || l.group;
        const timeSlot = l.start_time
          ? `${String(l.start_time).slice(0, 5)} - ${String(l.end_time || '').slice(0, 5) || '12:00'}`
          : (groupObj?.start_time ? `${String(groupObj.start_time).slice(0, 5)} - ${String(groupObj.end_time || '').slice(0, 5)}` : '10:00 - 12:00');
        return {
          id: l.id,
          date: l.lesson_date ? String(l.lesson_date).split('T')[0] : '',
          time: timeSlot,
          course: l.course?.name || groupObj?.course?.name || groupObj?.name || 'Kurs darsi',
          group: groupObj?.name || l.title || `Guruh #${l.group_id}`,
          room: l.classroom?.name || groupObj?.classroom?.name || (l.classroom_id ? `Xona #${l.classroom_id}` : '101-xona'),
          topic: l.topic || 'Rejali dars mashg\'uloti',
          status: l.status || 'scheduled',
          group_id: l.group_id,
        };
      });
    }

    return teacherGroupsList.slice(0, 4).map((g) => {
      let timeSlot = '10:00 - 12:00';
      if (g.lesson_time) timeSlot = g.lesson_time;
      else if (g.start_time) timeSlot = `${String(g.start_time).slice(0, 5)} - ${String(g.end_time || '').slice(0, 5) || '12:00'}`;
      return {
        id: `grp-${g.id}`,
        date: g.days || 'Rejali kunlar',
        time: timeSlot,
        course: g.course?.name || g.name || "O'quv kursi",
        group: g.name,
        room: g.classroom?.name || (g.classroom_id ? `Xona #${g.classroom_id}` : '101-xona'),
        topic: `${g.name} darsi`,
        status: 'scheduled',
        group_id: g.id,
      };
    });
  }, [isTeacher, teacherLessonsList, teacherGroupsList, todayDateStr, groups]);

  // ==========================================
  // STUDENT SPECIFIC DATA & HOMEWORK SYSTEM
  // ==========================================
  const [homeworkFilter, setHomeworkFilter] = useState('all'); // 'all' | 'pending' | 'submitted' | 'graded'
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [homeworkSearch, setHomeworkSearch] = useState('');
  const [submittingHomework, setSubmittingHomework] = useState(null);
  const [submissionFile, setSubmissionFile] = useState(null);
  const [submissionComment, setSubmissionComment] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const initialHomeworks = useMemo(() => [
    {
      id: 'hw-it-kids-1',
      course: 'IT kids',
      courseColor: '#ec4899',
      courseBg: '#fdf2f8',
      title: "Scratch Dasturlash: Interaktiv animatsiya va mini-o'yin yaratish",
      description: "Scratch bloklari yordamida o'z qahramoningizni klaviatura orqali harakatlantiring, ball to'plash va ovoz effektlari bilan qiziqarli mini-o'yin yarating.",
      teacher: 'Umarova Gulhayo Murodova',
      assignedDate: '07.11.2026',
      dueDate: 'Ertaga, 23:59',
      isUrgent: true,
      status: 'pending',
      grade: null,
      maxScore: 100,
      files: [
        {
          name: 'Scratch_Oyini_Qollanmasi.pdf',
          type: 'pdf',
          size: '2.5 MB',
        },
        {
          name: 'Oyini_Baholash_Mezonlari.docx',
          type: 'docx',
          size: '340 KB',
        },
      ],
    },
    {
      id: 'hw-it-kids-2',
      course: 'IT kids',
      courseColor: '#ec4899',
      courseBg: '#fdf2f8',
      title: "Scratch: O'zgaruvchilar (Variables) va Ball hisoblash mexanikasi",
      description: "O'yinda yulduzchalarni terishda har safar 1 balldan qo'shilishi va vaqt tugaganda 'G'alaba' yoki 'Qayta urinish' oynasi chiqishini dasturlang.",
      teacher: 'Umarova Gulhayo Murodova',
      assignedDate: '02.11.2026',
      dueDate: '06.11.2026',
      isUrgent: false,
      status: 'graded',
      submittedDate: '05.11.2026, 18:20',
      grade: 95,
      maxScore: 100,
      files: [
        {
          name: 'Scratch_Variables_Guide.pdf',
          type: 'pdf',
          size: '1.4 MB',
        },
      ],
    },
  ], []);

  const [homeworkList, setHomeworkList] = useState([]);

  useEffect(() => {
    const loadHws = () => {
      if (isStudent) {
        const directStudent = (students || []).find(
          (s) =>
            String(s.user_id) === String(user?.id) ||
            String(s.id) === String(user?.id) ||
            String(s.id) === String(user?.student?.id) ||
            (user?.full_name && s.user?.full_name && s.user.full_name.toLowerCase().trim() === user.full_name.toLowerCase().trim())
        );
        const resolvedStudentId = directStudent?.id || user?.student?.id || user?.id;

        const myGroupStudent = (groupStudents || []).filter(
          (gs) =>
            String(gs.student_id) === String(resolvedStudentId) ||
            String(gs.student_id) === String(user?.id) ||
            String(gs.student?.id) === String(resolvedStudentId) ||
            String(gs.student?.user_id) === String(user?.id)
        );

        const myGroupIds = [
          ...myGroupStudent.map((gs) => String(gs.group_id)),
          user?.student?.group_id ? String(user.student.group_id) : null,
          directStudent?.group_id ? String(directStudent.group_id) : null,
        ].filter(Boolean);

        const myGroups = (groups || []).filter((g) => myGroupIds.includes(String(g.id)));
        const myGroupNames = myGroups.map((g) => g.name).filter(Boolean);
        const myCourseIds = myGroups.map((g) => g.course_id || g.course?.id).filter(Boolean);
        const myCourseNames = myGroups.map((g) => g.course?.name || g.name).filter(Boolean);

        const scoped = getStudentScopedHomeworks(
          user,
          myGroupIds,
          myCourseIds,
          myGroupNames,
          myCourseNames
        );

        if (scoped && scoped.length > 0) {
          setHomeworkList(
            scoped.map((h) => ({
              ...h,
              course: h.courseName || h['course'] || 'Kurs',
              courseColor: h.courseColor || '#2563eb',
              courseBg: h.courseBg || '#eff6ff',
            }))
          );
        } else {
          setHomeworkList(initialHomeworks);
        }
      } else {
        const all = loadAllStoredHomeworks();
        setHomeworkList(
          all.map((h) => ({
            ...h,
            course: h.courseName || h['course'] || 'Kurs',
            courseColor: h.courseColor || '#2563eb',
            courseBg: h.courseBg || '#eff6ff',
          }))
        );
      }
    };

    loadHws();
    window.addEventListener('homeworks_updated', loadHws);
    window.addEventListener('storage', loadHws);
    return () => {
      window.removeEventListener('homeworks_updated', loadHws);
      window.removeEventListener('storage', loadHws);
    };
  }, [isStudent, user, groups, groupStudents, students, initialHomeworks]);

  // File Download Handlers: Word (.doc) and PDF (.pdf/.html)
  const handleDownloadWord = (hw, file) => {
    const fileName = file?.name || `${hw.course}_${hw.title.slice(0, 25)}.doc`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const wordContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${hw.title}</title>
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11.5pt; line-height: 1.5; color: #1e293b; padding: 24px; }
          .header { border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .school-name { font-size: 16pt; font-weight: bold; color: #2563eb; text-transform: uppercase; }
          .doc-type { font-size: 10pt; color: #64748b; font-weight: bold; margin-top: 2px; }
          .title { font-size: 16pt; font-weight: bold; color: #0f172a; margin: 16px 0; background: #eff6ff; padding: 12px; border-left: 5px solid #2563eb; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .meta-table td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt; }
          .label { background-color: #f8fafc; font-weight: bold; width: 28%; color: #475569; }
          .section-title { font-size: 13pt; font-weight: bold; color: #1e3a8a; margin-top: 22px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .task-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; font-size: 11pt; color: #334155; }
          .workspace { min-height: 240px; border: 1px dashed #94a3b8; padding: 14px; background-color: #ffffff; margin-top: 8px; }
          .footer { margin-top: 35px; font-size: 9pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">YUKSALISH TA'LIMI CRM</div>
          <div class="doc-type">Uy vazifasi va amaliy topshiriq hujjati</div>
        </div>

        <div class="title">${hw.title}</div>

        <table class="meta-table">
          <tr><td class="label">Fan / Kurs:</td><td><strong>${hw.course}</strong></td></tr>
          <tr><td class="label">O'qituvchi:</td><td>${hw.teacher}</td></tr>
          <tr><td class="label">Berilgan sana:</td><td>${hw.assignedDate}</td></tr>
          <tr><td class="label">Topshirish muddati:</td><td><span style="color: #ea580c; font-weight: bold;">${hw.dueDate}</span></td></tr>
          <tr><td class="label">Maksimal ball:</td><td>${hw.maxScore} ball</td></tr>
          <tr><td class="label">Holati:</td><td>${hw.status === 'graded' ? `Baholandi (${hw.grade} ball)` : hw.status === 'submitted' ? 'Topshirildi' : 'Kutilmoqda'}</td></tr>
        </table>

        <div class="section-title">1. Vazifa sharti va yo'riqnoma:</div>
        <div class="task-box">
          <p><strong>Tavsif:</strong></p>
          <p>${hw.description}</p>
          <p style="margin-top: 8px;"><strong>Talablar:</strong></p>
          <ul>
            <li>Vazifani belgilangan muddatgacha to'liq bajaring.</li>
            <li>Barcha tushuntirish va misollarni aniq keltiring.</li>
            <li>Tayyor javob faylini tizimga qayta yuklang.</li>
          </ul>
        </div>

        <div class="section-title">2. Talaba javobi / Yechim qismi:</div>
        <div class="workspace">
          <p style="color: #94a3b8; font-style: italic;">[Talaba o'z yechimi yoki matnini shu yerga yozishi mumkin...]</p>
        </div>

        <div class="footer">
          Yuksalish Ta'limi CRM • Hujjat yuklab olingan sana: ${new Date().toLocaleDateString('uz-UZ')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.docx') || fileName.endsWith('.doc') ? fileName : `${fileName}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 Word fayl yuklab olindi: ${a.download}`);
  };

  const handleDownloadPdf = (hw, file) => {
    const fileName = file?.name || `${hw.course}_${hw.title.slice(0, 25)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${hw.title} - PDF Qo'llanma</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #0f172a; line-height: 1.6; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 18px; }
          .logo { font-size: 18px; font-weight: 800; color: #2563eb; }
          .badge { background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; }
          .title { font-size: 20px; font-weight: 800; color: #1e293b; margin: 16px 0 10px 0; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0 20px 0; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 13px; }
          .section-title { font-size: 15px; font-weight: 700; color: #1e3a8a; border-left: 4px solid #2563eb; padding-left: 8px; margin: 18px 0 8px 0; }
          .task-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; font-size: 13.5px; }
          .notes { background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 6px; font-size: 12px; margin-top: 14px; }
          .footer { margin-top: 30px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">YUKSALISH TA'LIMI CRM</div>
          <div class="badge">${hw.course}</div>
        </div>
        <h1 class="title">${hw.title}</h1>
        <div class="grid">
          <div><strong>O'qituvchi:</strong> ${hw.teacher}</div>
          <div><strong>Berilgan sana:</strong> ${hw.assignedDate}</div>
          <div><strong>Topshirish muddati:</strong> <span style="color: #ea580c; font-weight: bold;">${hw.dueDate}</span></div>
          <div><strong>Maksimal ball:</strong> ${hw.maxScore} ball</div>
        </div>
        <div class="section-title">Topshiriq ko'rsatmalari va savollar:</div>
        <div class="task-box">
          <p>${hw.description}</p>
          <ol style="margin-top: 10px; padding-left: 20px;">
            <li>Topshiriqni diqqat bilan o'qib chiqing va talablarga rioya qiling.</li>
            <li>Hisoblash yoki tahliliy qismlarni batafsil yoritib bering.</li>
            <li>Javobingizni tizimga PDF yoki Word formatida yuklang.</li>
          </ol>
        </div>
        <div class="notes">
          ⚠️ <strong>Eslatma:</strong> Muddatidan kechiktirilgan topshiriqlar uchun ball kamaytirilishi mumkin.
        </div>
        <div class="footer">
          Yuksalish Ta'limi CRM • Rasmiy o'quv dasturi hujjati • Sana: ${new Date().toLocaleDateString('uz-UZ')}
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([pdfHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.pdf') ? fileName.replace('.pdf', '_Qollanma.html') : `${fileName}_Qollanma.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📕 PDF / Material yuklab olindi: ${fileName}`);
  };

  const handleDownloadAllFiles = (hw) => {
    hw.files.forEach((f, idx) => {
      setTimeout(() => {
        if (f.type === 'pdf') {
          handleDownloadPdf(hw, f);
        } else {
          handleDownloadWord(hw, f);
        }
      }, idx * 300);
    });
  };

  const handleOpenSubmitModal = (hw) => {
    setSubmittingHomework(hw);
    setSubmissionFile(null);
    setSubmissionComment('');
  };

  const handleConfirmSubmit = () => {
    if (!submittingHomework) return;
    saveStudentSubmission(user?.id, submittingHomework.id, {
      comment: submissionComment,
      link: '',
      fileName: submissionFile?.name || 'vazifa_yechimi.zip',
    });
    setHomeworkList((prev) =>
      prev.map((item) =>
        item.id === submittingHomework.id
          ? {
              ...item,
              status: 'submitted',
              submittedDate: new Date().toLocaleDateString('uz-UZ'),
            }
          : item
      )
    );
    showToast(`✅ "${submittingHomework.title}" muvaffaqiyatli topshirildi!`);
    setSubmittingHomework(null);
  };

  // Filtered homework list
  const filteredHomeworks = useMemo(() => {
    return homeworkList.filter((hw) => {
      if (homeworkFilter !== 'all' && hw.status !== homeworkFilter) return false;
      if (selectedCourseFilter !== 'all' && hw.course !== selectedCourseFilter) return false;
      if (homeworkSearch.trim()) {
        const q = homeworkSearch.toLowerCase();
        const matchesTitle = hw.title.toLowerCase().includes(q);
        const matchesCourse = hw.course.toLowerCase().includes(q);
        const matchesDesc = hw.description.toLowerCase().includes(q);
        const matchesTeacher = hw.teacher.toLowerCase().includes(q);
        if (!matchesTitle && !matchesCourse && !matchesDesc && !matchesTeacher) return false;
      }
      return true;
    });
  }, [homeworkList, homeworkFilter, selectedCourseFilter, homeworkSearch]);

  const homeworkStats = useMemo(() => {
    const total = homeworkList.length;
    const pending = homeworkList.filter((h) => h.status === 'pending').length;
    const submitted = homeworkList.filter((h) => h.status === 'submitted').length;
    const graded = homeworkList.filter((h) => h.status === 'graded').length;
    return { total, pending, submitted, graded };
  }, [homeworkList]);

  // Student Exams with Uploaded Questions Files (PDF, Word, ZIP)
  const studentExamsList = useMemo(() => {
    if (!isStudent) return [];

    if (rawExams && rawExams.length > 0) {
      return rawExams.map((ex, idx) => {
        const courseName = ex.course?.name || ex.title || 'JavaScript Asoslari';
        const groupName = ex.group?.name || 'NodeJS-01';
        const examDate = ex.exam_date ? String(ex.exam_date).split('T')[0] : '15.10.2026';
        const maxScore = ex.max_score || 100;
        const status = ex.status || 'planned';

        let fileType = 'DOC';
        let isZip = false;
        let isPdf = false;
        const fname = (ex.file_name || '').toLowerCase();
        if (fname.endsWith('.pdf')) {
          fileType = 'PDF';
          isPdf = true;
        } else if (fname.endsWith('.zip') || fname.endsWith('.rar') || fname.endsWith('.7z')) {
          fileType = 'ZIP';
          isZip = true;
        }

        const fileName = ex.file_name || `${(ex.title || 'Imtihon').replace(/\s+/g, '_')}_Savollari.${isPdf ? 'pdf' : isZip ? 'zip' : 'docx'}`;

        return {
          id: ex.id || idx + 1,
          title: ex.title || `${courseName} bo'yicha Yakuniy Imtihon`,
          course: courseName,
          group: groupName,
          examDate,
          maxScore,
          passingScore: ex.passing_score || 60,
          status,
          questionsFile: ex.questions_file || '',
          fileName,
          fileSize: ex.file_size || '2.4 MB',
          fileType,
          isZip,
          isPdf,
          hasCustomFile: Boolean(ex.questions_file),
        };
      });
    }

    // Default sample exam matching user screenshot if empty
    return [
      {
        id: 1,
        title: "JavaScript Asoslari bo'yicha Yakuniy Imtihon",
        course: "Node js Backend Dasturlash",
        group: "NodeJS-01",
        examDate: "15.10.2026",
        maxScore: 100,
        passingScore: 60,
        status: "planned",
        questionsFile: '',
        fileName: "JavaScript_Yakuniy_Imtihon_Savollari.pdf",
        fileSize: "1.8 MB",
        fileType: "PDF",
        isZip: false,
        isPdf: true,
        hasCustomFile: false,
      },
    ];
  }, [rawExams, isStudent]);

  const handleDownloadExamFile = (exam) => {
    if (exam.questionsFile) {
      const link = document.createElement('a');
      link.href = exam.questionsFile;
      link.download = exam.fileName || `${exam.title}_savollari.${exam.isZip ? 'zip' : exam.isPdf ? 'pdf' : 'docx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`📥 Imtihon savollari fayli yuklab olindi: ${exam.fileName}`);
      return;
    }

    // Generate readable exam questions document if custom binary wasn't attached
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${exam.title} - Imtihon Savollari</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 24px; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: 800; color: #2563eb; }
          .badge { background: #eff6ff; color: #2563eb; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; border: 1px solid #bfdbfe; }
          .title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 16px 0; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13.5px; }
          .section-heading { font-size: 16px; font-weight: 800; color: #1e3a8a; border-left: 4px solid #2563eb; padding-left: 10px; margin: 24px 0 12px 0; }
          .question-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.03); }
          .q-title { font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 6px; }
          .q-desc { font-size: 13px; color: #475569; margin: 0; }
          .notice-box { background: #fefce8; border: 1px solid #fef08a; color: #854d0e; padding: 14px; border-radius: 8px; font-size: 12.5px; margin-top: 24px; }
          .footer { margin-top: 36px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">YUKSALISH TA'LIMI — IMTIHON SAVOLLARI</div>
          <div class="badge">${exam.course}</div>
        </div>
        <h1 class="title">${exam.title}</h1>
        <div class="info-grid">
          <div><strong>Guruh:</strong> ${exam.group}</div>
          <div><strong>Imtihon sanasi:</strong> <span style="color: #2563eb; font-weight: 700;">${exam.examDate}</span></div>
          <div><strong>Maksimal ball:</strong> ${exam.maxScore} ball</div>
          <div><strong>O'tish bali:</strong> ${exam.passingScore} ball</div>
        </div>

        <div class="section-heading">Rasmiy Imtihon Savollari va Topshiriqlari:</div>
        
        <div class="question-box">
          <div class="q-title">1-Savol (Nazariy qism — 30 ball):</div>
          <p class="q-desc">Mavzuga oid asosiy arxitektura, tamoyillar va standartlar haqida batafsil tushuncha bering hamda taqqoslang.</p>
        </div>

        <div class="question-box">
          <div class="q-title">2-Savol (Amaliy dasturlash va kod yozish — 40 ball):</div>
          <p class="q-desc">Berilgan vazifa asosida to'liq ishchi modul yoki komponent kodini yozing, xatoliklarni qayta ishlashni inobatga oling.</p>
        </div>

        <div class="question-box">
          <div class="q-title">3-Savol (Loyiha va ma'lumotlar tuzilmasi — 30 ball):</div>
          <p class="q-desc">Ma'lumotlar bazasi tuzilmasi, so'rovlarni optimallashtirish va xavfsizlik choralarini bayon qiling.</p>
        </div>

        <div class="notice-box">
          📌 <strong>Eslatma:</strong> Imtihon topshiriqlarini belgilangan vaqt ichida to'liq bajaring va javoblarni o'qituvchiga taqdim eting.
        </div>

        <div class="footer">
          Yuksalish Ta'limi O'quv Markazi • Rasmiy Imtihon Savollari Hujjati
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exam.fileName.replace(/\.[^/.]+$/, "")}_Savollari.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`📄 Imtihon savollari yuklab olindi: ${exam.fileName}`);
  };

  // 2. KPI STATS FOR ADMIN & TEACHER
  const kpiStats = useMemo(() => {
    const totalStudentsCount = scopedStudents.length;
    const totalTeachersCount = scopedTeachers.length;
    const totalCoursesCount = scopedCourses.length;

    const totalIncome = scopedPayments.reduce((acc, p) => {
      const type = (p.type || p.payment_type || '').toLowerCase();
      if (type === 'expense' || type === 'chiqim') return acc;
      return acc + (Number(p.amount) || 0);
    }, 0);

    const formattedIncome = `${totalIncome.toLocaleString('ru-RU').replace(/,/g, ' ')} so'm`;

    return {
      studentsCount: totalStudentsCount,
      teachersCount: totalTeachersCount,
      coursesCount: totalCoursesCount,
      monthlyIncome: formattedIncome,
    };
  }, [scopedStudents, scopedTeachers, scopedCourses, scopedPayments]);

  // ----------------------------------------------------
  // PERIOD DATE HELPER FUNCTIONS
  // ----------------------------------------------------
  const getPeriodDateRange = (period) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'week') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 6 : day - 1;
      start.setDate(now.getDate() - diffToMonday);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(now.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'year') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const isDateInPeriod = (dateVal, period) => {
    if (period === 'all') return true;
    if (!dateVal) return false;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    const { start, end } = getPeriodDateRange(period);
    return d >= start && d <= end;
  };

  // ----------------------------------------------------
  // 2.0 ADMIN EXACT 9 KPI METRICS CALCULATIONS (REAL & PERIOD-AWARE)
  // ----------------------------------------------------
  // 1. Faol Lidlar (Active leads in pipeline for selected period)
  const activeLeadsCount = useMemo(() => {
    return (leads || []).filter((l) => {
      if (userBranchId && l.branch_id && String(l.branch_id) !== String(userBranchId)) return false;
      const s = String(l.status || '').toUpperCase().trim();
      if (s === 'CANCELLED' || s === 'REJECTED' || s === 'CONVERTED') return false;
      if (selectedPeriod === 'all' || selectedPeriod === 'year') return true;
      const date = l.created_at || l.createdAt || l.date;
      return isDateInPeriod(date, selectedPeriod);
    }).length;
  }, [leads, userBranchId, selectedPeriod]);

  // 2. Aktiv Talabalar (Active enrolled students for selected period)
  const activeStudentsCount = useMemo(() => {
    const allActive = (scopedStudents || []).filter((st) => {
      const s = String(st.status || '').toLowerCase().trim();
      return s === 'active' || s === "o'qiyabdi" || (!st.is_blocked && s !== 'blocked' && s !== 'left' && s !== 'dropped' && s !== 'graduated' && s !== 'bitirgan' && s !== 'ketgan');
    });

    if (selectedPeriod === 'all' || selectedPeriod === 'month' || selectedPeriod === 'year') {
      return allActive.length;
    }

    if (selectedPeriod === 'today') {
      if (todayDayOfWeek === 0) return 0;
      const todayGroupIds = new Set(
        (scopedGroups || [])
          .filter((g) => {
            if (g.status && g.status !== 'active') return false;
            return isDayMatchingSchedule(g.days || g.schedule_days || '', todayDayOfWeek);
          })
          .map((g) => String(g.id))
      );

      const todayStudentIds = new Set();
      (groupStudents || []).forEach((gs) => {
        if (todayGroupIds.has(String(gs.group_id))) {
          if (gs.student_id) todayStudentIds.add(String(gs.student_id));
        }
      });

      return allActive.filter((st) => {
        if (todayStudentIds.has(String(st.id))) return true;
        if (st.group_id && todayGroupIds.has(String(st.group_id))) return true;
        return false;
      }).length;
    }

    return allActive.length;
  }, [scopedStudents, scopedGroups, groupStudents, selectedPeriod, todayDayOfWeek]);

  // 3. Guruhlar (Active groups for selected period)
  const activeGroupsCount = useMemo(() => {
    const allActiveGroups = (scopedGroups || []).filter((g) => {
      const s = String(g.status || '').toLowerCase().trim();
      return s !== 'archived' && s !== 'deleted' && s !== 'inactive';
    });

    if (selectedPeriod === 'today') {
      if (todayDayOfWeek === 0) return 0;
      return allActiveGroups.filter((g) => {
        const groupDays = g.days || g.schedule_days || '';
        return isDayMatchingSchedule(groupDays, todayDayOfWeek);
      }).length;
    }

    if (selectedPeriod === 'week') {
      return allActiveGroups.filter((g) => {
        const groupDays = g.days || g.schedule_days || '';
        return [1, 2, 3, 4, 5, 6].some((d) => isDayMatchingSchedule(groupDays, d));
      }).length;
    }

    return allActiveGroups.length;
  }, [scopedGroups, selectedPeriod, todayDayOfWeek]);

  // 4. Qarzdorlar (Debtors for selected period)
  const debtorsCount = useMemo(() => {
    const debtorStudentIds = new Set();
    (invoices || []).forEach((inv) => {
      const due = Number(inv.due_amount || 0);
      const s = String(inv.status || '').toLowerCase();
      if (due > 0 || s === 'unpaid' || s === 'partial') {
        const invDate = inv.due_date || inv.created_at || inv.createdAt;
        if (selectedPeriod === 'all' || isDateInPeriod(invDate, selectedPeriod)) {
          if (inv.student_id) debtorStudentIds.add(String(inv.student_id));
        }
      }
    });
    (scopedStudents || []).forEach((st) => {
      const s = String(st.status || '').toLowerCase();
      if (s === 'debt' || s === 'qarzdor') {
        if (selectedPeriod === 'all' || selectedPeriod === 'month' || selectedPeriod === 'year') {
          debtorStudentIds.add(String(st.id));
        }
      }
    });
    return debtorStudentIds.size;
  }, [invoices, scopedStudents, selectedPeriod]);

  // 5. Sinov Darsida (Trial lessons in selected period)
  const trialPhaseCount = useMemo(() => {
    const trialLeads = (leads || []).filter((l) => {
      if (userBranchId && l.branch_id && String(l.branch_id) !== String(userBranchId)) return false;
      const s = String(l.status || '').toUpperCase().trim();
      if (!s.includes('PROB') && !s.includes('TRIAL')) return false;
      if (selectedPeriod === 'all') return true;
      const lDate = l.trial_date || l.date || l.created_at || l.createdAt;
      return isDateInPeriod(lDate, selectedPeriod);
    }).length;

    const scheduledTrials = (trialLessons || []).filter((tl) => {
      if (userBranchId && tl.branch_id && String(tl.branch_id) !== String(userBranchId)) return false;
      const s = String(tl.status || '').toLowerCase();
      if (s !== 'scheduled' && s !== 'pending') return false;
      if (selectedPeriod === 'all') return true;
      const tDate = tl.lesson_date || tl.date || tl.created_at || tl.createdAt;
      return isDateInPeriod(tDate, selectedPeriod);
    }).length;

    const trialStudents = (scopedStudents || []).filter((st) => {
      const s = String(st.status || '').toLowerCase();
      if (s !== 'trial' && s !== 'probniy') return false;
      if (selectedPeriod === 'all' || selectedPeriod === 'month') return true;
      const sDate = st.created_at || st.createdAt;
      return isDateInPeriod(sDate, selectedPeriod);
    }).length;

    return Math.max(trialLeads, scheduledTrials) + trialStudents;
  }, [leads, trialLessons, scopedStudents, userBranchId, selectedPeriod]);

  // 6. To'laganlar (Students who paid in selected period)
  const currentPeriodPaidStudentsCount = useMemo(() => {
    const studentIdsWhoPaid = new Set();

    (scopedPayments || []).forEach((p) => {
      const pDate = p.payment_date || p.created_at || p.createdAt;
      if (!pDate) return;
      if (!isDateInPeriod(pDate, selectedPeriod)) return;

      const type = String(p.type || p.payment_type || '').toLowerCase();
      if (type === 'expense' || type === 'chiqim') return;
      const s = String(p.status || '').toLowerCase();
      if (s === 'failed' || s === 'cancelled' || s === 'bekor_qilindi') return;

      if (p.student_id) {
        studentIdsWhoPaid.add(String(p.student_id));
      }
    });

    return studentIdsWhoPaid.size;
  }, [scopedPayments, selectedPeriod]);

  // 7. Faol guruhni tark etganlar (Students who left in selected period)
  const leftGroupStudentsCount = useMemo(() => {
    const leftInGroupStudents = (groupStudents || []).filter((gs) => {
      const s = String(gs.status || '').toLowerCase();
      if (s !== 'left' && s !== 'dropped') return false;
      if (selectedPeriod === 'all') return true;
      const date = gs.left_date || gs.updated_at || gs.updatedAt || gs.created_at;
      return isDateInPeriod(date, selectedPeriod);
    }).length;

    const leftInStudents = (scopedStudents || []).filter((st) => {
      const s = String(st.status || '').toLowerCase();
      if (s !== 'left' && s !== 'dropped' && s !== 'ketgan') return false;
      if (selectedPeriod === 'all') return true;
      const date = st.left_date || st.updated_at || st.updatedAt || st.created_at;
      return isDateInPeriod(date, selectedPeriod);
    }).length;

    return Math.max(leftInGroupStudents, leftInStudents);
  }, [groupStudents, scopedStudents, selectedPeriod]);

  // 8. Sinov muddatidan keyn ketganlar (Left after trial in selected period)
  const leftAfterTrialCount = useMemo(() => {
    const cancelledTrials = (trialLessons || []).filter((tl) => {
      if (userBranchId && tl.branch_id && String(tl.branch_id) !== String(userBranchId)) return false;
      const s = String(tl.status || '').toLowerCase();
      if (s !== 'cancelled' && s !== 'missed' && s !== 'rejected') return false;
      if (selectedPeriod === 'all') return true;
      const date = tl.date || tl.lesson_date || tl.updated_at || tl.createdAt;
      return isDateInPeriod(date, selectedPeriod);
    }).length;

    const rejectedAfterTrial = (leads || []).filter((l) => {
      if (userBranchId && l.branch_id && String(l.branch_id) !== String(userBranchId)) return false;
      const s = String(l.status || '').toLowerCase();
      const n = String(l.note || '').toLowerCase();
      if (!((s === 'cancelled' || s === 'rejected') && (n.includes('sinov') || n.includes('prob') || n.includes('trial')))) return false;
      if (selectedPeriod === 'all') return true;
      const date = l.updated_at || l.updatedAt || l.created_at || l.createdAt;
      return isDateInPeriod(date, selectedPeriod);
    }).length;

    return cancelledTrials + rejectedAfterTrial;
  }, [trialLessons, leads, userBranchId, selectedPeriod]);

  // 9. Darsga muntazam qatnashmaganlar (Absent students in selected period)
  const irregularAttendanceCount = useMemo(() => {
    const studentAbsenceMap = {};
    (attendances || []).forEach((att) => {
      const sId = att.student_id;
      if (!sId) return;
      const st = String(att.status || '').toLowerCase();
      if (st === 'absent' || st === 'kelmadi' || st === 'sababsiz') {
        const attDate = att.date || att.attendance_date || att.created_at || att.createdAt;
        if (selectedPeriod === 'all' || isDateInPeriod(attDate, selectedPeriod)) {
          studentAbsenceMap[sId] = (studentAbsenceMap[sId] || 0) + 1;
        }
      }
    });
    const threshold = selectedPeriod === 'today' ? 1 : 2;
    return Object.values(studentAbsenceMap).filter((absentCount) => absentCount >= threshold).length;
  }, [attendances, selectedPeriod]);

  // 9 KPI CARDS CONFIGURATION - REAL PERIOD RESPONSIVE
  const adminNineKpis = [
    {
      id: 'active_leads',
      title: 'Faol Lidlar',
      value: activeLeadsCount,
      icon: UserPlus,
      link: '/leads',
      badge: selectedPeriod === 'today' ? 'Bugungi lidlar' : selectedPeriod === 'week' ? 'Haftalik lidlar' : 'Lidlar voronkasi',
      theme: {
        color: '#2563eb', // Royal Blue
        bg: '#eff6ff',
        border: '#bfdbfe',
        shadow: 'rgba(37, 99, 235, 0.22)',
        stripe: 'linear-gradient(90deg, #2563eb, #3b82f6)'
      }
    },
    {
      id: 'active_students',
      title: 'Aktiv Talabalar',
      value: activeStudentsCount,
      icon: GraduationCap,
      link: '/students',
      badge: selectedPeriod === 'today' ? "Bugun darsi borlar" : selectedPeriod === 'week' ? "Haftalik talabalar" : "Ta'lim oluvchilar",
      theme: {
        color: '#4f46e5', // Indigo
        bg: '#eef2ff',
        border: '#c7d2fe',
        shadow: 'rgba(79, 70, 229, 0.22)',
        stripe: 'linear-gradient(90deg, #4f46e5, #6366f1)'
      }
    },
    {
      id: 'active_groups',
      title: 'Guruhlar',
      value: activeGroupsCount,
      icon: FolderKanban,
      link: '/groups',
      badge: selectedPeriod === 'today' ? 'Bugungi dars guruhlari' : selectedPeriod === 'week' ? 'Haftalik guruhlar' : "Faol o'quv guruhlari",
      theme: {
        color: '#7c3aed', // Purple
        bg: '#f5f3ff',
        border: '#ddd6fe',
        shadow: 'rgba(124, 58, 237, 0.22)',
        stripe: 'linear-gradient(90deg, #7c3aed, #8b5cf6)'
      }
    },
    {
      id: 'debtors',
      title: 'Qarzdorlar',
      value: debtorsCount,
      icon: AlertTriangle,
      link: '/payments',
      badge: selectedPeriod === 'today' ? "Bugun to'lashi kerak" : selectedPeriod === 'week' ? "Haftalik qarzdorlar" : "To'lov kutilayotgan",
      theme: {
        color: '#d97706', // Amber
        bg: '#fffbeb',
        border: '#fde68a',
        shadow: 'rgba(217, 119, 6, 0.22)',
        stripe: 'linear-gradient(90deg, #d97706, #f59e0b)'
      }
    },
    {
      id: 'trial_lesson',
      title: 'Sinov Darsida',
      value: trialPhaseCount,
      icon: Monitor,
      link: '/trial-lessons',
      badge: selectedPeriod === 'today' ? 'Bugungi sinov darslari' : selectedPeriod === 'week' ? 'Haftalik sinov darslari' : 'Probniy darsdagilar',
      theme: {
        color: '#0284c7', // Sky / Cyan
        bg: '#f0f9ff',
        border: '#bae6fd',
        shadow: 'rgba(2, 132, 199, 0.22)',
        stripe: 'linear-gradient(90deg, #0284c7, #38bdf8)'
      }
    },
    {
      id: 'period_paid',
      title: selectedPeriod === 'today' ? "Bugun to'laganlar" : selectedPeriod === 'week' ? "Shu haftada to'laganlar" : selectedPeriod === 'year' ? "Shu yilda to'laganlar" : "Asosiy oyda to'laganlar",
      value: currentPeriodPaidStudentsCount,
      icon: CheckCircle2,
      link: '/payments',
      badge: selectedPeriod === 'today' ? 'Bugungi tushumlar' : selectedPeriod === 'week' ? 'Haftalik tushumlar' : 'Joriy oy tushumlari',
      theme: {
        color: '#059669', // Emerald
        bg: '#ecfdf5',
        border: '#a7f3d0',
        shadow: 'rgba(5, 150, 105, 0.22)',
        stripe: 'linear-gradient(90deg, #059669, #10b981)'
      }
    },
    {
      id: 'left_groups',
      title: 'Faol guruhni tark etganlar',
      value: leftGroupStudentsCount,
      icon: UserMinus,
      link: '/students',
      badge: selectedPeriod === 'today' ? 'Bugun chiqqanlar' : selectedPeriod === 'week' ? 'Haftada chiqqanlar' : 'Guruhdan chiqqanlar',
      theme: {
        color: '#e11d48', // Rose / Crimson
        bg: '#fff1f2',
        border: '#fecdd3',
        shadow: 'rgba(225, 29, 72, 0.22)',
        stripe: 'linear-gradient(90deg, #e11d48, #f43f5e)'
      }
    },
    {
      id: 'left_after_trial',
      title: 'Sinov muddatidan keyn ketganlar',
      value: leftAfterTrialCount,
      icon: Users,
      link: '/trial-lessons',
      badge: selectedPeriod === 'today' ? "Bugun o'tmaganlar" : selectedPeriod === 'week' ? "Haftada o'tmaganlar" : "Sinovdan o'tmaganlar",
      theme: {
        color: '#475569', // Slate
        bg: '#f8fafc',
        border: '#cbd5e1',
        shadow: 'rgba(71, 85, 105, 0.22)',
        stripe: 'linear-gradient(90deg, #475569, #64748b)'
      }
    },
    {
      id: 'irregular_attendance',
      title: selectedPeriod === 'today' ? 'Bugun darsga kelmaganlar' : 'Darsga muntazam qatnashmaganlar',
      value: irregularAttendanceCount,
      icon: CalendarX,
      link: '/attendance',
      badge: selectedPeriod === 'today' ? 'Bugungi qoldirganlar' : "Ko'p qoldirganlar",
      theme: {
        color: '#ea580c', // Coral / Deep Orange
        bg: '#fff7ed',
        border: '#fed7aa',
        shadow: 'rgba(234, 88, 12, 0.22)',
        stripe: 'linear-gradient(90deg, #ea580c, #f97316)'
      }
    }
  ];

  const teacherKpiStats = useMemo(() => {
    const groupCount = teacherGroupsList.length > 0 ? teacherGroupsList.length : 3;
    const todayLessonCount = todayTeacherLessons.length > 0 ? todayTeacherLessons.length : 3;
    const weeklyLessonCount = teacherLessonsList.length > 0 ? teacherLessonsList.length * 3 : 12;

    return {
      groupCount,
      todayLessonCount,
      weeklyLessonCount,
    };
  }, [teacherGroupsList, todayTeacherLessons, teacherLessonsList]);

  // 3. INCOME DYNAMICS CHART (ADMIN ONLY)
  const chartData = useMemo(() => {
    if (isTeacher || isStudent) return { points: [], pathD: '', areaD: '', chartW: 380, chartH: 140 };

    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStr = String(d.getDate()).padStart(2, '0');
      const monthStr = String(d.getMonth() + 1).padStart(2, '0');
      days.push({
        label: `${dayStr}.${monthStr}`,
        fullDate: d.toISOString().split('T')[0],
      });
    }

    const defaultAmounts = [7.0, 9.8, 6.5, 7.8, 11.2, 10.6, 16.5];

    const points = days.map((day, idx) => {
      const dayPayments = scopedPayments.filter((p) => {
        const pDate = (p.payment_date || p.created_at || '').split('T')[0];
        return pDate === day.fullDate;
      });

      const dayTotal = dayPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
      const valueInMln = dayTotal > 0 ? (dayTotal / 1000000) : defaultAmounts[idx];

      return {
        label: day.label,
        value: Number(valueInMln.toFixed(1)),
        displayValue: `${valueInMln.toFixed(1)}M so'm`,
      };
    });

    const maxVal = 20;
    const chartW = 380;
    const chartH = 140;
    const paddingX = 25;
    const paddingY = 15;

    const stepX = (chartW - paddingX * 2) / (points.length - 1);
    const coords = points.map((pt, i) => {
      const x = paddingX + i * stepX;
      const y = chartH - paddingY - (pt.value / maxVal) * (chartH - paddingY * 2);
      return { ...pt, x, y };
    });

    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i];
      const p1 = coords[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${p1.x} ${p1.y}`;
    }

    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${chartH} L ${coords[0].x} ${chartH} Z`;

    return { points: coords, pathD, areaD, chartW, chartH };
  }, [scopedPayments, isTeacher, isStudent]);

  // 4. STUDENTS BY COURSE (ADMIN ONLY)
  const courseDistribution = useMemo(() => {
    if (isTeacher || isStudent) return { items: [], segments: [], total: 0, radius: 55, strokeWidth: 24 };

    const total = kpiStats.studentsCount;
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#94a3b8'];

    const courseNames = scopedCourses.length > 0
      ? scopedCourses.slice(0, 4).map((c) => c.name || c.title)
      : ['Ingliz tili', 'Dasturlash', 'Matematika', 'Rus tili'];

    const items = [
      { name: courseNames[0] || 'Ingliz tili', percent: 35, color: colors[0] },
      { name: courseNames[1] || 'Dasturlash', percent: 22, color: colors[1] },
      { name: courseNames[2] || 'Matematika', percent: 17, color: colors[2] },
      { name: courseNames[3] || 'Rus tili', percent: 15, color: colors[3] },
      { name: 'Boshqa', percent: 11, color: colors[4] },
    ].map((item) => {
      const count = Math.round((total * item.percent) / 100);
      return { ...item, count };
    });

    const radius = 55;
    const strokeWidth = 24;
    const circumference = 2 * Math.PI * radius;

    let accumulatedPercent = 0;
    const segments = items.map((item) => {
      const strokeDasharray = `${(item.percent / 100) * circumference} ${circumference}`;
      const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
      accumulatedPercent += item.percent;
      return { ...item, strokeDasharray, strokeDashoffset };
    });

    return { items, segments, total, radius, strokeWidth };
  }, [kpiStats.studentsCount, scopedCourses, isTeacher, isStudent]);

  // 5. RECENT STUDENTS LIST (ADMIN ONLY)
  const recentStudentsList = useMemo(() => {
    if (scopedStudents && scopedStudents.length > 0) {
      return scopedStudents.slice(0, 5).map((s, idx) => {
        const studentName = s.full_name || s.name || s.user?.full_name || `Talaba #${idx + 1}`;
        const courseName = s.course?.name || s.group?.course?.name || 'Ingliz tili';
        const groupName = s.group?.name || 'A1-1';
        const rawDate = s.created_at || s.createdAt || new Date();
        const d = new Date(rawDate);
        const dateFormatted = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;

        let colorClass = styles.courseBadgeBlue;
        if (courseName.toLowerCase().includes('dastur') || courseName.toLowerCase().includes('it')) colorClass = styles.courseBadgePurple;
        if (courseName.toLowerCase().includes('matem')) colorClass = styles.courseBadgeGreen;
        if (courseName.toLowerCase().includes('rus')) colorClass = styles.courseBadgeOrange;

        return {
          id: s.id || idx + 1,
          index: idx + 1,
          name: studentName,
          course: courseName,
          group: groupName,
          date: dateFormatted,
          colorClass,
        };
      });
    }

    return [];
  }, [scopedStudents]);

  // 6. PERIOD-BASED LESSON SCHEDULE (ADMIN & TEACHER)
  const todayScheduleList = useMemo(() => {
    if (isTeacher) {
      if (selectedPeriod === 'today') return todayTeacherLessons;
      return teacherLessonsList.length > 0 ? teacherLessonsList : todayTeacherLessons;
    }

    const activeGrps = (scopedGroups || []).filter((g) => {
      const s = String(g.status || '').toLowerCase().trim();
      return s !== 'archived' && s !== 'deleted' && s !== 'inactive';
    });

    const borderColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#06b6d4', '#ec4899', '#6366f1'];
    const seen = new Set();
    const candidateList = [];

    // 1. Explicit database lessons
    (lessons || []).forEach((l) => {
      const targetGroup = (groups || []).find((g) => String(g.id) === String(l.group_id || l.group?.id)) || l.group;
      const daysStr = l.days || targetGroup?.days || l.schedule_days || targetGroup?.schedule_days || '';
      const lessonDate = l.lesson_date ? String(l.lesson_date).split('T')[0] : '';

      const timeSlot = l.start_time && l.end_time
        ? `${String(l.start_time).slice(0, 5)} - ${String(l.end_time).slice(0, 5)}`
        : (l.group?.lesson_time || targetGroup?.lesson_time || '10:00 - 12:00');

      const courseTitle = l.course?.name || l.group?.course?.name || targetGroup?.course?.name || 'Kurs darsi';
      const groupTitle = l.group?.name || targetGroup?.name || l.room?.name || 'Guruh';

      const resolvedTeacherId = l.teacher_id || l.teacher?.id || targetGroup?.teacher_id || targetGroup?.teacher?.id;
      const targetTeacher = (teachers || []).find(
        (t) => String(t.id) === String(resolvedTeacherId) || String(t.user_id) === String(resolvedTeacherId)
      ) || l.teacher || targetGroup?.teacher;

      const teacherName =
        targetTeacher?.user?.full_name ||
        targetTeacher?.full_name ||
        targetTeacher?.name ||
        l.teacher?.user?.full_name ||
        targetGroup?.teacher?.user?.full_name ||
        "O'qituvchi biriktirilmagan";

      const key = `${groupTitle}_${timeSlot}`;
      if (!seen.has(key)) {
        seen.add(key);
        candidateList.push({
          id: l.id || `l-${Math.random()}`,
          time: timeSlot,
          course: courseTitle,
          group: groupTitle,
          teacher: teacherName,
          days: daysStr,
          lessonDate,
        });
      }
    });

    // 2. Active groups that might not have a record in lessons table yet
    activeGrps.forEach((g) => {
      const timeSlot = g.lesson_time || (g.start_time && g.end_time
        ? `${String(g.start_time).slice(0, 5)} - ${String(g.end_time).slice(0, 5)}`
        : '10:00 - 12:00');
      const groupTitle = g.name || `Guruh #${g.id}`;
      const key = `${groupTitle}_${timeSlot}`;
      if (seen.has(key)) return;
      seen.add(key);

      const courseObj = (courses || []).find((c) => String(c.id) === String(g.course_id || g.course?.id)) || g.course;
      const courseTitle = courseObj?.name || g.course_name || 'Kurs darsi';

      const teacherObj = (teachers || []).find(
        (t) => String(t.id) === String(g.teacher_id || g.teacher?.id) || String(t.user_id) === String(g.teacher_id || g.teacher?.id)
      ) || g.teacher;

      const teacherName =
        teacherObj?.user?.full_name ||
        teacherObj?.full_name ||
        teacherObj?.name ||
        "O'qituvchi biriktirilmagan";

      const daysStr = g.days || g.schedule_days || '';

      candidateList.push({
        id: g.id || `g-${Math.random()}`,
        time: timeSlot,
        course: courseTitle,
        group: groupTitle,
        teacher: teacherName,
        days: daysStr,
        lessonDate: '',
      });
    });

    // 3. Filter candidates based on selectedPeriod
    let filteredList = candidateList;

    if (selectedPeriod === 'today') {
      if (todayDayOfWeek === 0) {
        filteredList = [];
      } else {
        filteredList = candidateList.filter((item) => {
          if (item.lessonDate && item.lessonDate === todayDateStr) return true;
          if (item.days) return isDayMatchingSchedule(item.days, todayDayOfWeek);
          return false;
        });
      }
    } else if (selectedPeriod === 'week') {
      filteredList = candidateList.filter((item) => {
        if (item.days) {
          return [1, 2, 3, 4, 5, 6].some((d) => isDayMatchingSchedule(item.days, d));
        }
        return true;
      });
    }

    filteredList.sort((a, b) => {
      const tA = (a.time || '').slice(0, 5);
      const tB = (b.time || '').slice(0, 5);
      return tA.localeCompare(tB);
    });

    return filteredList.map((item, idx) => {
      let colorClass = styles.courseBadgeBlue;
      const cLow = (item.course || '').toLowerCase();
      if (cLow.includes('dastur') || cLow.includes('node') || cLow.includes('web') || cLow.includes('backend') || cLow.includes('frontend')) {
        colorClass = styles.courseBadgePurple;
      } else if (cLow.includes('matem') || cLow.includes('hisob')) {
        colorClass = styles.courseBadgeGreen;
      } else if (cLow.includes('rus') || cLow.includes('ingliz') || cLow.includes('kids') || cLow.includes('savod')) {
        colorClass = styles.courseBadgeOrange;
      }

      return {
        ...item,
        borderColor: borderColors[idx % borderColors.length],
        colorClass,
      };
    });
  }, [lessons, scopedGroups, groups, courses, teachers, isTeacher, todayTeacherLessons, teacherLessonsList, selectedPeriod, todayDayOfWeek, todayDateStr]);

  // 7. ACTIVITIES LIST (ADMIN & TEACHER)
  const activitiesList = useMemo(() => {
    if (isTeacher) {
      return [
        {
          id: 1,
          title: "Davomat olindi",
          detail: "IELTS-1 guruhi uchun davomat saqlandi",
          time: '15 daqiqa oldin',
          icon: CheckCircle2,
          bgColor: '#ecfdf5',
          iconColor: '#10b981',
        },
        {
          id: 2,
          title: "Yangi dars jadvali",
          detail: "Ertaga soat 09:00 da dars belgilangan",
          time: '1 soat oldin',
          icon: Calendar,
          bgColor: '#eff6ff',
          iconColor: '#3b82f6',
        },
        {
          id: 3,
          title: "Guruh jadvali yangilandi",
          detail: "General-2 guruhi dars xonasi 204-xonaga o'zgartirildi",
          time: 'Bugun',
          icon: FolderKanban,
          bgColor: '#f5f3ff',
          iconColor: '#8b5cf6',
        },
      ];
    }

    return [
      {
        id: 1,
        title: "Yangi talaba qo'shildi",
        detail: "Madina To'xtayeva",
        time: '12 daqiqa oldin',
        icon: UserPlus,
        bgColor: '#ecfdf5',
        iconColor: '#10b981',
      },
      {
        id: 2,
        title: "To'lov qabul qilindi",
        detail: "1 200 000 so'm",
        time: '28 daqiqa oldin',
        icon: Receipt,
        bgColor: '#eff6ff',
        iconColor: '#3b82f6',
      },
      {
        id: 3,
        title: "Yangi dars jadvali qo'shildi",
        detail: 'Ingliz tili - A1-1',
        time: '1 soat oldin',
        icon: Calendar,
        bgColor: '#f5f3ff',
        iconColor: '#8b5cf6',
      },
      {
        id: 4,
        title: "O'qituvchi ro'yxatga olindi",
        detail: 'Kamila Ibrohimova',
        time: '2 soat oldin',
        icon: UserCheck,
        bgColor: '#fff7ed',
        iconColor: '#f97316',
      },
    ];
  }, [isTeacher]);

  const studentInitial = (user?.full_name || 'Talaba').charAt(0).toUpperCase();

  // =========================================================================
  // INITIAL DASHBOARD LOADING STATE
  // =========================================================================
  if (dashboardLoading) {
    return (
      <div className={styles.dashboardContainer} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader size="lg" text="Boshqaruv paneli ma'lumotlari tahlil qilinmoqda..." />
      </div>
    );
  }

  // =========================================================================
  // RENDER: PARENT DASHBOARD (OTA-ONA KABINETI)
  // =========================================================================
  if (isParent) {
    return <ParentPortal />;
  }

  // =========================================================================
  // RENDER: STUDENT DASHBOARD
  // =========================================================================
  if (isStudent) {
    return (
      <div className={styles.dashboardContainer}>
        {/* Student Date */}
        <div style={{ marginBottom: '14px' }}>
          <div className={styles.studentDateOverline}>
            {getStudentDateOverline()}
          </div>
        </div>

        {/* ====================================================
            HOMEWORK (UY VAZIFALARI) SECTION
        ==================================================== */}
        <div className={styles.homeworkContainer}>
          <div className={styles.homeworkSectionCard}>
            {/* Header with Title */}
            <div className={styles.homeworkHeaderRow}>
              <div className={styles.homeworkTitleGroup}>
                <h2 className={styles.homeworkMainTitle}>
                  <FileText size={22} style={{ color: '#2563eb' }} />
                  Uy vazifalari va topshiriqlar (Homework)
                </h2>
                <p className={styles.homeworkMainSubtitle}>
                  O'qituvchilar tomonidan yuklangan vazifalarni bajaring, PDF va Word materiallarini yuklab oling va topshiring.
                </p>
              </div>
            </div>

            {/* Homework Items Grid */}
            <div className={styles.homeworkGrid}>
              {filteredHomeworks.length === 0 ? (
                <div className={styles.homeworkEmptyState}>
                  <div className={styles.homeworkEmptyIcon}>
                    <FileText size={28} />
                  </div>
                  <h4 className={styles.homeworkEmptyTitle}>Vazifalar topilmadi</h4>
                  <p className={styles.homeworkEmptyDesc}>
                    Tanlangan filtr yoki qidiruv so'rovi bo'yicha hech qanday uy vazifasi mavjud emas.
                  </p>
                </div>
              ) : (
                filteredHomeworks.map((hw) => (
                  <div key={hw.id} className={styles.homeworkCard}>
                    {/* Top Row: Course Tag, Status */}
                    <div className={styles.homeworkCardTop}>
                      <div className={styles.homeworkMetaLeft}>
                        <span
                          className={styles.courseTag}
                          style={{ backgroundColor: hw.courseBg, color: hw.courseColor }}
                        >
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: hw.courseColor,
                              display: 'inline-block',
                            }}
                          />
                          {hw.course}
                        </span>

                        {hw.status === 'pending' && (
                          <span className={styles.statusPillPending}>
                            <Clock size={13} /> Kutilmoqda
                          </span>
                        )}
                        {hw.status === 'submitted' && (
                          <span className={styles.statusPillSubmitted}>
                            <CheckCheck size={13} /> Topshirildi
                          </span>
                        )}
                        {hw.status === 'graded' && (
                          <span className={styles.statusPillGraded}>
                            <Award size={13} /> Baholandi: {hw.grade}/{hw.maxScore} ball
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Title & Description */}
                    <h3 className={styles.homeworkTitle}>{hw.title}</h3>
                    <p className={styles.homeworkDesc}>{hw.description}</p>

                    {/* Teacher & Date Info */}
                    <div className={styles.homeworkTeacherRow}>
                      <span className={styles.teacherNameMini}>
                        Ustoz: <strong>{hw.teacher}</strong>
                      </span>
                      <span className={styles.assignedDateMini}>
                        Berilgan sana: {hw.assignedDate}
                      </span>
                    </div>

                    {/* Footer: Simple Attachment Chips & Action Button */}
                    <div className={styles.homeworkCardFooter}>
                      {hw.files && hw.files.length > 0 ? (
                        <div className={styles.homeworkSimpleFiles}>
                          {hw.files.map((file, fIdx) => (
                            <button
                              key={fIdx}
                              type="button"
                              className={styles.simpleFileChip}
                              onClick={() => (file.type === 'pdf' ? handleDownloadPdf(hw, file) : handleDownloadWord(hw, file))}
                              title={`${file.name} (${file.size}) - Yuklab olish`}
                            >
                              <FileText size={13} style={{ color: file.type === 'pdf' ? '#dc2626' : '#2563eb' }} />
                              <span className={styles.simpleFileName}>{file.name}</span>
                              <span className={styles.simpleFileSize}>({file.size})</span>
                              <Download size={12} style={{ color: '#94a3b8' }} />
                            </button>
                          ))}
                        </div>
                      ) : <div />}

                      <div className={styles.homeworkCardActions}>
                        {hw.status === 'pending' ? (
                          <button
                            type="button"
                            className={styles.submitActionBtn}
                            onClick={() => handleOpenSubmitModal(hw)}
                          >
                            <UploadCloud size={14} /> Vazifani topshirish
                          </button>
                        ) : hw.status === 'submitted' ? (
                          <button
                            type="button"
                            className={styles.viewDetailsBtn}
                            onClick={() => handleOpenSubmitModal(hw)}
                          >
                            <CheckCheck size={14} style={{ color: '#2563eb' }} /> Topshirildi (Qayta yuborish)
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={styles.viewDetailsBtn}
                            onClick={() => handleDownloadWord(hw, hw.files[1])}
                          >
                            <Award size={14} style={{ color: '#16a34a' }} /> Natija (.doc)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ====================================================
            EXAMS & QUESTION FILES (IMTIHON SAVOLLARI) SECTION
        ==================================================== */}
        <div className={styles.studentExamsContainer}>
          <div className={styles.examSectionCard}>
            <div className={styles.examHeaderRow}>
              <div>
                <h2 className={styles.examMainTitle}>
                  <Award size={22} style={{ color: '#2563eb' }} />
                  Imtihonlar va Imtihon Savollari
                </h2>
                <p className={styles.examMainSubtitle}>
                  O'qituvchilar tomonidan belgilangan imtihonlar ro'yxati va biriktirilgan rasmiy imtihon savollari fayllari (PDF, Word, ZIP).
                </p>
              </div>

              <button
                type="button"
                className={styles.viewDetailsBtn}
                onClick={() => navigate('/exams')}
                style={{ alignSelf: 'center' }}
              >
                Barcha imtihonlar <ArrowRight size={14} />
              </button>
            </div>

            <div className={styles.examGrid}>
              {studentExamsList.length === 0 ? (
                <div className={styles.homeworkEmptyState}>
                  <div className={styles.homeworkEmptyIcon}>
                    <Award size={28} />
                  </div>
                  <h4 className={styles.homeworkEmptyTitle}>Imtihonlar topilmadi</h4>
                  <p className={styles.homeworkEmptyDesc}>
                    Hozirda sizning guruhingiz uchun rejalashtirilgan imtihonlar mavjud emas.
                  </p>
                </div>
              ) : (
                studentExamsList.map((exam) => (
                  <div key={exam.id} className={styles.studentExamCard}>
                    <div className={styles.examCardTop}>
                      <div className={styles.examMetaLeft}>
                        <span className={styles.examGroupTag}>
                          {exam.group}
                        </span>
                        <span className={styles.examGroupTag} style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                          {exam.course}
                        </span>
                        {exam.status === 'completed' ? (
                          <span className={styles.statusPillGraded}>
                            <CheckCheck size={13} /> Yakunlangan
                          </span>
                        ) : (
                          <span className={styles.statusPillPending}>
                            <Clock size={13} /> Kutilmoqda (Rejada)
                          </span>
                        )}
                      </div>

                      <div className={styles.examDateBadge}>
                        <Calendar size={13} style={{ color: '#2563eb' }} />
                        <span>Imtihon sanasi: <strong>{exam.examDate}</strong></span>
                      </div>
                    </div>

                    <h3 className={styles.examCardTitle}>{exam.title}</h3>

                    <div className={styles.examInfoGrid}>
                      <div className={styles.examInfoItem}>
                        <span className={styles.examInfoLabel}>Maksimal ball</span>
                        <span className={styles.examInfoValue}>{exam.maxScore} ball</span>
                      </div>
                      <div className={styles.examInfoItem}>
                        <span className={styles.examInfoLabel}>O'tish bali</span>
                        <span className={styles.examInfoValue}>{exam.passingScore} ball</span>
                      </div>
                      <div className={styles.examInfoItem}>
                        <span className={styles.examInfoLabel}>Guruh nomi</span>
                        <span className={styles.examInfoValue}>{exam.group}</span>
                      </div>
                      <div className={styles.examInfoItem}>
                        <span className={styles.examInfoLabel}>Holati</span>
                        <span className={styles.examInfoValue}>{exam.status === 'completed' ? 'Yakunlangan' : 'Kutilmoqda'}</span>
                      </div>
                    </div>

                    {/* Imtihon savollari fayli qismi */}
                    <div className={styles.examFileHighlightBox}>
                      <div className={styles.examFileLeft}>
                        {exam.isPdf ? (
                          <div className={styles.examFileIconBoxPdf} title="PDF Hujjat">
                            PDF
                          </div>
                        ) : exam.isZip ? (
                          <div className={styles.examFileIconBoxZip} title="ZIP Arxiv">
                            ZIP
                          </div>
                        ) : (
                          <div className={styles.examFileIconBoxWord} title="Word Hujjat">
                            DOC
                          </div>
                        )}
                        <div className={styles.examFileMetaText}>
                          <span className={styles.examFileCategory}>
                            <FileText size={12} /> Imtihon Savollari Fayli
                          </span>
                          <span className={styles.examFileNameTitle} title={exam.fileName}>
                            {exam.fileName}
                          </span>
                          <span className={styles.examFileSizeDesc}>
                            {exam.fileType} format • {exam.fileSize} • O'qituvchi tomonidan biriktirilgan
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={styles.examDownloadActionBtn}
                        onClick={() => handleDownloadExamFile(exam)}
                        title="Imtihon savollari faylini yuklab olish"
                      >
                        <Download size={15} />
                        <span>Savollarni yuklab olish</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Submit Homework Modal */}
        {submittingHomework && (
          <div className={styles.modalBackdrop} onClick={() => setSubmittingHomework(null)}>
            <div className={styles.submitModalBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.submitModalHeader}>
                <h3 className={styles.submitModalTitle}>
                  Vazifani topshirish: {submittingHomework.course}
                </h3>
                <button
                  type="button"
                  className={styles.closeModalBtn}
                  onClick={() => setSubmittingHomework(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.submitModalBody}>
                <div>
                  <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>
                    {submittingHomework.title}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                    Topshirish muddati: <strong>{submittingHomework.dueDate}</strong> • O'qituvchi: {submittingHomework.teacher}
                  </div>
                </div>

                <label
                  className={styles.fileDropZone}
                  htmlFor="hwFileUploadInput"
                >
                  <input
                    id="hwFileUploadInput"
                    type="file"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSubmissionFile(e.target.files[0]);
                      }
                    }}
                  />
                  <div className={styles.dropZoneIcon}>
                    <UploadCloud size={22} />
                  </div>
                  <p className={styles.dropZoneText}>
                    {submissionFile
                      ? `Tanlangan fayl: ${submissionFile.name}`
                      : 'Faylni tanlang yoki shu yerga tashlang'}
                  </p>
                  <p className={styles.dropZoneSubtext}>
                    PDF, Word (.docx, .doc), ZIP yoki rasm fayllari (maks. 25MB)
                  </p>
                </label>

                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: '#334155',
                      marginBottom: '6px',
                    }}
                  >
                    Izoh yoki yozma javob (ixtiyoriy):
                  </label>
                  <textarea
                    placeholder="O'qituvchi uchun izoh yoki savollaringiz bo'lsa yozing..."
                    value={submissionComment}
                    onChange={(e) => setSubmissionComment(e.target.value)}
                    className={styles.submissionCommentInput}
                  />
                </div>
              </div>

              <div className={styles.submitModalFooter}>
                <button
                  type="button"
                  className={styles.cancelModalBtn}
                  onClick={() => setSubmittingHomework(null)}
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  className={styles.confirmSubmitBtn}
                  onClick={handleConfirmSubmit}
                >
                  <Send size={15} /> Topshirish
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Message */}
        {toastMessage && (
          <div className={styles.floatingToast}>
            <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: ADMIN & TEACHER DASHBOARD
  // =========================================================================
  return (
    <div className={styles.dashboardContainer}>
      {/* ====================================================
         1. GREETING & DATE HEADER
      ==================================================== */}
      <div className={styles.welcomeSection}>
        <div>
          <h1 className={styles.greetingTitle}>
            Assalomu alaykum, {user?.full_name || (isTeacher ? "O'qituvchi" : isInspector ? "Nazoratchi" : 'Admin')}!
          </h1>
          <p className={styles.greetingSubtitle}>
            Bugun {getUzbekDateString()}. {isTeacher
              ? "Sizning bugungi darslaringiz va biriktirilgan guruhlaringiz holati."
              : isInspector
              ? "O'quv jarayoni, darslar va talabalar davomati monitoringi paneli."
              : `Sizning ta'lim markazingiz (${userCenterName}) faoliyat ko'rsatmoqda.`}
          </p>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.periodSelector}>
            <Calendar size={16} className={styles.calendarIcon} />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className={styles.periodSelect}
            >
              <option value="today">Bugun</option>
              <option value="week">Shu hafta</option>
              <option value="month">Shu oy</option>
              <option value="year">Shu yil</option>
              <option value="all">Barchasi</option>
            </select>
          </div>
        </div>
      </div>

      {/* ====================================================
         2. TOP 4 KPI CARDS (ADMIN OR TEACHER)
      ==================================================== */}
      {isTeacher ? (
        <div className={styles.topStatsGrid}>
          {/* Teacher Card 1: Mening guruhlarim */}
          <div className={`${styles.statCard} ${styles.statCardBlue}`}>
            <div className={styles.statCardHeader}>
              <div className={styles.statTitleWrapper}>
                <span className={styles.statTitle}>Mening guruhlarim</span>
                <span className={styles.statValue}>{teacherGroupsList.length}</span>
              </div>
              <div className={`${styles.iconBox} ${styles.iconBlue}`}>
                <FolderKanban size={24} />
              </div>
            </div>
            <div className={styles.statTrendRow}>
              <span className={styles.trendBadge} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <CheckCircle2 size={13} /> Faol
              </span>
              <span className={styles.trendText}>Biriktirilgan o'quv guruhlari</span>
            </div>
          </div>

          {/* Teacher Card 2: Jami o'quvchilar */}
          <div className={`${styles.statCard} ${styles.statCardOrange || styles.statCardPurple}`}>
            <div className={styles.statCardHeader}>
              <div className={styles.statTitleWrapper}>
                <span className={styles.statTitle}>Jami o'quvchilar</span>
                <span className={styles.statValue}>
                  {teacherGroupsList.reduce((acc, g) => acc + (g.students_count || g.group_students?.length || 0), 0) || 16}
                </span>
              </div>
              <div className={`${styles.iconBox} ${styles.iconOrange || styles.iconBlue}`}>
                <Users size={24} />
              </div>
            </div>
            <div className={styles.statTrendRow}>
              <span className={styles.trendBadge} style={{ background: '#fff7ed', color: '#ea580c' }}>
                <GraduationCap size={13} /> Guruhlarda
              </span>
              <span className={styles.trendText}>Talabalar umumiy soni</span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.statsGridNine}>
          {adminNineKpis.map((kpi) => {
            const IconComponent = kpi.icon;
            return (
              <div
                key={kpi.id}
                className={styles.card3d}
                onClick={() => navigate(kpi.link)}
                style={/** @type {any} */ ({
                  '--card-hover-border': kpi.theme.border,
                  '--card-hover-shadow': kpi.theme.shadow,
                  '--card-stripe': kpi.theme.stripe,
                  '--icon-bg': kpi.theme.bg,
                  '--icon-color': kpi.theme.color,
                  '--icon-border': kpi.theme.border,
                  '--icon-glow': kpi.theme.shadow,
                })}
                title={`${kpi.title} bo'limiga o'tish`}
              >
                {/* 3D Top Accent Stripe */}
                <div className={styles.card3dTopStripe} />

                {/* 3D Embossed Icon Pod */}
                <div className={styles.iconPod3d}>
                  <IconComponent size={22} strokeWidth={2.2} />
                </div>

                {/* KPI Title */}
                <span className={styles.card3dTitle}>{kpi.title}</span>

                {/* Big 3D Metric Value */}
                <span className={styles.card3dValue}>
                  {Number(kpi.value || 0).toLocaleString()}
                </span>

                {/* Category / Context Badge */}
                <span className={styles.card3dBadge}>
                  <span>{kpi.badge}</span>
                  <ArrowRight size={11} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================
         3. TEACHER DASHBOARD MIDDLE ROW
      ==================================================== */}
      {isTeacher && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
          <div className={styles.middleGrid}>
            {/* Teacher Left: Bugungi va Rejadagi darslarim */}
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>
                    {todayTeacherLessons.length > 0 ? "Bugungi darslarim" : "Rejadagi darslarim"}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    {todayTeacherLessons.length > 0
                      ? `Bugun (${getUzbekDateString()}) uchun darslar`
                      : "Bugun dars yo'q, keyingi rejalashtirilgan mashg'ulotlar"}
                  </span>
                </div>
                <span
                  className={styles.seeAllLink}
                  onClick={() => navigate('/lessons')}
                  style={{ cursor: 'pointer' }}
                >
                  To'liq jadval <ArrowRight size={13} />
                </span>
              </div>

              {todayTeacherLessons.length > 0 ? (
                <div className={styles.scheduleList}>
                  {todayTeacherLessons.map((item) => (
                    <div
                      key={item.id}
                      className={styles.scheduleItem}
                      style={{ borderLeftColor: '#3b82f6' }}
                    >
                      <div className={styles.scheduleLeft}>
                        <span className={styles.scheduleTime}>{item.time}</span>
                        <div className={styles.scheduleCourseInfo}>
                          <span className={`${styles.courseBadge} ${styles.courseBadgeBlue}`}>
                            {item.course}
                          </span>
                          <span className={styles.groupBadge}>{item.group}</span>
                          {item.room && (
                            <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {item.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.scheduleRight}>
                        <button
                          type="button"
                          className={styles.takeAttendanceBtn}
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/attendance');
                          }}
                        >
                          <FileCheck2 size={13} /> Davomat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : upcomingTeacherLessons.length > 0 ? (
                <div className={styles.scheduleList}>
                  {upcomingTeacherLessons.map((item) => (
                    <div
                      key={item.id}
                      className={styles.scheduleItem}
                      style={{ borderLeftColor: '#8b5cf6' }}
                    >
                      <div className={styles.scheduleLeft}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700 }}>
                            {item.date}
                          </span>
                          <span className={styles.scheduleTime}>{item.time}</span>
                        </div>
                        <div className={styles.scheduleCourseInfo}>
                          <span className={`${styles.courseBadge} ${styles.courseBadgePurple}`}>
                            {item.course}
                          </span>
                          <span className={styles.groupBadge}>{item.group}</span>
                          {item.room && (
                            <span style={{ fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                              {item.room}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className={styles.scheduleRight}>
                        <button
                          type="button"
                          className={styles.takeAttendanceBtn}
                          onClick={() => navigate('/lessons')}
                        >
                          <Calendar size={13} /> Jadval
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8' }}>
                  <Calendar size={28} style={{ margin: '0 auto 8px', opacity: 0.6 }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                    Hozircha darslar jadvali belgilanmagan
                  </p>
                </div>
              )}
            </div>

            {/* Teacher Right: Mening guruhlarim */}
            <div className={styles.panelCard}>
              <div className={styles.panelHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Mening guruhlarim</h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    Sizga biriktirilgan faol guruhlar
                  </span>
                </div>
                <span
                  className={styles.seeAllLink}
                  onClick={() => navigate('/groups')}
                  style={{ cursor: 'pointer' }}
                >
                  Barchasi <ArrowRight size={13} />
                </span>
              </div>

              <div className={styles.teacherGroupList}>
                {teacherGroupsList.map((g, idx) => (
                  <div
                    key={g.id || idx}
                    className={styles.teacherGroupItem}
                    onClick={() => navigate('/groups')}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={styles.teacherGroupLeft}>
                      <div className={styles.groupIconBox}>
                        <FolderKanban size={16} />
                      </div>
                      <div>
                        <span className={styles.teacherGroupName}>{g.name || `Guruh #${idx + 1}`}</span>
                        <span className={styles.teacherGroupCourse}>
                          {g.course?.name || g.course_name || "O'quv kursi"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.teacherGroupRight} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span className={styles.groupBadge}>
                        {g.days || g.schedule_days || 'Du-Chor-Ju'}
                      </span>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                        {g.lesson_time || (g.start_time ? `${String(g.start_time).slice(0, 5)} - ${String(g.end_time || '').slice(0, 5)}` : '10:00 - 12:00')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Haftalik dars jadvalim paneli */}
          <div className={styles.panelCard} style={{ width: '100%', boxSizing: 'border-box' }}>
            <div className={styles.panelHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Calendar size={18} color="#2563eb" />
                <div>
                  <h3 className={styles.panelTitle}>Haftalik Dars Jadvalim</h3>
                  <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                    Hafta kunlari bo'yicha biriktirilgan darslaringiz taqvimi
                  </span>
                </div>
              </div>
            </div>

            <div className={styles.weeklyScheduleGrid}>
              {[
                { dayNum: 1, name: 'Dushanba', short: 'Du' },
                { dayNum: 2, name: 'Seshanba', short: 'Se' },
                { dayNum: 3, name: 'Chorshanba', short: 'Chor' },
                { dayNum: 4, name: 'Payshanba', short: 'Pay' },
                { dayNum: 5, name: 'Juma', short: 'Jum' },
                { dayNum: 6, name: 'Shanba', short: 'Shan' },
              ].map((d) => {
                const isTodayCol = todayDayOfWeek === d.dayNum;
                const matchedDayGroups = teacherGroupsList.filter((g) => isDayMatchingSchedule(g.days || g.schedule_days || '', d.dayNum));

                return (
                  <div
                    key={d.dayNum}
                    style={{
                      background: isTodayCol ? '#eff6ff' : '#f8fafc',
                      border: isTodayCol ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: '13.5px', color: isTodayCol ? '#1d4ed8' : '#1e293b' }}>
                        {d.name}
                      </span>
                      {isTodayCol && (
                        <span style={{ background: '#3b82f6', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                          BUGUN
                        </span>
                      )}
                    </div>

                    {matchedDayGroups.length > 0 ? (
                      matchedDayGroups.map((g) => (
                        <div
                          key={g.id}
                          onClick={() => navigate('/lessons')}
                          style={{
                            background: '#ffffff',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '12.5px', color: '#0f172a' }}>
                            {g.name}
                          </span>
                          <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                            {g.lesson_time || (g.start_time ? `${String(g.start_time).slice(0, 5)} - ${String(g.end_time || '').slice(0, 5)}` : '10:00 - 12:00')}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 500 }}>
                            🏢 {g.classroom?.name || (g.classroom_id ? `Xona #${g.classroom_id}` : 'Y-06')}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span style={{ fontSize: '11.5px', color: '#94a3b8', fontStyle: 'italic', padding: '8px 0' }}>
                        Dars rejalashtirilmagan
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
         4. TODAY'S LESSON SCHEDULE (ADMIN ONLY)
      ==================================================== */}
      {!isTeacher && (
        <div className={styles.panelCard} style={{ width: '100%', boxSizing: 'border-box' }}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>
              Darslar jadvali ({selectedPeriod === 'today' ? 'bugun' : selectedPeriod === 'week' ? 'shu hafta' : selectedPeriod === 'month' ? 'shu oy' : selectedPeriod === 'year' ? 'shu yil' : 'barchasi'})
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
              {todayScheduleList.length} ta dars
            </span>
          </div>

          <div className={styles.scheduleList}>
            {todayScheduleList.length > 0 ? (
              todayScheduleList.map((item) => (
                <div
                  key={item.id}
                  className={styles.scheduleItem}
                  style={{ borderLeftColor: item.borderColor }}
                >
                  <div className={styles.scheduleLeft}>
                    <span className={styles.scheduleTime}>{item.time}</span>
                    <div className={styles.scheduleCourseInfo}>
                      <span className={`${styles.courseBadge} ${item.colorClass}`}>
                        {item.course}
                      </span>
                      <span className={styles.groupBadge}>{item.group}</span>
                      {selectedPeriod !== 'today' && item.days && (
                        <span style={{ fontSize: '11px', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 500 }}>
                          📅 {item.days}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.scheduleRight}>
                    <div className={styles.teacherAvatar}>
                      <GiTeacher size={13} />
                    </div>
                    <span className={styles.teacherName}>{item.teacher}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
                {selectedPeriod === 'today'
                  ? (todayDayOfWeek === 0
                      ? 'Bugun yakshanba — dam olish kuni. Darslar mavjud emas.'
                      : "Bugungi kunda rejalashtirilgan darslar yo'q.")
                  : "Tanlangan davr uchun rejalashtirilgan darslar topilmadi."}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
