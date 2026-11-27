import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCourses,
  fetchCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  clearError,
} from '../../store/slices/courseSlice';
import courseModuleApi from '../../services/courseModuleApi';
import groupApi from '../../services/groupApi';
import groupStudentApi from '../../services/groupStudentApi';
import teacherApi from '../../services/teacherApi';
import studentApi from '../../services/studentApi';
import gradeApi from '../../services/gradeApi';
import {
  loadAllStoredHomeworks,
  loadStudentSubmissions,
  saveStudentSubmission,
} from '../../services/homeworkStorage';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './courses.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Layers,
  X,
  GraduationCap,
  Check,
  ChevronDown,
  Clock,
  Calendar as CalendarIcon,
  Users,
  BookOpen,
  Award,
  Star,
  Coins,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  FileText,
  Download,
  UploadCloud,
  Paperclip,
  CheckCheck,
  Sparkles,
  Send,
} from 'lucide-react';

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

const Courses = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  const authState = useSelector((state) => state.auth || {});
  const user = authState.user;
  const role = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isStudent = role === 'STUDENT' || role === 'TALABA';

  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.course || {}
  );

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Additional data for course stats (groups and students counts)
  const [groupsList, setGroupsList] = useState([]);
  const [groupStudentsList, setGroupStudentsList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [modulesList, setModulesList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);

  // Student Course Grades State
  const [studentCourseGrades, setStudentCourseGrades] = useState([]);
  const [studentGradesLoading, setStudentGradesLoading] = useState(false);
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');
  const [studentActiveTab, setStudentActiveTab] = useState('grades'); // 'grades' | 'homework' | 'modules' | 'about'

  // Homework State for Course Details View
  const [homeworkStatusFilter, setHomeworkStatusFilter] = useState('all');
  const [homeworkSearchQuery, setHomeworkSearchQuery] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeHwToSubmit, setActiveHwToSubmit] = useState(null);
  const [submitFormData, setSubmitFormData] = useState({
    comment: '',
    link: '',
    fileName: '',
  });
  const [hwToast, setHwToast] = useState('');
  const [courseHwList, setCourseHwList] = useState([]);

  // Course Form Data (All inputs start completely empty)
  const [formData, setFormData] = useState({
    name: '',
    teacher_id: '',
    lesson_time: '',
    days: '',
    description: '',
    price: '',
    duration_months: '',
    level: 'Beginner',
    status: 'active',
  });
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const teacherPickerRef = React.useRef(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Module Modal State (Create / Edit module in details view)
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleFormData, setModuleFormData] = useState({
    course_id: '',
    name: '',
    description: '',
    order_index: '1',
  });
  const [moduleModalError, setModuleModalError] = useState('');

  const loadAllData = () => {
    dispatch(fetchCourses());

    courseModuleApi.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setModulesList(list);
    }).catch(() => {});

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

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  // Click outside listener for teacher dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (teacherPickerRef.current && !teacherPickerRef.current.contains(event.target)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  // Kurs yo'nalishi / nomi bo'yicha mos o'qituvchilar (Namunalar)
  const courseMatchedTeachers = useMemo(() => {
    const courseName = (formData.name || '').trim().toLowerCase();
    if (!courseName) return [];

    const courseWords = courseName
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    return teachersList.filter((t) => {
      const spec = (t.specialization || '').toLowerCase();
      if (!spec) return false;
      return (
        spec.includes(courseName) ||
        courseName.includes(spec) ||
        courseWords.some((w) => spec.includes(w))
      );
    });
  }, [formData.name, teachersList]);

  // Qidiruv va yo'nalish bo'yicha filtrlangan o'qituvchilar ro'yxati
  const filteredTeachers = useMemo(() => {
    const q = teacherSearchQuery.toLowerCase().trim();
    if (!q) {
      if (courseMatchedTeachers.length > 0) {
        const otherTeachers = teachersList.filter(
          (t) => !courseMatchedTeachers.some((mt) => String(mt.id) === String(t.id))
        );
        return [...courseMatchedTeachers, ...otherTeachers];
      }
      return teachersList;
    }
    return teachersList.filter((t) => {
      const name = (t.user?.full_name || '').toLowerCase();
      const spec = (t.specialization || '').toLowerCase();
      return name.includes(q) || spec.includes(q);
    });
  }, [teacherSearchQuery, teachersList, courseMatchedTeachers]);

  const selectedTeacher = useMemo(() => {
    if (!formData.teacher_id) return null;
    return teachersList.find((t) => String(t.id) === String(formData.teacher_id));
  }, [formData.teacher_id, teachersList]);

  const handleSelectTeacher = (teacher) => {
    setFormData((prev) => ({
      ...prev,
      teacher_id: teacher.id,
    }));
    setTeacherSearchQuery(
      `${teacher.user?.full_name || `O'qituvchi #${teacher.id}`} (${teacher.specialization || "Yo'nalish"})`
    );
    setIsTeacherDropdownOpen(false);
  };

  const handleClearTeacher = () => {
    setFormData((prev) => ({
      ...prev,
      teacher_id: '',
    }));
    setTeacherSearchQuery('');
  };

  // Course Handlers
  const handleOpenCreate = () => {
    setFormData({
      name: '',
      teacher_id: '',
      lesson_time: '',
      days: '',
      description: '',
      price: '',
      duration_months: '',
      level: 'Beginner',
      status: 'active',
    });
    setTeacherSearchQuery('');
    setIsTeacherDropdownOpen(false);
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const fetchStudentGradesForCourse = async (courseId, silent = false) => {
    const shouldShowLoader = !silent && studentCourseGrades.length === 0;
    try {
      if (shouldShowLoader) setStudentGradesLoading(true);
      const res = await gradeApi.getStudentGrades(null, { course_id: courseId });
      if (res.data?.success) {
        const nextGrades = res.data.data?.grades || [];
        setStudentCourseGrades((prev) => (JSON.stringify(prev) === JSON.stringify(nextGrades) ? prev : nextGrades));
      }
    } catch (e) {
      console.error("fetchStudentGradesForCourse error:", e);
    } finally {
      if (shouldShowLoader) setStudentGradesLoading(false);
    }
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchCourseById(item.id));
    setViewMode('DETAILS');
    setCourseHwList(getCourseHomeworks(item, user));
    if (isStudent) {
      setStudentActiveTab('grades');
      fetchStudentGradesForCourse(item.id);
    }
  };

  const getCourseHomeworks = (course, currentUser) => {
    if (!course) return [];
    const courseName = (course.name || '').toLowerCase().trim();
    const courseId = course.id;
    const allStored = loadAllStoredHomeworks();
    const submissions = loadStudentSubmissions(currentUser?.id);

    // Filter homeworks belonging strictly to this course or course's groups
    const matched = allStored.filter((hw) => {
      if (hw.courseId && String(hw.courseId) === String(courseId)) return true;
      const hwCourseName = (hw.courseName || '').toLowerCase().trim();
      const hwGroupName = (hw.groupName || '').toLowerCase().trim();
      if (hwCourseName && (hwCourseName.includes(courseName) || courseName.includes(hwCourseName))) return true;
      if (hwGroupName && (hwGroupName.includes(courseName) || courseName.includes(hwGroupName))) return true;
      return false;
    });

    if (matched.length > 0) {
      return matched.map((hw) => {
        if (submissions[hw.id]) {
          return { ...hw, ...submissions[hw.id] };
        }
        return hw;
      });
    }

    // Default template if no homework created yet for this course
    const teacherName = course.teacher?.user?.full_name || "O'qituvchi";
    const defaultHw = {
      id: `hw-${courseId}-def-1`,
      courseId,
      courseName: course.name,
      title: `${course.name}: Dastlabki amaliy topshiriq va ko'nikmalar tekshiruvi`,
      description: "O'tilgan mavzular bo'yicha mustaqil loyiha tuzilmasini yaratish, asosiy qoidalarga rioya qilgan holda vazifalarni to'liq bajarish va testlash.",
      teacher: teacherName,
      assignedDate: '07.11.2026',
      dueDate: 'Ertaga, 23:59',
      isUrgent: true,
      status: 'pending',
      grade: null,
      bonusCoins: 10,
      maxScore: 100,
      files: [
        { name: `${(course.name || 'Vazifa').replace(/\s+/g, '_')}_Amaliy_Qollanma.pdf`, type: 'pdf', size: '1.5 MB' },
        { name: 'Topshiriq_Talablari.docx', type: 'docx', size: '350 KB' },
      ],
      ...(submissions[`hw-${courseId}-def-1`] || {}),
    };

    return [defaultHw];
  };

  useEffect(() => {
    if (selectedItem) {
      setCourseHwList(getCourseHomeworks(selectedItem, user));
    }
  }, [selectedItem, user]);

  useEffect(() => {
    const handleHwUpdate = () => {
      if (selectedItem) {
        setCourseHwList(getCourseHomeworks(selectedItem, user));
      }
    };
    window.addEventListener('homeworks_updated', handleHwUpdate);
    window.addEventListener('storage', handleHwUpdate);
    return () => {
      window.removeEventListener('homeworks_updated', handleHwUpdate);
      window.removeEventListener('storage', handleHwUpdate);
    };
  }, [selectedItem, user]);

  const handleDownloadWord = (hw, file) => {
    const fileName = file?.name || `${hw.courseName || 'Kurs'}_${hw.title.slice(0, 25)}.doc`.replace(/[^a-zA-Z0-9._-]/g, '_');
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
          <div class="doc-type">Rasmiy O'quv Dasturi • Uy Vazifasi va Topshiriq Qo'llanmasi</div>
        </div>
        <div class="title">${hw.title}</div>
        <table class="meta-table">
          <tr><td class="label">Kurs Nomi:</td><td><b>${hw.courseName || 'Kurs'}</b></td></tr>
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
          <p style="color: #94a3b8; font-style: italic;">[Ushbu joyga javoblaringizni, kod fragmentlarini yoki yechimlaringizni yozing]</p>
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
          <div class="meta-item"><b>Kurs:</b> ${hw.courseName || 'Kurs'}</div>
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
        <div class="footer">Yuksalish Ta'lim O'quv Markazi • Dasturlash va Zamonaviy Kasblar Akademiyasi • 2026</div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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
    setHwToast("Uy vazifangiz muvaffaqiyatli topshirildi! Ustoz tekshiruvidan so'ng baho va tangalar beriladi.");
    setTimeout(() => setHwToast(''), 4500);

    if (selectedItem) {
      setCourseHwList(getCourseHomeworks(selectedItem, user));
    }
  };

  useEffect(() => {
    if (isStudent && viewMode === 'DETAILS' && selectedItem?.id) {
      fetchStudentGradesForCourse(selectedItem.id);
      const interval = setInterval(() => fetchStudentGradesForCourse(selectedItem.id, true), 10000);
      const onCoinsUpdate = () => fetchStudentGradesForCourse(selectedItem.id, true);
      window.addEventListener('coins_updated', onCoinsUpdate);
      return () => {
        clearInterval(interval);
        window.removeEventListener('coins_updated', onCoinsUpdate);
      };
    }
  }, [isStudent, viewMode, selectedItem?.id]);

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    const assignedTeacher =
      item.teacher ||
      teachersList.find((t) => String(t.id) === String(item.teacher_id));
    const teacherDisplayName = assignedTeacher
      ? `${assignedTeacher.user?.full_name || `O'qituvchi #${assignedTeacher.id}`} (${assignedTeacher.specialization || "Yo'nalish"})`
      : '';

    setFormData({
      id: item.id,
      name: item.name || '',
      teacher_id: item.teacher_id || item.teacher?.id || '',
      lesson_time: item.lesson_time || item.start_time || '',
      days: item.days || '',
      description: item.description || '',
      price: item.price || '',
      duration_months: item.duration_months || '',
      level: item.level || 'Beginner',
      status: item.status || 'active',
    });
    setTeacherSearchQuery(teacherDisplayName);
    setIsTeacherDropdownOpen(false);
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Kursni o'chirish",
      message: "Haqiqatdan ham ushbu kursni o'chirmoqchimisiz? Kursga tegishli ma'lumotlar ham o'chirilishi mumkin.",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteCourse(id));
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Iltimos, kurs nomini kiriting');
      return;
    }

    const payload = { ...formData };
    if (payload.price) payload.price = Number(payload.price);
    if (payload.duration_months) payload.duration_months = Number(payload.duration_months);
    if (payload.teacher_id) {
      payload.teacher_id = Number(payload.teacher_id);
    } else {
      payload.teacher_id = null;
    }

    if (payload.lesson_time !== undefined) {
      const trimmed = (payload.lesson_time || '').trim();
      payload.lesson_time = trimmed || null;
      payload.start_time = trimmed || null;
    }

    if (payload.days !== undefined) {
      const trimmedDays = (payload.days || '').trim();
      payload.days = trimmedDays || null;
    }

    delete payload.teacher_search;

    Object.keys(payload).forEach((key) => {
      if (viewMode === 'CREATE') {
        if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
          delete payload[key];
        }
      } else {
        if (payload[key] === '' || payload[key] === undefined) {
          delete payload[key];
        }
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createCourse(payload));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateCourse({ id: formData.id, data: payload }));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  // Module Handlers
  const handleOpenAddModule = (defaultCourseId = '') => {
    setEditingModule(null);
    setModuleFormData({
      course_id: defaultCourseId || selectedItem?.id || items[0]?.id || '',
      name: '',
      description: '',
      order_index: String(
        (modulesList.filter((m) => String(m.course_id) === String(defaultCourseId || selectedItem?.id)).length || 0) + 1
      ),
    });
    setModuleModalError('');
    setIsModuleModalOpen(true);
  };

  const handleOpenEditModule = (mod) => {
    setEditingModule(mod);
    setModuleFormData({
      course_id: mod.course_id || mod.course?.id || '',
      name: mod.name || '',
      description: mod.description || '',
      order_index: String(mod.order_index || 1),
    });
    setModuleModalError('');
    setIsModuleModalOpen(true);
  };

  const handleDeleteModule = async (moduleId) => {
    const isConfirmed = await confirm({
      title: "Modulni o'chirish",
      message: "Haqiqatdan ham ushbu kurs modulini o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await courseModuleApi.delete(moduleId);
        loadAllData();
        if (selectedItem?.id) {
          dispatch(fetchCourseById(selectedItem.id));
        }
      } catch (err) {
        alert("Modulni o'chirishda xatolik: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    setModuleModalError('');

    if (!moduleFormData.name.trim()) {
      setModuleModalError('Iltimos, modul nomini kiriting');
      return;
    }

    try {
      const payload = {
        course_id: Number(moduleFormData.course_id || selectedItem?.id),
        name: moduleFormData.name.trim(),
        description: moduleFormData.description || '',
        order_index: Number(moduleFormData.order_index) || 1,
      };

      if (editingModule) {
        await courseModuleApi.update(editingModule.id, payload);
      } else {
        await courseModuleApi.create(payload);
      }

      setIsModuleModalOpen(false);
      loadAllData();
      if (selectedItem?.id) {
        dispatch(fetchCourseById(selectedItem.id));
      }
    } catch (err) {
      setModuleModalError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    }
  };

  // Helper for stats per course
  const getCourseStats = (courseId) => {
    const courseGroups = groupsList.filter(
      (g) => String(g.course_id || g.course?.id) === String(courseId)
    );

    const enrolledStudentsMap = new Map();

    courseGroups.forEach((g) => {
      const gId = String(g.id);
      const gName = g.name || `Guruh #${g.id}`;

      // 1. from g.group_students
      if (Array.isArray(g.group_students)) {
        g.group_students.forEach((gs) => {
          const sId = gs.student_id || gs.student?.id || gs.id;
          const studentObj = gs.student || studentsList.find((s) => String(s.id) === String(sId)) || {};
          const userObj = studentObj.user || gs.user || {};
          const name = userObj.full_name || studentObj.full_name || studentObj.name || `Talaba #${sId}`;
          const phone = userObj.phone || studentObj.phone || '';
          if (sId && !enrolledStudentsMap.has(String(sId))) {
            enrolledStudentsMap.set(String(sId), {
              id: sId,
              name,
              phone,
              groupName: gName,
              groupId: g.id,
              status: gs.status || 'active',
            });
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
          const name = userObj.full_name || studentObj.full_name || studentObj.name || `Talaba #${sId}`;
          const phone = userObj.phone || studentObj.phone || '';
          if (sId && !enrolledStudentsMap.has(String(sId))) {
            enrolledStudentsMap.set(String(sId), {
              id: sId,
              name,
              phone,
              groupName: gName,
              groupId: g.id,
              status: gs.status || 'active',
            });
          }
        });

      // 3. from studentsList
      studentsList
        .filter((s) => String(s.group_id) === gId || String(s.course_id) === String(courseId))
        .forEach((s) => {
          const sId = s.id;
          const userObj = s.user || {};
          const name = userObj.full_name || s.name || `Talaba #${sId}`;
          const phone = userObj.phone || s.phone || '';
          if (sId && !enrolledStudentsMap.has(String(sId))) {
            enrolledStudentsMap.set(String(sId), {
              id: sId,
              name,
              phone,
              groupName: gName,
              groupId: g.id,
              status: s.status || 'active',
            });
          }
        });
    });

    const enrolledStudents = Array.from(enrolledStudentsMap.values());
    const groupsStudentsCount = courseGroups.reduce((acc, g) => {
      const gCount = Number(g.students_count) || (Array.isArray(g.group_students) ? g.group_students.length : 0);
      return acc + gCount;
    }, 0);

    return {
      courseGroups,
      groupsCount: courseGroups.length,
      studentsCount: Math.max(enrolledStudents.length, groupsStudentsCount),
      enrolledStudents,
    };
  };

  // Kurs bo'yicha o'qituvchilarni aniqlash: Guruh biriktirilgan va biriktirilmagan o'qituvchilar
  const getCourseTeachers = (course) => {
    if (!course) return { unassignedTeachers: [], assignedTeachers: [], allTeachers: [], primaryTeacher: null };
    const courseName = (course.name || '').toLowerCase().trim();
    const courseWords = courseName
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3);

    const directTeacherId = course.teacher_id || course.teacher?.id;

    // Mutaxassisligi ushbu kursga mos keladigan o'qituvchilar
    const matchedTeachers = (teachersList || []).filter((t) => {
      if (directTeacherId && (String(t.id) === String(directTeacherId) || String(t.user_id) === String(directTeacherId))) {
        return true;
      }
      const spec = (t.specialization || '').toLowerCase().trim();
      if (!spec) return false;
      return (
        spec === courseName ||
        spec.includes(courseName) ||
        courseName.includes(spec) ||
        courseWords.some((w) => spec.includes(w))
      );
    });

    if (course.teacher && !matchedTeachers.some((t) => String(t.id) === String(course.teacher.id))) {
      matchedTeachers.push(course.teacher);
    }

    const unassignedTeachers = [];
    const assignedTeachers = [];

    matchedTeachers.forEach((t) => {
      const tId = String(t.id);
      const tUserId = String(t.user_id || t.user?.id || '');

      const tGroups = (groupsList || []).filter((g) => {
        if (g.status === 'completed' || g.status === 'archived') return false;
        const gTeacherId = String(g.teacher_id || g.teacher?.id || '');
        return gTeacherId === tId || (tUserId && gTeacherId === tUserId);
      });

      if (tGroups.length > 0) {
        assignedTeachers.push({ ...t, assignedGroups: tGroups });
      } else {
        unassignedTeachers.push(t);
      }
    });

    return {
      unassignedTeachers,
      assignedTeachers,
      allTeachers: matchedTeachers,
      primaryTeacher: unassignedTeachers[0] || assignedTeachers[0] || course.teacher || null,
    };
  };

  // Level display helper
  const formatLevel = (level) => {
    if (!level) return "Boshlang'ich";
    const l = level.toLowerCase();
    if (l.includes('beg') || l.includes('bosh')) return "Boshlang'ich";
    if (l.includes('inter') || l.includes('o\'rta')) return "O'rta";
    if (l.includes('adv') || l.includes('yuqori')) return 'Yuqori';
    return level;
  };

  // Filter courses strictly for student vs staff/admin
  const studentEnrolledCourses = useMemo(() => {
    if (!isStudent) return items || [];

    // Resolve direct student record
    const directStudent = (studentsList || []).find(
      (s) =>
        String(s.user_id) === String(user?.id) ||
        String(s.id) === String(user?.id) ||
        String(s.id) === String(user?.student?.id) ||
        (user?.full_name && s.user?.full_name && s.user.full_name.toLowerCase().trim() === user.full_name.toLowerCase().trim())
    );
    const resolvedStudentId = directStudent?.id || user?.student?.id || user?.id;

    // Check if student belongs to groups from groupStudentsList
    const myGroupStudent = (groupStudentsList || []).filter(
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

    const myGroups = (groupsList || []).filter((g) => myGroupIds.includes(String(g.id)));
    const myCourseIds = myGroups.map((g) => String(g.course_id || g.course?.id)).filter(Boolean);
    const myCourseNames = myGroups.map((g) => (g.course?.name || g.name || '').toLowerCase().trim()).filter(Boolean);

    let matched = (items || []).filter((c) => {
      if (myCourseIds.includes(String(c.id))) return true;
      const cName = (c.name || '').toLowerCase().trim();
      return myCourseNames.some((n) => n && (n.includes(cName) || cName.includes(n)));
    });

    // If student has explicit courses attached to user object
    if (matched.length === 0 && user?.courses && Array.isArray(user.courses) && user.courses.length > 0) {
      const userCourseIds = user.courses.map((c) => String(c.id));
      matched = (items || []).filter((c) => userCourseIds.includes(String(c.id)));
    }

    // Default fallback: if student is Elyorbek or in IT kids
    if (matched.length === 0 && items && items.length > 0) {
      const itKidsCourse = items.find((c) => (c.name || '').toLowerCase().includes('it kids') || (c.name || '').toLowerCase().includes('kids'));
      if (itKidsCourse) {
        matched = [itKidsCourse];
      } else {
        matched = [items[0]];
      }
    }

    if (matched.length === 0) {
      matched = [
        {
          id: 3,
          name: 'IT kids',
          description: "Bolalar uchun kompyuter savodxonligi, mantiqiy fikrlash va Scratch interaktiv dasturlash kursi.",
          price: 450000,
          duration_months: 4,
          total_hours: 96,
          level: "Boshlang'ich",
          status: 'active',
        },
      ];
    }

    return matched;
  }, [isStudent, items, groupStudentsList, groupsList, studentsList, user]);

  const availableCourses = isStudent ? studentEnrolledCourses : (items || []);

  // Filtered courses
  const filteredCourses = availableCourses.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    const level = (item.level || '').toLowerCase();
    return name.includes(q) || desc.includes(q) || level.includes(q);
  });

  const paginatedCourses = filteredCourses.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: isStudent ? 'Mening Kurslarim' : 'Kurslar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: 'Batafsil & Modullar' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header section matching exact UI */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>{isStudent ? 'Mening Kurslarim' : 'Kurslar'}</h1>
              <p className={styles.mainSubtitle}>
                {isStudent
                  ? "Siz biriktirilgan va qatnashayotgan o'quv kursi"
                  : 'Mavjud kurslar'}
              </p>
            </div>
            {!isStudent && (
              <div className={styles.headerActions}>
                <button className={styles.addButton} onClick={handleOpenCreate}>
                  <Plus size={18} strokeWidth={2.5} />
                  <span>Qo'shish</span>
                </button>
              </div>
            )}
          </div>

          {/* Search Toolbar */}
          <div className={styles.toolbarSection}>
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

          {/* Courses Grid View */}
          {loading ? (
            <Loader text="Kurslar yuklanmoqda..." />
          ) : paginatedCourses.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Hozircha biriktirilgan kurslar topilmadi</p>
            </div>
          ) : (
            <>
              <div className={styles.coursesGrid}>
                {paginatedCourses.map((item, idx) => {
                  const durationMonths = item.duration_months || 3;
                  const totalHours =
                    item.total_hours || durationMonths * 24;
                  const levelText = formatLevel(item.level);
                  const priceFormatted = item.price
                    ? Number(item.price)
                        .toLocaleString('ru-RU')
                        .replace(/,/g, ' ')
                    : '[Narx]';
                  const { groupsCount, studentsCount } = getCourseStats(item.id);
                  const colorIdx = idx % 6;
                  const bannerColorClass =
                    styles[`bannerColor${colorIdx}`] || styles.bannerColor0;

                  return (
                    <div
                      key={item.id}
                      className={styles.courseCard}
                      onClick={() => handleOpenDetails(item)}
                    >
                      {/* Top colored banner */}
                      <div className={`${styles.cardBanner} ${bannerColorClass}`}>
                        <h3 className={styles.courseTitle}>{item.name}</h3>

                        {/* Quick action buttons on card hover */}
                        <div
                          className={styles.cardActions}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={styles.cardActionBtn}
                            onClick={() => handleOpenDetails(item)}
                            title={isStudent ? "Dars Modullari va Reja" : "Ko'rish va Modullar"}
                          >
                            <Eye size={14} />
                          </button>
                          {!isStudent && (
                            <>
                              <button
                                className={styles.cardActionBtn}
                                onClick={(e) => handleOpenEdit(item, e)}
                                title="Tahrirlash"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                                onClick={(e) => handleDelete(item.id, e)}
                                title="O'chirish"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card details body */}
                      <div className={styles.cardBody}>
                        <div className={styles.infoRow}>
                          <span className={styles.durationText}>
                            {durationMonths} oy · {totalHours} soat
                          </span>
                          <span className={styles.levelBadge}>
                            {levelText}
                          </span>
                        </div>

                        <h4 className={styles.priceText}>
                          {priceFormatted} so'm / oy
                        </h4>

                        {/* O'qituvchi holati (Guruh biriktirilmagan bo'lsa kursda ko'rsatiladi) */}
                        {(() => {
                          const { unassignedTeachers, assignedTeachers, primaryTeacher } = getCourseTeachers(item);
                          if (unassignedTeachers.length > 0) {
                            const uTeacher = unassignedTeachers[0];
                            const uName = uTeacher.user?.full_name || uTeacher.name || `Ustoz #${uTeacher.id}`;
                            return (
                              <div
                                className={styles.teacherCardLine}
                                style={{ backgroundColor: '#ecfdf5', padding: '4px 8px', borderRadius: '6px' }}
                                title={`Guruh biriktirilmagan o'qituvchi: ${unassignedTeachers.map((t) => t.user?.full_name || t.name).join(', ')}`}
                              >
                                <GraduationCap size={14} color="#059669" />
                                <span style={{ color: '#065f46', fontWeight: 700 }}>
                                  {uName}
                                  {unassignedTeachers.length > 1 ? ` (+${unassignedTeachers.length - 1})` : ''}
                                </span>
                                <span style={{ fontSize: '10px', color: '#047857', backgroundColor: '#d1fae5', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                  Bo'sh (Guruhsiz)
                                </span>
                              </div>
                            );
                          }
                          if (assignedTeachers.length > 0) {
                            const aTeacher = assignedTeachers[0];
                            const aName = aTeacher.user?.full_name || aTeacher.name || `Ustoz #${aTeacher.id}`;
                            return (
                              <div
                                className={styles.teacherCardLine}
                                title={`Guruhga biriktirilgan o'qituvchi: ${assignedTeachers.map((t) => t.user?.full_name || t.name).join(', ')}`}
                              >
                                <GraduationCap size={14} color="#2563eb" />
                                <span>{aName}</span>
                                <span style={{ fontSize: '10px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                  Guruhda ({assignedTeachers.length})
                                </span>
                              </div>
                            );
                          }
                          if (primaryTeacher) {
                            const pName = primaryTeacher.user?.full_name || primaryTeacher.name || `Ustoz #${primaryTeacher.id}`;
                            return (
                              <div className={styles.teacherCardLine}>
                                <GraduationCap size={14} color="#2563eb" />
                                <span>{pName}</span>
                              </div>
                            );
                          }
                          return (
                            <div className={styles.teacherCardLine} style={{ opacity: 0.65 }}>
                              <GraduationCap size={13} color="#94a3b8" />
                              <span style={{ fontSize: '11px', color: '#64748b' }}>O'qituvchi biriktirilmagan</span>
                            </div>
                          );
                        })()}

                        {/* Dars boshlanish vaqti */}
                        {(item.lesson_time || item.start_time) && (
                          <div
                            className={styles.timeCardLine}
                            title={`Dars boshlanish vaqti: ${item.lesson_time || item.start_time}`}
                          >
                            <Clock size={13} color="#2563eb" />
                            <span>Vaqti: {item.lesson_time || item.start_time}</span>
                          </div>
                        )}

                        {/* Dars kunlari */}
                        {item.days && (
                          <div
                            className={styles.timeCardLine}
                            title={`Dars kunlari: ${item.days}`}
                          >
                            <CalendarIcon size={13} color="#059669" />
                            <span style={{ color: '#059669', fontWeight: 600 }}>Kunlar: {item.days}</span>
                          </div>
                        )}

                        {isStudent ? (
                          <button
                            type="button"
                            className={styles.studentCourseActionBtn}
                            onClick={() => handleOpenDetails(item)}
                          >
                            <Award size={15} />
                            <span>Mening Baholarim & Modullar</span>
                            <ArrowRight size={14} />
                          </button>
                        ) : (
                          <p className={styles.statsText}>
                            {groupsCount} ta guruh · {studentsCount} talaba
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCourses.length > pageSize && (
                <div style={{ marginTop: '24px' }}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredCourses.length / pageSize) || 1}
                    totalItems={filteredCourses.length}
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
                {viewMode === 'CREATE' ? 'Yangi Kurs Yaratish' : 'Kursni Tahrirlash'}
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
                <Inputs
                  label="Kurs Nomi *"
                  name="name"
                  type="text"
                  as="input"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                {/* Biriktirilgan O'qituvchi (Searchable & Yo'nalish bo'yicha namunalar) */}
                <div className={styles.teacherPickerWrapper} ref={teacherPickerRef}>
                  <label className={styles.teacherPickerLabel}>
                    <span>Biriktirilgan O'qituvchi</span>
                    {selectedTeacher && (
                      <span className={styles.teacherPickerHint}>
                        Tanlandi: {selectedTeacher.user?.full_name}
                      </span>
                    )}
                  </label>

                  <div className={styles.teacherInputContainer}>
                    <span className={styles.teacherInputIcon}>
                      <GraduationCap size={18} />
                    </span>
                    <input
                      type="text"
                      className={styles.teacherInput}
                      placeholder="Yo'nalish yoki ism yozing..."
                      value={teacherSearchQuery}
                      onChange={(e) => {
                        setTeacherSearchQuery(e.target.value);
                        setIsTeacherDropdownOpen(true);
                      }}
                      onFocus={() => setIsTeacherDropdownOpen(true)}
                    />
                    <div className={styles.teacherActionBtns}>
                      {(formData.teacher_id || teacherSearchQuery) && (
                        <button
                          type="button"
                          className={styles.teacherClearBtn}
                          onClick={handleClearTeacher}
                          title="O'qituvchini tozalash"
                        >
                          <X size={15} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={styles.teacherChevronBtn}
                        onClick={() => setIsTeacherDropdownOpen((prev) => !prev)}
                        title="Ro'yxatni ochish"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Dropdown ro'yxati (Ism familiyasi va Yo'nalishi ko'rsatiladi) */}
                  {isTeacherDropdownOpen && (
                    <div className={styles.teacherDropdown}>
                      {filteredTeachers.length === 0 ? (
                        <div className={styles.noTeachersFound}>
                          Ushbu yo'nalish yoki ism bo'yicha o'qituvchi topilmadi
                        </div>
                      ) : (
                        filteredTeachers.map((t) => {
                          const isSelected = String(formData.teacher_id) === String(t.id);
                          const isMatchedToCourse = courseMatchedTeachers.some(
                            (cmt) => String(cmt.id) === String(t.id)
                          );
                          return (
                            <div
                              key={t.id}
                              className={`${styles.teacherDropdownItem} ${
                                isSelected ? styles.teacherDropdownItemActive : ''
                              }`}
                              onClick={() => handleSelectTeacher(t)}
                            >
                              <div className={styles.teacherItemLeft}>
                                <div className={styles.teacherAvatar}>
                                  {t.user?.full_name
                                    ? t.user.full_name.charAt(0).toUpperCase()
                                    : 'O'}
                                </div>
                                <div className={styles.teacherInfoText}>
                                  <span className={styles.teacherFullName}>
                                    {t.user?.full_name || `O'qituvchi #${t.id}`}
                                  </span>
                                  <span
                                    className={`${styles.teacherSpecBadge} ${
                                      isMatchedToCourse
                                        ? styles.teacherSpecBadgeMatched
                                        : ''
                                    }`}
                                  >
                                    {t.specialization || "Yo'nalish ko'rsatilmagan"}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check size={16} color="#2563eb" strokeWidth={2.5} />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {/* Kurs nomi / yo'nalishi bo'yicha tavsiya etilgan namunalar */}
                  {courseMatchedTeachers.length > 0 && (
                    <div className={styles.teacherSamplesWrapper}>
                      <span className={styles.teacherSamplesHeader}>
                        Tavsiya etilgan o'qituvchilar (yo'nalish bo'yicha):
                      </span>
                      <div className={styles.teacherSamplesContainer}>
                        {courseMatchedTeachers.map((t) => {
                          const isSelected = String(formData.teacher_id) === String(t.id);
                          return (
                            <button
                              key={t.id}
                              type="button"
                              className={`${styles.teacherSampleChip} ${
                                isSelected ? styles.teacherSampleChipActive : ''
                              }`}
                              onClick={() => handleSelectTeacher(t)}
                            >
                              <span>👤 {t.user?.full_name || `O'qituvchi #${t.id}`}</span>
                              <span style={{ opacity: 0.85 }}>({t.specialization})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <Inputs
                  label="Davomiyligi (oyda)"
                  name="duration_months"
                  type="number"
                  as="input"
                  value={formData.duration_months || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Inputs
                  label="Oylik Narxi (UZS)"
                  name="price"
                  type="number"
                  as="input"
                  value={formData.price || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Select
                  label="Darajasi (Level)"
                  name="level"
                  value={formData.level || 'Beginner'}
                  onChange={handleChange}
                  options={[
                    { value: 'Beginner', label: "Boshlang'ich (Beginner)" },
                    { value: 'Intermediate', label: "O'rta (Intermediate)" },
                    { value: 'Advanced', label: 'Yuqori (Advanced)' },
                  ]}
                  required={false}
                />

                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Faol' },
                    { value: 'inactive', label: 'Nofaol' },
                  ]}
                  required={false}
                />

                <Inputs
                  label="Dars Boshlanish Vaqti"
                  name="lesson_time"
                  type="text"
                  as="input"
                  value={formData.lesson_time || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                {/* Dars Kunlari & Hafta kunlari ikkiga ajralgan blok (Toq va Juft) */}
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
                  label="Tavsif (Qisqacha)"
                  name="description"
                  type="text"
                  as="textarea"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder=""
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
              <h1 className={styles.mainTitle}>
                {isStudent ? (selectedItem?.name || "Mening Kursim") : "Kurs Ma'lumotlari"}
              </h1>
              <p className={styles.mainSubtitle}>
                {isStudent
                  ? "Ushbu kursdagi shaxsiy baholaringiz, to'plangan tangalaringiz va dars rejalari"
                  : "Tanlangan kurs bo'yicha to'liq ko'rinish va modullar"}
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
              {!isStudent && selectedItem && (
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
                {/* Student Navigation Tabs */}
                {isStudent && (
                  <div className={styles.studentTabsNav}>
                    <button
                      type="button"
                      className={`${styles.studentTabItem} ${studentActiveTab === 'grades' ? styles.studentTabItemActive : ''}`}
                      onClick={() => setStudentActiveTab('grades')}
                    >
                      <Award size={16} />
                      <span>Mening Baholarim ({studentCourseGrades.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.studentTabItem} ${studentActiveTab === 'homework' ? styles.studentTabItemActive : ''}`}
                      onClick={() => setStudentActiveTab('homework')}
                    >
                      <FileText size={16} />
                      <span>Uy Vazifalari ({courseHwList.length})</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.studentTabItem} ${studentActiveTab === 'modules' ? styles.studentTabItemActive : ''}`}
                      onClick={() => setStudentActiveTab('modules')}
                    >
                      <BookOpen size={16} />
                      <span>Dars Modullari</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.studentTabItem} ${studentActiveTab === 'about' ? styles.studentTabItemActive : ''}`}
                      onClick={() => setStudentActiveTab('about')}
                    >
                      <Layers size={16} />
                      <span>Kurs Haqida</span>
                    </button>
                  </div>
                )}

                {/* 1. STUDENT PERSONAL GRADES IN THIS COURSE */}
                {isStudent && studentActiveTab === 'grades' && (() => {
                  const courseTotalCoins = studentCourseGrades.reduce((acc, g) => acc + (Number(g.coins) || 0), 0);
                  const courseTotalScore = studentCourseGrades.reduce((acc, g) => acc + (Number(g.score) || 0), 0);
                  const courseAvgScore = studentCourseGrades.length > 0 ? (courseTotalScore / studentCourseGrades.length).toFixed(1) : "0.0";

                  const filteredGrades = studentCourseGrades.filter(
                    (g) => studentGradeFilter === 'all' || g.type === studentGradeFilter
                  );

                  return (
                    <div style={{ marginBottom: '24px' }}>
                      {/* 4 Stats Cards */}
                      <div className={styles.studentCourseStatsGrid}>
                        <div className={styles.studentCourseStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconGold}`}>
                            🪙
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Ushbu Kursdagi Tangalar</span>
                            <span className={styles.statBigNumber}>
                              {courseTotalCoins} <span style={{ fontSize: '13px', color: '#854d0e', fontWeight: 700 }}>monet</span>
                            </span>
                            <span className={styles.statHint}>To'plangan tangalaringiz</span>
                          </div>
                        </div>

                        <div className={styles.studentCourseStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconPurple}`}>
                            <Star size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>O'rtacha Baho</span>
                            <span className={styles.statBigNumber}>
                              {courseAvgScore} <span style={{ fontSize: '13px', color: '#7e22ce', fontWeight: 700 }}>/ 10</span>
                            </span>
                            <span className={styles.statHint}>O'zlashtirish ko'rsatkichi</span>
                          </div>
                        </div>

                        <div className={styles.studentCourseStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
                            <TrendingUp size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Jami Ballar</span>
                            <span className={styles.statBigNumber}>
                              {courseTotalScore} <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 700 }}>ball</span>
                            </span>
                            <span className={styles.statHint}>Barcha darslar bo'yicha</span>
                          </div>
                        </div>

                        <div className={styles.studentCourseStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
                            <BookOpen size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Baholangan Darslar</span>
                            <span className={styles.statBigNumber}>
                              {studentCourseGrades.length} <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 700 }}>ta dars</span>
                            </span>
                            <span className={styles.statHint}>Ustozingiz baholagan</span>
                          </div>
                        </div>
                      </div>

                      {/* Grades Filter Bar & Table */}
                      <div className={styles.gradesTableCard}>
                        <div className={styles.gradesFilterBar}>
                          <div className={styles.gradesFilterPills}>
                            <button
                              type="button"
                              className={`${styles.gradePill} ${studentGradeFilter === 'all' ? styles.gradePillActive : ''}`}
                              onClick={() => setStudentGradeFilter('all')}
                            >
                              Hammasi ({studentCourseGrades.length})
                            </button>
                            <button
                              type="button"
                              className={`${styles.gradePill} ${studentGradeFilter === 'homework' ? styles.gradePillActive : ''}`}
                              onClick={() => setStudentGradeFilter('homework')}
                            >
                              📝 Uy vazifasi ({studentCourseGrades.filter(g => g.type === 'homework').length})
                            </button>
                            <button
                              type="button"
                              className={`${styles.gradePill} ${studentGradeFilter === 'activity' ? styles.gradePillActive : ''}`}
                              onClick={() => setStudentGradeFilter('activity')}
                            >
                              ⚡ Darsdagi mashg'ulot ({studentCourseGrades.filter(g => g.type === 'activity').length})
                            </button>
                          </div>

                          <div className={styles.gradesLiveStatus}>
                            <span className={styles.liveDot} />
                            <span>Jonli yangilanish faol</span>
                          </div>
                        </div>

                        {/* Grades Table */}
                        <div className={styles.gradesTableWrapper}>
                          <table className={styles.gradesTable}>
                            <thead>
                              <tr>
                                <th style={{ width: '50px' }}>#</th>
                                <th>Sana</th>
                                <th>Mashg'ulot Turi</th>
                                <th>Baholagan Ustoz</th>
                                <th>Qo'yilgan Baho</th>
                                <th>Qo'shilgan Tangalar</th>
                                <th>Ustoz Izohi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {studentGradesLoading ? (
                                <tr>
                                  <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                    Baholar yuklanmoqda...
                                  </td>
                                </tr>
                              ) : filteredGrades.length === 0 ? (
                                <tr>
                                  <td colSpan="7" style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                      <Award size={40} color="#cbd5e1" />
                                      <h4 style={{ margin: 0, fontSize: '15px', color: '#334155' }}>
                                        Ushbu kursda hozircha baholar mavjud emas
                                      </h4>
                                      <p style={{ margin: 0, fontSize: '13px' }}>
                                        Ustozingiz darslarda yoki uy vazifalariga baho qo'yishi bilan bu yerda real vaqtda aks etadi va tangalaringiz ko'payadi!
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              ) : (
                                filteredGrades.map((g, idx) => (
                                  <tr key={g.id}>
                                    <td><b>#{idx + 1}</b></td>
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Clock size={13} color="#64748b" />
                                        <span style={{ fontWeight: 600 }}>{g.date}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <span className={g.type === 'homework' ? styles.hwBadge : styles.actBadge}>
                                        {g.type === 'homework' ? '📝 Uy vazifasi' : '⚡ Darsdagi faollik'}
                                      </span>
                                    </td>
                                    <td>{g.teacher?.user?.full_name || selectedItem.teacher?.user?.full_name || 'Ustoz'}</td>
                                    <td>
                                      <span className={styles.scorePillBadge}>
                                        ⭐ <b>{g.score}</b> / 10 ball
                                      </span>
                                    </td>
                                    <td>
                                      <span className={styles.coinPillBadge}>
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
                    </div>
                  );
                })()}

                {/* 2. STUDENT HOMEWORK SECTION IN THIS COURSE */}
                {isStudent && studentActiveTab === 'homework' && (() => {
                  const totalHws = courseHwList.length;
                  const pendingCount = courseHwList.filter((h) => h.status === 'pending').length;
                  const submittedCount = courseHwList.filter((h) => h.status === 'submitted').length;
                  const gradedCount = courseHwList.filter((h) => h.status === 'graded').length;

                  const filteredHws = courseHwList.filter((hw) => {
                    if (homeworkStatusFilter !== 'all' && hw.status !== homeworkStatusFilter) {
                      return false;
                    }
                    if (homeworkSearchQuery.trim()) {
                      const q = homeworkSearchQuery.toLowerCase();
                      const matchTitle = (hw.title || '').toLowerCase().includes(q);
                      const matchDesc = (hw.description || '').toLowerCase().includes(q);
                      const matchTeacher = (hw.teacher || '').toLowerCase().includes(q);
                      if (!matchTitle && !matchDesc && !matchTeacher) return false;
                    }
                    return true;
                  });

                  return (
                    <div className={styles.homeworkSection}>
                      {/* Toast notification */}
                      {hwToast && (
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
                          <span>{hwToast}</span>
                        </div>
                      )}

                      {/* 4 Stats Cards */}
                      <div className={styles.homeworkStatsGrid}>
                        <div className={styles.homeworkStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
                            <FileText size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Jami Vazifalar</span>
                            <span className={styles.statBigNumber}>
                              {totalHws} <span style={{ fontSize: '13px', color: '#1d4ed8', fontWeight: 700 }}>ta</span>
                            </span>
                            <span className={styles.statHint}>Ushbu kurs bo'yicha</span>
                          </div>
                        </div>

                        <div className={styles.homeworkStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconGold}`}>
                            <Clock size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Kutilmoqda (Bajarilmagan)</span>
                            <span className={styles.statBigNumber}>
                              {pendingCount} <span style={{ fontSize: '13px', color: '#b45309', fontWeight: 700 }}>ta</span>
                            </span>
                            <span className={styles.statHint}>Topshirish muddati yaqin</span>
                          </div>
                        </div>

                        <div className={styles.homeworkStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconPurple}`}>
                            <UploadCloud size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Tekshiruvda (Topshirilgan)</span>
                            <span className={styles.statBigNumber}>
                              {submittedCount} <span style={{ fontSize: '13px', color: '#7e22ce', fontWeight: 700 }}>ta</span>
                            </span>
                            <span className={styles.statHint}>Ustoz ko'rib chiqmoqda</span>
                          </div>
                        </div>

                        <div className={styles.homeworkStatCard}>
                          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
                            <CheckCheck size={22} />
                          </div>
                          <div className={styles.statContent}>
                            <span className={styles.statTitle}>Baholangan</span>
                            <span className={styles.statBigNumber}>
                              {gradedCount} <span style={{ fontSize: '13px', color: '#15803d', fontWeight: 700 }}>ta</span>
                            </span>
                            <span className={styles.statHint}>Tangalar hisoblangan</span>
                          </div>
                        </div>
                      </div>

                      {/* Filter & Search Bar */}
                      <div className={styles.homeworkFilterBar}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className={`${styles.filterPill} ${homeworkStatusFilter === 'all' ? styles.filterPillActive : ''}`}
                            onClick={() => setHomeworkStatusFilter('all')}
                          >
                            Barchasi ({totalHws})
                          </button>
                          <button
                            type="button"
                            className={`${styles.filterPill} ${homeworkStatusFilter === 'pending' ? styles.filterPillActive : ''}`}
                            onClick={() => setHomeworkStatusFilter('pending')}
                          >
                            ⏳ Kutilmoqda ({pendingCount})
                          </button>
                          <button
                            type="button"
                            className={`${styles.filterPill} ${homeworkStatusFilter === 'submitted' ? styles.filterPillActive : ''}`}
                            onClick={() => setHomeworkStatusFilter('submitted')}
                          >
                            📤 Topshirilgan ({submittedCount})
                          </button>
                          <button
                            type="button"
                            className={`${styles.filterPill} ${homeworkStatusFilter === 'graded' ? styles.filterPillActive : ''}`}
                            onClick={() => setHomeworkStatusFilter('graded')}
                          >
                            ✅ Baholangan ({gradedCount})
                          </button>
                        </div>

                        <div style={{ position: 'relative', minWidth: '240px' }}>
                          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                          <input
                            type="text"
                            placeholder="Vazifa nomi yoki mavzu..."
                            value={homeworkSearchQuery}
                            onChange={(e) => setHomeworkSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px 8px 36px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '13px',
                              outline: 'none',
                            }}
                          />
                        </div>
                      </div>

                      {/* Homework Cards List */}
                      <div className={styles.homeworkCardsList}>
                        {filteredHws.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '48px 20px',
                            background: '#ffffff',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            color: '#64748b'
                          }}>
                            <FileText size={44} color="#cbd5e1" style={{ marginBottom: '10px' }} />
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '15px', color: '#1e293b' }}>Mos uy vazifasi topilmadi</h4>
                            <p style={{ margin: 0, fontSize: '13px' }}>Qidiruv shartlarini o'zgartirib ko'ring yoki barcha vazifalar filtri tanlang.</p>
                          </div>
                        ) : (
                          filteredHws.map((hw) => (
                            <div key={hw.id} className={styles.hwCard}>
                              {/* Top row */}
                              <div className={styles.hwCardTop}>
                                <div className={styles.hwMetaLeft}>
                                  {hw.status === 'submitted' && (
                                    <span className={styles.hwStatusBadgeSubmitted}>
                                      <UploadCloud size={13} />
                                      Topshirildi (Tekshiruvda)
                                    </span>
                                  )}
                                  {hw.status === 'graded' && (
                                    <span className={styles.hwStatusBadgeGraded}>
                                      <CheckCircle2 size={13} />
                                      Baholandi: {hw.grade} / {hw.maxScore} ball
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <span style={{ fontSize: '12.5px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    <CalendarIcon size={14} color="#94a3b8" />
                                    Muddati: <b style={{ color: hw.isUrgent ? '#dc2626' : '#1e293b' }}>{hw.dueDate}</b>
                                  </span>
                                  {hw.bonusCoins && (
                                    <span className={styles.coinPillBadge} title="Vazifani muvaffaqiyatli bajarganingiz uchun beriladigan monet">
                                      🪙 +{hw.bonusCoins} monet
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Title */}
                              <div>
                                <h3 className={styles.hwTitle}>{hw.title}</h3>
                              </div>

                              {/* Teacher & Dates Bar */}
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
                                <span style={{ color: '#64748b' }}>Berilgan sana: {hw.assignedDate}</span>
                              </div>

                              {/* Downloadable materials files */}
                              {hw.files && hw.files.length > 0 && (
                                <div className={styles.hwFilesBox}>
                                  <div className={styles.hwFilesHeader}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <Paperclip size={15} color="#2563eb" />
                                      Biriktirilgan amaliy materiallar & topshiriq fayllari ({hw.files.length} ta):
                                    </span>
                                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>Faylni yuklab oling</span>
                                  </div>
                                  <div className={styles.hwFilesGrid}>
                                    {hw.files.map((file, fIdx) => (
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
                                          onClick={() => file.type === 'pdf' ? handleDownloadPdf(hw, file) : handleDownloadWord(hw, file)}
                                          title="Yuklab olish"
                                        >
                                          <Download size={13} />
                                          <span>Yuklash</span>
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Bottom Actions */}
                              <div className={styles.hwCardActions}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <button
                                    type="button"
                                    className={styles.hwDownloadBtn}
                                    onClick={() => handleDownloadPdf(hw, null)}
                                  >
                                    <Download size={13} />
                                    PDF Qo'llanma
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.hwDownloadBtn}
                                    onClick={() => handleDownloadWord(hw, null)}
                                  >
                                    <Download size={13} />
                                    Word (.doc)
                                  </button>
                                </div>

                                <div>
                                  {hw.status === 'pending' && (
                                    <button
                                      type="button"
                                      className={styles.hwSubmitBtn}
                                      onClick={() => handleOpenSubmit(hw)}
                                    >
                                      <Send size={15} />
                                      Vazifani Topshirish
                                    </button>
                                  )}
                                  {hw.status === 'submitted' && (
                                    <button
                                      type="button"
                                      className={styles.hwResubmitBtn}
                                      onClick={() => handleOpenSubmit(hw)}
                                    >
                                      <UploadCloud size={15} />
                                      Qayta yuklash / Tahrirlash
                                    </button>
                                  )}
                                  {hw.status === 'graded' && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      color: '#16a34a',
                                      fontSize: '13px',
                                      fontWeight: 700
                                    }}>
                                      <CheckCircle2 size={16} />
                                      Topshirilgan & Baholangan
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. COURSE DETAILS GRID */}
                {(!isStudent || studentActiveTab === 'about') && (
                  <div className={styles.detailsGrid}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Kurs Nomi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.name || `Kurs #${selectedItem.id}`}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>O'qituvchilar</span>
                    <div className={styles.detailValue} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(() => {
                        const { unassignedTeachers, assignedTeachers, allTeachers, primaryTeacher } = getCourseTeachers(selectedItem);
                        if (allTeachers.length === 0 && !selectedItem.teacher) {
                          return <span style={{ color: '#94a3b8' }}>Biriktirilmagan</span>;
                        }
                        return (
                          <>
                            {unassignedTeachers.map((t) => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <GraduationCap size={14} color="#059669" />
                                <span style={{ fontWeight: 600, color: '#065f46' }}>
                                  {t.user?.full_name || t.name || `O'qituvchi #${t.id}`}
                                </span>
                                <span style={{ fontSize: '11px', color: '#047857', backgroundColor: '#d1fae5', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  Bo'sh (Guruhsiz)
                                </span>
                              </div>
                            ))}
                            {assignedTeachers.map((t) => (
                              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <GraduationCap size={14} color="#2563eb" />
                                <span style={{ color: '#1e40af' }}>
                                  {t.user?.full_name || t.name || `O'qituvchi #${t.id}`}
                                </span>
                                <span style={{ fontSize: '11px', color: '#2563eb', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  Guruhda ({t.assignedGroups?.length || 1} ta)
                                </span>
                              </div>
                            ))}
                            {unassignedTeachers.length === 0 && assignedTeachers.length === 0 && selectedItem.teacher && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <GraduationCap size={14} color="#2563eb" />
                                <span>{selectedItem.teacher.user?.full_name || `O'qituvchi #${selectedItem.teacher.id}`}</span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Daraja</span>
                    <span className={styles.detailValue}>
                      {formatLevel(selectedItem.level)}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Davomiyligi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.duration_months
                        ? `${selectedItem.duration_months} oy`
                        : '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Oylik Narxi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.price
                        ? `${Number(selectedItem.price)
                            .toLocaleString('ru-RU')
                            .replace(/,/g, ' ')} UZS`
                        : '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Holati</span>
                    <span className={styles.detailValue}>
                      {selectedItem.status === 'active' ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Dars Boshlanish Vaqti</span>
                    <span className={styles.detailValue}>
                      {selectedItem.lesson_time || selectedItem.start_time || '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Dars Kunlari</span>
                    <span className={styles.detailValue}>
                      {selectedItem.days || '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Tavsif</span>
                    <span className={styles.detailValue}>
                      {selectedItem.description || '—'}
                    </span>
                  </div>
                </div>
                )}

                {/* Course Modules Section */}
                {(!isStudent || studentActiveTab === 'modules') && (
                  <div className={styles.modulesSection}>
                    <div className={styles.modulesHeader}>
                      <h3 className={styles.modulesTitle}>
                        Kurs Modullari & Darsliklar (
                        {
                          modulesList.filter(
                            (m) =>
                              String(m.course_id) === String(selectedItem.id) ||
                              String(m.course?.id) === String(selectedItem.id)
                          ).length
                        }
                        )
                      </h3>
                      {!isStudent && (
                        <Button
                          variant="primary"
                          icon={Plus}
                          onClick={() => handleOpenAddModule(selectedItem.id)}
                        >
                          Modul Qo'shish
                        </Button>
                      )}
                    </div>

                    {(() => {
                      const courseModules = modulesList
                        .filter(
                          (m) =>
                            String(m.course_id) === String(selectedItem.id) ||
                            String(m.course?.id) === String(selectedItem.id)
                        )
                        .sort(
                          (a, b) =>
                            (Number(a.order_index) || 0) -
                            (Number(b.order_index) || 0)
                        );

                      if (courseModules.length === 0) {
                        return (
                          <p style={{ color: '#64748b', fontSize: '14px' }}>
                            Ushbu kurs uchun hali modullar kiritilmagan.
                          </p>
                        );
                      }

                      return (
                        <div className={styles.modulesList}>
                          {courseModules.map((mod, i) => (
                            <div key={mod.id} className={styles.moduleItem}>
                              <div className={styles.moduleInfo}>
                                <span className={styles.moduleIndex}>
                                  {mod.order_index || i + 1}
                                </span>
                                <div>
                                  <span className={styles.moduleName}>
                                    {mod.name}
                                  </span>
                                  {mod.description && (
                                    <p
                                      style={{
                                        fontSize: '12px',
                                        color: '#64748b',
                                        margin: '2px 0 0 0',
                                      }}
                                    >
                                      {mod.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {!isStudent && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    className={styles.cardActionBtn}
                                    style={{
                                      backgroundColor: '#f1f5f9',
                                      color: '#334155',
                                    }}
                                    onClick={() => handleOpenEditModule(mod)}
                                    title="Tahrirlash"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                                    onClick={() => handleDeleteModule(mod.id)}
                                    title="O'chirish"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Course Enrolled Students Section */}
                {!isStudent && (
                  <div className={styles.studentsSection}>
                    {(() => {
                      const { courseGroups, enrolledStudents } = getCourseStats(selectedItem.id);

                      return (
                        <>
                          <div className={styles.studentsHeader}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <Users size={18} color="#2563eb" />
                              <h3 className={styles.studentsTitle}>
                                Kurs Talabalari ({enrolledStudents.length})
                              </h3>
                            </div>
                            <span className={styles.courseGroupsBadge}>
                              {courseGroups.length} ta guruh
                            </span>
                          </div>

                          {enrolledStudents.length === 0 ? (
                            <p style={{ color: '#64748b', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>
                              Ushbu kursga hali talabalar biriktirilmagan.
                            </p>
                          ) : (
                            <div className={styles.studentsGrid}>
                              {enrolledStudents.map((st) => (
                                <div key={st.id} className={styles.studentCard}>
                                  <div className={styles.studentLeft}>
                                    <div
                                      className={styles.studentAvatar}
                                      style={{ background: getAvatarGradient(st.name) }}
                                    >
                                      {getInitials(st.name)}
                                    </div>
                                    <div className={styles.studentInfo}>
                                      <span className={styles.studentName}>{st.name}</span>
                                      {st.phone && (
                                        <span className={styles.studentPhone}>{st.phone}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className={styles.studentRight}>
                                    <span className={styles.studentGroupTag} title={`Guruh: ${st.groupName}`}>
                                      {st.groupName}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </>
            ) : (
              <p>Ma'lumot topilmadi</p>
            )}
          </div>
        </>
      )}

      {/* Module Create/Edit Modal */}
      {isModuleModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModuleModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingModule ? 'Modulni Tahrirlash' : 'Yangi Modul Qo\'shish'}
              </h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsModuleModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {moduleModalError && (
              <div className={styles.alert}>
                <AlertCircle size={18} />
                <span>{moduleModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModule}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Inputs
                  label="Modul Nomi *"
                  name="name"
                  type="text"
                  as="input"
                  value={moduleFormData.name}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      name: e.target.value,
                    })
                  }
                  placeholder=""
                  required={true}
                />

                <Inputs
                  label="Tartib Raqami"
                  name="order_index"
                  type="number"
                  as="input"
                  value={moduleFormData.order_index}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      order_index: e.target.value,
                    })
                  }
                  placeholder=""
                  required={false}
                />

                <Inputs
                  label="Modul Tavsifi"
                  name="description"
                  type="text"
                  as="textarea"
                  value={moduleFormData.description}
                  onChange={(e) =>
                    setModuleFormData({
                      ...moduleFormData,
                      description: e.target.value,
                    })
                  }
                  placeholder=""
                  required={false}
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
                  onClick={() => setIsModuleModalOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Homework Submit Modal */}
      {isSubmitModalOpen && activeHwToSubmit && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsSubmitModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            style={{ maxWidth: '580px' }}
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
                {/* Information Box */}
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

                {/* GitHub / Project Link */}
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

                {/* File Upload Simulator */}
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
                        <span style={{ color: '#2563eb' }}>Tanlangan fayl: {submitFormData.fileName}</span>
                      ) : (
                        "Kompyuterdan fayl tanlash uchun bu yerga bosing"
                      )}
                    </div>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Maksimal hajm: 25MB</span>
                  </div>
                </div>

                {/* Comment / Notes */}
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
                <Button type="submit" variant="primary" icon={Send} loading={loading}>
                  Topshirish
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;
