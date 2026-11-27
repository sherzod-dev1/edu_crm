import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  fetchGroups,
  fetchGroupById,
  createGroup,
  updateGroup,
  deleteGroup,
  clearError,
} from '../../store/slices/groupSlice';
import courseApi from '../../services/courseApi';
import teacherApi from '../../services/teacherApi';
import branchApi from '../../services/branchApi';
import studentApi from '../../services/studentApi';
import groupStudentApi from '../../services/groupStudentApi';
import classroomApi from '../../services/classroomApi';
import lessonApi from '../../services/lessonApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './groups.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  UserPlus,
  X,
  BookOpen,
  GraduationCap,
  DoorOpen,
  Calendar,
  Clock,
  CheckSquare,
  Users,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Hammasi' },
  { id: 'ACTIVE', label: 'Faol' },
  { id: 'COMPLETED', label: 'Yakunlangan' },
];

const parseLessonTime = (str) => {
  if (!str || typeof str !== 'string') return { startTime: null, endTime: null, formatted: '' };
  const matches = str.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g);
  if (matches && matches.length >= 2) {
    const start = matches[0].replace('.', ':');
    const end = matches[1].replace('.', ':');
    const startPad = start.length === 4 ? `0${start}` : start;
    const endPad = end.length === 4 ? `0${end}` : end;
    return {
      startTime: `${startPad}:00`,
      endTime: `${endPad}:00`,
      formatted: `${startPad} - ${endPad}`,
    };
  } else if (matches && matches.length === 1) {
    const start = matches[0].replace('.', ':');
    const startPad = start.length === 4 ? `0${start}` : start;
    return {
      startTime: `${startPad}:00`,
      endTime: null,
      formatted: startPad,
    };
  }
  return { startTime: null, endTime: null, formatted: str.trim() };
};

const timeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const match = String(timeStr).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

const getScheduleCategory = (daysStr) => {
  if (!daysStr) return 'other';
  const str = String(daysStr).toLowerCase();
  const hasOdd = str.includes('du') || str.includes('chor') || str.includes('jum') || str.includes('odd') || str.includes('toq');
  const hasEven = str.includes('se') || str.includes('pay') || str.includes('shan') || str.includes('even') || str.includes('juft');
  if (hasOdd && !hasEven) return 'odd';
  if (hasEven && !hasOdd) return 'even';
  return 'all';
};

const doDaysOverlap = (daysA, daysB) => {
  if (!daysA || !daysB) return true;
  const catA = getScheduleCategory(daysA);
  const catB = getScheduleCategory(daysB);
  if (catA === 'all' || catB === 'all') return true;
  return catA === catB;
};

const QUICK_TIME_SLOTS = [
  { label: '08:00 - 10:00', start: '08:00', end: '10:00' },
  { label: '10:00 - 12:00', start: '10:00', end: '12:00' },
  { label: '14:00 - 16:00', start: '14:00', end: '16:00' },
  { label: '16:00 - 18:00', start: '16:00', end: '18:00' },
  { label: '18:00 - 20:00', start: '18:00', end: '20:00' },
];

const formatGroupTime = (group) => {
  if (!group) return '—';
  if (group.lesson_time && group.lesson_time.trim()) {
    return group.lesson_time.trim();
  }
  if (group.start_time) {
    const s = String(group.start_time).slice(0, 5);
    const e = group.end_time ? String(group.end_time).slice(0, 5) : '';
    return e ? `${s} - ${e}` : s;
  }
  return '—';
};

const formatDateDisplay = (dateStr) => {
  if (!dateStr) return '—';
  try {
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return clean;
  } catch {
    return String(dateStr);
  }
};

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  'linear-gradient(135deg, #06b6d4 0%, #0e7490 100%)',
  'linear-gradient(135deg, #10b981 0%, #047857 100%)',
  'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
  'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
];

const getAvatarGradient = (str = '') => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
};

const getInitials = (name = '') => {
  if (!name) return 'TL';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Groups = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.group || {}
  );
  const { user } = useSelector((state) => state.auth || {});

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Dropdowns & Related data
  const [coursesList, setCoursesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [classroomsList, setClassroomsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [groupStudentsList, setGroupStudentsList] = useState([]);
  const [lessonsList, setLessonsList] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    course_id: '',
    course_input: '',
    teacher_id: '',
    branch_id: '',
    classroom_id: '',
    classroom_input: '',
    days: '',
    lesson_time: '',
    opening_date: '',
    start_date: '',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Enroll Student Modal State
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollFormData, setEnrollFormData] = useState({
    group_id: '',
    student_id: '',
    status: 'active',
  });
  const [enrollModalError, setEnrollModalError] = useState('');

  const loadAllData = () => {
    dispatch(fetchGroups());

    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {
      setCoursesList([]);
    });

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
      const userBranchId = user?.branch_id;
      if (!isSuperAdminUser && userBranchId) {
        setTeachersList(list.filter((t) => String(t.branch_id || t.user?.branch_id) === String(userBranchId)));
      } else {
        setTeachersList(list);
      }
    }).catch(() => {});

    branchApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
      if (!isSuperAdminUser) {
        const userBranchId = user?.branch_id;
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
      const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
      const userBranchId = user?.branch_id;
      if (!isSuperAdminUser && userBranchId) {
        setClassroomsList(list.filter((c) => String(c.branch_id) === String(userBranchId)));
      } else {
        setClassroomsList(list);
      }
    }).catch(() => {});

    studentApi.getAll({ limit: 300 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStudentsList(list);
    }).catch(() => {});

    groupStudentApi.getAll({ limit: 500 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupStudentsList(list);
    }).catch(() => {});

    lessonApi.getAll({ limit: 500 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setLessonsList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setCurrentPage(1);
  };

  // Group Actions
  const handleOpenCreate = () => {
    const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
    const defaultBranchId = !isSuperAdminUser ? (user?.branch_id || user?.branch?.id || branchesList[0]?.id || '') : (branchesList[0]?.id || '');
    const todayStr = new Date().toISOString().split('T')[0];
    setFormData({
      name: '',
      course_id: '',
      course_input: '',
      teacher_id: '',
      branch_id: defaultBranchId,
      classroom_id: '',
      classroom_input: '',
      days: '',
      lesson_time: '',
      opening_date: todayStr,
      start_date: todayStr,
      status: 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchGroupById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    const course = item.course || coursesList.find((c) => String(c.id) === String(item.course_id));
    const classroom = item.classroom || classroomsList.find((c) => String(c.id) === String(item.classroom_id));

    let initialLessonTime = item.lesson_time || '';
    if (!initialLessonTime && item.start_time) {
      const s = String(item.start_time).slice(0, 5);
      const e = item.end_time ? String(item.end_time).slice(0, 5) : '';
      initialLessonTime = e ? `${s} - ${e}` : s;
    }

    setFormData({
      id: item.id,
      name: item.name || '',
      course_id: item.course_id || item.course?.id || '',
      course_input: course?.name || item.course_name || '',
      teacher_id: item.teacher_id || item.teacher?.id || '',
      branch_id: item.branch_id || item.branch?.id || '',
      classroom_id: item.classroom_id || item.classroom?.id || '',
      classroom_input: classroom?.name || item.classroom_name || (item.classroom_id ? `Lab-${item.classroom_id}` : ''),
      days: item.days || '',
      lesson_time: initialLessonTime,
      opening_date: item.opening_date
        ? String(item.opening_date).split('T')[0]
        : (item.createdAt || item.created_at ? String(item.createdAt || item.created_at).split('T')[0] : ''),
      start_date: item.start_date ? String(item.start_date).split('T')[0] : '',
      status: item.status || 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Guruhni o'chirish",
      message: "Haqiqatdan ham ushbu guruhni o'chirmoqchimisiz? Guruhga biriktirilgan talabalar va darslar jadvali bekor qilinishi mumkin.",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteGroup(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        loadAllData();
        if (selectedItem?.id === id) {
          setViewMode('LIST');
        }
      }
    }
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const isDayActive = (dayKey) => {
    const str = String(formData.days || '').toLowerCase();
    if (!str) return false;
    if (dayKey === 'Du') return str.includes('du');
    if (dayKey === 'Chor') return str.includes('chor');
    if (dayKey === 'Jum') return str.includes('jum') || (str.includes('ju') && !str.includes('juft'));
    if (dayKey === 'Se') return str.includes('se');
    if (dayKey === 'Pay') return str.includes('pay');
    if (dayKey === 'Shan') return str.includes('shan');
    return false;
  };

  const handleToggleDay = (dayKey) => {
    const allDaysOrder = [
      { key: 'Du', code: 'Du' },
      { key: 'Se', code: 'Se' },
      { key: 'Chor', code: 'Chor' },
      { key: 'Pay', code: 'Pay' },
      { key: 'Jum', code: 'Ju' },
      { key: 'Shan', code: 'Shan' },
    ];

    const currentActive = allDaysOrder.filter((d) => isDayActive(d.key)).map((d) => d.key);
    let nextActive;
    if (currentActive.includes(dayKey)) {
      nextActive = currentActive.filter((k) => k !== dayKey);
    } else {
      nextActive = [...currentActive, dayKey];
    }

    const orderedCodes = allDaysOrder
      .filter((d) => nextActive.includes(d.key))
      .map((d) => d.code);

    setFormData((prev) => ({
      ...prev,
      days: orderedCodes.join('-'),
    }));
  };

  const selectedTeacherId = formData.teacher_id;
  const selectedTeacherObj = useMemo(() => {
    if (!selectedTeacherId) return null;
    return teachersList.find(
      (t) => String(t.id) === String(selectedTeacherId) || String(t.user_id) === String(selectedTeacherId)
    );
  }, [selectedTeacherId, teachersList]);

  const teacherActiveGroups = useMemo(() => {
    if (!selectedTeacherId) return [];
    return (items || []).filter((g) => {
      if (viewMode === 'EDIT' && String(g.id) === String(formData.id)) return false;
      if (g.status === 'completed' || g.status === 'archived') return false;
      const matchTeacher =
        String(g.teacher_id) === String(selectedTeacherId) ||
        String(g.teacher?.id) === String(selectedTeacherId) ||
        (selectedTeacherObj && (
          String(g.teacher_id) === String(selectedTeacherObj.user_id) ||
          String(g.teacher_id) === String(selectedTeacherObj.id)
        ));
      return Boolean(matchTeacher);
    });
  }, [selectedTeacherId, selectedTeacherObj, items, viewMode, formData.id]);

  const teacherScheduleOverview = useMemo(() => {
    if (!teacherActiveGroups.length) return { odd: [], even: [], other: [] };
    const odd = [];
    const even = [];
    const other = [];

    teacherActiveGroups.forEach((g) => {
      const timeDisplay = formatGroupTime(g);
      const cat = getScheduleCategory(g.days);
      const item = {
        id: g.id,
        name: g.name,
        days: g.days || 'Belgilanmagan',
        time: timeDisplay,
        startTime: g.start_time,
        endTime: g.end_time,
        lessonTime: g.lesson_time,
      };
      if (cat === 'odd') odd.push(item);
      else if (cat === 'even') even.push(item);
      else {
        other.push(item);
      }
    });

    return { odd, even, other };
  }, [teacherActiveGroups]);

  const groupTeacherConflict = useMemo(() => {
    if (!selectedTeacherId || !formData.days || !formData.lesson_time) return null;
    const parsed = parseLessonTime(formData.lesson_time);
    if (!parsed.startTime || !parsed.endTime) return null;

    const newStartMin = timeToMinutes(parsed.startTime);
    const newEndMin = timeToMinutes(parsed.endTime);
    if (newStartMin === null || newEndMin === null || newStartMin >= newEndMin) return null;

    for (const g of teacherActiveGroups) {
      if (!doDaysOverlap(formData.days, g.days)) continue;
      let existStartMin = timeToMinutes(g.start_time);
      let existEndMin = timeToMinutes(g.end_time);

      if (existStartMin === null || existEndMin === null) {
        const gParsed = parseLessonTime(g.lesson_time);
        existStartMin = timeToMinutes(gParsed.startTime);
        existEndMin = timeToMinutes(gParsed.endTime);
      }

      if (existStartMin !== null && existEndMin !== null) {
        if (newStartMin < existEndMin && newEndMin > existStartMin) {
          return {
            groupName: g.name,
            days: g.days || 'Nomaʼlum kunlar',
            time: formatGroupTime(g),
            conflictMessage: `O'qituvchining "${g.name}" guruhida (${g.days || 'shu kunlarda'} ${formatGroupTime(g)}) darsi bor!`,
          };
        }
      }
    }
    return null;
  }, [selectedTeacherId, formData.days, formData.lesson_time, teacherActiveGroups]);

  const isSlotDisabled = (slot) => {
    if (!selectedTeacherId || !formData.days) return false;
    const slotStartMin = timeToMinutes(slot.start);
    const slotEndMin = timeToMinutes(slot.end);

    return teacherActiveGroups.some((g) => {
      if (!doDaysOverlap(formData.days, g.days)) return false;
      let existStartMin = timeToMinutes(g.start_time);
      let existEndMin = timeToMinutes(g.end_time);
      if (existStartMin === null || existEndMin === null) {
        const gParsed = parseLessonTime(g.lesson_time);
        existStartMin = timeToMinutes(gParsed.startTime);
        existEndMin = timeToMinutes(gParsed.endTime);
      }
      if (existStartMin !== null && existEndMin !== null) {
        return slotStartMin < existEndMin && slotEndMin > existStartMin;
      }
      return false;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (groupTeacherConflict) {
      setErrorMessage(groupTeacherConflict.conflictMessage);
      return;
    }

    // Course resolution: faqat Kurslar kategoriyasidagi mavjud kurslar
    let resolvedCourseId = null;
    if (formData.course_id && coursesList.some((c) => String(c.id) === String(formData.course_id))) {
      resolvedCourseId = formData.course_id;
    } else if (formData.course_input) {
      const matchedCourse = coursesList.find(
        (c) => c.name.toLowerCase() === formData.course_input.trim().toLowerCase()
      );
      if (matchedCourse) resolvedCourseId = matchedCourse.id;
    }

    if (!resolvedCourseId) {
      setErrorMessage("Iltimos, Kurslar bo'limida mavjud kurslardan birini tanlang!");
      return;
    }

    // Classroom resolution: if classroom_input is typed
    let resolvedClassroomId = formData.classroom_id;
    const typedRoom = (formData.classroom_input || '').trim();
    if (typedRoom) {
      const matchedRoom = classroomsList.find(
        (c) => c.name.toLowerCase() === typedRoom.toLowerCase()
      );
      if (matchedRoom) {
        resolvedClassroomId = matchedRoom.id;
      } else {
        try {
          const newRoomRes = await classroomApi.create({
            name: typedRoom,
            capacity: 20,
            branch_id: formData.branch_id || branchesList[0]?.id || 1,
          });
          const createdRoom = newRoomRes.data?.data || newRoomRes.data;
          if (createdRoom?.id) {
            resolvedClassroomId = createdRoom.id;
          }
        } catch (rErr) {
          console.warn("Classroom fallback:", rErr);
        }
      }
    }

    const payload = { ...formData };
    if (!payload.name || !payload.name.trim()) {
      const matchedCourse = coursesList.find((c) => String(c.id) === String(resolvedCourseId));
      payload.name = matchedCourse ? matchedCourse.name : 'Guruh';
    }
    if (resolvedCourseId) payload.course_id = Number(resolvedCourseId);
    if (payload.teacher_id) payload.teacher_id = Number(payload.teacher_id);
    if (payload.branch_id) payload.branch_id = Number(payload.branch_id);
    if (resolvedClassroomId) payload.classroom_id = Number(resolvedClassroomId);

    if (formData.lesson_time && formData.lesson_time.trim()) {
      const parsedTime = parseLessonTime(formData.lesson_time);
      if (parsedTime.startTime) payload.start_time = parsedTime.startTime;
      if (parsedTime.endTime) payload.end_time = parsedTime.endTime;
      payload.lesson_time = parsedTime.formatted || formData.lesson_time.trim();
    } else {
      payload.lesson_time = '';
      payload.start_time = null;
      payload.end_time = null;
    }

    delete payload.course_input;
    delete payload.classroom_input;

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createGroup(payload));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateGroup({ id: formData.id, data: payload }));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  // Student Enrollment Handlers
  const handleOpenEnrollStudent = (defaultGroupId = '') => {
    setEnrollFormData({
      group_id: defaultGroupId || selectedItem?.id || items[0]?.id || '',
      student_id: studentsList[0]?.id || '',
      status: 'active',
    });
    setEnrollModalError('');
    setIsEnrollModalOpen(true);
  };

  const handleRemoveStudentFromGroup = async (groupStudentId) => {
    const isConfirmed = await confirm({
      title: "Talabani guruhdan chiqarish",
      message: "Haqiqatdan ham ushbu talabani guruh ro'yxatidan chiqarmoqchimisiz?",
      confirmText: "Ha, chiqarilsin",
      cancelText: 'Bekor qilish',
      type: 'warning',
    });

    if (isConfirmed) {
      try {
        await groupStudentApi.delete(groupStudentId);
        loadAllData();
        if (selectedItem?.id) {
          dispatch(fetchGroupById(selectedItem.id));
        }
      } catch (err) {
        alert("Talabani chiqarishda xatolik: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSaveEnrollment = async (e) => {
    e.preventDefault();
    setEnrollModalError('');

    if (!enrollFormData.group_id) {
      setEnrollModalError('Iltimos, guruhni tanlang');
      return;
    }
    if (!enrollFormData.student_id) {
      setEnrollModalError('Iltimos, talabani tanlang');
      return;
    }

    try {
      await groupStudentApi.create({
        group_id: Number(enrollFormData.group_id),
        student_id: Number(enrollFormData.student_id),
        status: enrollFormData.status || 'active',
      });

      setIsEnrollModalOpen(false);
      loadAllData();
      if (selectedItem?.id) {
        dispatch(fetchGroupById(selectedItem.id));
      }
    } catch (err) {
      setEnrollModalError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    }
  };

  const userRole = (user?.role || '').toUpperCase();
  const rawPosition = (
    user?.position ||
    user?.employee?.position ||
    user?.employee_profile?.position ||
    ''
  ).toLowerCase();
  const isTeacher = userRole === 'TEACHER';
  const isStudent = userRole === 'STUDENT' || userRole === 'TALABA';
  const isManager = userRole === 'MANAGER';
  const isInspector =
    userRole === 'NAZORATCHI' ||
    userRole === 'INSPECTOR' ||
    userRole === 'SUPERVISOR' ||
    rawPosition.includes('nazoratchi') ||
    rawPosition.includes('inspektor') ||
    rawPosition.includes('supervisor');
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
  const canManage = !isTeacher && !isStudent && !isManager && !isInspector;
  const canViewDetails = !isStudent;
  const userBranchId = user?.branch_id || user?.branch?.id;

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

  const branchScopedItems = useMemo(() => {
    const allItems = items || [];
    if (isSuperAdmin) return allItems;

    if (isTeacher) {
      // Strictly show only groups assigned to this teacher
      return allItems.filter((g) => {
        if (currentTeacherId && String(g.teacher_id) === String(currentTeacherId)) return true;
        if (currentTeacherUserId && String(g.teacher_id) === String(currentTeacherUserId)) return true;
        if (g.teacher) {
          if (currentTeacherId && String(g.teacher.id) === String(currentTeacherId)) return true;
          if (
            currentTeacherUserId &&
            (String(g.teacher.user_id) === String(currentTeacherUserId) ||
              String(g.teacher.user?.id) === String(currentTeacherUserId))
          ) {
            return true;
          }
          const tName = (
            g.teacher.full_name ||
            g.teacher.name ||
            g.teacher.user?.full_name ||
            ''
          )
            .toLowerCase()
            .trim();
          const uName = (user?.full_name || '').toLowerCase().trim();
          if (tName && uName && (tName.includes(uName) || uName.includes(tName))) return true;
        }
        return false;
      });
    }

    if (userBranchId) {
      return allItems.filter((item) => !item.branch_id || String(item.branch_id) === String(userBranchId));
    }

    return allItems;
  }, [items, isSuperAdmin, isTeacher, currentTeacherId, currentTeacherUserId, user, userBranchId]);

  // Helper for group details calculations
  const getGroupStats = (group) => {
    const groupId = group.id;

    // Enrolled students collection
    const directGroupStudents = groupStudentsList.filter(
      (gs) => String(gs.group_id) === String(groupId)
    );
    const matchingStudents = studentsList.filter(
      (s) => String(s.group_id) === String(groupId)
    );
    const groupObjStudents = Array.isArray(group.group_students) ? group.group_students : [];

    const enrolledStudentsMap = new Map();

    const addOrUpdateStudent = (sId, name, phone) => {
      if (!sId) return;
      const key = String(sId);
      const cleanName = (name || '').trim();
      const cleanPhone = (phone || '').trim();
      if (!enrolledStudentsMap.has(key)) {
        enrolledStudentsMap.set(key, {
          id: sId,
          name: cleanName || `Talaba #${sId}`,
          phone: cleanPhone || '',
        });
      } else {
        const existing = enrolledStudentsMap.get(key);
        if (!existing.phone && cleanPhone) existing.phone = cleanPhone;
        if ((!existing.name || existing.name.startsWith('Talaba #')) && cleanName) {
          existing.name = cleanName;
        }
      }
    };

    // 1. groupObjStudents
    groupObjStudents.forEach((gs) => {
      const studentObj = gs.student || studentsList.find((s) => String(s.id) === String(gs.student_id)) || {};
      const userObj = studentObj.user || gs.user || {};
      const sId = gs.student_id || studentObj.id || gs.id;
      const name = userObj.full_name || studentObj.full_name || studentObj.name || userObj.username;
      const phone = userObj.phone || studentObj.phone;
      addOrUpdateStudent(sId, name, phone);
    });

    // 2. directGroupStudents
    directGroupStudents.forEach((gs) => {
      const sId = gs.student_id || gs.student?.id;
      const studentObj = gs.student || studentsList.find((s) => String(s.id) === String(sId)) || {};
      const userObj = studentObj.user || gs.user || {};
      const name = userObj.full_name || studentObj.full_name || studentObj.name || userObj.username;
      const phone = userObj.phone || studentObj.phone;
      addOrUpdateStudent(sId, name, phone);
    });

    // 3. matchingStudents (students whose group_id matches)
    matchingStudents.forEach((s) => {
      const sId = s.id;
      const userObj = s.user || {};
      const name = userObj.full_name || s.full_name || s.name || userObj.username;
      const phone = userObj.phone || s.phone;
      addOrUpdateStudent(sId, name, phone);
    });

    const enrolledStudents = Array.from(enrolledStudentsMap.values());
    const enrolledStudentsCount = Math.max(
      enrolledStudents.length,
      directGroupStudents.length,
      matchingStudents.length,
      groupObjStudents.length,
      Number(group.students_count) || 0
    );

    // Lessons progress
    const groupLessons = lessonsList.filter(
      (l) => String(l.group_id) === String(groupId)
    );
    const completedLessons = groupLessons.filter(
      (l) => l.status === 'completed' || l.is_completed
    ).length;
    const totalLessons = groupLessons.length > 0 ? groupLessons.length : 36;
    const currentCompleted = groupLessons.length > 0 ? completedLessons : Math.min(Number(groupId) * 4, totalLessons);

    const progressPercentage = Math.min(
      Math.round((currentCompleted / totalLessons) * 100),
      100
    );

    // Teacher Name
    const teacher = teachersList.find(
      (t) => String(t.id) === String(group.teacher_id || group.teacher?.id) ||
             String(t.user_id) === String(group.teacher_id || group.teacher?.id)
    );
    const teacherName =
      group.teacher?.user?.full_name ||
      group.teacher?.full_name ||
      group.teacher?.name ||
      teacher?.user?.full_name ||
      teacher?.full_name ||
      (isTeacher && user?.full_name ? user.full_name : '');

    // Classroom
    const classroom = classroomsList.find(
      (c) => String(c.id) === String(group.classroom_id || group.classroom?.id)
    );
    const classroomName =
      group.classroom?.name ||
      classroom?.name ||
      (group.classroom_id ? `Xona #${group.classroom_id}` : '');

    // Course Name
    const course = coursesList.find(
      (c) => String(c.id) === String(group.course_id || group.course?.id)
    );
    const courseName = group.course?.name || course?.name || group.name || 'Node.js Backend Dasturlash';

    // Schedule
    const daysText = group.days || group.schedule_days || '—';
    const timeText = formatGroupTime(group);

    const isActive = group.status === 'active' || !group.status;

    // Sanalar hisob-kitobi (Guruh ochilish sanasi va Darslar boshlanishi)
    const rawOpeningDate =
      group.opening_date ||
      (group.createdAt || group.created_at
        ? String(group.createdAt || group.created_at).split('T')[0]
        : null);

    const sortedGroupLessons = [...groupLessons].sort((a, b) =>
      String(a.lesson_date || '').localeCompare(String(b.lesson_date || ''))
    );
    const firstLessonDate = sortedGroupLessons[0]?.lesson_date;

    const rawStartDate =
      group.start_date
        ? String(group.start_date).split('T')[0]
        : (firstLessonDate || rawOpeningDate);

    const isNewGroup =
      currentCompleted === 0 ||
      group.status === 'new' ||
      group.status === 'planned' ||
      Boolean(rawOpeningDate && (new Date() - new Date(rawOpeningDate)) / (1000 * 60 * 60 * 24) <= 30);

    const todayStr = new Date().toISOString().split('T')[0];
    const isLessonStarted = rawStartDate ? rawStartDate <= todayStr : false;

    return {
      courseId: group.course_id || group.course?.id || course?.id,
      teacherId: group.teacher_id || group.teacher?.id || teacher?.id,
      classroomId: group.classroom_id || group.classroom?.id || classroom?.id,
      courseName,
      teacherName,
      classroomName,
      daysText,
      timeText,
      enrolledCount: enrolledStudentsCount,
      enrolledStudents,
      currentCompleted,
      totalLessons,
      progressPercentage,
      isActive,
      openingDate: rawOpeningDate,
      startDate: rawStartDate,
      isNewGroup,
      isLessonStarted,
    };
  };

  // Filter groups by category & search
  const filteredGroups = branchScopedItems.filter((item) => {
    const stats = getGroupStats(item);

    // Category filter
    if (activeCategory === 'ACTIVE' && !stats.isActive) return false;
    if (activeCategory === 'COMPLETED' && stats.isActive) return false;

    // Search query filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const course = (stats.courseName || '').toLowerCase();
    const teacher = (stats.teacherName || '').toLowerCase();
    const branch = (item.branch?.name || '').toLowerCase();

    return (
      name.includes(q) ||
      course.includes(q) ||
      teacher.includes(q) ||
      branch.includes(q)
    );
  });

  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Guruhlar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil & O'quvchilar" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header section matching exact UI */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Guruhlar</h1>
              <p className={styles.mainSubtitle}>Faol guruhlar</p>
            </div>
            {canManage && (
              <button className={styles.addButton} onClick={handleOpenCreate}>
                <Plus size={18} strokeWidth={2.5} />
                <span>Qo'shish</span>
              </button>
            )}
          </div>

          {/* Categories Pill Tabs and Search */}
          <div className={styles.toolbarSection}>
            <div className={styles.categoriesList}>
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    className={`${styles.categoryPill} ${
                      isActive ? styles.categoryPillActive : ''
                    }`}
                    onClick={() => handleSelectCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            <div className={styles.searchBox}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Qidirish..."
                value={searchQuery}
                onChange={handleSearch}
                className={styles.searchInput}
              />
            </div>
          </div>

          {/* Groups Grid View */}
          {loading ? (
            <Loader text="Guruhlar yuklanmoqda..." />
          ) : paginatedGroups.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Hozircha guruhlar topilmadi</p>
            </div>
          ) : (
            <>
              <div className={styles.groupsGrid}>
                {paginatedGroups.map((item) => {
                  const {
                    courseName,
                    teacherName,
                    classroomName,
                    daysText,
                    timeText,
                    enrolledCount,
                    enrolledStudents,
                    currentCompleted,
                    totalLessons,
                    progressPercentage,
                    isActive,
                    openingDate,
                    startDate,
                    isNewGroup,
                    isLessonStarted,
                  } = getGroupStats(item);

                  const groupDisplayTitle = item.name
                    ? (courseName && !item.name.toLowerCase().includes(courseName.toLowerCase())
                        ? `${item.name} · ${courseName}`
                        : item.name)
                    : `G-[${item.id}] · ${courseName}`;

                  return (
                    <div
                      key={item.id}
                      className={styles.groupCard}
                      onClick={canViewDetails ? () => handleOpenDetails(item) : undefined}
                      style={{ cursor: canViewDetails ? 'pointer' : 'default' }}
                    >
                      {/* Top Header */}
                      <div className={styles.cardHeader}>
                        <h3 className={styles.groupTitle}>{groupDisplayTitle}</h3>

                        <div className={styles.headerRightGroup}>
                          {isNewGroup && (
                            <span className={styles.newBadge} title="Yangi ochilgan guruh">
                              ✨ Yangi guruh
                            </span>
                          )}
                          <span
                            className={`${styles.statusBadge} ${
                              !isActive ? styles.statusBadgeCompleted : ''
                            }`}
                          >
                            {isActive ? 'Faol' : 'Yakunlangan'}
                          </span>

                          {/* Quick action buttons on hover (Admin/Manager view, Admin edit/delete) */}
                          {(canManage || isManager) && (
                            <div
                              className={styles.cardActions}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className={styles.cardActionBtn}
                                onClick={() => handleOpenDetails(item)}
                                title="Ko'rish"
                              >
                                <Eye size={13} />
                              </button>
                              {canManage && (
                                <>
                                  <button
                                    className={styles.cardActionBtn}
                                    onClick={(e) => handleOpenEdit(item, e)}
                                    title="Tahrirlash"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                                    onClick={(e) => handleDelete(item.id, e)}
                                    title="O'chirish"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Informational category badges without navigation */}
                      <div className={styles.categoryBadgesRow} onClick={(e) => e.stopPropagation()}>
                        <div
                          className={`${styles.categoryBadge} ${styles.badgeCourse}`}
                          title={`Kurs: ${courseName}`}
                        >
                          <BookOpen size={12} />
                          <span>{courseName}</span>
                        </div>

                        {teacherName ? (
                          <div
                            className={`${styles.categoryBadge} ${styles.badgeTeacher}`}
                            title={`O'qituvchi: ${teacherName}`}
                          >
                            <GraduationCap size={12} />
                            <span>{teacherName}</span>
                          </div>
                        ) : (
                          <div
                            className={`${styles.categoryBadge}`}
                            style={{ backgroundColor: '#fef2f2', color: '#b91c1c', border: '1px dashed #fca5a5' }}
                            title="O'qituvchi biriktirilmagan"
                          >
                            <GraduationCap size={12} />
                            <span>O'qituvchi biriktirilmagan</span>
                          </div>
                        )}

                        {classroomName && (
                          <div
                            className={`${styles.categoryBadge} ${styles.badgeClassroom}`}
                            title={`Xona: ${classroomName}`}
                          >
                            <DoorOpen size={12} />
                            <span>{classroomName}</span>
                          </div>
                        )}

                        {(daysText !== '—' || timeText !== '—') && (
                          <div
                            className={`${styles.categoryBadge} ${styles.badgeTime}`}
                            title={`Dars vaqti: ${daysText} · ${timeText}`}
                          >
                            <Clock size={12} />
                            <span>{daysText} · {timeText}</span>
                          </div>
                        )}
                      </div>

                      {/* Guruh ochilish sanasi va Darslar boshlanishi */}
                      <div className={styles.groupDatesContainer} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.dateBlock} title="Guruh ochilish sanasi">
                          <div className={styles.dateIconWrapper} style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                            <Calendar size={13} />
                          </div>
                          <div className={styles.dateBlockInfo}>
                            <span className={styles.dateBlockLabel}>Guruh ochilish sanasi:</span>
                            <span className={styles.dateBlockValue}>{formatDateDisplay(openingDate)}</span>
                          </div>
                        </div>

                        <div
                          className={styles.dateBlock}
                          title={isLessonStarted ? "Darslar boshlangan sana" : "Darslar boshlanish sanasi"}
                        >
                          <div className={styles.dateIconWrapper} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                            <Clock size={13} />
                          </div>
                          <div className={styles.dateBlockInfo}>
                            <span className={styles.dateBlockLabel}>
                              {isLessonStarted ? "Darslar boshlangan sana:" : "Darslar boshlanish sanasi:"}
                            </span>
                            <span className={styles.dateBlockValue}>{formatDateDisplay(startDate)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className={styles.progressBarTrack} style={{ marginTop: 12 }}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>

                      {/* Footer stats */}
                      <div className={styles.cardFooter}>
                        <p className={styles.statsText}>
                          {currentCompleted}/{totalLessons} dars · {enrolledCount} talaba
                        </p>
                      </div>

                      {/* Guruhdagi talabalar soni */}
                      <div
                        className={styles.quickNavRow}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canViewDetails) handleOpenDetails(item);
                        }}
                      >
                        <div
                          className={`${styles.quickNavBtn} ${styles.quickNavBtnSecondary}`}
                          title={`Guruhdagi talabalar soni: ${enrolledCount}. Tafsilotlarni ko'rish uchun bosing.`}
                          style={{ cursor: canViewDetails ? 'pointer' : 'default' }}
                        >
                          <Users size={12} />
                          <span>Talabalar ({enrolledCount})</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredGroups.length > pageSize && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredGroups.length / pageSize) || 1}
                    totalItems={filteredGroups.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>
                {viewMode === 'CREATE' ? 'Yangi Guruh Yaratish' : 'Guruhni Tahrirlash'}
              </h1>
              <p className={styles.mainSubtitle}>
                Kerakli ma'lumotlarni to'ldirib saqlang
              </p>
            </div>
            <Button
              variant="outline"
              icon={ArrowLeft}
              onClick={() => setViewMode('LIST')}
            >
              Orqaga
            </Button>
          </div>

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
                  label="Tegishli Kurs"
                  name="course_id"
                  value={formData.course_id || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const courseObj = coursesList.find((c) => String(c.id) === String(selectedId));
                    setFormData((prev) => ({
                      ...prev,
                      course_id: selectedId,
                      course_input: courseObj ? courseObj.name : '',
                      teacher_id: prev.teacher_id || (courseObj?.teacher_id ? String(courseObj.teacher_id) : ''),
                      lesson_time: prev.lesson_time || courseObj?.lesson_time || courseObj?.start_time || '',
                      days: prev.days || courseObj?.days || '',
                    }));
                  }}
                  options={[
                    { value: '', label: coursesList.length > 0 ? 'Kursni tanlang' : "Kurslar mavjud emas" },
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
                    { value: '', label: "O'qituvchini tanlang (Ixtiyoriy)" },
                    ...teachersList.map((t) => {
                      const tId = String(t.id);
                      const tUserId = String(t.user_id || t.user?.id || '');
                      const activeGroupCount = (items || []).filter((g) => {
                        if (g.status === 'completed' || g.status === 'archived') return false;
                        const gTeacherId = String(g.teacher_id || g.teacher?.id || '');
                        return gTeacherId === tId || (tUserId && gTeacherId === tUserId);
                      }).length;
                      const statusTag = activeGroupCount === 0 ? "🟢 Bo'sh (guruhsiz)" : `🔵 ${activeGroupCount} ta guruhda`;
                      return {
                        value: t.id,
                        label: `${t.user?.full_name || `O'qituvchi #${t.id}`} (${t.specialization || 'Fan'}) — ${statusTag}`,
                      };
                    }),
                  ]}
                  required={false}
                />

                <Inputs
                  label="Xona Nomi / Raqami"
                  name="classroom_input"
                  type="text"
                  as="input"
                  value={formData.classroom_input || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    const matched = classroomsList.find(
                      (c) => c.name.toLowerCase() === val.trim().toLowerCase()
                    );
                    setFormData((prev) => ({
                      ...prev,
                      classroom_input: val,
                      classroom_id: matched ? matched.id : '',
                    }));
                  }}
                  placeholder=""
                  required={false}
                />

                <div>
                  <Inputs
                    label="Dars Kunlari (Hafta kunlari)"
                    name="days"
                    type="text"
                    as="input"
                    value={formData.days || ''}
                    onChange={handleChange}
                    placeholder=""
                    required={false}
                  />

                  {/* Hafta kunlari ikkiga ajralgan blok (Toq va Juft) */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginTop: '6px',
                    }}
                  >
                    {/* 🟢 Toq kunlar */}
                    <div
                      style={{
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #86efac',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#166534' }}>🟢 Toq kunlar</span>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, days: 'Du-Chor-Ju' }))}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #10b981',
                            backgroundColor: formData.days === 'Du-Chor-Ju' ? '#10b981' : '#ffffff',
                            color: formData.days === 'Du-Chor-Ju' ? '#ffffff' : '#166534',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Barchasi
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { key: 'Du', label: 'Dush' },
                          { key: 'Chor', label: 'Chor' },
                          { key: 'Jum', label: 'Jum' },
                        ].map((day) => {
                          const isSelected = isDayActive(day.key);
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => handleToggleDay(day.key)}
                              style={{
                                flex: 1,
                                padding: '5px 2px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 600,
                                border: isSelected ? '1px solid #10b981' : '1px solid #bbf7d0',
                                backgroundColor: isSelected ? '#10b981' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#15803d',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 🟣 Juft kunlar */}
                    <div
                      style={{
                        backgroundColor: '#fdf2f8',
                        border: '1px solid #f472b6',
                        borderRadius: '8px',
                        padding: '8px 10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#9d174d' }}>🟣 Juft kunlar</span>
                        <button
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, days: 'Se-Pay-Shan' }))}
                          style={{
                            fontSize: 10,
                            padding: '2px 6px',
                            borderRadius: 4,
                            border: '1px solid #ec4899',
                            backgroundColor: formData.days === 'Se-Pay-Shan' ? '#ec4899' : '#ffffff',
                            color: formData.days === 'Se-Pay-Shan' ? '#ffffff' : '#9d174d',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          Barchasi
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[
                          { key: 'Se', label: 'Sesh' },
                          { key: 'Pay', label: 'Pay' },
                          { key: 'Shan', label: 'Shan' },
                        ].map((day) => {
                          const isSelected = isDayActive(day.key);
                          return (
                            <button
                              key={day.key}
                              type="button"
                              onClick={() => handleToggleDay(day.key)}
                              style={{
                                flex: 1,
                                padding: '5px 2px',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 600,
                                border: isSelected ? '1px solid #ec4899' : '1px solid #fbcfe8',
                                backgroundColor: isSelected ? '#ec4899' : '#ffffff',
                                color: isSelected ? '#ffffff' : '#be185d',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <Inputs
                  label="Dars Vaqti (Boshlanish - Tugash)"
                  name="lesson_time"
                  type="text"
                  as="input"
                  value={formData.lesson_time || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                {/* O'qituvchining dars jadvali va tezkor vaqt tanlash */}
                {selectedTeacherObj && (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      backgroundColor: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '16px',
                      marginTop: '4px',
                      marginBottom: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={16} color="#4f46e5" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {selectedTeacherObj.user?.full_name || "O'qituvchi"}ning dars jadvali
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Jami faol guruhlari: <strong>{teacherActiveGroups.length} ta</strong>
                      </span>
                    </div>

                    {/* Toq va Juft kunlar paneli */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                      {/* 🟢 Toq kunlar */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#166534', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🟢 Toq kunlar</span>
                          <span style={{ fontSize: '10px', fontWeight: 400, color: '#15803d' }}>(Dush / Chor / Jum)</span>
                        </div>
                        {teacherScheduleOverview.odd.length === 0 ? (
                          <div style={{ fontSize: '11px', color: '#16a34a', fontStyle: 'italic' }}>
                            ✓ Ushbu kunlarda band darslar yo'q
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {teacherScheduleOverview.odd.map((g) => (
                              <div
                                key={g.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '5px 8px',
                                  backgroundColor: '#f0fdf4',
                                  borderRadius: '6px',
                                  border: '1px solid #dcfce7',
                                  fontSize: '11px',
                                }}
                              >
                                <span style={{ fontWeight: 600, color: '#166534', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {g.name}
                                </span>
                                <span style={{ color: '#047857', fontWeight: 700, backgroundColor: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>
                                  {g.time}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 🟣 Juft kunlar */}
                      <div
                        style={{
                          backgroundColor: '#ffffff',
                          border: '1px solid #fbcfe8',
                          borderRadius: '8px',
                          padding: '10px 12px',
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#9d174d', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🟣 Juft kunlar</span>
                          <span style={{ fontSize: '10px', fontWeight: 400, color: '#be185d' }}>(Sesh / Pay / Shan)</span>
                        </div>
                        {teacherScheduleOverview.even.length === 0 ? (
                          <div style={{ fontSize: '11px', color: '#db2777', fontStyle: 'italic' }}>
                            ✓ Ushbu kunlarda band darslar yo'q
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {teacherScheduleOverview.even.map((g) => (
                              <div
                                key={g.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '5px 8px',
                                  backgroundColor: '#fdf2f8',
                                  borderRadius: '6px',
                                  border: '1px solid #fce7f3',
                                  fontSize: '11px',
                                }}
                              >
                                <span style={{ fontWeight: 600, color: '#9d174d', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {g.name}
                                </span>
                                <span style={{ color: '#be185d', fontWeight: 700, backgroundColor: '#fce7f3', padding: '2px 6px', borderRadius: '4px' }}>
                                  {g.time}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tezkor vaqt tanlash tugmalari */}
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#475569', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Sparkles size={13} color="#6366f1" />
                        <span>Tezkor vaqt oralig'ini tanlash:</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {QUICK_TIME_SLOTS.map((slot) => {
                          const isSlotActive = formData.lesson_time && formData.lesson_time.includes(slot.start);
                          const isBusy = isSlotDisabled(slot);
                          return (
                            <button
                              key={slot.label}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({
                                  ...prev,
                                  lesson_time: slot.label,
                                }));
                              }}
                              style={{
                                fontSize: '11px',
                                padding: '5px 10px',
                                borderRadius: '6px',
                                border: isBusy
                                  ? '1px dashed #ef4444'
                                  : isSlotActive
                                  ? '1px solid #4f46e5'
                                  : '1px solid #cbd5e1',
                                backgroundColor: isBusy
                                  ? '#fee2e2'
                                  : isSlotActive
                                  ? '#4f46e5'
                                  : '#ffffff',
                                color: isBusy
                                  ? '#b91c1c'
                                  : isSlotActive
                                  ? '#ffffff'
                                  : '#334155',
                                cursor: 'pointer',
                                fontWeight: isSlotActive ? 700 : 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              <span>{slot.label}</span>
                              {isBusy && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    backgroundColor: '#dc2626',
                                    color: '#ffffff',
                                    padding: '1px 4px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  Band
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* To'qnashuv ogohlantirishi */}
                    {groupTeacherConflict && (
                      <div
                        style={{
                          marginTop: '12px',
                          padding: '10px 12px',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fca5a5',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                        }}
                      >
                        <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <div style={{ fontSize: '12px', color: '#991b1b', lineHeight: 1.4 }}>
                          <strong>Diqqat: Vaqt to'qnashuvi aniqlandi!</strong>
                          <div style={{ marginTop: '2px' }}>
                            Tanlangan vaqtda o'qituvchining <strong>"{groupTeacherConflict.groupName}"</strong> guruhida ({groupTeacherConflict.days} {groupTeacherConflict.time}) darsi mavjud. Iltimos, boshqa vaqt yoki kun tanlang.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Vaqt to'g'ri tanlangandagi tasdiq */}
                    {!groupTeacherConflict && formData.lesson_time && formData.days && (
                      <div
                        style={{
                          marginTop: '10px',
                          padding: '8px 12px',
                          backgroundColor: '#f0fdf4',
                          border: '1px solid #86efac',
                          borderRadius: '8px',
                          fontSize: '11px',
                          color: '#15803d',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span>✓ Ushbu kunda va vaqtda o'qituvchi bo'sh. Guruhni rejalashtirish mumkin.</span>
                      </div>
                    )}
                  </div>
                )}

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

                <Inputs
                  label="Guruh Ochilish Sanasi"
                  name="opening_date"
                  type="date"
                  as="input"
                  value={formData.opening_date || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                <Inputs
                  label="Darslar Boshlanish Sanasi"
                  name="start_date"
                  type="date"
                  as="input"
                  value={formData.start_date || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Faol' },
                    { value: 'completed', label: 'Yakunlangan' },
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

      {viewMode === 'DETAILS' && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Guruh Ma'lumotlari</h1>
              <p className={styles.mainSubtitle}>
                Guruh tafsilotlari va unga biriktirilgan talabalar ro'yxati
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <Button
                variant="outline"
                icon={ArrowLeft}
                onClick={() => setViewMode('LIST')}
              >
                Orqaga
              </Button>
              {canManage && selectedItem && (
                <Button
                  variant="primary"
                  icon={Edit2}
                  onClick={(e) => handleOpenEdit(selectedItem, e)}
                >
                  Tahrirlash
                </Button>
              )}
            </div>
          </div>

          <div className={styles.card}>
            {loading ? (
              <Loader text="Ma'lumotlar yuklanmoqda..." />
            ) : selectedItem ? (
              <>
                <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Guruh Nomi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.name || `Guruh #${selectedItem.id}`}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Kurs</span>
                    <span className={styles.detailValue}>
                      {selectedItem.course?.name || '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>O'qituvchi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.teacher?.user?.full_name ||
                        teachersList.find(
                          (t) =>
                            String(t.id) === String(selectedItem.teacher_id) ||
                            String(t.user_id) === String(selectedItem.teacher_id)
                        )?.user?.full_name ||
                        'Biriktirilmagan'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Filial</span>
                    <span className={styles.detailValue}>
                      {selectedItem.branch?.name || 'Asosiy filial'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Guruh Ochilish Sanasi</span>
                    <span className={styles.detailValue}>
                      {formatDateDisplay(
                        selectedItem.opening_date ||
                        selectedItem.createdAt ||
                        selectedItem.created_at
                      )}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>
                      {selectedItem.start_date && String(selectedItem.start_date).split('T')[0] <= new Date().toISOString().split('T')[0]
                        ? "Darslar Boshlangan Sana"
                        : "Darslar Boshlanish Sanasi"}
                    </span>
                    <span className={styles.detailValue}>
                      {formatDateDisplay(
                        selectedItem.start_date ||
                        selectedItem.opening_date ||
                        selectedItem.createdAt
                      )}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Dars Kunlari</span>
                    <span className={styles.detailValue}>
                      {selectedItem.days || '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Dars Vaqti</span>
                    <span className={styles.detailValue}>
                      {formatGroupTime(selectedItem)}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Xona</span>
                    <span className={styles.detailValue}>
                      {selectedItem.classroom?.name ||
                        classroomsList.find((c) => String(c.id) === String(selectedItem.classroom_id))?.name ||
                        (selectedItem.classroom_id ? `Xona #${selectedItem.classroom_id}` : '—')}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Holati</span>
                    <span className={styles.detailValue}>
                      {selectedItem.status === 'active' ? 'Faol' : 'Yakunlangan'}
                    </span>
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
                      onClick={() => navigate('/courses')}
                      title="Kurslar bo'limiga o'tish"
                    >
                      <div className={styles.relatedCardLeft}>
                        <div className={styles.relatedCardIcon} style={{ backgroundColor: '#eff6ff', color: '#2563eb' }}>
                          <BookOpen size={16} />
                        </div>
                        <div className={styles.relatedCardTexts}>
                          <span className={styles.relatedCardLabel}>Kurs</span>
                          <span className={styles.relatedCardValue}>{selectedItem.course?.name || 'Kurslar'}</span>
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
                          <span className={styles.relatedCardValue}>
                            {selectedItem.teacher?.user?.full_name ||
                              teachersList.find(
                                (t) =>
                                  String(t.id) === String(selectedItem.teacher_id) ||
                                  String(t.user_id) === String(selectedItem.teacher_id)
                              )?.user?.full_name ||
                              "O'qituvchilar"}
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>

                    <div
                      className={styles.relatedCard}
                      onClick={() => navigate('/lessons')}
                      title="Dars jadvalida ko'rish"
                    >
                      <div className={styles.relatedCardLeft}>
                        <div className={styles.relatedCardIcon} style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>
                          <Calendar size={16} />
                        </div>
                        <div className={styles.relatedCardTexts}>
                          <span className={styles.relatedCardLabel}>Dars Jadvali</span>
                          <span className={styles.relatedCardValue}>{selectedItem.days || 'Jadval ko\'rish'}</span>
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
                          <span className={styles.relatedCardValue}>
                            {selectedItem.classroom?.name || classroomsList.find((c) => String(c.id) === String(selectedItem.classroom_id))?.name || 'Xonalar'}
                          </span>
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
                          <span className={styles.relatedCardValue}>Guruh davomati</span>
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
                          <Users size={16} />
                        </div>
                        <div className={styles.relatedCardTexts}>
                          <span className={styles.relatedCardLabel}>Talabalar</span>
                          <span className={styles.relatedCardValue}>Barcha talabalar</span>
                        </div>
                      </div>
                      <ChevronRight size={16} color="#94a3b8" />
                    </div>
                  </div>
                </div>

                {/* Enrolled Students Section */}
                <div className={styles.studentsSection}>
                  {(() => {
                    const directGS = groupStudentsList.filter(
                      (gs) => String(gs.group_id) === String(selectedItem.id)
                    );
                    const matchingS = studentsList.filter(
                      (s) => String(s.group_id) === String(selectedItem.id)
                    );
                    const groupObjGS = Array.isArray(selectedItem.group_students) ? selectedItem.group_students : [];

                    const studentMap = new Map();
                    directGS.forEach((gs) => {
                      const sid = gs.student_id || gs.student?.id;
                      if (sid) studentMap.set(String(sid), gs);
                    });
                    groupObjGS.forEach((gs) => {
                      const sid = gs.student_id || gs.student?.id;
                      if (sid && !studentMap.has(String(sid))) studentMap.set(String(sid), gs);
                    });
                    matchingS.forEach((s) => {
                      if (!studentMap.has(String(s.id))) {
                        studentMap.set(String(s.id), { id: `s_${s.id}`, student_id: s.id, student: s, group_id: selectedItem.id });
                      }
                    });
                    const currentGroupStudents = Array.from(studentMap.values());

                    return (
                      <>
                        <div className={styles.studentsHeader}>
                          <h3 className={styles.studentsTitle}>
                            Guruh Talabalari ({currentGroupStudents.length})
                          </h3>
                          {canManage && (
                            <Button
                              variant="primary"
                              icon={UserPlus}
                              onClick={() => handleOpenEnrollStudent(selectedItem.id)}
                            >
                              Talaba Qo'shish
                            </Button>
                          )}
                        </div>

                        {currentGroupStudents.length === 0 ? (
                          <p style={{ color: '#64748b', fontSize: '14px' }}>
                            Ushbu guruhga hali talabalar biriktirilmagan.
                          </p>
                        ) : (
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px',
                            }}
                          >
                        {currentGroupStudents.map((gs, i) => {
                          const student =
                            gs.student ||
                            studentsList.find(
                              (s) => String(s.id) === String(gs.student_id)
                            );
                          const studentName =
                            student?.user?.full_name ||
                            `Talaba #${gs.student_id}`;
                          const phone = student?.user?.phone || '—';

                          return (
                            <div
                              key={gs.id || i}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '10px',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                }}
                              >
                                <span
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '50%',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {i + 1}
                                </span>
                                <div>
                                  <div
                                    style={{
                                      fontSize: '14px',
                                      fontWeight: 600,
                                      color: '#0f172a',
                                    }}
                                  >
                                    {studentName}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                    }}
                                  >
                                    {phone}
                                  </div>
                                </div>
                              </div>
                              {canManage && (
                                <button
                                  className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                                  onClick={() => handleRemoveStudentFromGroup(gs.id)}
                                  title="Guruhdan chiqarish"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
                </div>
              </>
            ) : (
              <p>Ma'lumot topilmadi</p>
            )}
          </div>
        </>
      )}

      {/* Enroll Student Modal */}
      {isEnrollModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsEnrollModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Guruhga Talaba Biriktirish</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsEnrollModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {enrollModalError && (
              <div className={styles.alert}>
                <AlertCircle size={18} />
                <span>{enrollModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEnrollment}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Select
                  label="Talabani tanlang *"
                  name="student_id"
                  value={enrollFormData.student_id}
                  onChange={(e) =>
                    setEnrollFormData({
                      ...enrollFormData,
                      student_id: e.target.value,
                    })
                  }
                  options={[
                    { value: '', label: 'Talabani tanlang' },
                    ...studentsList.map((s) => ({
                      value: s.id,
                      label: `${s.user?.full_name || `Talaba #${s.id}`} (${s.user?.phone || ''})`,
                    })),
                  ]}
                  required={true}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  marginTop: '20px',
                }}
              >
                <Button
                  variant="outline"
                  onClick={() => setIsEnrollModalOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Biriktirish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
