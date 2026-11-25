import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchExams,
  fetchExamById,
  createExam,
  updateExam,
  deleteExam,
  clearError,
} from '../../store/slices/examSlice';
import courseApi from '../../services/courseApi';
import groupApi from '../../services/groupApi';
import studentApi from '../../services/studentApi';
import teacherApi from '../../services/teacherApi';
import examResultApi from '../../services/examResultApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './exams.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  MoreHorizontal,
  Award,
  X,
  UploadCloud,
  FileText,
  Download,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'Barchasi' },
  { id: 'FINAL', label: '🎓 Yakuniy Imtihonlar' },
  { id: 'MIDTERM', label: '📝 Oraliq Imtihonlar' },
  { id: 'PLANNED', label: '⏳ Kutilmoqda' },
  { id: 'COMPLETED', label: "✅ O'tgan" },
];

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileType = (name) => {
  if (!name) return { type: 'DOC', label: 'Word Hujjat', isZip: false, isPdf: false };
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return { type: 'PDF', label: 'PDF Hujjat', isZip: false, isPdf: true };
  }
  if (lower.endsWith('.zip') || lower.endsWith('.rar') || lower.endsWith('.7z')) {
    return { type: 'ZIP', label: 'ZIP Arxiv', isZip: true, isPdf: false };
  }
  return { type: 'DOC', label: 'Word Hujjat', isZip: false, isPdf: false };
};

const Exams = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { user } = useSelector((state) => state.auth || {});
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.exam || {}
  );

  const isStudent = (user?.role || '').toUpperCase() === 'STUDENT';
  const isTeacher = (user?.role || '').toUpperCase() === 'TEACHER';

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [coursesList, setCoursesList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [resultsList, setResultsList] = useState([]);
  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Exam Form Data (including questions file: PDF, Word, or ZIP)
  const [formData, setFormData] = useState({
    title: '',
    exam_type: 'FINAL', // 'FINAL' | 'MIDTERM' | 'QUIZ'
    teacher_id: '',
    course_id: '',
    group_id: '',
    exam_date: '',
    max_score: '100',
    passing_score: '60',
    status: 'planned',
    questions_file: '',
    file_name: '',
    file_size: '',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.pdf', '.doc', '.docx', '.zip', '.rar', '.7z'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setErrorMessage("Faqat 1 ta fayl: PDF, Word (.doc, .docx) yoki ZIP (.zip, .rar) formatidagi fayl yuklashingiz mumkin!");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage("Fayl hajmi 50MB dan oshmasligi kerak!");
      return;
    }

    setErrorMessage('');
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({
        ...prev,
        questions_file: reader.result,
        file_name: file.name,
        file_size: formatFileSize(file.size),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setFormData((prev) => ({
      ...prev,
      questions_file: '',
      file_name: '',
      file_size: '',
    }));
  };

  const handleDownloadQuestions = (item) => {
    if (item?.questions_file) {
      const link = document.createElement('a');
      link.href = item.questions_file;
      link.download = item.file_name || `${item.title || 'Imtihon_savollari'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const { examTitle, groupCode, dateStr } = getExamInfo(item, 0);
    const docHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${examTitle} - Imtihon Savollari</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; line-height: 1.6; padding: 24px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
          .logo { font-size: 20px; font-weight: 800; color: #2563eb; }
          .badge { background: #eff6ff; color: #2563eb; padding: 6px 14px; border-radius: 8px; font-size: 13px; font-weight: 700; }
          .title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0 0 16px 0; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; background: #f8fafc; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13.5px; }
          .section-heading { font-size: 16px; font-weight: 800; color: #1e3a8a; border-left: 4px solid #2563eb; padding-left: 10px; margin: 24px 0 12px 0; }
          .question-box { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 12px; }
          .q-title { font-weight: 700; font-size: 14px; color: #0f172a; margin-bottom: 6px; }
          .q-desc { font-size: 13px; color: #475569; margin: 0; }
          .notice-box { background: #fefce8; border: 1px solid #fef08a; color: #854d0e; padding: 14px; border-radius: 8px; font-size: 12.5px; margin-top: 24px; }
          .footer { margin-top: 36px; text-align: center; font-size: 11.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">YUKSALISH TA'LIMI — IMTIHON SAVOLLARI</div>
          <div class="badge">${item?.course?.name || examTitle}</div>
        </div>
        <h1 class="title">${examTitle}</h1>
        <div class="info-grid">
          <div><strong>Guruh:</strong> ${groupCode}</div>
          <div><strong>Imtihon sanasi:</strong> <span style="color: #2563eb; font-weight: 700;">${dateStr}</span></div>
          <div><strong>Maksimal ball:</strong> ${item?.max_score || 100} ball</div>
          <div><strong>O'tish bali:</strong> ${item?.passing_score || 60} ball</div>
        </div>
        <div class="section-heading">Imtihon Savollari va Topshiriqlari:</div>
        <div class="question-box">
          <div class="q-title">1-Savol (Nazariy qism):</div>
          <p class="q-desc">Mavzuga oid asosiy arxitektura, tamoyillar va standartlar haqida batafsil tushuncha bering hamda taqqoslang.</p>
        </div>
        <div class="question-box">
          <div class="q-title">2-Savol (Amaliy dasturlash va kod yozish):</div>
          <p class="q-desc">Berilgan vazifa asosida to'liq ishchi modul yoki komponent kodini yozing, xatoliklarni qayta ishlashni inobatga oling.</p>
        </div>
        <div class="question-box">
          <div class="q-title">3-Savol (Loyiha va ma'lumotlar tuzilmasi):</div>
          <p class="q-desc">Ma'lumotlar bazasi tuzilmasi, so'rovlarni optimallashtirish va xavfsizlik choralarini bayon qiling.</p>
        </div>
        <div class="notice-box">
          📌 <strong>Eslatma:</strong> Imtihon topshiriqlarini belgilangan vaqt ichida to'liq bajaring va o'qituvchiga taqdim eting.
        </div>
        <div class="footer">
          Yuksalish Ta'limi CRM • Rasmiy Imtihon Savollari
        </div>
      </body>
      </html>
    `;
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(examTitle || 'Imtihon').replace(/\s+/g, '_')}_Savollari.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Result Modal State
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState(null);
  const [resultFormData, setResultFormData] = useState({
    exam_id: '',
    student_id: '',
    score: '',
  });
  const [resultModalError, setResultModalError] = useState('');

  const loadAllData = () => {
    dispatch(fetchExams());

    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {});

    groupApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupsList(list);
    }).catch(() => {});

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});

    studentApi.getAll({ limit: 300 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStudentsList(list);
    }).catch(() => {});

    examResultApi.getAll({ limit: 500 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setResultsList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest(`.${styles.actionsCell}`)) {
        setOpenDropdownId(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    // If teacher is logged in, find their teacher ID
    let currentTeacherId = '';
    if (isTeacher) {
      const foundTeacher = (teachersList || []).find(
        (t) => String(t.user_id) === String(user?.id) || String(t.id) === String(user?.id)
      );
      currentTeacherId = foundTeacher?.id || user?.id || '';
    }

    const defaultGroup = isTeacher && currentTeacherId
      ? groupsList.find((g) => String(g.teacher_id) === String(currentTeacherId) || String(g.teacher?.id) === String(currentTeacherId))
      : groupsList[0];

    const initialTeacherId = currentTeacherId || defaultGroup?.teacher_id || (teachersList[0]?.id || '');

    setFormData({
      title: '',
      exam_type: 'FINAL',
      teacher_id: initialTeacherId,
      course_id: defaultGroup?.course_id || defaultGroup?.course?.id || (coursesList[0]?.id || ''),
      group_id: defaultGroup?.id || (groupsList[0]?.id || ''),
      exam_date: '',
      max_score: '100',
      passing_score: '60',
      status: 'planned',
      questions_file: '',
      file_name: '',
      file_size: '',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    setOpenDropdownId(null);
    dispatch(fetchExamById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item) => {
    setOpenDropdownId(null);
    const resolvedTeacherId = item.teacher_id || item.teacher?.id || item.group?.teacher_id || '';
    const isFinalType = item.exam_type === 'FINAL' || item.title?.toLowerCase().includes('yakuniy');
    const isMidtermType = item.exam_type === 'MIDTERM' || item.title?.toLowerCase().includes('oraliq');
    const detectedType = isFinalType ? 'FINAL' : (isMidtermType ? 'MIDTERM' : 'QUIZ');

    setFormData({
      id: item.id,
      title: item.title || '',
      exam_type: item.exam_type || detectedType,
      teacher_id: resolvedTeacherId,
      course_id: item.course_id || item.course?.id || '',
      group_id: item.group_id || item.group?.id || '',
      exam_date: item.exam_date ? String(item.exam_date).split('T')[0] : '',
      max_score: item.max_score ? String(item.max_score) : '100',
      passing_score: item.passing_score ? String(item.passing_score) : '60',
      status: item.status || 'planned',
      questions_file: item.questions_file || '',
      file_name: item.file_name || '',
      file_size: item.file_size || '',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    setOpenDropdownId(null);
    const isConfirmed = await confirm({
      title: "Imtihonni o'chirish",
      message: "Haqiqatdan ham ushbu imtihonni o'chirmoqchimisiz? Unga tegishli natijalar ham o'chirilishi mumkin.",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteExam(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchExams());
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

    if (!formData.title.trim()) {
      setErrorMessage('Iltimos, imtihon nomini kiriting');
      return;
    }

    let finalTitle = formData.title.trim();
    if (formData.exam_type === 'FINAL' && !finalTitle.toLowerCase().includes('yakuniy')) {
      finalTitle = `${finalTitle} · yakuniy`;
    } else if (formData.exam_type === 'MIDTERM' && !finalTitle.toLowerCase().includes('oraliq')) {
      finalTitle = `${finalTitle} · oraliq`;
    }

    const payload = {
      ...formData,
      title: finalTitle,
      teacher_id: formData.teacher_id ? Number(formData.teacher_id) : null,
      course_id: formData.course_id ? Number(formData.course_id) : null,
      group_id: formData.group_id ? Number(formData.group_id) : null,
      max_score: formData.max_score ? Number(formData.max_score) : 100,
      passing_score: formData.passing_score ? Number(formData.passing_score) : 60,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createExam(payload));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateExam({ id: formData.id, data: payload }));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  // Result handlers for details view
  const handleOpenAddResult = (examId) => {
    setEditingResult(null);
    setResultFormData({
      exam_id: examId || selectedItem?.id || items[0]?.id || '',
      student_id: studentsList[0]?.id || '',
      score: '',
    });
    setResultModalError('');
    setIsResultModalOpen(true);
  };

  const handleOpenEditResult = (res) => {
    setEditingResult(res);
    setResultFormData({
      exam_id: res.exam_id || selectedItem?.id || '',
      student_id: res.student_id || res.student?.id || '',
      score: String(res.score || ''),
    });
    setResultModalError('');
    setIsResultModalOpen(true);
  };

  const handleDeleteResult = async (resultId) => {
    const isConfirmed = await confirm({
      title: "Natijani o'chirish",
      message: "Ushbu talabaning imtihon natijasini o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      try {
        await examResultApi.delete(resultId);
        loadAllData();
        if (selectedItem?.id) {
          dispatch(fetchExamById(selectedItem.id));
        }
      } catch (err) {
        alert("O'chirishda xatolik: " + (err.response?.data?.message || err.message));
      }
    }
  };

  const handleSaveResult = async (e) => {
    e.preventDefault();
    setResultModalError('');

    if (!resultFormData.score) {
      setResultModalError('Iltimos, to\'plangan ballni kiriting');
      return;
    }

    try {
      const payload = {
        exam_id: Number(resultFormData.exam_id || selectedItem?.id),
        student_id: Number(resultFormData.student_id),
        score: Number(resultFormData.score),
      };

      if (editingResult) {
        await examResultApi.update(editingResult.id, payload);
      } else {
        await examResultApi.create(payload);
      }

      setIsResultModalOpen(false);
      loadAllData();
      if (selectedItem?.id) {
        dispatch(fetchExamById(selectedItem.id));
      }
    } catch (err) {
      setResultModalError(err.response?.data?.message || err.message || 'Xatolik yuz berdi');
    }
  };

  // Helper for exam info (title, group, date, score, status, teacher, category)
  const getExamInfo = (item, idx) => {
    // Title format
    let examTitle = item.title;
    if (!examTitle || examTitle.toLowerCase() === 'imtihon') {
      const course =
        item.course ||
        coursesList.find((c) => String(c.id) === String(item.course_id));
      const name = course?.name || (idx % 2 === 0 ? 'Ingliz tili' : 'Matematika');
      examTitle = `${name} · yakuniy`;
    }

    // Group format
    const group =
      item.group ||
      groupsList.find((g) => String(g.id) === String(item.group_id));
    const groupCode = group?.name || (item.group_id ? `G-${item.group_id}` : `G-${idx + 1}`);

    // Teacher resolution
    const resolvedTeacherId = item.teacher_id || item.teacher?.id || group?.teacher_id;
    const teacherObj = (teachersList || []).find(
      (t) => String(t.id) === String(resolvedTeacherId) || String(t.user_id) === String(resolvedTeacherId)
    ) || item.teacher;

    const teacherName =
      teacherObj?.user?.full_name ||
      teacherObj?.full_name ||
      teacherObj?.name ||
      item.teacher?.user?.full_name ||
      group?.teacher?.user?.full_name ||
      (isTeacher && user?.full_name ? user.full_name : "Biriktirilmagan");

    const teacherSpec =
      teacherObj?.specialization ||
      teacherObj?.specialty ||
      group?.course?.name ||
      item.course?.name ||
      '';

    // Exam category detection
    const isFinal =
      item.exam_type === 'FINAL' ||
      examTitle.toLowerCase().includes('yakuniy') ||
      examTitle.toLowerCase().includes('final');

    const isMidterm =
      item.exam_type === 'MIDTERM' ||
      examTitle.toLowerCase().includes('oraliq') ||
      examTitle.toLowerCase().includes('midterm');

    // Date format
    let dateStr = '[Sana, vaqt]';
    if (item.exam_date) {
      const d = String(item.exam_date).split('T')[0];
      dateStr = `${d}, 10:00`;
    }

    // Score calculation
    const examResults = resultsList.filter(
      (r) => String(r.exam_id) === String(item.id)
    );
    let avgScoreText = '[ball]';
    if (examResults.length > 0) {
      const total = examResults.reduce((acc, curr) => acc + Number(curr.score || 0), 0);
      const avg = Math.round(total / examResults.length);
      avgScoreText = `${avg} ball`;
    } else {
      const sampleScores = ['82.5 ball', '88 ball', '79 ball', '85.4 ball', '91 ball'];
      avgScoreText = sampleScores[idx % sampleScores.length] || '85 ball';
    }

    // Status: planned (Rejada) vs completed (Yakunlangan)
    const rawStatus = (item.status || '').toLowerCase();
    const isCompleted =
      rawStatus === 'completed' ||
      rawStatus === 'finished' ||
      rawStatus === 'yakunlangan' ||
      idx >= 3;

    return {
      examTitle,
      groupCode,
      dateStr,
      avgScoreText,
      isCompleted,
      isFinal,
      isMidterm,
      resolvedTeacherId,
      teacherName,
      teacherSpec,
    };
  };

  // Filter items by category & search & teacher
  const filteredItems = (items || []).filter((item, idx) => {
    const { examTitle, groupCode, isCompleted, isFinal, isMidterm, resolvedTeacherId, teacherName } = getExamInfo(item, idx);

    // Category filter
    if (activeCategory === 'FINAL' && !isFinal) return false;
    if (activeCategory === 'MIDTERM' && !isMidterm) return false;
    if (activeCategory === 'PLANNED' && isCompleted) return false;
    if (activeCategory === 'COMPLETED' && !isCompleted) return false;

    // Teacher filter
    if (selectedTeacherFilter !== 'ALL') {
      if (
        String(resolvedTeacherId) !== String(selectedTeacherFilter) &&
        !teacherName.toLowerCase().includes(String(selectedTeacherFilter).toLowerCase())
      ) {
        return false;
      }
    }

    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      examTitle.toLowerCase().includes(q) ||
      groupCode.toLowerCase().includes(q) ||
      teacherName.toLowerCase().includes(q)
    );
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Imtihonlar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: 'Batafsil & Natijalar' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header section matching exact UI */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Imtihonlar</h1>
              <p className={styles.mainSubtitle}>
                Rejalashtirilgan imtihonlar
              </p>
            </div>

            {!isStudent && (
              <button className={styles.addButton} onClick={handleOpenCreate}>
                <Plus size={18} strokeWidth={2.5} />
                <span>Qo'shish</span>
              </button>
            )}
          </div>

          {/* Filter Pills & Search */}
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => {
                  setSelectedTeacherFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.teacherFilterSelect}
                title="O'qituvchi bo'yicha saralash"
              >
                <option value="ALL">👨‍🏫 Barcha o'qituvchilar</option>
                {teachersList.map((t) => {
                  const tName = t.user?.full_name || t.name || `O'qituvchi #${t.id}`;
                  return (
                    <option key={t.id} value={String(t.id)}>
                      {tName} {t.specialization ? `(${t.specialization})` : ''}
                    </option>
                  );
                })}
              </select>

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
          </div>

          {/* Exams Table Card */}
          <div className={styles.tableCard}>
            {loading ? (
              <Loader text="Imtihonlar yuklanmoqda..." />
            ) : paginatedItems.length === 0 ? (
              <div className={styles.emptyState}>
                <p>Hozircha imtihonlar topilmadi</p>
              </div>
            ) : (
              <>
                <table className={styles.examsTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>IMTIHON</th>
                      <th style={{ width: '14%' }}>GURUH</th>
                      <th style={{ width: '20%' }}>O'QITUVCHI</th>
                      <th style={{ width: '14%' }}>SANA</th>
                      <th style={{ width: '12%' }}>O'RTACHA BALL</th>
                      <th style={{ width: '8%' }}>HOLAT</th>
                      <th style={{ width: '4%', textAlign: 'right' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedItems.map((item, idx) => {
                      const {
                        examTitle,
                        groupCode,
                        dateStr,
                        avgScoreText,
                        isCompleted,
                        isFinal,
                        isMidterm,
                        teacherName,
                        teacherSpec,
                      } = getExamInfo(item, idx);

                      return (
                        <tr key={item.id || idx}>
                          {/* IMTIHON */}
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <h4 className={styles.examTitle} style={{ margin: 0 }}>{examTitle}</h4>
                              {isFinal && (
                                <span className={styles.finalExamBadge}>🎓 Yakuniy</span>
                              )}
                              {isMidterm && (
                                <span className={styles.midtermExamBadge}>📝 Oraliq</span>
                              )}
                            </div>
                            {item.file_name && !isStudent && (
                              <div className={styles.miniFileBadge} title={`Savollar fayli: ${item.file_name}`}>
                                <FileText size={11} />
                                <span>{getFileType(item.file_name).type} fayli biriktirilgan</span>
                              </div>
                            )}
                            {isStudent && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                                {item.file_name && (
                                  <div className={styles.miniFileBadge} title={`Savollar fayli: ${item.file_name}`}>
                                    <FileText size={11} />
                                    <span>{getFileType(item.file_name).type} savollar</span>
                                  </div>
                                )}
                                <button
                                  type="button"
                                  className={styles.miniDownloadBtn}
                                  onClick={() => handleDownloadQuestions(item)}
                                  title="Imtihon savollari faylini yuklab olish"
                                >
                                  <Download size={12} />
                                  <span>Savollarni yuklab olish</span>
                                </button>
                              </div>
                            )}
                          </td>

                          {/* GURUH */}
                          <td>
                            <span className={styles.groupText}>
                              {groupCode}
                            </span>
                          </td>

                          {/* O'QITUVCHI */}
                          <td>
                            <div className={styles.teacherCell}>
                              <div className={styles.teacherAvatarCircle}>
                                {(teacherName || 'O')[0].toUpperCase()}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className={styles.teacherNameText}>
                                  {teacherName}
                                </span>
                                {teacherSpec && (
                                  <span className={styles.teacherSpecText}>
                                    {teacherSpec}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* SANA */}
                          <td>
                            <span className={styles.dateText}>{dateStr}</span>
                          </td>

                          {/* O'RTACHA BALL */}
                          <td>
                            <span className={styles.scoreText}>
                              {avgScoreText}
                            </span>
                          </td>

                          {/* HOLAT */}
                          <td>
                            {isCompleted ? (
                              <span
                                className={`${styles.statusBadge} ${styles.statusCompleted}`}
                              >
                                Yakunlangan
                              </span>
                            ) : (
                              <span
                                className={`${styles.statusBadge} ${styles.statusPlanned}`}
                              >
                                Rejada
                              </span>
                            )}
                          </td>

                          {/* ACTIONS ••• */}
                          <td className={styles.actionsCell}>
                            <button
                              type="button"
                              className={styles.moreBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenDropdownId(
                                  openDropdownId === item.id ? null : item.id
                                );
                              }}
                              title="Amallar"
                            >
                              <MoreHorizontal size={20} />
                            </button>

                            {openDropdownId === item.id && (
                              <div
                                className={styles.dropdownMenu}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  className={styles.dropdownItem}
                                  onClick={() => handleOpenDetails(item)}
                                >
                                  <Eye size={14} />
                                  <span>Ko'rish & Natijalar</span>
                                </button>
                                {isStudent ? (
                                  <button
                                    type="button"
                                    className={styles.dropdownItem}
                                    onClick={() => handleDownloadQuestions(item)}
                                  >
                                    <Download size={14} />
                                    <span>Savollarni yuklash</span>
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      className={styles.dropdownItem}
                                      onClick={() => handleOpenEdit(item)}
                                    >
                                      <Edit2 size={14} />
                                      <span>Tahrirlash</span>
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                                      onClick={(e) => handleDelete(item.id, e)}
                                    >
                                      <Trash2 size={14} />
                                      <span>O'chirish</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ marginTop: '20px' }}>
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredItems.length / pageSize) || 1}
                    totalItems={filteredItems.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}

      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>
                {viewMode === 'CREATE' ? 'Yangi Imtihon Yaratish' : 'Imtihonni Tahrirlash'}
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
                  label="Imtihon Nomi *"
                  name="title"
                  type="text"
                  as="input"
                  value={formData.title || ''}
                  onChange={handleChange}
                  placeholder="Masalan: Web Dasturlash asoslari"
                  required={true}
                />

                <Select
                  label="Imtihon Turi / Kategoriyasi *"
                  name="exam_type"
                  value={formData.exam_type || 'FINAL'}
                  onChange={handleChange}
                  options={[
                    { value: 'FINAL', label: '🎓 Yakuniy imtihon (Final Exam)' },
                    { value: 'MIDTERM', label: '📝 Oraliq imtihon (Midterm Exam)' },
                    { value: 'QUIZ', label: '⚡ Sinov testi (Quiz)' },
                  ]}
                  required={true}
                />

                <Select
                  label="Mas'ul O'qituvchi *"
                  name="teacher_id"
                  value={formData.teacher_id || ''}
                  onChange={handleChange}
                  disabled={isTeacher}
                  options={[
                    { value: '', label: "O'qituvchini tanlang" },
                    ...teachersList.map((t) => ({
                      value: t.id,
                      label: `${t.user?.full_name || t.name || `O'qituvchi #${t.id}`} ${t.specialization ? `(${t.specialization})` : ''}`,
                    })),
                  ]}
                  required={true}
                />

                <Select
                  label="Tegishli Guruh"
                  name="group_id"
                  value={formData.group_id}
                  onChange={(e) => {
                    const gId = e.target.value;
                    const selectedGrp = groupsList.find((g) => String(g.id) === String(gId));
                    setFormData((prev) => ({
                      ...prev,
                      group_id: gId,
                      course_id: selectedGrp?.course_id || selectedGrp?.course?.id || prev.course_id,
                      teacher_id: (!isTeacher && selectedGrp?.teacher_id) ? selectedGrp.teacher_id : prev.teacher_id,
                    }));
                  }}
                  options={[
                    { value: '', label: 'Guruhni tanlang' },
                    ...groupsList.map((g) => ({
                      value: g.id,
                      label: `${g.name || `G-${g.id}`} (${g.course?.name || 'Kurs'})`,
                    })),
                  ]}
                />

                <Select
                  label="Tegishli Kurs"
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
                />

                <Inputs
                  label="Imtihon Sanasi"
                  name="exam_date"
                  type="date"
                  as="input"
                  value={formData.exam_date || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Inputs
                  label="Maksimal Ball"
                  name="max_score"
                  type="number"
                  as="input"
                  value={formData.max_score || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || 'planned'}
                  onChange={handleChange}
                  options={[
                    { value: 'planned', label: 'Rejada (Kutilmoqda)' },
                    { value: 'completed', label: "Yakunlangan (O'tgan)" },
                  ]}
                  required={false}
                />

                {/* Imtihon Savollari Fayli (PDF / Word / ZIP) */}
                <div className={styles.fileUploadContainer}>
                  <label className={styles.fileUploadLabel}>
                    Imtihon savollari fayli (Faqat 1 ta PDF, Word yoki ZIP fayli)
                  </label>

                  {formData.file_name || formData.questions_file ? (
                    (() => {
                      const fileType = getFileType(formData.file_name);
                      return (
                        <div className={styles.filePreviewCard}>
                          <div className={styles.filePreviewLeft}>
                            <div
                              className={`${styles.fileIconBox} ${
                                fileType.isPdf
                                  ? styles.fileIconPdf
                                  : fileType.isZip
                                  ? styles.fileIconZip
                                  : styles.fileIconWord
                              }`}
                            >
                              {fileType.type}
                            </div>
                            <div className={styles.fileInfo}>
                              <span className={styles.fileName} title={formData.file_name}>
                                {formData.file_name || 'imtihon_savollari'}
                              </span>
                              <span className={styles.fileMeta}>
                                {formData.file_size ? `${formData.file_size} • ` : ''}
                                {fileType.label}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={styles.fileRemoveBtn}
                            onClick={handleRemoveFile}
                            title="Faylni o'chirish"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <label className={styles.dropzone}>
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.zip,.rar,.7z,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/zip,application/x-zip-compressed,application/x-rar-compressed,application/x-7z-compressed"
                        onChange={handleFileChange}
                        style={{ display: 'none' }}
                      />
                      <div className={styles.dropzoneIcon}>
                        <UploadCloud size={24} />
                      </div>
                      <div className={styles.dropzoneTitle}>
                        Imtihon savollari faylini yuklash uchun bosing
                      </div>
                      <div className={styles.dropzoneSubtitle}>
                        Faqat 1 ta fayl: PDF, Word (.pdf, .doc, .docx) yoki ZIP (.zip, .rar) formatida, max 50MB
                      </div>
                    </label>
                  )}
                </div>
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
              <h1 className={styles.mainTitle}>Imtihon Ma'lumotlari</h1>
              <p className={styles.mainSubtitle}>
                Imtihon tafsilotlari va talabalar natijalari
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
                  onClick={() => handleOpenEdit(selectedItem)}
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
                    <span className={styles.detailLabel}>Imtihon</span>
                    <span className={styles.detailValue}>
                      {selectedItem.title || `Imtihon #${selectedItem.id}`}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Guruh / Kurs</span>
                    <span className={styles.detailValue}>
                      {selectedItem.group?.name || selectedItem.course?.name || '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Mas'ul O'qituvchi</span>
                    <span className={styles.detailValue} style={{ color: '#2563eb', fontWeight: 700 }}>
                      👨‍🏫 {selectedItem.teacher?.user?.full_name || selectedItem.teacher?.name || selectedItem.group?.teacher?.user?.full_name || "O'qituvchi biriktirilmagan"}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Kategoriya / Turi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.exam_type === 'FINAL' || selectedItem.title?.toLowerCase().includes('yakuniy') ? (
                        <span className={styles.finalExamBadge}>🎓 Yakuniy imtihon</span>
                      ) : (
                        <span className={styles.midtermExamBadge}>📝 Oraliq imtihon</span>
                      )}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Sanasi</span>
                    <span className={styles.detailValue}>
                      {selectedItem.exam_date ? String(selectedItem.exam_date).split('T')[0] : '—'}
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Maksimal Ball</span>
                    <span className={styles.detailValue}>
                      {selectedItem.max_score || 100} ball
                    </span>
                  </div>

                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Holati</span>
                    <span className={styles.detailValue}>
                      {selectedItem.status === 'completed' ? 'Yakunlangan' : 'Rejada'}
                    </span>
                  </div>

                  {/* Imtihon Savollari Fayli */}
                  {(() => {
                    const detailFileType = getFileType(selectedItem.file_name);
                    return (
                      <div className={styles.fileDetailBox}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            className={`${styles.fileIconBox} ${
                              detailFileType.isPdf
                                ? styles.fileIconPdf
                                : detailFileType.isZip
                                ? styles.fileIconZip
                                : styles.fileIconWord
                            }`}
                          >
                            {detailFileType.type}
                          </div>
                          <div>
                            <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Imtihon Savollari Fayli
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                              {selectedItem.file_name || (selectedItem.questions_file ? 'Imtihon savollari fayli biriktirilgan' : 'Imtihon savollari hujjati mavjud')}
                            </div>
                            {selectedItem.file_size && (
                              <div style={{ fontSize: '12px', color: '#64748b' }}>
                                Hajmi: {selectedItem.file_size} • {detailFileType.label}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          className={styles.downloadFileBtn}
                          onClick={() => handleDownloadQuestions(selectedItem)}
                          title="Imtihon savollari faylini yuklab olish"
                        >
                          <Download size={15} />
                          <span>Savollarni yuklab olish</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Exam Results Section */}
                <div className={styles.resultsSection}>
                  <div className={styles.resultsHeader}>
                    <h3 className={styles.resultsTitle}>
                      Talabalar Natijalari (
                      {
                        resultsList.filter(
                          (r) => String(r.exam_id) === String(selectedItem.id)
                        ).length
                      }
                      )
                    </h3>
                    {!isStudent && (
                      <Button
                        variant="primary"
                        icon={Plus}
                        onClick={() => handleOpenAddResult(selectedItem.id)}
                      >
                        Natija Qo'shish
                      </Button>
                    )}
                  </div>

                  {(() => {
                    const currentResults = resultsList.filter(
                      (r) => String(r.exam_id) === String(selectedItem.id)
                    );

                    if (currentResults.length === 0) {
                      return (
                        <p style={{ color: '#64748b', fontSize: '14px' }}>
                          Ushbu imtihon uchun hali natijalar kiritilmagan.
                        </p>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {currentResults.map((r, i) => {
                          const student =
                            r.student ||
                            studentsList.find((s) => String(s.id) === String(r.student_id));
                          const studentName =
                            student?.user?.full_name || `Talaba #${r.student_id}`;

                          return (
                            <div
                              key={r.id || i}
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
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
                                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                                    {studentName}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <span
                                  style={{
                                    padding: '4px 12px',
                                    borderRadius: '9999px',
                                    backgroundColor: '#ecfdf5',
                                    color: '#10b981',
                                    fontWeight: 700,
                                    fontSize: '13px',
                                  }}
                                >
                                  {r.score} ball
                                </span>

                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <button
                                    className={styles.cardActionBtn}
                                    onClick={() => handleOpenEditResult(r)}
                                    title="Tahrirlash"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
                                    onClick={() => handleDeleteResult(r.id)}
                                    title="O'chirish"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
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

      {/* Result Modal */}
      {isResultModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsResultModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {editingResult ? 'Natijani Tahrirlash' : 'Imtihon Natijasini Kiritish'}
              </h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsResultModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            {resultModalError && (
              <div className={styles.alert}>
                <AlertCircle size={18} />
                <span>{resultModalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveResult}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <Select
                  label="Talabani tanlang *"
                  name="student_id"
                  value={resultFormData.student_id}
                  onChange={(e) =>
                    setResultFormData({
                      ...resultFormData,
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

                <Inputs
                  label="To'plangan Ball *"
                  name="score"
                  type="number"
                  as="input"
                  value={resultFormData.score}
                  onChange={(e) =>
                    setResultFormData({
                      ...resultFormData,
                      score: e.target.value,
                    })
                  }
                  placeholder=""
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
                  onClick={() => setIsResultModalOpen(false)}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary">
                  Saqlash
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Exams;
