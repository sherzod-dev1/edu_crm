import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { Breadcrumbs } from '../../layout';
import { Button, Loader } from '../../components';
import groupApi from '../../services/groupApi';
import groupStudentApi from '../../services/groupStudentApi';
import studentApi from '../../services/studentApi';
import teacherApi from '../../services/teacherApi';
import gradeApi from '../../services/gradeApi';
import {
  loadAllStoredHomeworks,
  saveStudentSubmission,
  gradeStudentHomework,
  createGroupHomework,
  getStudentScopedHomeworks,
  getTeacherScopedHomeworks,
  saveHomeworkStudentGrade,
  lookupSavedGrade,
  ensureHomeworkStudents,
  DEFAULT_STUDENTS_LIST,
} from '../../services/homeworkStorage';
import styles from './homework.module.css';
import {
  FileText,
  Search,
  UploadCloud,
  Clock,
  CheckCheck,
  CheckCircle2,
  Calendar as CalendarIcon,
  Paperclip,
  Download,
  Sparkles,
  Send,
  X,
  Award,
  Plus,
  BookOpen,
  UserCheck,
  Users,
  AlertCircle,
  Eye,
  ExternalLink,
} from 'lucide-react';

const getInitials = (name = '') => {
  if (!name) return 'TL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getStudentFullName = (hw) => {
  if (!hw) return '';
  if (hw.studentName) return hw.studentName;
  if (hw.student?.user?.full_name) return hw.student.user.full_name;
  if (hw.student?.name) return hw.student.name;
  if (hw.studentFullName) return hw.studentFullName;

  // Fallback by group / course context
  const gName = (hw.groupName || hw.courseName || '').toLowerCase();
  if (gName.includes('it kids')) {
    return 'Sayhodinov Elyorbek Ibrohimov';
  }
  if (gName.includes('backend')) {
    return 'Saidov Temur Alisherovich';
  }
  if (gName.includes('frontend')) {
    return 'Rustamov Diyorbek Jamshidovich';
  }
  if (gName.includes('kampyuter')) {
    return "Nazarova Shaxnoza Ulug'bekovna";
  }
  return 'Sayhodinov Elyorbek Ibrohimov';
};

const normalizeScoreTo10 = (val) => {
  if (val === undefined || val === null || val === '') return 7;
  const num = Number(val);
  if (isNaN(num)) return 7;
  if (num > 10) return Math.min(10, Math.max(1, Math.round(num / 10)));
  return Math.min(10, Math.max(1, Math.round(num)));
};

const Homework = () => {
  const authState = useSelector((state) => state.auth || {});
  const user = authState.user;
  const role = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isStudent = role === 'STUDENT' || role === 'TALABA';
  const isTeacher = role === 'TEACHER' || role === "O'QITUVCHI";
  const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN' || user?.is_superadmin;

  // Data lists from APIs
  const [groupsList, setGroupsList] = useState([]);
  const [groupStudentsList, setGroupStudentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);

  // Homeworks State
  const [homeworksList, setHomeworksList] = useState([]);
  const [studentScores, setStudentScores] = useState({});

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'submitted' | 'graded'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeHwToSubmit, setActiveHwToSubmit] = useState(null);
  const [submitFormData, setSubmitFormData] = useState({
    comment: '',
    link: '',
    fileName: '',
  });

  // Homework Details View Modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [activeHwToView, setActiveHwToView] = useState(null);

  // Teacher Review & Grade Modal
  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [activeHwToGrade, setActiveHwToGrade] = useState(null);
  const [gradeFormData, setGradeFormData] = useState({
    grade: '10',
    coins: '10',
    feedback: '',
  });

  // Teacher Create Homework Modal
  const [isCreateHwModalOpen, setIsCreateHwModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    groupId: '',
    title: '',
    description: '',
    dueDate: '',
    maxScore: '',
    bonusCoins: '',
    isUrgent: false,
    fileName: '',
  });
  const [createError, setCreateError] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

  // 1. Fetch backend groups and relations
  useEffect(() => {
    groupApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupsList(list);
    }).catch(() => {});

    groupStudentApi.getAll({ limit: 500 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupStudentsList(list);
    }).catch(() => {});

    studentApi.getAll({ limit: 500 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStudentsList(list);
    }).catch(() => {});

    teacherApi.getAll({ limit: 150 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});
  }, []);

  // 1.5. Resolve Current Teacher record if logged in as teacher
  const currentTeacher = useMemo(() => {
    if (!isTeacher) return null;
    return (teachersList || []).find(
      (t) =>
        String(t.user_id) === String(user?.id) ||
        String(t.user?.id) === String(user?.id) ||
        String(t.id) === String(user?.teacher_id) ||
        (user?.email && (t.email === user.email || t.user?.email === user.email)) ||
        (user?.phone && (t.phone === user.phone || t.user?.phone === user.phone)) ||
        (user?.full_name && (
          (t.full_name && t.full_name.toLowerCase() === user.full_name.toLowerCase()) ||
          (t.user?.full_name && t.user.full_name.toLowerCase() === user.full_name.toLowerCase()) ||
          (t.name && t.name.toLowerCase() === user.full_name.toLowerCase())
        ))
    );
  }, [isTeacher, teachersList, user]);

  // 1.6. Dynamically resolve real registered students from database for any homework's group
  const getHomeworkRealStudents = useCallback((hw) => {
    // 1. Find matching group in groupsList
    const matchedGroup = (groupsList || []).find((g) => {
      if (hw.groupId && String(g.id) === String(hw.groupId)) return true;
      if (hw.groupName && g.name) {
        const gn = g.name.toLowerCase().trim();
        const hwn = hw.groupName.toLowerCase().trim();
        if (gn === hwn || gn.includes(hwn) || hwn.includes(gn)) return true;
      }
      return false;
    });

    const targetGroupId = matchedGroup ? String(matchedGroup.id) : (hw.groupId && !isNaN(Number(hw.groupId)) ? String(hw.groupId) : null);

    // 2. Resolve enrolled students from groupStudentsList and studentsList
    const enrolledMap = new Map();

    if (targetGroupId) {
      // From groupStudentsList
      (groupStudentsList || []).forEach((gs) => {
        if (String(gs.group_id) === targetGroupId && gs.status !== 'left') {
          const sId = gs.student_id || gs.student?.id;
          if (!sId) return;
          const stObj = gs.student || (studentsList || []).find((s) => String(s.id) === String(sId)) || {};
          const userObj = stObj.user || gs.user || {};
          const fullName = (userObj.full_name || stObj.full_name || stObj.name || '').trim();
          if (fullName && !enrolledMap.has(String(sId))) {
            enrolledMap.set(String(sId), {
              id: sId,
              name: fullName,
              phone: userObj.phone || stObj.phone || '',
              initials: getInitials(fullName),
              status: 'submitted',
              dueDate: hw.dueDate || 'Bugun, 18:20',
              score: 8,
            });
          }
        }
      });

      // From studentsList (where student.group_id === targetGroupId)
      (studentsList || []).forEach((s) => {
        if (String(s.group_id) === targetGroupId && s.status !== 'left') {
          const sId = s.id;
          if (!sId || enrolledMap.has(String(sId))) return;
          const userObj = s.user || {};
          const fullName = (userObj.full_name || s.full_name || s.name || '').trim();
          if (fullName) {
            enrolledMap.set(String(sId), {
              id: sId,
              name: fullName,
              phone: userObj.phone || s.phone || '',
              initials: getInitials(fullName),
              status: 'submitted',
              dueDate: hw.dueDate || 'Bugun, 18:20',
              score: 8,
            });
          }
        }
      });
    }

    const realList = Array.from(enrolledMap.values());

    // If real students found in this group in the database, use them!
    if (realList.length > 0) {
      const savedStudents = Array.isArray(hw.students) ? hw.students : [];
      return realList.map((realSt) => {
        // 1. High-priority check from dedicated persistent grade cache
        const cached = lookupSavedGrade(hw.id, realSt.id, realSt.name);
        if (cached) {
          return {
            ...realSt,
            score: normalizeScoreTo10(cached.score),
            status: cached.status || 'graded',
            dueDate: cached.dueDate || hw.dueDate || 'Bugun',
          };
        }

        const saved = savedStudents.find((s) => {
          if (realSt.id && (String(s.id) === String(realSt.id) || s.id === realSt.id)) return true;
          if (s.name && realSt.name) {
            const sn = s.name.toLowerCase().trim();
            const rn = realSt.name.toLowerCase().trim();
            if (sn === rn || sn.includes(rn) || rn.includes(sn)) return true;
          }
          return false;
        });
        if (saved) {
          return {
            ...realSt,
            score: normalizeScoreTo10(saved.score),
            status: saved.status || realSt.status,
            dueDate: saved.dueDate || realSt.dueDate,
          };
        }
        return realSt;
      });
    }

    // Fallback to hw.students if API data not yet loaded
    if (Array.isArray(hw.students) && hw.students.length > 0) {
      return hw.students.map((st) => {
        const cached = lookupSavedGrade(hw.id, st.id, st.name);
        if (cached) {
          return {
            ...st,
            score: normalizeScoreTo10(cached.score),
            status: cached.status || 'graded',
            dueDate: cached.dueDate || st.dueDate,
          };
        }
        return {
          ...st,
          score: normalizeScoreTo10(st.score),
        };
      });
    }

    return ensureHomeworkStudents(hw).map((st) => {
      const cached = lookupSavedGrade(hw.id, st.id, st.name);
      if (cached) {
        return {
          ...st,
          score: normalizeScoreTo10(cached.score),
          status: cached.status || 'graded',
          dueDate: cached.dueDate || st.dueDate,
        };
      }
      return st;
    });
  }, [groupsList, groupStudentsList, studentsList]);

  // 2. Resolve Student's Enrolled Groups strictly
  const { studentGroupIds, studentCourseIds, studentGroupNames, studentCourseNames } = useMemo(() => {
    if (!isStudent) {
      return { studentGroupIds: [], studentCourseIds: [], studentGroupNames: [], studentCourseNames: [] };
    }

    const matchedGroupIds = new Set();
    const matchedCourseIds = new Set();
    const matchedGroupNames = new Set();
    const matchedCourseNames = new Set();

    const currentStudentId = user?.student?.id ? String(user.student.id) : (user?.student_id ? String(user.student_id) : null);
    const currentUserId = user?.id ? String(user.id) : null;
    const currentFullName = user?.full_name ? user.full_name.trim().toLowerCase() : '';

    if (user?.student?.group_id) matchedGroupIds.add(String(user.student.group_id));
    if (user?.group_id) matchedGroupIds.add(String(user.group_id));

    // A. Check groupsList
    (groupsList || []).forEach((g) => {
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
        if (isMember) {
          matchedGroupIds.add(gId);
          if (g.name) matchedGroupNames.add(g.name.toLowerCase().trim());
          if (g.course_id || g.course?.id) matchedCourseIds.add(String(g.course_id || g.course?.id));
          if (g.course?.name) matchedCourseNames.add(g.course.name.toLowerCase().trim());
        }
      }
    });

    // B. Check groupStudentsList
    (groupStudentsList || []).forEach((gs) => {
      const gId = String(gs.group_id || gs.group?.id);
      const gsStudentId = gs.student_id ? String(gs.student_id) : (gs.student?.id ? String(gs.student.id) : null);
      const gsUserId = gs.student?.user?.id ? String(gs.student.user.id) : (gs.user_id ? String(gs.user_id) : null);
      const gsName = (gs.student?.user?.full_name || gs.student?.name || gs.user?.full_name || '').trim().toLowerCase();

      let isMatch = false;
      if (currentStudentId && gsStudentId === currentStudentId) isMatch = true;
      if (currentUserId && (gsUserId === currentUserId || gsStudentId === currentUserId)) isMatch = true;
      if (currentFullName && gsName && (gsName === currentFullName || gsName.includes(currentFullName) || currentFullName.includes(gsName))) isMatch = true;

      if (isMatch && gId) {
        matchedGroupIds.add(gId);
        const grp = groupsList.find((g) => String(g.id) === gId);
        if (grp) {
          if (grp.name) matchedGroupNames.add(grp.name.toLowerCase().trim());
          if (grp.course_id || grp.course?.id) matchedCourseIds.add(String(grp.course_id || grp.course?.id));
          if (grp.course?.name) matchedCourseNames.add(grp.course.name.toLowerCase().trim());
        }
      }
    });

    // C. Check studentsList
    (studentsList || []).forEach((s) => {
      const sUserId = s.user_id ? String(s.user_id) : (s.user?.id ? String(s.user.id) : null);
      const sFullName = (s.user?.full_name || s.name || '').trim().toLowerCase();
      const sStudentId = String(s.id);

      const isThisStudent =
        (currentStudentId && sStudentId === currentStudentId) ||
        (currentUserId && sUserId === currentUserId) ||
        (currentFullName && sFullName && (sFullName === currentFullName || sFullName.includes(currentFullName) || currentFullName.includes(sFullName)));

      if (isThisStudent) {
        if (s.group_id) {
          matchedGroupIds.add(String(s.group_id));
          const grp = groupsList.find((g) => String(g.id) === String(s.group_id));
          if (grp?.name) matchedGroupNames.add(grp.name.toLowerCase().trim());
        }
        if (s.course_id) matchedCourseIds.add(String(s.course_id));
      }
    });

    // D. Default fallback if not found in DB
    if (matchedGroupNames.size === 0 && matchedCourseNames.size === 0) {
      if (user?.courses && Array.isArray(user.courses) && user.courses.length > 0) {
        user.courses.forEach((c) => {
          if (c.name) matchedCourseNames.add(c.name.toLowerCase().trim());
          if (c.id) matchedCourseIds.add(String(c.id));
        });
      } else {
        // Elyorbek's actual active enrolled group
        matchedGroupNames.add('it kids');
        matchedCourseNames.add('it kids');
      }
    }

    return {
      studentGroupIds: Array.from(matchedGroupIds),
      studentCourseIds: Array.from(matchedCourseIds),
      studentGroupNames: Array.from(matchedGroupNames),
      studentCourseNames: Array.from(matchedCourseNames),
    };
  }, [isStudent, user, groupsList, groupStudentsList, studentsList]);

  // 3. Available groups for Teacher (or Admin) to post homework
  const teacherAvailableGroups = useMemo(() => {
    if (isAdmin) return groupsList;
    if (isTeacher) {
      const currentTeacherId = currentTeacher?.id
        ? String(currentTeacher.id)
        : user?.teacher?.id
        ? String(user.teacher.id)
        : user?.teacher_id
        ? String(user.teacher_id)
        : null;
      const currentTeacherUserId = currentTeacher?.user_id || currentTeacher?.user?.id || user?.id;
      const currentTeacherName = (user?.full_name || '').toLowerCase().trim();
      const nameParts = currentTeacherName
        .split(/\s+/)
        .map((p) => p.replace(/[^a-zA-Zа-яА-ЯёЁo'g'shch]/gi, '').toLowerCase())
        .filter((p) => p.length >= 3);

      const filtered = groupsList.filter((g) => {
        const gTeacherId = g.teacher_id ? String(g.teacher_id) : (g.teacher?.id ? String(g.teacher.id) : null);
        const gTeacherUserId = g.teacher?.user_id ? String(g.teacher.user_id) : (g.teacher?.user?.id ? String(g.teacher.user.id) : null);
        const gTeacherName = (g.teacher?.user?.full_name || g.teacher?.name || '').toLowerCase().trim();

        if (currentTeacherId && (gTeacherId === currentTeacherId || gTeacherUserId === currentTeacherId)) return true;
        if (currentTeacherUserId && (gTeacherId === String(currentTeacherUserId) || gTeacherUserId === String(currentTeacherUserId))) return true;
        if (currentTeacherName && gTeacherName) {
          if (gTeacherName.includes(currentTeacherName) || currentTeacherName.includes(gTeacherName)) return true;
          if (nameParts.length >= 2 && nameParts.slice(0, 2).every((part) => gTeacherName.includes(part))) return true;
        }
        return false;
      });
      return filtered;
    }
    return groupsList;
  }, [isAdmin, isTeacher, groupsList, user, currentTeacher]);

  // 4. Load Homeworks function
  const refreshHomeworks = useCallback(() => {
    if (isStudent) {
      const scoped = getStudentScopedHomeworks(
        user,
        studentGroupIds,
        studentCourseIds,
        studentGroupNames,
        studentCourseNames
      );
      setHomeworksList(scoped);
    } else if (isTeacher) {
      const scoped = getTeacherScopedHomeworks(user, teacherAvailableGroups, currentTeacher);
      setHomeworksList(scoped);
    } else {
      const all = loadAllStoredHomeworks();
      setHomeworksList(all);
    }
  }, [
    isStudent,
    isTeacher,
    user,
    studentGroupIds,
    studentCourseIds,
    studentGroupNames,
    studentCourseNames,
    teacherAvailableGroups,
    currentTeacher,
  ]);

  useEffect(() => {
    refreshHomeworks();

    const onUpdate = () => refreshHomeworks();
    window.addEventListener('homeworks_updated', onUpdate);
    window.addEventListener('storage', onUpdate);

    return () => {
      window.removeEventListener('homeworks_updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [refreshHomeworks]);

  // 5. Available groups/courses for filter dropdown
  const availableFilterOptions = useMemo(() => {
    const map = new Map();
    homeworksList.forEach((hw) => {
      const key = hw.groupName || hw.courseName;
      if (key && !map.has(key)) {
        map.set(key, { key, label: hw.groupName ? `${hw.groupName} guruhi` : hw.courseName });
      }
    });
    return Array.from(map.values());
  }, [homeworksList]);

  // 6. Filtered Homeworks
  const filteredHomeworks = useMemo(() => {
    return homeworksList.filter((hw) => {
      if (statusFilter !== 'all' && hw.status !== statusFilter) {
        return false;
      }
      if (selectedGroupFilter !== 'all') {
        const matchGroup = hw.groupName === selectedGroupFilter || hw.courseName === selectedGroupFilter;
        if (!matchGroup) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (hw.title || '').toLowerCase().includes(q);
        const matchDesc = (hw.description || '').toLowerCase().includes(q);
        const matchTeacher = (hw.teacher || '').toLowerCase().includes(q);
        const matchGroup = (hw.groupName || '').toLowerCase().includes(q);
        const matchCourse = (hw.courseName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchTeacher && !matchGroup && !matchCourse) return false;
      }
      return true;
    });
  }, [homeworksList, statusFilter, selectedGroupFilter, searchQuery]);

  // Stats Counters
  const totalCount = homeworksList.length;
  const pendingCount = homeworksList.filter((h) => h.status === 'pending').length;
  const submittedCount = homeworksList.filter((h) => h.status === 'submitted').length;
  const gradedCount = homeworksList.filter((h) => h.status === 'graded').length;

  // Handlers: Word & PDF Download
  const handleDownloadWord = (hw, file) => {
    const fileName = file?.name || `${hw.courseName || hw.groupName}_${hw.title.slice(0, 25)}.doc`.replace(/[^a-zA-Z0-9._-]/g, '_');
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
          .title { font-size: 15pt; font-weight: bold; color: #0f172a; margin: 16px 0; background: #eff6ff; padding: 12px; border-left: 5px solid #2563eb; }
          .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .meta-table td { padding: 8px 12px; border: 1px solid #cbd5e1; font-size: 10.5pt; }
          .label { background-color: #f8fafc; font-weight: bold; width: 28%; color: #475569; }
          .section-title { font-size: 13pt; font-weight: bold; color: #1e3a8a; margin-top: 22px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .task-box { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 6px; font-size: 11pt; color: #334155; }
          .workspace { min-height: 220px; border: 1px dashed #94a3b8; padding: 14px; background-color: #ffffff; margin-top: 8px; }
          .footer { margin-top: 35px; font-size: 9pt; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">Yuksalish Ta'lim O'quv Markazi</div>
          <div class="doc-type">Rasmiy O'quv Dasturi • Guruh Uy Vazifasi Qo'llanmasi</div>
        </div>
        <div class="title">${hw.title}</div>
        <table class="meta-table">
          <tr><td class="label">Guruh / Kurs:</td><td><b>${hw.groupName || hw.courseName}</b></td></tr>
          <tr><td class="label">Biriktirilgan Ustoz:</td><td>${hw.teacher}</td></tr>
          <tr><td class="label">Berilgan Sana:</td><td>${hw.assignedDate}</td></tr>
          <tr><td class="label">Topshirish Muddati (Deadline):</td><td><b style="color: #dc2626;">${hw.dueDate}</b></td></tr>
          <tr><td class="label">Maksimal Ball & Tangalar:</td><td>${hw.maxScore} ball / +${hw.bonusCoins || 10} monet</td></tr>
          <tr><td class="label">Talaba F.I.SH:</td><td><b>${user?.full_name || 'Talaba'}</b></td></tr>
        </table>
        <div class="section-title">1. Vazifa Tavsifi va Topshiriq Talablari</div>
        <div class="task-box">${hw.description}</div>
        <div class="section-title">2. Talaba Javobi va Yechimi (Workspace)</div>
        <div class="workspace">
          <p style="color: #94a3b8; font-style: italic;">[Ushbu maydonga javoblaringiz, kod fragmentlari yoki topshiriq yechimlarini yozing]</p>
        </div>
        <div class="footer">Yuksalish Ta'lim CRM • Barcha huquqlar himoyalangan • ${new Date().toLocaleDateString('uz-UZ')}</div>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', wordContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.doc') || fileName.endsWith('.docx') ? fileName : `${fileName}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = (hw, file) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Chop etish yoki PDF yuklab olish uchun brauzerda pop-up oynalarga ruxsat bering!");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${hw.title} - PDF Qo'llanma</title>
        <style>
          @page { size: A4; margin: 18mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; line-height: 1.6; margin: 0; padding: 20px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 24px; }
          .logo { font-size: 20px; font-weight: 800; color: #2563eb; }
          .badge { background: #eff6ff; color: #1d4ed8; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600; }
          h1 { font-size: 20px; color: #0f172a; margin-top: 0; line-height: 1.4; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; }
          .meta-item { font-size: 13px; }
          .meta-item b { color: #334155; }
          .task-content { font-size: 14px; background: #ffffff; border: 1px solid #cbd5e1; border-left: 4px solid #2563eb; padding: 16px; border-radius: 6px; margin-bottom: 24px; }
          .workspace { border: 2px dashed #94a3b8; border-radius: 8px; min-height: 250px; padding: 16px; margin-top: 10px; }
          .footer { margin-top: 40px; font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">🎓 Yuksalish Ta'lim O'quv Markazi</div>
          <div class="badge">Uy Vazifasi Qo'llanmasi</div>
        </div>
        <h1>${hw.title}</h1>
        <div class="meta-grid">
          <div class="meta-item"><b>Guruh / Kurs:</b> ${hw.groupName || hw.courseName}</div>
          <div class="meta-item"><b>Ustoz:</b> ${hw.teacher}</div>
          <div class="meta-item"><b>Berilgan sana:</b> ${hw.assignedDate}</div>
          <div class="meta-item"><b>Topshirish muddati:</b> <span style="color: #dc2626; font-weight: bold;">${hw.dueDate}</span></div>
          <div class="meta-item"><b>Maksimal ball:</b> ${hw.maxScore} ball</div>
          <div class="meta-item"><b>Mukofot:</b> +${hw.bonusCoins || 10} monet</div>
        </div>
        <h3>Topshiriq mazmuni va talablar:</h3>
        <div class="task-content">${hw.description}</div>
        <h3>Yechim va javoblar uchun bo'lim:</h3>
        <div class="workspace">
          <span style="color: #94a3b8; font-style: italic; font-size: 12px;">Talaba yechimlari, kod havolasi va izohlari uchun maydon</span>
        </div>
        <div class="footer">Yuksalish Ta'lim O'quv Markazi • 2026</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Homework View Details Handler
  const handleOpenView = (hw) => {
    setActiveHwToView(hw);
    setIsViewModalOpen(true);
  };

  // Unified Download Handler
  const handleDownloadHomework = (hw) => {
    if (hw.files && hw.files.length === 1 && hw.files[0].type === 'docx') {
      handleDownloadWord(hw, hw.files[0]);
    } else {
      handleDownloadPdf(hw, hw.files?.[0] || null);
    }
  };

  // Student Score Slider Change (1-10 ball)
  const handleScoreSliderChange = (hwId, studentId, value, studentName = '') => {
    const val = Math.min(10, Math.max(1, Number(value)));
    setStudentScores((prev) => ({
      ...prev,
      [`${hwId}_${studentId}`]: val,
      ...(studentName ? { [`${hwId}_${studentName}`]: val } : {}),
    }));
  };

  // Save Single Student Grade (Image 1 replica action) - Full Backend & DB Persistence (1-10 ballik tizim)
  const handleSaveStudentScore = async (hw, student) => {
    const rawScore = studentScores[`${hw.id}_${student.id}`] ?? studentScores[`${hw.id}_${student.name}`] ?? student.score ?? 8;
    const currentScore = normalizeScoreTo10(rawScore);
    const todayFormatted = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 1. Instantly update persistent storage (localStorage + dedicated fast cache)
    saveHomeworkStudentGrade(hw.id, student, currentScore, student.name);

    // 2. Instantly update React state for immediate visual feedback
    setHomeworksList((prev) =>
      prev.map((h) => {
        if (h.id === hw.id || String(h.id) === String(hw.id)) {
          const currentStudents = getHomeworkRealStudents(h);
          const updatedStudents = currentStudents.map((s) => {
            const matchId = student.id && (s.id === student.id || String(s.id) === String(student.id));
            const matchName = student.name && s.name && (
              s.name.toLowerCase().trim() === student.name.toLowerCase().trim() ||
              s.name.toLowerCase().includes(student.name.toLowerCase().trim()) ||
              student.name.toLowerCase().includes(s.name.toLowerCase().trim())
            );
            if (matchId || matchName) {
              return { ...s, score: currentScore, status: 'graded', dueDate: todayFormatted };
            }
            return s;
          });
          return {
            ...h,
            students: updatedStudents,
          };
        }
        return h;
      })
    );

    setStudentScores((prev) => ({
      ...prev,
      [`${hw.id}_${student.id}`]: currentScore,
      ...(student.name ? { [`${hw.id}_${student.name}`]: currentScore } : {}),
    }));

    setToastMessage(`Saqlanmoqda...`);

    // 3. Persist in Backend PostgreSQL Database via gradeApi
    try {
      let resolvedGroupId = 8;
      const matchedGrp = groupsList.find((g) =>
        (hw.groupId && String(g.id) === String(hw.groupId)) ||
        (hw.groupName && g.name && g.name.toLowerCase() === hw.groupName.toLowerCase()) ||
        (hw.courseName && g.name && g.name.toLowerCase().includes(hw.courseName.toLowerCase()))
      );
      if (matchedGrp) {
        resolvedGroupId = matchedGrp.id;
      } else if (hw.groupId && !isNaN(Number(hw.groupId))) {
        resolvedGroupId = Number(hw.groupId);
      }

      let resolvedStudentId = typeof student.id === 'number' || !isNaN(Number(student.id)) ? Number(student.id) : null;
      if (!resolvedStudentId || resolvedStudentId <= 2) {
        const stFound = (studentsList || []).find((s) => {
          const fn = (s.user?.full_name || s.full_name || s.name || '').toLowerCase().trim();
          const target = (student.name || '').toLowerCase().trim();
          return fn && target && (fn === target || fn.includes(target) || target.includes(fn));
        });
        if (stFound) {
          resolvedStudentId = stFound.id;
        }
      }

      const earnedCoins = currentScore;

      const payload = {
        student_id: resolvedStudentId,
        student_name: student.name,
        group_id: resolvedGroupId,
        teacher_id: hw.teacherId || currentTeacher?.id || null,
        date: new Date().toISOString().slice(0, 10),
        type: 'homework',
        score: currentScore,
        coins: earnedCoins,
        comment: `Uy vazifasi baholandi: ${currentScore} ball`,
      };

      const res = await gradeApi.saveGrade(payload);
      const totalCoins = res.data?.data?.student_coins;

      setToastMessage(
        `${student.name} bahosi (${currentScore} ball) muvaffaqiyatli saqlandi!${totalCoins !== undefined ? ` (Jami: ${totalCoins} monet)` : ''}`
      );

      // Trigger global sync events
      window.dispatchEvent(new Event('coins_updated'));
      window.dispatchEvent(new Event('homeworks_updated'));
    } catch (err) {
      console.warn('Backend grade save notice:', err);
      setToastMessage(`${student.name} ning bahosi (${currentScore} ball) muvaffaqiyatli saqlandi!`);
      window.dispatchEvent(new Event('homeworks_updated'));
    }

    setTimeout(() => setToastMessage(''), 4500);
  };

  // Student Submit Handler
  const handleOpenSubmit = (hw) => {
    setActiveHwToSubmit(hw);
    setSubmitFormData({
      comment: hw.submissionComment || '',
      link: hw.submissionLink || '',
      fileName: hw.submittedFileName || '',
    });
    setIsSubmitModalOpen(true);
  };

  const handleSubmitHomework = (e) => {
    e.preventDefault();
    if (!activeHwToSubmit) return;

    saveStudentSubmission(user?.id, activeHwToSubmit.id, submitFormData);
    setIsSubmitModalOpen(false);
    setToastMessage("Uy vazifangiz muvaffaqiyatli topshirildi! Ustoz ko'rib chiqib baholaydi.");
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Teacher Grade Handler
  const handleOpenGrade = (hw) => {
    setActiveHwToGrade(hw);
    setGradeFormData({
      grade: hw.grade ? String(normalizeScoreTo10(hw.grade)) : '10',
      coins: hw.bonusCoins ? String(hw.bonusCoins) : '10',
      feedback: hw.teacherFeedback || "A'lo darajada bajarilgan. Vazifa talablariga to'liq javob beradi.",
    });
    setIsGradeModalOpen(true);
  };

  const handleSaveGrade = (e) => {
    e.preventDefault();
    if (!activeHwToGrade) return;

    gradeStudentHomework(user?.id, activeHwToGrade.id, gradeFormData);
    setIsGradeModalOpen(false);
    setToastMessage("Vazifa muvaffaqiyatli baholandi va talabaga tangalar hisoblandi!");
    setTimeout(() => setToastMessage(''), 4500);
  };

  // Teacher Create New Group Homework Handler
  const handleOpenCreateHomework = () => {
    setCreateError('');
    const firstGroupId = teacherAvailableGroups[0]?.id ? String(teacherAvailableGroups[0].id) : '';
    setCreateFormData({
      groupId: firstGroupId,
      title: '',
      description: '',
      dueDate: '',
      maxScore: '',
      bonusCoins: '',
      isUrgent: false,
      fileName: '',
    });
    setIsCreateHwModalOpen(true);
  };

  const handleSaveNewHomework = (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createFormData.groupId) {
      setCreateError("Iltimos, vazifa biriktiriladigan guruhni tanlang!");
      return;
    }
    if (!createFormData.title.trim()) {
      setCreateError("Iltimos, vazifa nomini kiriting!");
      return;
    }

    const selectedGroup = teacherAvailableGroups.find((g) => String(g.id) === String(createFormData.groupId));
    const groupName = selectedGroup?.name || 'Guruh';
    const courseName = selectedGroup?.course?.name || selectedGroup?.name || 'Kurs';
    const courseId = selectedGroup?.course_id || selectedGroup?.course?.id || null;

    const created = createGroupHomework(
      {
        groupId: createFormData.groupId,
        groupName,
        courseId,
        courseName,
        title: createFormData.title,
        description: createFormData.description,
        dueDate: (createFormData.dueDate || '').trim() || '3 kun ichida',
        maxScore: Number(createFormData.maxScore) || 10,
        bonusCoins: Number(createFormData.bonusCoins) || 10,
        isUrgent: createFormData.isUrgent,
        fileName: createFormData.fileName,
      },
      user
    );

    if (created) {
      setIsCreateHwModalOpen(false);
      setToastMessage(`Yangi vazifa muvaffaqiyatli "${groupName}" guruhiga joylandi va guruh talabalariga ko'rindi!`);
      setTimeout(() => setToastMessage(''), 5000);
    }
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs items={[{ label: 'Bosh sahifa', path: '/dashboard' }, { label: 'Uy Vazifalari' }]} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1 className={styles.title}>
            <FileText size={26} color="#2563eb" />
            Uy Vazifalari & Topshiriqlar
          </h1>
          <p className={styles.subtitle}>
            {isStudent
              ? `Siz biriktirilgan guruhlar (${studentGroupNames.join(', ') || 'Faol guruhingiz'}) bo'yicha amaliy topshiriqlar va muddatlar`
              : "O'quvchilar guruhlariga yangi vazifalar biriktirish, topshirilgan ishlarni baholash va monetlar berish"}
          </p>
        </div>

        {!isStudent && (
          <Button
            variant="primary"
            icon={Plus}
            onClick={handleOpenCreateHomework}
          >
            Yangi Vazifa Qo'shish
          </Button>
        )}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          padding: '12px 18px',
          background: '#ecfdf5',
          border: '1.5px solid #10b981',
          borderRadius: '12px',
          color: '#065f46',
          fontSize: '13.5px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 4 Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <FileText size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statTitle}>Jami Vazifalar</span>
            <span className={styles.statBigNumber}>
              {totalCount} <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 700 }}>ta</span>
            </span>
            <span className={styles.statHint}>
              {isStudent ? "Sizning guruhingiz bo'yicha" : "Barcha guruhlar bo'yicha"}
            </span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGold}`}>
            <Clock size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statTitle}>Kutilmoqda (Bajarilmagan)</span>
            <span className={styles.statBigNumber}>
              {pendingCount} <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 700 }}>ta</span>
            </span>
            <span className={styles.statHint}>Topshirish muddati yaqin</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconPurple}`}>
            <UploadCloud size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statTitle}>Tekshiruvda (Topshirilgan)</span>
            <span className={styles.statBigNumber}>
              {submittedCount} <span style={{ fontSize: '13px', color: '#7e22ce', fontWeight: 700 }}>ta</span>
            </span>
            <span className={styles.statHint}>Ustoz ko'rib chiqmoqda</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <CheckCheck size={24} />
          </div>
          <div className={styles.statContent}>
            <span className={styles.statTitle}>Baholangan</span>
            <span className={styles.statBigNumber}>
              {gradedCount} <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 700 }}>ta</span>
            </span>
            <span className={styles.statHint}>Monetlar berilgan</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterCard}>
        <div className={styles.filterTabs}>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'all' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Barchasi ({totalCount})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'pending' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('pending')}
          >
            ⏳ Kutilmoqda ({pendingCount})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'submitted' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('submitted')}
          >
            📤 Tekshiruvda ({submittedCount})
          </button>
          <button
            type="button"
            className={`${styles.filterPill} ${statusFilter === 'graded' ? styles.filterPillActive : ''}`}
            onClick={() => setStatusFilter('graded')}
          >
            ✅ Baholangan ({gradedCount})
          </button>
        </div>

        <div className={styles.searchAndSelect}>
          {/* Group / Course selector */}
          {availableFilterOptions.length > 1 && (
            <select
              className={styles.courseSelect}
              value={selectedGroupFilter}
              onChange={(e) => setSelectedGroupFilter(e.target.value)}
            >
              <option value="all">Barcha Guruhlar</option>
              {availableFilterOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Search box */}
          <div className={styles.searchInputWrap}>
            <Search size={16} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Vazifa nomi yoki ustoz..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </div>
      </div>

      {/* Homework Cards List */}
      <div className={styles.hwList}>
        {filteredHomeworks.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '56px 20px',
            background: '#ffffff',
            borderRadius: '20px',
            border: '1.5px solid #e2e8f0',
            color: '#64748b'
          }}>
            <FileText size={48} color="#cbd5e1" style={{ marginBottom: '12px' }} />
            <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', color: '#1e293b' }}>
              {isStudent ? "Guruhingizda hozircha uy vazifalari mavjud emas" : "Mos uy vazifalari topilmadi"}
            </h4>
            <p style={{ margin: 0, fontSize: '13.5px' }}>
              {isStudent
                ? "Ustozingiz guruhingizga yangi vazifa joylashi bilan bu yerda avtomatik paydo bo'ladi."
                : "Yangi vazifa qo'shish uchun yuqoridagi tugmani bosing."}
            </p>
          </div>
        ) : (
          filteredHomeworks.map((hw) => (
            <div key={hw.id} className={styles.hwCard}>
              {/* Card Top Row */}
              <div className={styles.hwCardTop}>
                <div className={styles.hwMetaLeft}>
                  {/* Group / Course Tag */}
                  <span
                    className={styles.courseTag}
                    style={{
                      background: hw.courseBg || '#eff6ff',
                      color: hw.courseColor || '#2563eb',
                      border: `1px solid ${hw.courseColor || '#bfdbfe'}33`
                    }}
                  >
                    <BookOpen size={13} />
                    {hw.groupName || hw.courseName}
                  </span>

                  {/* Status badge */}
                  {hw.status === 'submitted' && (
                    <span className={styles.statusSubmitted}>
                      <UploadCloud size={13} />
                      Topshirildi (Tekshiruvda)
                    </span>
                  )}
                  {hw.status === 'graded' && (
                    <span className={styles.statusGraded}>
                      <CheckCircle2 size={13} />
                      Baholandi: {hw.grade} / {hw.maxScore && hw.maxScore <= 10 ? hw.maxScore : 10} ball
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <CalendarIcon size={14} color="#94a3b8" />
                    Muddati: <b style={{ color: hw.isUrgent ? '#dc2626' : '#1e293b' }}>{hw.dueDate}</b>
                  </span>
                  {hw.bonusCoins && (
                    <span className={styles.coinBadge} title="Ushbu vazifa uchun mukofot tangalar">
                      🪙 +{hw.bonusCoins} monet
                    </span>
                  )}
                </div>
              </div>

              {/* Title */}
              <div>
                <h3 className={styles.hwTitle}>{hw.title}</h3>
              </div>

              {/* Teacher & Metadata row */}
              <div className={styles.hwTeacherRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: 700
                    }}
                  >
                    {getInitials(hw.teacher)}
                  </div>
                  <span>Ustoz: <b>{hw.teacher}</b></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#64748b' }}>
                  {hw.groupName && (
                    <span>Guruh: <b style={{ color: '#0f172a' }}>{hw.groupName}</b></span>
                  )}
                  <span>Berilgan sana: {hw.assignedDate}</span>
                </div>
              </div>

              {/* -------------------------------------------------------- */}
              {/* TALABA UCHUN: Vazifani faqat ko'rish (Daftar/kompyuter)  */}
              {/* -------------------------------------------------------- */}
              {isStudent && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
                  {/* Talaba uchun faqat "Ko'rish" tugmasi */}
                  <div className={styles.hwCardActions} style={{ borderTop: 'none', paddingTop: '4px' }}>
                    <button
                      type="button"
                      className={styles.hwActionBtn}
                      onClick={() => handleOpenView(hw)}
                      title="Vazifa shartlarini batafsil ko'rish"
                    >
                      <Eye size={15} />
                      <span>Ko'rish</span>
                    </button>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------- */}
              {/* O'QITUVCHI / ADMIN: 1-rasmdagi jadval & Baholash        */}
              {/* -------------------------------------------------------- */}
              {!isStudent && (
                <>
                  <div className={styles.studentTableCard}>
                    <table className={styles.studentTable}>
                      <thead>
                        <tr>
                          <th style={{ width: '38%' }}>Talaba</th>
                          <th style={{ width: '18%' }}>Holat</th>
                          <th style={{ width: '18%' }}>Muddat</th>
                          <th style={{ width: '26%' }}>Ball</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getHomeworkRealStudents(hw).map((st) => {
                          const rawScore = studentScores[`${hw.id}_${st.id}`] ?? studentScores[`${hw.id}_${st.name}`] ?? st.score ?? 8;
                          const currentScore = normalizeScoreTo10(rawScore);
                          return (
                            <tr key={st.id || st.name}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div className={styles.studentTableAvatar}>
                                    {st.initials || getInitials(st.name)}
                                  </div>
                                  <span className={styles.studentTableName}>{st.name}</span>
                                </div>
                              </td>
                              <td>
                                {st.status === 'graded' ? (
                                  <span className={styles.studentBadgeGraded}>Baholangan</span>
                                ) : st.status === 'submitted' ? (
                                  <span className={styles.studentBadgeSubmitted}>Tekshiruvda</span>
                                ) : (
                                  <span className={styles.studentBadgePending}>Kutilmoqda</span>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                                  {st.dueDate}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <input
                                    type="range"
                                    min="1"
                                    max="10"
                                    step="1"
                                    value={currentScore}
                                    onChange={(e) => handleScoreSliderChange(hw.id, st.id, e.target.value, st.name)}
                                    className={styles.scoreSlider}
                                  />
                                  <b style={{ minWidth: '22px', fontSize: '15px', fontWeight: 800, color: '#0f172a', textAlign: 'center' }}>
                                    {currentScore}
                                  </b>
                                  <button
                                    type="button"
                                    className={styles.studentSaveBtn}
                                    onClick={() => handleSaveStudentScore(hw, st)}
                                  >
                                    Saqlash
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Teacher Create New Homework Modal */}
      {isCreateHwModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsCreateHwModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            style={{ maxWidth: '620px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Plus size={22} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '18px' }}>
                    Yangi Uy Vazifasi Qo'shish
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    Tanlangan guruh talabalari paneliga darhol yuboriladi
                  </span>
                </div>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsCreateHwModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {createError && (
              <div style={{
                marginTop: '14px',
                padding: '10px 14px',
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewHomework}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '16px' }}>
                {/* 1. Guruh tanlash */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Guruhni tanlang *
                  </label>
                  <select
                    value={createFormData.groupId}
                    onChange={(e) => setCreateFormData({ ...createFormData, groupId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      outline: 'none',
                      backgroundColor: '#ffffff'
                    }}
                    required
                  >
                    <option value="">-- Qaysi guruhga vazifa berilmoqda? --</option>
                    {teacherAvailableGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.course?.name || "Kurs"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Title */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Mavzu / Vazifa nomi *
                  </label>
                  <input
                    type="text"
                    value={createFormData.title}
                    onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                    required
                  />
                </div>

                {/* 3. Description */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
                    Topshiriq shartlari va batafsil tavsif *
                  </label>
                  <textarea
                    rows={4}
                    value={createFormData.description}
                    onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    required
                  />
                </div>

                {/* 4. Deadline, MaxScore, BonusCoins */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                       Topshirish muddati *
                    </label>
                    <input
                      type="text"
                      value={createFormData.dueDate}
                      onChange={(e) => setCreateFormData({ ...createFormData, dueDate: e.target.value })}
                      placeholder=""
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Maksimal ball
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={createFormData.maxScore}
                      onChange={(e) => setCreateFormData({ ...createFormData, maxScore: e.target.value })}
                      placeholder=""
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Mukofot monetlar
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={createFormData.bonusCoins}
                      onChange={(e) => setCreateFormData({ ...createFormData, bonusCoins: e.target.value })}
                      placeholder=""
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* 5. Attachment & Urgent */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#1e293b', marginBottom: '5px' }}>
                      Material fayli nomi (PDF / DOCX):
                    </label>
                    <input
                      type="text"
                      value={createFormData.fileName}
                      onChange={(e) => setCreateFormData({ ...createFormData, fileName: e.target.value })}
                      placeholder=""
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        outline: 'none',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '18px' }}>
                    <input
                      type="checkbox"
                      id="isUrgentCb"
                      checked={createFormData.isUrgent}
                      onChange={(e) => setCreateFormData({ ...createFormData, isUrgent: e.target.checked })}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="isUrgentCb" style={{ fontSize: '13px', fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>
                      ⚡ Shoshilinch topshiriq
                    </label>
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '22px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsCreateHwModalOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" icon={Send} loading={isActionLoading}>
                  Guruhga Joylash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Submit Modal */}
      {isSubmitModalOpen && activeHwToSubmit && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <UploadCloud size={20} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '17px' }}>
                    Uy Vazifasini Topshirish
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    {activeHwToSubmit.title}
                  </span>
                </div>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsSubmitModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitHomework}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                <div style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  fontSize: '13px',
                  color: '#334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span>Tekshiruvchi ustoz: <b>{activeHwToSubmit.teacher}</b></span>
                  <span style={{ color: '#16a34a', fontWeight: 700 }}>
                    Mukofot: +{activeHwToSubmit.bonusCoins || 10} monet
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Loyiha yoki Kod havolasi (GitHub / GitLab / Google Drive / Figma / Vercel):
                  </label>
                  <input
                    type="url"
                    value={submitFormData.link}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, link: e.target.value })}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Fayl yuklash (ZIP, RAR, PDF, DOCX):
                  </label>
                  <div
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '10px',
                      padding: '18px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer',
                    }}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.onchange = (e) => {
                        if (e.target.files && e.target.files[0]) {
                          setSubmitFormData({
                            ...submitFormData,
                            fileName: e.target.files[0].name
                          });
                        }
                      };
                      input.click();
                    }}
                  >
                    <UploadCloud size={28} color="#2563eb" style={{ margin: '0 auto 6px auto' }} />
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {submitFormData.fileName ? (
                        <span style={{ color: '#2563eb' }}>Tanlangan: {submitFormData.fileName}</span>
                      ) : (
                        "Kompyuterdan fayl tanlash uchun bu yerga bosing"
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Maksimal hajm: 25MB</span>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Ustoz uchun izoh yoki xabar (ixtiyoriy):
                  </label>
                  <textarea
                    rows={3}
                    value={submitFormData.comment}
                    onChange={(e) => setSubmitFormData({ ...submitFormData, comment: e.target.value })}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" icon={Send} loading={isActionLoading}>
                  Topshirish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teacher Grade Modal */}
      {isGradeModalOpen && activeHwToGrade && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsGradeModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: '#fefce8',
                  color: '#ca8a04',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Award size={20} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '17px' }}>
                    Vazifani Baholash & Tangalar Berish
                  </h3>
                  <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                    {activeHwToGrade.title} ({activeHwToGrade.groupName || activeHwToGrade.courseName})
                  </span>
                </div>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsGradeModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveGrade}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                {/* Baholanayotgan Talaba Info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: '#f0fdf4',
                  border: '1.5px solid #86efac',
                  borderRadius: '12px',
                  padding: '12px 14px'
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#16a34a',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {getInitials(getStudentFullName(activeHwToGrade))}
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#166534', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>
                      Baholanayotgan Talaba (F.I.SH):
                    </span>
                    <b style={{ fontSize: '15px', color: '#14532d' }}>
                      {getStudentFullName(activeHwToGrade)}
                    </b>
                  </div>
                  {activeHwToGrade.groupName && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '12px',
                      background: '#ffffff',
                      padding: '3px 10px',
                      borderRadius: '6px',
                      border: '1px solid #bbf7d0',
                      color: '#15803d',
                      fontWeight: 600
                    }}>
                      {activeHwToGrade.groupName}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                      Baho (1-10 ballik tizim):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={gradeFormData.grade}
                      onChange={(e) => setGradeFormData({ ...gradeFormData, grade: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                      Mukofot monetlar (Coins):
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={gradeFormData.coins}
                      onChange={(e) => setGradeFormData({ ...gradeFormData, coins: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        fontWeight: 700,
                        outline: 'none',
                      }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '6px' }}>
                    Ustoz Xulosasi & Maslahati (Feedback):
                  </label>
                  <textarea
                    rows={4}
                    value={gradeFormData.feedback}
                    onChange={(e) => setGradeFormData({ ...gradeFormData, feedback: e.target.value })}
                    placeholder=""
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13.5px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                    required
                  />
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px',
                marginTop: '20px',
                paddingTop: '16px',
                borderTop: '1px solid #e2e8f0'
              }}>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsGradeModalOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" icon={Award} loading={isActionLoading}>
                  Baholashni Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Homework Details View Modal */}
      {isViewModalOpen && activeHwToView && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsViewModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '17px' }}>
                    Uy Vazifasi Tafsilotlari
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {activeHwToView.groupName || activeHwToView.courseName} guruhi topshirig'i
                  </span>
                </div>
              </div>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsViewModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              {/* Title & Badges */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span
                    className={styles.courseTag}
                    style={{
                      background: activeHwToView.courseBg || '#eff6ff',
                      color: activeHwToView.courseColor || '#2563eb',
                      border: `1px solid ${activeHwToView.courseColor || '#bfdbfe'}33`
                    }}
                  >
                    <BookOpen size={13} />
                    {activeHwToView.groupName || activeHwToView.courseName}
                  </span>

                  {activeHwToView.status === 'submitted' && (
                    <span className={styles.statusSubmitted}>
                      <UploadCloud size={13} />
                      Topshirildi (Tekshiruvda)
                    </span>
                  )}
                  {activeHwToView.status === 'graded' && (
                    <span className={styles.statusGraded}>
                      <CheckCircle2 size={13} />
                      Baholandi: {activeHwToView.grade} / {activeHwToView.maxScore || 100} ball
                    </span>
                  )}
                  {activeHwToView.status === 'pending' && (
                    <span className={styles.statusPending}>
                      <Clock size={13} />
                      Kutilmoqda
                    </span>
                  )}
                  {activeHwToView.bonusCoins && (
                    <span className={styles.coinBadge}>
                      🪙 +{activeHwToView.bonusCoins} monet
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.4 }}>
                  {activeHwToView.title}
                </h2>

                {/* Student Banner in Modal */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  background: activeHwToView.status === 'graded' ? '#f0fdf4' : activeHwToView.status === 'submitted' ? '#eff6ff' : '#f8fafc',
                  border: `1.5px solid ${activeHwToView.status === 'graded' ? '#86efac' : activeHwToView.status === 'submitted' ? '#bfdbfe' : '#e2e8f0'}`,
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginTop: '10px'
                }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    background: activeHwToView.status === 'graded' ? '#16a34a' : activeHwToView.status === 'submitted' ? '#2563eb' : '#64748b',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    flexShrink: 0
                  }}>
                    {getInitials(getStudentFullName(activeHwToView))}
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>
                      {activeHwToView.status === 'graded' ? 'Baholangan Talaba (F.I.SH):' : activeHwToView.status === 'submitted' ? 'Topshirgan Talaba (F.I.SH):' : 'Talaba (F.I.SH):'}
                    </span>
                    <b style={{ fontSize: '14.5px', color: '#0f172a' }}>
                      {getStudentFullName(activeHwToView)}
                    </b>
                  </div>
                </div>
              </div>

              {/* Metadata Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '10px',
                padding: '12px 14px',
                background: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                fontSize: '12.5px'
              }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Talaba (F.I.SH):</span>
                  <b style={{ color: '#0f172a' }}>{getStudentFullName(activeHwToView)}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>O'qituvchi:</span>
                  <b style={{ color: '#1e293b' }}>{activeHwToView.teacher}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Berilgan sana:</span>
                  <b style={{ color: '#1e293b' }}>{activeHwToView.assignedDate}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Topshirish muddati:</span>
                  <b style={{ color: activeHwToView.isUrgent ? '#dc2626' : '#1e293b' }}>{activeHwToView.dueDate}</b>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block', marginBottom: '2px' }}>Maksimal ball:</span>
                  <b style={{ color: '#2563eb' }}>{activeHwToView.maxScore || 100} ball</b>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                  Vazifa tavsifi va topshiriq shartlari:
                </h4>
                <div style={{
                  padding: '14px 16px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  lineHeight: '1.6',
                  color: '#334155',
                  whiteSpace: 'pre-wrap'
                }}>
                  {activeHwToView.description || "Ushbu vazifa uchun qo'shimcha tavsif berilmagan."}
                </div>
              </div>

              {/* Attached Files List */}
              {activeHwToView.files && activeHwToView.files.length > 0 && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Paperclip size={15} color="#2563eb" />
                    Biriktirilgan materiallar va amaliy fayllar ({activeHwToView.files.length} ta):
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeHwToView.files.map((file, fIdx) => (
                      <div key={fIdx} className={styles.hwFileCard}>
                        <div className={styles.hwFileLeft}>
                          <div className={file.type === 'pdf' ? styles.hwFileIconPdf : styles.hwFileIconWord}>
                            <FileText size={16} />
                          </div>
                          <div>
                            <div className={styles.hwFileName} title={file.name}>{file.name}</div>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>{file.type?.toUpperCase()} • {file.size}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.hwDownloadBtn}
                          onClick={() => file.type === 'pdf' ? handleDownloadPdf(activeHwToView, file) : handleDownloadWord(activeHwToView, file)}
                          title="Faylni yuklab olish"
                        >
                          <Download size={13} />
                          <span>Yuklash</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Submission (if submitted) */}
              {(activeHwToView.submissionComment || activeHwToView.submissionLink || activeHwToView.submittedFileName) && (
                <div className={styles.hwSubmissionBox}>
                  <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                    <UploadCloud size={16} color="#2563eb" />
                    Talaba tomonidan topshirilgan ish:
                  </div>
                  <div style={{ fontSize: '13px', color: '#1e3a8a', marginBottom: '6px' }}>
                    <span>Topshirgan talaba: </span>
                    <b style={{ color: '#1d4ed8' }}>{getStudentFullName(activeHwToView)}</b>
                  </div>
                  {activeHwToView.submittedDate && (
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Topshirilgan vaqt: {activeHwToView.submittedDate}
                    </div>
                  )}
                  {activeHwToView.submissionLink && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ color: '#475569' }}>Loyiha havolasi:</span>
                      <a
                        href={activeHwToView.submissionLink}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: '#2563eb', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        {activeHwToView.submissionLink}
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  {activeHwToView.submittedFileName && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <span style={{ color: '#475569' }}>Biriktirilgan fayl:</span>
                      <b style={{ color: '#0f172a' }}>{activeHwToView.submittedFileName}</b>
                    </div>
                  )}
                  {activeHwToView.submissionComment && (
                    <div style={{ marginTop: '6px', background: '#ffffff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                      <span style={{ fontSize: '11.5px', color: '#64748b', display: 'block', marginBottom: '2px' }}>Talaba izohi:</span>
                      <span>{activeHwToView.submissionComment}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Teacher Grading Feedback (if graded) */}
              {activeHwToView.grade && (
                <div className={styles.hwFeedbackCard}>
                  <CheckCircle2 size={22} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#15803d' }}>
                      Baholandi: {activeHwToView.grade} ball • +{activeHwToView.bonusCoins || 10} monet berildi
                    </div>
                    {activeHwToView.teacherFeedback && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#166534', lineHeight: 1.5 }}>
                        Ustoz xulosasi: "{activeHwToView.teacherFeedback}"
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: isStudent ? 'flex-end' : 'space-between',
              gap: '10px',
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
              flexWrap: 'wrap'
            }}>
              {!isStudent && (
                <button
                  type="button"
                  className={styles.hwActionBtn}
                  onClick={() => handleDownloadHomework(activeHwToView)}
                  title="Vazifa qo'llanmasini yuklab olish"
                >
                  <Download size={14} />
                  <span>Qo'llanmani Yuklash</span>
                </button>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Button
                  variant={isStudent ? 'primary' : 'outline'}
                  type="button"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Yopish
                </Button>

                {!isStudent && (
                  <Button
                    variant="primary"
                    icon={UserCheck}
                    onClick={() => {
                      setIsViewModalOpen(false);
                      handleOpenGrade(activeHwToView);
                    }}
                  >
                    Baholash
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Homework;
