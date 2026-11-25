import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPayments,
  createPayment,
  deletePayment,
} from '../../store/slices/paymentSlice';
import { fetchBranches } from '../../store/slices/branchSlice';
import studentApi from '../../services/studentApi';
import teacherApi from '../../services/teacherApi';
import paymentMethodApi from '../../services/paymentMethodApi';
import courseApi from '../../services/courseApi';
import { Breadcrumbs } from '../../layout';
import { Button, Table, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './payments.module.css';
import {
  Wallet,
  Plus,
  Minus,
  ArrowRightLeft,
  Calendar,
  Trash2,
  X,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Building2,
  Search,
  BarChart3,
  CreditCard,
  Banknote,
  Receipt,
  Users,
  AlertCircle,
  Filter,
  Layers,
  ArrowUpRight,
  Sparkles,
  Printer,
  Check,
  BookOpen,
  GraduationCap,
  ArrowLeft,
} from 'lucide-react';

const Payments = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();

  const authState = useSelector((state) => state.auth || {});
  const user = authState.user;
  const roleName = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isSuperAdmin = roleName === 'SUPER_ADMIN' || roleName === 'SUPERADMIN' || user?.is_superadmin;
  const isManager = roleName === 'MANAGER';

  const { items: payments = [], loading } = useSelector((state) => state.payment || {});
  const { items: branches = [] } = useSelector((state) => state.branch || {});

  const scopedBranches = useMemo(() => {
    if (isSuperAdmin) return branches;
    const userBranchId = user?.branch_id || user?.branch?.id;
    const userCenterName = user?.branch?.name || user?.full_name || "O'quv Maskani";

    let filtered = branches.filter(
      (b) =>
        (userBranchId && String(b.id) === String(userBranchId)) ||
        (b.name && userCenterName && b.name.toLowerCase().trim() === userCenterName.toLowerCase().trim())
    );
    if (filtered.length === 0 && branches.length > 0) {
      filtered = branches.filter((b) => b.id === userBranchId);
    }
    if (filtered.length === 0) {
      filtered = [{ id: userBranchId || 1, name: userCenterName }];
    }
    return filtered;
  }, [branches, isSuperAdmin, user]);

  // Page Tabs: 'CENTERS' (O'quv markazlari hisoboti) | 'KASSA' (Kassa & Tranzaksiyalar) | 'ANALYTICS' (Moliya Analitikasi)
  const [activeTab, setActiveTab] = useState('CENTERS');

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('ALL'); // 'ALL' | 'INCOME' | 'EXPENSE'
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [datePeriod, setDatePeriod] = useState('ALL'); // 'ALL' | 'TODAY' | 'MONTH' | 'YEAR'

  // Dropdown data
  const [studentsList, setStudentsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  const [methodsList, setMethodsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [showAllStudents, setShowAllStudents] = useState(false);

  // Last Completed Payment & Receipt Preview
  const [lastCompletedPayment, setLastCompletedPayment] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // View Mode: 'LIST' (Dashboard) | 'CREATE_KIRIM' (1-Page Kirim) | 'CREATE_CHIQIM' (1-Page Chiqim) | 'TRANSFER' (1-Page O'tkazma)
  const [viewMode, setViewMode] = useState('LIST');

  // Modals (backward compatibility)
  const [isKirimModalOpen, setIsKirimModalOpen] = useState(false);
  const [isChiqimModalOpen, setIsChiqimModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    branch_id: '',
    student_id: '',
    course_id: '',
    course_name: '',
    payment_method_id: '',
    amount: '',
    transaction_id: "O'quvchi to'lovi",
    note: '',
    type: 'income',
    from_branch_id: '',
    to_branch_id: '',
  });
  const [formError, setFormError] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Initial Fetch
  useEffect(() => {
    dispatch(fetchPayments({ limit: 500 }));
    dispatch(fetchBranches());

    studentApi.getAll({ limit: 200 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStudentsList(list);
    }).catch(() => {});

    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {});

    teacherApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setTeachersList(list);
    }).catch(() => {});

    paymentMethodApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setMethodsList(list);
    }).catch(() => {});
  }, [dispatch]);

  // Course Helpers
  const getStudentCourseName = (student) => {
    if (!student) return '';
    return (
      student.course?.name ||
      student.group?.course?.name ||
      student.group_students?.[0]?.group?.course?.name ||
      student.group?.name ||
      coursesList.find((c) => String(c.id) === String(student.course_id || student.group?.course_id))?.name ||
      ''
    );
  };

  const getPaymentCourseName = (p) => {
    if (isPaymentExpense(p)) return null;
    if (p.student?.course?.name) return p.student.course.name;
    if (p.student?.group?.course?.name) return p.student.group.course.name;

    const st = studentsList.find((s) => String(s.id) === String(p.student_id || p.student?.id));
    if (st) {
      const cName = getStudentCourseName(st);
      if (cName) return cName;
    }

    const text = `${p.transaction_id || ''} ${p.note || ''}`;
    for (const c of coursesList) {
      if (c.name && text.toLowerCase().includes(c.name.toLowerCase())) {
        return c.name;
      }
    }

    return p.course_name || 'Umumiy kurs';
  };

  // Helper to check if a student belongs to a specific course (by ID or group course ID)
  const isStudentInCourse = (student, courseId, courseObj = null) => {
    if (!student || !courseId) return false;
    const targetId = String(courseId);

    // 1. Direct course ID on student
    const sCourseId = student.course_id ? String(student.course_id) : (student.course?.id ? String(student.course.id) : null);
    if (sCourseId && sCourseId === targetId) return true;

    // 2. Direct course ID on student's main group
    const sGroupCourseId = student.group?.course_id ? String(student.group.course_id) : null;
    if (sGroupCourseId && sGroupCourseId === targetId) return true;

    // 3. Check group_students relation if student has groups
    if (Array.isArray(student.group_students) && student.group_students.length > 0) {
      const matchInGS = student.group_students.some(
        (gs) =>
          (gs.group?.course_id && String(gs.group.course_id) === targetId) ||
          (gs.course_id && String(gs.course_id) === targetId) ||
          (gs.course?.id && String(gs.course.id) === targetId)
      );
      if (matchInGS) return true;
    }

    // If the student already has an explicit course or group course ID that does NOT match targetId,
    // they definitely do NOT belong to this course (e.g. 10:00 vs 14:00 course).
    if (sCourseId && sCourseId !== targetId) return false;
    if (sGroupCourseId && sGroupCourseId !== targetId) return false;

    // 4. Safe fallback ONLY if the student has no course_id or group.course_id at all:
    // Match by course name AND lesson time / schedule to prevent cross-schedule mixing
    const c = courseObj || coursesList.find((item) => String(item.id) === targetId);
    if (c?.name && !sCourseId && !sGroupCourseId) {
      const targetName = c.name.toLowerCase().trim();
      const sCourseName = (getStudentCourseName(student) || '').toLowerCase().trim();
      if (sCourseName === targetName) {
        // If course has specific lesson_time or start_time, ensure it matches
        const cTime = (c.lesson_time || c.start_time || '').replace(/[^0-9]/g, '');
        const sTime = (student.group?.lesson_time || student.group?.name || '').replace(/[^0-9]/g, '');
        if (!cTime || !sTime || sTime.includes(cTime) || cTime.includes(sTime)) {
          return true;
        }
      }
    }

    return false;
  };

  // Helper to format course title with time if present
  const getCourseDisplayTitle = (courseId, defaultName = '') => {
    const c = coursesList.find((item) => String(item.id) === String(courseId));
    if (!c) return defaultName;
    const timeStr = c.lesson_time || c.start_time;
    return `${c.name}${timeStr ? ` (${timeStr})` : ''}`;
  };

  // Filter students based on currently selected course
  const courseStudents = useMemo(() => {
    if (!formData.course_id || showAllStudents) {
      return studentsList;
    }
    const selectedCourse = coursesList.find((c) => String(c.id) === String(formData.course_id));
    return studentsList.filter((s) => isStudentInCourse(s, formData.course_id, selectedCourse));
  }, [studentsList, coursesList, formData.course_id, showAllStudents]);

  const handleStudentChange = (studentId) => {
    if (!studentId) {
      setFormData((prev) => ({
        ...prev,
        student_id: '',
      }));
      return;
    }

    const student = studentsList.find((s) => String(s.id) === String(studentId));
    const cName = getStudentCourseName(student);
    const targetStudentCourseId = student?.course_id || student?.course?.id || student?.group?.course_id;
    let cObj = coursesList.find((c) => String(c.id) === String(targetStudentCourseId));
    if (!cObj && cName) {
      cObj = coursesList.find((c) => c.name?.toLowerCase().trim() === cName.toLowerCase().trim());
    }
    const cId = cObj?.id || targetStudentCourseId || '';
    const actualCourseName = cObj?.name || cName;

    setFormData((prev) => ({
      ...prev,
      student_id: studentId,
      course_id: prev.course_id || cId,
      course_name: prev.course_name || actualCourseName,
      amount: prev.amount || (cObj?.price ? String(cObj.price) : ''),
      transaction_id: prev.transaction_id || (actualCourseName ? `${actualCourseName} to'lovi` : "O'quvchi to'lovi"),
      note: prev.note || (actualCourseName ? `${actualCourseName} kursi uchun o'qish to'lovi` : "Kurs to'lovi"),
    }));
  };

  const handleCourseChange = (courseId) => {
    const course = coursesList.find((c) => String(c.id) === String(courseId));
    const cName = course?.name || '';
    const timeInfo = course?.lesson_time || course?.start_time ? ` (${course.lesson_time || course.start_time})` : '';

    // Check if the currently chosen student is actually enrolled in this selected course
    const currentStudent = studentsList.find((s) => String(s.id) === String(formData.student_id));
    const studentStillValid = currentStudent && courseId && isStudentInCourse(currentStudent, courseId, course);

    // If current student does not belong to the newly selected course, reset student_id
    const nextStudentId = studentStillValid ? formData.student_id : '';

    setShowAllStudents(false);

    setFormData((prev) => ({
      ...prev,
      course_id: courseId,
      course_name: cName,
      student_id: nextStudentId,
      amount: course?.price ? String(course.price) : prev.amount,
      transaction_id: cName ? `${cName} to'lovi` : prev.transaction_id,
      note: cName ? `${cName}${timeInfo} kursi uchun o'qish to'lovi` : prev.note,
    }));
  };

  // Format money helper
  const formatMoney = (val) => {
    if (!val && val !== 0) return '0 UZS';
    return Number(val).toLocaleString('ru-RU').replace(/,/g, ' ') + ' UZS';
  };

  // Format Date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} | ${hours}:${mins}`;
    } catch {
      return String(dateStr);
    }
  };

  // Helper to determine if a payment is Income or Expense
  const isPaymentExpense = (p) => {
    if (p.type === 'expense') return true;
    const desc = `${p.transaction_id || ''} ${p.note || ''}`.toLowerCase();
    return (
      desc.includes('xarajat') ||
      desc.includes('ijara') ||
      desc.includes('maosh') ||
      desc.includes('oylik') ||
      desc.includes('suv') ||
      desc.includes('marker') ||
      desc.includes('kommunal') ||
      desc.includes('chiqim')
    );
  };

  // Helper to determine the branch ID of a payment accurately
  const getPaymentBranchId = (p) => {
    if (!p) return null;
    if (p.branch_id) return String(p.branch_id);
    if (p.student?.branch_id) return String(p.student.branch_id);
    if (p.student?.user?.branch_id) return String(p.student.user.branch_id);

    // Cross-reference with studentsList loaded in state
    const stId = p.student_id || p.student?.id;
    if (stId) {
      const st = studentsList.find((s) => String(s.id) === String(stId));
      if (st?.branch_id) return String(st.branch_id);
      if (st?.user?.branch_id) return String(st.user.branch_id);
    }

    // If single branch in scope, all recorded payments belong to this branch
    if (scopedBranches.length === 1) {
      return String(scopedBranches[0].id);
    }
    return null;
  };

  // 1. OVERALL FINANCIAL TOTALS (100% REAL)
  const overallTotals = useMemo(() => {
    let kirim = 0;
    let chiqim = 0;
    let bugungiKirim = 0;

    const todayStr = new Date().toISOString().split('T')[0];

    // For non-superadmin users, strictly scope totals to their permitted branch(es)
    const visiblePayments = isSuperAdmin
      ? (payments || [])
      : (payments || []).filter((p) => {
          const bId = getPaymentBranchId(p);
          if (!bId) return true;
          return scopedBranches.some((b) => String(b.id) === String(bId));
        });

    visiblePayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      const pDate = (p.payment_date || p.created_at || '').split('T')[0];

      if (isPaymentExpense(p)) {
        chiqim += amt;
      } else {
        kirim += amt;
        if (pDate === todayStr) {
          bugungiKirim += amt;
        }
      }
    });

    const qoldiq = kirim - chiqim;
    return { kirim, chiqim, qoldiq, bugungiKirim, totalCount: visiblePayments.length };
  }, [payments, isSuperAdmin, scopedBranches, studentsList]);

  // 2. PER-LEARNING-CENTER (BRANCH) BREAKDOWN
  const centerReports = useMemo(() => {
    return scopedBranches.map((branch) => {
      // Filter payments belonging accurately to this branch
      const branchPayments = (payments || []).filter((p) => {
        const bId = getPaymentBranchId(p);
        return String(bId) === String(branch.id);
      });

      let kirim = 0;
      let chiqim = 0;
      let naqd = 0;
      let plastik = 0;
      let terminal = 0;
      let bank = 0;

      branchPayments.forEach((p) => {
        const amt = Number(p.amount) || 0;
        const isExp = isPaymentExpense(p);

        if (isExp) {
          chiqim += amt;
        } else {
          kirim += amt;
        }

        // Method classification
        const method = (
          methodsList.find((m) => m.id === p.payment_method_id)?.name || ''
        ).toLowerCase();
        const code = (
          methodsList.find((m) => m.id === p.payment_method_id)?.code || ''
        ).toUpperCase();

        if (code === 'CASH' || method.includes('naqd')) {
          naqd += amt;
        } else if (
          code === 'CARD' ||
          code === 'ONLINE' ||
          method.includes('plastik') ||
          method.includes('payme') ||
          method.includes('click')
        ) {
          plastik += amt;
        } else if (code === 'TERMINAL' || method.includes('terminal')) {
          terminal += amt;
        } else {
          bank += amt;
        }
      });

      const qoldiq = kirim - chiqim;
      const branchStudents = studentsList.filter(
        (s) => String(s.branch_id) === String(branch.id) || String(s.user?.branch_id) === String(branch.id)
      ).length;

      const avgPayment = branchPayments.length > 0 ? Math.round(kirim / Math.max(1, branchPayments.length)) : 0;
      const isInactive = branch.status === 'inactive' || branch.status === 'blocked';

      return {
        id: branch.id,
        name: branch.name || `Filial #${branch.id}`,
        address: branch.address || 'Asosiy manzil',
        phone: branch.phone || '—',
        status: isInactive ? 'stopped' : 'active',
        statusLabel: isInactive ? "To'xtatilgan" : 'Faol',
        kirim,
        chiqim,
        qoldiq,
        paymentsCount: branchPayments.length,
        studentsCount: branchStudents,
        avgPayment,
        methods: { naqd, plastik, terminal, bank },
        lastPaymentDate: branchPayments[0]?.payment_date || branchPayments[0]?.created_at || null,
      };
    });
  }, [scopedBranches, payments, studentsList, methodsList]);

  // 3. PAYMENT METHODS SUMMARY BALANCES (Real aggregation)
  const methodBalances = useMemo(() => {
    let naqd = 0;
    let plastik = 0;
    let terminal = 0;
    let bank = 0;

    const visiblePayments = isSuperAdmin
      ? (payments || [])
      : (payments || []).filter((p) => {
          const bId = getPaymentBranchId(p);
          if (!bId) return true;
          return scopedBranches.some((b) => String(b.id) === String(bId));
        });

    visiblePayments.forEach((p) => {
      const amt = Number(p.amount) || 0;
      const method = (
        methodsList.find((m) => m.id === p.payment_method_id)?.name || ''
      ).toLowerCase();
      const code = (
        methodsList.find((m) => m.id === p.payment_method_id)?.code || ''
      ).toUpperCase();

      if (code === 'CASH' || method.includes('naqd')) {
        naqd += amt;
      } else if (
        code === 'CARD' ||
        code === 'ONLINE' ||
        method.includes('plastik') ||
        method.includes('payme') ||
        method.includes('click')
      ) {
        plastik += amt;
      } else if (code === 'TERMINAL' || method.includes('terminal')) {
        terminal += amt;
      } else {
        bank += amt;
      }
    });

    return { naqd, plastik, terminal, bank };
  }, [payments, methodsList, isSuperAdmin, scopedBranches, studentsList]);

  // 4. FILTERED TRANSACTIONS LIST
  const filteredPayments = useMemo(() => {
    return (payments || []).filter((p) => {
      // Non-superadmin scope restriction
      if (!isSuperAdmin) {
        const pBranchId = getPaymentBranchId(p);
        if (pBranchId && !scopedBranches.some((b) => String(b.id) === String(pBranchId))) {
          return false;
        }
      }

      // Branch filter
      if (selectedBranchId !== 'ALL') {
        const pBranchId = getPaymentBranchId(p);
        if (String(pBranchId) !== String(selectedBranchId)) {
          return false;
        }
      }

      // Type filter
      if (transactionTypeFilter === 'INCOME' && isPaymentExpense(p)) return false;
      if (transactionTypeFilter === 'EXPENSE' && !isPaymentExpense(p)) return false;

      // Method filter
      if (methodFilter !== 'ALL' && String(p.payment_method_id) !== String(methodFilter)) {
        return false;
      }

      // Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const studentName = (
          p.student?.user?.full_name ||
          p.student?.parent_name ||
          ''
        ).toLowerCase();
        const trName = (p.transaction_id || '').toLowerCase();
        const note = (p.note || '').toLowerCase();
        if (!studentName.includes(q) && !trName.includes(q) && !note.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [payments, selectedBranchId, transactionTypeFilter, methodFilter, searchQuery]);

  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // 5. OPEN FORMS (1-PAGE VIEWS)
  const handleOpenKirim = (branchId = null) => {
    setFormData({
      branch_id: branchId || (selectedBranchId !== 'ALL' ? selectedBranchId : (scopedBranches[0]?.id || '')),
      student_id: '',
      course_id: '',
      course_name: '',
      payment_method_id: methodsList[0]?.id || '',
      amount: '',
      transaction_id: "O'quvchi to'lovi",
      note: "Kurs to'lovi",
      type: 'income',
      from_branch_id: '',
      to_branch_id: '',
    });
    setShowAllStudents(false);
    setFormError('');
    setViewMode('CREATE_KIRIM');
    setIsKirimModalOpen(false);
  };

  const handleOpenChiqim = (branchId = null) => {
    setFormData({
      branch_id: branchId || (selectedBranchId !== 'ALL' ? selectedBranchId : (scopedBranches[0]?.id || '')),
      student_id: '',
      course_id: '',
      course_name: '',
      payment_method_id: methodsList[0]?.id || '',
      amount: '',
      transaction_id: 'Xarajat',
      note: "Ofis / kommunal yoki xo'jalik xarajati",
      type: 'expense',
      from_branch_id: '',
      to_branch_id: '',
    });
    setFormError('');
    setViewMode('CREATE_CHIQIM');
    setIsChiqimModalOpen(false);
  };

  const handleOpenTransfer = (branchId = null) => {
    setFormData({
      branch_id: branchId || (scopedBranches[0]?.id || ''),
      student_id: '',
      course_id: '',
      course_name: '',
      payment_method_id: methodsList[0]?.id || '',
      amount: '',
      transaction_id: "Markazlararo o'tkazma",
      note: "Kassa ko'chirish",
      type: 'transfer',
      from_branch_id: branchId || (scopedBranches[0]?.id || ''),
      to_branch_id: scopedBranches.find((b) => String(b.id) !== String(branchId || scopedBranches[0]?.id))?.id || '',
    });
    setFormError('');
    setViewMode('TRANSFER');
    setIsTransferModalOpen(false);
  };

  // Submit Payment / Expense
  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.amount || Number(formData.amount) <= 0) {
      setFormError("Iltimos, to'g'ri summani kiriting");
      return;
    }

    try {
      const payload = {
        amount: Number(formData.amount),
        transaction_id: formData.transaction_id || (formData.type === 'income' ? "O'quvchi to'lovi" : 'Xarajat'),
        note: formData.note || '',
        payment_date: new Date().toISOString(),
        status: 'completed',
        type: formData.type,
      };

      if (formData.branch_id) {
        payload.branch_id = Number(formData.branch_id);
      }
      if (formData.student_id) {
        payload.student_id = Number(formData.student_id);
      }
      if (formData.payment_method_id) {
        payload.payment_method_id = Number(formData.payment_method_id);
      }

      const res = await dispatch(createPayment(payload));
      if (!res.error) {
        const studentObj = studentsList.find((s) => String(s.id) === String(formData.student_id));
        const studentFullName =
          studentObj?.user?.full_name ||
          studentObj?.parent_name ||
          (formData.student_id ? `Talaba #${formData.student_id}` : "Noma'lum talaba");
        const courseName = formData.course_name || getStudentCourseName(studentObj) || 'Umumiy kurs';
        const methodName =
          methodsList.find((m) => String(m.id) === String(formData.payment_method_id))?.name ||
          'Kassa to\'lovi';
        const branchName =
          scopedBranches.find((b) => String(b.id) === String(formData.branch_id))?.name ||
          "Yuksalish Ta'limi";
        const now = new Date();

        const receiptData = {
          id: res.payload?.id || `TRX-${Date.now().toString().slice(-6)}`,
          payer: studentFullName,
          course: courseName,
          date: formatDate(now),
          amount: Number(formData.amount),
          method: methodName,
          center: branchName,
          note: formData.note || `${courseName} to'lovi`,
        };

        setLastCompletedPayment(receiptData);
        setSelectedReceipt(receiptData);

        setIsKirimModalOpen(false);
        setIsChiqimModalOpen(false);
        setIsTransferModalOpen(false);
        setViewMode('LIST');
        dispatch(fetchPayments({ limit: 500 }));
      } else {
        setFormError(res.payload || res.error.message || 'Xatolik yuz berdi');
      }
    } catch (err) {
      setFormError(err.message || 'Xatolik yuz berdi');
    }
  };

  // Delete payment
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "To'lovni o'chirish",
      message: "Haqiqatdan ham ushbu to'lov yozuvini o'chirmoqchimisiz? Tranzaksiya markaz hisob-kitoblaridan olib tashlanadi.",
      confirmText: "Ha, o'chirilsin",
      cancelText: "Bekor qilish",
      type: "danger",
    });

    if (isConfirmed) {
      await dispatch(deletePayment(id));
      dispatch(fetchPayments({ limit: 500 }));
    }
  };

  // Switch to Transactions filtered by a specific center
  const handleFilterByCenter = (centerId) => {
    setSelectedBranchId(String(centerId));
    setActiveTab('KASSA');
    setCurrentPage(1);
  };

  // Table Columns
  const tableColumns = [
    {
      title: '№',
      key: 'id',
      width: '50px',
      render: (_, __, index) => (currentPage - 1) * pageSize + index + 1,
    },
    {
      title: 'SANA',
      key: 'payment_date',
      render: (val, row) => (
        <span className={styles.tableDate}>{formatDate(val || row.created_at)}</span>
      ),
    },
    {
      title: "O'QUV MARKAZI",
      key: 'branch',
      render: (_, row) => {
        const branchName =
          row.branch?.name ||
          branches.find((b) => b.id === (row.branch_id || row.student?.branch_id))?.name ||
          'Asosiy markaz';
        return (
          <span className={styles.tableBranchBadge}>
            <Building2 size={12} />
            <span>{branchName}</span>
          </span>
        );
      },
    },
    {
      title: 'KIMDAN / TALABA',
      key: 'student',
      render: (_, row) => {
        const isExp = isPaymentExpense(row);
        const name =
          row.student?.user?.full_name ||
          row.student?.parent_name ||
          (isExp ? "Xarajat / Ta'minotchi" : `Talaba #${row.student_id || '—'}`);
        const courseName = getPaymentCourseName(row);
        return (
          <div className={styles.tableUserCell}>
            <span className={styles.tableUserName}>{name}</span>
            {courseName && (
              <span className={styles.tableCourseBadge}>
                <BookOpen size={10} />
                <span>{courseName}</span>
              </span>
            )}
          </div>
        );
      },
    },
    {
      title: "TO'LOV USULI",
      key: 'payment_method',
      render: (_, row) => {
        const method =
          row.payment_method?.name ||
          methodsList.find((m) => m.id === row.payment_method_id)?.name ||
          'Naqd pul';
        return <span className={styles.tableMethodTag}>{method}</span>;
      },
    },
    {
      title: 'IZOH / TRANZAKSIYA',
      key: 'note',
      render: (val, row) => (
        <div className={styles.tableNoteWrapper}>
          <span className={styles.tableTrName}>{row.transaction_id || 'To\'lov'}</span>
          {val && <span className={styles.tableNoteText}>{val}</span>}
        </div>
      ),
    },
    {
      title: 'MIQDORI',
      key: 'amount',
      render: (val, row) => {
        const isExp = isPaymentExpense(row);
        return (
          <span className={isExp ? styles.amountExpense : styles.amountIncome}>
            {formatMoney(val)}
          </span>
        );
      },
    },
    {
      title: 'CHEK',
      key: 'receipt',
      width: '65px',
      render: (_, row) => {
        if (isPaymentExpense(row)) return null;
        return (
          <button
            type="button"
            className={styles.btnSmallTable}
            style={{ padding: '3px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            title="Chekni ko'rish"
            onClick={(e) => {
              e.stopPropagation();
              const studentName =
                row.student?.user?.full_name ||
                row.student?.parent_name ||
                `Talaba #${row.student_id || '—'}`;
              const courseName = getPaymentCourseName(row);
              const methodName =
                row.payment_method?.name ||
                methodsList.find((m) => m.id === row.payment_method_id)?.name ||
                "To'lov usuli";
              const branchName =
                row.branch?.name ||
                branches.find((b) => b.id === (row.branch_id || row.student?.branch_id))?.name ||
                "Yuksalish Ta'limi";
              setSelectedReceipt({
                id: row.id,
                payer: studentName,
                course: courseName || "Kurs to'lovi",
                date: formatDate(row.payment_date || row.created_at),
                amount: row.amount,
                method: methodName,
                center: branchName,
                note: row.note || row.transaction_id || "O'qish to'lovi",
              });
            }}
          >
            <Receipt size={12} />
            <span>Chek</span>
          </button>
        );
      },
    },
    {
      title: 'HOLATI',
      key: 'status',
      width: '110px',
      render: () => (
        <span className={styles.statusCompleted}>
          <CheckCircle2 size={12} />
          <span>Bajarildi</span>
        </span>
      ),
    },
    ...(!isManager
      ? [
          {
            title: '',
            key: 'actions',
            width: '50px',
            align: 'right',
            render: (_, row) => (
              <button
                className={styles.deleteActionBtn}
                onClick={(e) => handleDelete(row.id, e)}
                title="O'chirish"
              >
                <Trash2 size={14} />
              </button>
            ),
          },
        ]
      : []),
  ];

  // ==========================================
  // STUDENT SPECIFIC PAYMENT PORTAL
  // ==========================================
  const isStudent = roleName === 'STUDENT' || roleName === 'TALABA' || user?.role === 'STUDENT';
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilter, setStudentFilter] = useState('ALL');
  const [isStudentPayModalOpen, setIsStudentPayModalOpen] = useState(false);
  const [studentPayMethod, setStudentPayMethod] = useState('payme');
  const [studentPayAmount, setStudentPayAmount] = useState('650000');
  const [studentPayCourse, setStudentPayCourse] = useState('Frontend Web Dasturlash');
  const [studentToast, setStudentToast] = useState('');

  const [studentPaymentsList, setStudentPaymentsList] = useState([
    {
      id: 'CHK-2026-1002',
      date: '01.10.2026 | 14:30',
      course: 'Frontend Web Dasturlash',
      amount: 650000,
      method: 'Payme',
      methodType: 'ONLINE',
      status: 'Tasdiqlangan',
      payer: user?.full_name || 'Talaba',
      center: user?.branch?.name || "Yuksalish Ta'limi",
      note: "2026-yil Oktyabr oyi kursi to'lovi",
    },
    {
      id: 'CHK-2026-0901',
      date: '01.09.2026 | 10:15',
      course: 'Frontend Web Dasturlash',
      amount: 650000,
      method: 'Click Up',
      methodType: 'ONLINE',
      status: 'Tasdiqlangan',
      payer: user?.full_name || 'Talaba',
      center: user?.branch?.name || "Yuksalish Ta'limi",
      note: "2026-yil Sentabr oyi kursi to'lovi",
    },
    {
      id: 'CHK-2026-0801',
      date: '01.08.2026 | 16:45',
      course: 'Frontend Web Dasturlash',
      amount: 650000,
      method: 'Naqd pul (Kassa)',
      methodType: 'CASH',
      status: 'Tasdiqlangan',
      payer: user?.full_name || 'Talaba',
      center: user?.branch?.name || "Yuksalish Ta'limi",
      note: "2026-yil Avgust oyi kursi to'lovi",
    },
    {
      id: 'CHK-2026-0701',
      date: '01.07.2026 | 11:20',
      course: 'Ingliz tili (IELTS / B1)',
      amount: 550000,
      method: 'Plastik karta',
      methodType: 'ONLINE',
      status: 'Tasdiqlangan',
      payer: user?.full_name || 'Talaba',
      center: user?.branch?.name || "Yuksalish Ta'limi",
      note: "2026-yil Iyul oyi kursi to'lovi",
    },
  ]);

  const showStudentToast = (msg) => {
    setStudentToast(msg);
    setTimeout(() => setStudentToast(''), 3500);
  };

  const handleStudentPaySubmit = (e) => {
    e.preventDefault();
    const amt = Number(studentPayAmount) || 650000;
    const methodName =
      studentPayMethod === 'payme'
        ? 'Payme'
        : studentPayMethod === 'click'
        ? 'Click Up'
        : studentPayMethod === 'uzum'
        ? 'Uzum Bank'
        : 'Naqd pul';

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');

    const newPayment = {
      id: `CHK-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      date: `${day}.${month}.${year} | ${hours}:${mins}`,
      course: studentPayCourse,
      amount: amt,
      method: methodName,
      methodType: studentPayMethod === 'cash' ? 'CASH' : 'ONLINE',
      status: 'Tasdiqlangan',
      payer: user?.full_name || 'Talaba',
      center: user?.branch?.name || "Yuksalish Ta'limi",
      note: `${studentPayCourse} kursi uchun to'lov`,
    };

    setStudentPaymentsList([newPayment, ...studentPaymentsList]);
    setIsStudentPayModalOpen(false);
    showStudentToast("To'lov muvaffaqiyatli amalga oshirildi va kvitansiya shakllantirildi!");
    setSelectedReceipt(newPayment);
  };

  if (isStudent) {
    const filteredStudentPayments = studentPaymentsList.filter((p) => {
      if (studentSearch) {
        const query = studentSearch.toLowerCase();
        const matchesId = p.id.toLowerCase().includes(query);
        const matchesCourse = p.course.toLowerCase().includes(query);
        const matchesMethod = p.method.toLowerCase().includes(query);
        if (!matchesId && !matchesCourse && !matchesMethod) return false;
      }
      if (studentFilter === 'ONLINE') return p.methodType === 'ONLINE';
      if (studentFilter === 'CASH') return p.methodType === 'CASH';
      return true;
    });

    return (
      <div className={styles.container}>
        <Breadcrumbs items={[{ label: "Mening To'lovlarim" }]} />

        {/* 1. STUDENT HERO CARD */}
        <div className={styles.studentHeroCard}>
          <div className={styles.studentHeroContent}>
            <div className={styles.studentHeroTag}>
              <Sparkles size={13} />
              <span>Talaba Shaxsiy To'lovlari</span>
            </div>
            <h1 className={styles.studentHeroTitle}>Kurs To'lovlari & Balans</h1>
            <p className={styles.studentHeroSubtitle}>
              O'quv markazidagi oylik to'lovlaringiz holati, to'lov kvitansiyalari va amalga oshirilgan barcha to'lovlar tarixi
            </p>
          </div>

          <div className={styles.studentHeroAction}>
            <button
              type="button"
              className={styles.studentPayBtn}
              onClick={() => setIsStudentPayModalOpen(true)}
            >
              <CreditCard size={17} />
              <span>Online To'lov Qilish</span>
            </button>
          </div>
        </div>

        {/* TOAST MESSAGE */}
        {studentToast && (
          <div style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '12px',
            padding: '12px 18px',
            color: '#065f46',
            fontWeight: '600',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
          }}>
            <CheckCircle2 size={18} color="#10b981" />
            <span>{studentToast}</span>
          </div>
        )}

        {/* 2. THREE STATS CARDS */}
        <div className={styles.studentStatsGrid}>
          {/* Card 1: Monthly Fee */}
          <div className={styles.studentStatCard}>
            <div className={`${styles.studentStatIcon} ${styles.blue}`}>
              <Receipt size={24} />
            </div>
            <div className={styles.studentStatInfo}>
              <span className={styles.studentStatLabel}>Kurs Oylik Narxi</span>
              <span className={styles.studentStatValue}>650 000 UZS</span>
              <span className={styles.studentStatDesc}>Frontend Web Dasturlash</span>
            </div>
          </div>

          {/* Card 2: Payment Status */}
          <div className={styles.studentStatCard}>
            <div className={`${styles.studentStatIcon} ${styles.green}`}>
              <CheckCircle2 size={24} />
            </div>
            <div className={styles.studentStatInfo}>
              <span className={styles.studentStatLabel}>To'lov Balansi & Holati</span>
              <span className={styles.studentStatValue} style={{ color: '#059669' }}>
                To'langan <Check size={18} />
              </span>
              <span className={styles.studentStatDesc}>Qarzdorlik mavjud emas (0 UZS)</span>
            </div>
          </div>

          {/* Card 3: Next Payment Date */}
          <div className={styles.studentStatCard}>
            <div className={`${styles.studentStatIcon} ${styles.purple}`}>
              <Calendar size={24} />
            </div>
            <div className={styles.studentStatInfo}>
              <span className={styles.studentStatLabel}>Keyingi To'lov Muddati</span>
              <span className={styles.studentStatValue}>01.11.2026</span>
              <span className={styles.studentStatDesc}>Noyabr oyi uchun to'lov sanasi</span>
            </div>
          </div>
        </div>

        {/* 3. PAYMENT GATEWAYS BANNER */}
        <div className={styles.studentPaymentGatewaysBox}>
          <div className={styles.gatewayTitleGroup}>
            <div className={styles.gatewayIcon}>
              <Wallet size={20} />
            </div>
            <div>
              <div className={styles.gatewayHeading}>Tezkor To'lov Tizimlari</div>
              <div className={styles.gatewaySub}>Istalgan to'lov vositasi orqali to'lovni 1 daqiqada amalga oshiring</div>
            </div>
          </div>

          <div className={styles.gatewaysPills}>
            <span className={styles.gatewayPill}>💳 Payme</span>
            <span className={styles.gatewayPill}>💳 Click Up</span>
            <span className={styles.gatewayPill}>🏦 Uzum Bank</span>
            <span className={styles.gatewayPill}>💵 Markaz Kassasi</span>
          </div>
        </div>

        {/* 4. PAYMENTS HISTORY TABLE */}
        <div className={styles.studentTableCard}>
          <div className={styles.studentTableControls}>
            <div className={styles.studentSearchInputWrap}>
              <Search size={16} color="#94a3b8" />
              <input
                type="text"
                placeholder="Chek ID, kurs yoki to'lov usuli bo'yicha qidirish..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
            </div>

            <div className={styles.studentFilterTabs}>
              <button
                type="button"
                className={`${styles.studentFilterBtn} ${studentFilter === 'ALL' ? styles.active : ''}`}
                onClick={() => setStudentFilter('ALL')}
              >
                Barchasi ({studentPaymentsList.length})
              </button>
              <button
                type="button"
                className={`${styles.studentFilterBtn} ${studentFilter === 'ONLINE' ? styles.active : ''}`}
                onClick={() => setStudentFilter('ONLINE')}
              >
                Online to'lovlar
              </button>
              <button
                type="button"
                className={`${styles.studentFilterBtn} ${studentFilter === 'CASH' ? styles.active : ''}`}
                onClick={() => setStudentFilter('CASH')}
              >
                Naqd (Kassa)
              </button>
            </div>
          </div>

          <div className={styles.tableResponsive}>
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>CHEK / KVITANSIYA ID</th>
                  <th>KURS NOMI</th>
                  <th>SANA VA VAQT</th>
                  <th>TO'LOV USULI</th>
                  <th>SUMMA</th>
                  <th>HOLATI</th>
                  <th style={{ textAlign: 'right' }}>KVITANSIYA</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudentPayments.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                      Hech qanday to'lov ma'lumoti topilmadi
                    </td>
                  </tr>
                ) : (
                  filteredStudentPayments.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong style={{ color: '#0f172a', letterSpacing: '0.02em' }}>
                          #{item.id}
                        </strong>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: '#334155' }}>
                          {item.course}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                          {item.date}
                        </span>
                      </td>
                      <td>
                        <span className={styles.tableMethodTag}>
                          {item.method}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, color: '#059669', fontSize: '14px' }}>
                          {formatMoney(item.amount)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.statusCompleted}>
                          <CheckCircle2 size={12} />
                          <span>{item.status}</span>
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className={styles.receiptBtn}
                          onClick={() => setSelectedReceipt(item)}
                          title="Chekni ko'rish"
                        >
                          <Receipt size={13} />
                          <span>Chekni ko'rish</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. RECEIPT PREVIEW MODAL */}
        {selectedReceipt && (
          <div className={styles.receiptModalOverlay} onClick={() => setSelectedReceipt(null)}>
            <div className={styles.receiptModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.receiptPaper} id="printableReceipt">
                <div className={styles.receiptHeader}>
                  <div className={styles.receiptCenterName}>{selectedReceipt.center}</div>
                  <div className={styles.receiptSub}>Rasmiy To'lov Kvitansiyasi</div>
                  <span className={styles.receiptCheckId}>ID: #{selectedReceipt.id}</span>
                </div>

                <div className={styles.receiptAmountBox}>
                  <div className={styles.receiptAmountLabel}>To'langan Summa</div>
                  <div className={styles.receiptAmountVal}>{formatMoney(selectedReceipt.amount)}</div>
                </div>

                <div className={styles.receiptDetailsList}>
                  <div className={styles.receiptRow}>
                    <span className={styles.receiptRowLabel}>To'lovchi (Talaba):</span>
                    <span className={styles.receiptRowVal}>{selectedReceipt.payer}</span>
                  </div>

                  <div className={styles.receiptRow}>
                    <span className={styles.receiptRowLabel}>Kurs:</span>
                    <span className={styles.receiptRowVal}>{selectedReceipt.course}</span>
                  </div>

                  <div className={styles.receiptRow}>
                    <span className={styles.receiptRowLabel}>To'lov Sanasi:</span>
                    <span className={styles.receiptRowVal}>{selectedReceipt.date}</span>
                  </div>

                  <div className={styles.receiptRow}>
                    <span className={styles.receiptRowLabel}>To'lov Turi:</span>
                    <span className={styles.receiptRowVal}>{selectedReceipt.method}</span>
                  </div>

                  <div className={styles.receiptRow}>
                    <span className={styles.receiptRowLabel}>Izoh:</span>
                    <span className={styles.receiptRowVal}>{selectedReceipt.note}</span>
                  </div>
                </div>

                <div className={styles.receiptStampBox}>
                  <span className={styles.receiptStamp}>
                    <CheckCircle2 size={13} /> TASDIQLANGAN
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    CRM ID: {selectedReceipt.id}
                  </span>
                </div>
              </div>

              <div className={styles.receiptModalFooter}>
                <button
                  type="button"
                  className={styles.modalCancelBtn}
                  onClick={() => setSelectedReceipt(null)}
                >
                  Yopish
                </button>
                <button
                  type="button"
                  className={styles.receiptPrintBtn}
                  onClick={() => window.print()}
                >
                  <Printer size={15} />
                  <span>Chop etish (Print)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 6. ONLINE PAYMENT SIMULATION MODAL */}
        {isStudentPayModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsStudentPayModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>
                  <CreditCard size={18} color="#2563eb" />
                  <span>Online To'lov Qilish</span>
                </div>
                <button
                  type="button"
                  className={styles.modalCloseBtn}
                  onClick={() => setIsStudentPayModalOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleStudentPaySubmit}>
                <div className={styles.modalBody}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Kursni tanlang</label>
                    <select
                      className={styles.modalSelect}
                      value={studentPayCourse}
                      onChange={(e) => setStudentPayCourse(e.target.value)}
                    >
                      <option value="Frontend Web Dasturlash">Frontend Web Dasturlash (650 000 UZS)</option>
                      <option value="Ingliz tili (IELTS / B1)">Ingliz tili (IELTS / B1) (550 000 UZS)</option>
                      <option value="Matematika & Mental arifmetika">Matematika & Mental arifmetika (450 000 UZS)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>To'lov Summasi (UZS)</label>
                    <input
                      type="number"
                      className={styles.modalInput}
                      value={studentPayAmount}
                      onChange={(e) => setStudentPayAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>To'lov Tizimini tanlang</label>
                    <div className={styles.methodSelectorGrid}>
                      <div
                        className={`${styles.methodSelectCard} ${studentPayMethod === 'payme' ? styles.selected : ''}`}
                        onClick={() => setStudentPayMethod('payme')}
                      >
                        <CreditCard size={18} color="#00cccc" />
                        <span>Payme</span>
                      </div>

                      <div
                        className={`${styles.methodSelectCard} ${studentPayMethod === 'click' ? styles.selected : ''}`}
                        onClick={() => setStudentPayMethod('click')}
                      >
                        <CreditCard size={18} color="#0088cc" />
                        <span>Click Up</span>
                      </div>

                      <div
                        className={`${styles.methodSelectCard} ${studentPayMethod === 'uzum' ? styles.selected : ''}`}
                        onClick={() => setStudentPayMethod('uzum')}
                      >
                        <Wallet size={18} color="#7000ff" />
                        <span>Uzum Bank</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.modalCancelBtn}
                    onClick={() => setIsStudentPayModalOpen(false)}
                  >
                    Bekor qilish
                  </button>
                  <button type="submit" className={styles.modalSubmitBtn}>
                    To'lovni Tasdiqlash
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          {
            label: 'Moliya & Kassa',
            onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined,
          },
          ...(viewMode === 'CREATE_KIRIM' ? [{ label: "Yangi Kirim (To'lov Qabul Qilish)" }] : []),
          ...(viewMode === 'CREATE_CHIQIM' ? [{ label: "Yangi Chiqim (Xarajat Yozish)" }] : []),
          ...(viewMode === 'TRANSFER' ? [{ label: "Kassalararo O'tkazma" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* ======================================================== */}
      {/* 1. TOP FINANCIAL KPI OVERVIEW CARDS                     */}
      {/* ======================================================== */}
      <div className={styles.kpiGrid}>
        {/* Jami Kirim */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiTitle}>Jami Kirim (Daromad)</span>
            <div className={`${styles.kpiIconBox} ${styles.iconGreen}`}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${styles.textGreen}`}>
            {formatMoney(overallTotals.kirim)}
          </div>
          <div className={styles.kpiSub}>
            Bugungi tushum: <strong>{formatMoney(overallTotals.bugungiKirim)}</strong>
          </div>
        </div>

        {/* Jami Chiqim */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiTitle}>Jami Chiqim (Xarajatlar)</span>
            <div className={`${styles.kpiIconBox} ${styles.iconRed}`}>
              <TrendingDown size={18} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${styles.textRed}`}>
            {formatMoney(overallTotals.chiqim)}
          </div>
          <div className={styles.kpiSub}>Xo'jalik, ijara va maosh xarajatlari</div>
        </div>

        {/* Sof Qoldiq */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiTitle}>Sof Qoldiq (Kassa)</span>
            <div className={`${styles.kpiIconBox} ${styles.iconBlue}`}>
              <Wallet size={18} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${overallTotals.qoldiq >= 0 ? styles.textBlue : styles.textRed}`}>
            {formatMoney(overallTotals.qoldiq)}
          </div>
          <div className={styles.kpiSub}>
            {scopedBranches.length > 1 ? "Barcha filiallar bo'yicha jami naqd & karta" : "Filial bo'yicha jami naqd & karta"}
          </div>
        </div>

        {/* Filiallar */}
        <div className={styles.kpiCard}>
          <div className={styles.kpiTop}>
            <span className={styles.kpiTitle}>Filiallar</span>
            <div className={`${styles.kpiIconBox} ${styles.iconPurple}`}>
              <Building2 size={18} />
            </div>
          </div>
          <div className={styles.kpiValue}>
            {isSuperAdmin ? branches.length : scopedBranches.length} ta filial
          </div>
          <div className={styles.kpiSub}>
            Jami tranzaksiyalar: <strong>{overallTotals.totalCount} ta</strong>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP TABS & ACTION BUTTONS BAR                        */}
      {/* ======================================================== */}
      <div className={styles.topActionBar}>
        <div className={styles.navTabs}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'CENTERS' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('CENTERS')}
          >
            <Building2 size={16} />
            <span>Filiallar Hisoboti</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'KASSA' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('KASSA')}
          >
            <Wallet size={16} />
            <span>Kassa & Tranzaksiyalar</span>
          </button>

          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === 'ANALYTICS' ? styles.activeTabBtn : ''}`}
            onClick={() => setActiveTab('ANALYTICS')}
          >
            <BarChart3 size={16} />
            <span>Moliya Analitikasi</span>
          </button>
        </div>

        {!isManager && (
          <div className={styles.quickActions}>
            <button
              type="button"
              className={styles.btnKirim}
              onClick={() => handleOpenKirim()}
              title="Yangi to'lov qabul qilish"
            >
              <Plus size={15} />
              <span>Kirim (To'lov)</span>
            </button>

            <button
              type="button"
              className={styles.btnChiqim}
              onClick={() => handleOpenChiqim()}
              title="Xarajat yozish"
            >
              <Minus size={15} />
              <span>Chiqim (Xarajat)</span>
            </button>

            <button
              type="button"
              className={styles.btnTransfer}
              onClick={() => handleOpenTransfer()}
              title="Kassalararo o'tkazma"
            >
              <ArrowRightLeft size={15} />
              <span>O'tkazma</span>
            </button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* OXIRGI AMALGA OSHIRILGAN TO'LOV BANNERI                 */}
      {/* ======================================================== */}
      {lastCompletedPayment && (
        <div className={styles.recentPaymentBanner}>
          <div className={styles.recentPaymentLeft}>
            <div className={styles.recentPaymentIcon}>
              <CheckCircle2 size={22} />
            </div>
            <div className={styles.recentPaymentInfo}>
              <div className={styles.recentPaymentTitle}>
                To'lov Muvaffaqiyatli Qabul Qilindi!
              </div>
              <div className={styles.recentPaymentMeta}>
                <span>👤 Talaba: <strong>{lastCompletedPayment.payer}</strong></span>
                <span>🎓 Kurs: <strong>{lastCompletedPayment.course}</strong></span>
                <span>📅 Sana: <strong>{lastCompletedPayment.date}</strong></span>
                <span>💳 To'lov Usuli: <strong>{lastCompletedPayment.method}</strong></span>
                <span>🏢 Markaz: <strong>{lastCompletedPayment.center}</strong></span>
              </div>
            </div>
          </div>
          <div className={styles.recentPaymentRight}>
            <div className={styles.recentPaymentAmount}>
              +{formatMoney(lastCompletedPayment.amount)}
            </div>
            <button
              type="button"
              className={styles.recentReceiptBtn}
              onClick={() => setSelectedReceipt(lastCompletedPayment)}
            >
              <Receipt size={14} />
              <span>Chekni ko'rish</span>
            </button>
            <button
              type="button"
              className={styles.recentPaymentClose}
              onClick={() => setLastCompletedPayment(null)}
              title="Yopish"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: O'QUV MARKAZLARI BO'YICHA ALOHIDA HISOB-KITOB     */}
      {/* ======================================================== */}
      {activeTab === 'CENTERS' && (
        <>
          {/* Cards Grid per Learning Center */}
          <div className={styles.centerCardsGrid}>
            {centerReports.length === 0 ? (
              <div className={styles.emptyCard}>
                Hozircha tizimda o'quv markazlari mavjud emas
              </div>
            ) : (
              centerReports
                .filter((c) =>
                  !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((center) => (
                  <div key={center.id} className={styles.centerFinancialCard}>
                    {/* Top Header */}
                    <div className={styles.centerCardTop}>
                      <div className={styles.centerTitleWrapper}>
                        <div className={styles.centerAvatarIcon}>
                          <Building2 size={20} />
                        </div>
                        <div>
                          <h3 className={styles.centerCardTitle}>{center.name}</h3>
                          <span className={styles.centerCardAddress}>{center.address}</span>
                        </div>
                      </div>

                      <span
                        className={`${styles.statusBadge} ${
                          center.status === 'active' ? styles.statusActive : styles.statusStopped
                        }`}
                      >
                        {center.statusLabel}
                      </span>
                    </div>

                    {/* Financial Metrics 3-Col Box */}
                    <div className={styles.centerFinancialGrid}>
                      <div className={styles.finBox}>
                        <span className={styles.finLabel}>KIRIM</span>
                        <span className={`${styles.finVal} ${styles.textGreen}`}>
                          {formatMoney(center.kirim)}
                        </span>
                      </div>

                      <div className={styles.finBox}>
                        <span className={styles.finLabel}>CHIQIM</span>
                        <span className={`${styles.finVal} ${styles.textRed}`}>
                          {formatMoney(center.chiqim)}
                        </span>
                      </div>

                      <div className={styles.finBox}>
                        <span className={styles.finLabel}>SOF QOLDIQ</span>
                        <span
                          className={`${styles.finVal} ${
                            center.qoldiq >= 0 ? styles.textBlue : styles.textRed
                          }`}
                        >
                          {formatMoney(center.qoldiq)}
                        </span>
                      </div>
                    </div>

                    {/* Meta Row: Students & Avg Payment */}
                    <div className={styles.centerMetaRow}>
                      <div className={styles.centerMetaItem}>
                        <Users size={13} color="#64748b" />
                        <span>
                          Talabalar: <strong>{center.studentsCount} ta</strong>
                        </span>
                      </div>

                      <div className={styles.centerMetaItem}>
                        <Receipt size={13} color="#64748b" />
                        <span>
                          Tranzaksiyalar: <strong>{center.paymentsCount} ta</strong>
                        </span>
                      </div>
                    </div>

                    {/* Payment Methods Breakdown for this Center */}
                    <div className={styles.methodsBreakdownBox}>
                      <span className={styles.methodsBreakdownTitle}>To'lov usullari bo'yicha:</span>
                      <div className={styles.methodsMiniPills}>
                        <span className={styles.miniPill}>
                          💵 Naqd: <strong>{formatMoney(center.methods.naqd)}</strong>
                        </span>
                        <span className={styles.miniPill}>
                          💳 Karta: <strong>{formatMoney(center.methods.plastik)}</strong>
                        </span>
                        {center.methods.terminal > 0 && (
                          <span className={styles.miniPill}>
                            📠 Terminal: <strong>{formatMoney(center.methods.terminal)}</strong>
                          </span>
                        )}
                        {center.methods.bank > 0 && (
                          <span className={styles.miniPill}>
                            🏛️ Bank: <strong>{formatMoney(center.methods.bank)}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className={styles.centerCardFooter}>
                      {!isManager && (
                        <>
                          <button
                            type="button"
                            className={styles.centerKirimBtn}
                            onClick={() => handleOpenKirim(center.id)}
                            title="Ushbu markazga to'lov qo'shish"
                          >
                            <Plus size={13} />
                            <span>Kirim</span>
                          </button>

                          <button
                            type="button"
                            className={styles.centerChiqimBtn}
                            onClick={() => handleOpenChiqim(center.id)}
                            title="Ushbu markazdan xarajat yozish"
                          >
                            <Minus size={13} />
                            <span>Chiqim</span>
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className={styles.centerTrBtn}
                        onClick={() => handleFilterByCenter(center.id)}
                        title="Ushbu markaz tranzaksiyalariga o'tish"
                      >
                        <span>Tranzaksiyalar</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>

          {/* Comparison Table */}
          <div className={styles.comparisonTableCard}>
            <div className={styles.tableCardHeader}>
              <h3 className={styles.tableCardTitle}>Filiallar Moliyaviy Taqqoslama Jadvali</h3>
              <span className={styles.tableCardSub}>Real vaqt rejimida yangilanadi</span>
            </div>

            <div className={styles.tableResponsive}>
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th>FILIAL</th>
                    <th>HOLATI</th>
                    <th>JAMI KIRIM</th>
                    <th>JAMI CHIQIM</th>
                    <th>SOF QOLDIQ</th>
                    <th>TALABALAR</th>
                    <th>TRANZAKSIYALAR</th>
                    <th style={{ textAlign: 'right' }}>AMALLAR</th>
                  </tr>
                </thead>
                <tbody>
                  {centerReports.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className={styles.tdBranchName}>
                          <Building2 size={14} color="#2563eb" />
                          <span>{c.name}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            c.status === 'active' ? styles.statusActive : styles.statusStopped
                          }`}
                        >
                          {c.statusLabel}
                        </span>
                      </td>
                      <td className={styles.textGreen}>{formatMoney(c.kirim)}</td>
                      <td className={styles.textRed}>{formatMoney(c.chiqim)}</td>
                      <td className={c.qoldiq >= 0 ? styles.textBlue : styles.textRed}>
                        <strong>{formatMoney(c.qoldiq)}</strong>
                      </td>
                      <td>{c.studentsCount} ta</td>
                      <td>{c.paymentsCount} ta</td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className={styles.btnSmallTable}
                          onClick={() => handleFilterByCenter(c.id)}
                        >
                          Ko'rish
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* So'nggi qabul qilingan to'lovlar bloki */}
          <div className={styles.recentPaymentsCard}>
            <div className={styles.recentPaymentsHeader}>
              <div className={styles.recentPaymentsTitleGroup}>
                <div className={`${styles.kpiIconBox} ${styles.iconGreen}`}>
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className={styles.recentPaymentsTitle}>So'nggi Qabul Qilingan To'lovlar</h3>
                  <p className={styles.recentPaymentsSub}>
                    O'quvchilar tomonidan amalga oshirilgan oxirgi to'lovlar va sanalar ro'yxati
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.btnSmallTable}
                onClick={() => setActiveTab('KASSA')}
              >
                Barcha tranzaksiyalar ({payments.length}) →
              </button>
            </div>

            {payments.filter((p) => !isPaymentExpense(p)).length === 0 ? (
              <div className={styles.emptyCard}>Hozircha qabul qilingan to'lovlar mavjud emas</div>
            ) : (
              <div className={styles.recentPaymentsGrid}>
                {payments
                  .filter((p) => !isPaymentExpense(p))
                  .slice(0, 6)
                  .map((p) => {
                    const studentName =
                      p.student?.user?.full_name ||
                      p.student?.parent_name ||
                      `Talaba #${p.student_id || '—'}`;
                    const courseName = getPaymentCourseName(p);
                    const methodName =
                      p.payment_method?.name ||
                      methodsList.find((m) => m.id === p.payment_method_id)?.name ||
                      "To'lov usuli";
                    const branchName =
                      p.branch?.name ||
                      branches.find((b) => b.id === (p.branch_id || p.student?.branch_id))?.name ||
                      "Yuksalish Ta'limi";
                    const pDate = formatDate(p.payment_date || p.created_at);

                    return (
                      <div
                        key={p.id}
                        className={styles.recentItemCard}
                        onClick={() =>
                          setSelectedReceipt({
                            id: p.id,
                            payer: studentName,
                            course: courseName || "Kurs to'lovi",
                            date: pDate,
                            amount: p.amount,
                            method: methodName,
                            center: branchName,
                            note: p.note || p.transaction_id || "O'qish to'lovi",
                          })
                        }
                      >
                        <div className={styles.recentItemTop}>
                          <div className={styles.recentItemStudent}>
                            <div className={styles.recentItemAvatar}>
                              {studentName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className={styles.recentItemName}>{studentName}</div>
                              <div className={styles.recentItemDate}>
                                <Calendar size={11} />
                                <span>{pDate}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {courseName && (
                          <div className={styles.recentItemCourseBadge}>
                            <BookOpen size={11} />
                            <span>{courseName}</span>
                          </div>
                        )}

                        <div className={styles.recentItemBottom}>
                          <span className={styles.recentItemAmount}>
                            +{formatMoney(p.amount)}
                          </span>
                          <span className={styles.recentItemMethod}>{methodName}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 2: KASSA & TRANZAKSIYALAR (TABLE & FILTERS)         */}
      {/* ======================================================== */}
      {activeTab === 'KASSA' && (
        <>
          {/* 4 Method Summary Cards */}
          <div className={styles.methodsSummaryGrid}>
            <div className={styles.methodCard}>
              <div className={styles.methodCardTop}>
                <span className={styles.methodName}>💵 Naqd Pul</span>
                <Banknote size={16} color="#16a34a" />
              </div>
              <div className={styles.methodBalance}>{formatMoney(methodBalances.naqd)}</div>
              <span className={styles.methodSub}>Kassadagi naqd mablag'</span>
            </div>

            <div className={styles.methodCard}>
              <div className={styles.methodCardTop}>
                <span className={styles.methodName}>💳 Plastik Karta</span>
                <CreditCard size={16} color="#2563eb" />
              </div>
              <div className={styles.methodBalance}>{formatMoney(methodBalances.plastik)}</div>
              <span className={styles.methodSub}>Uzcard, Humo, Payme, Click</span>
            </div>

            <div className={styles.methodCard}>
              <div className={styles.methodCardTop}>
                <span className={styles.methodName}>📠 Terminal</span>
                <Receipt size={16} color="#d97706" />
              </div>
              <div className={styles.methodBalance}>{formatMoney(methodBalances.terminal)}</div>
              <span className={styles.methodSub}>POS Terminal orqali</span>
            </div>

            <div className={styles.methodCard}>
              <div className={styles.methodCardTop}>
                <span className={styles.methodName}>🏛️ Hisob Raqami</span>
                <Building2 size={16} color="#7c3aed" />
              </div>
              <div className={styles.methodBalance}>{formatMoney(methodBalances.bank)}</div>
              <span className={styles.methodSub}>Bank hisob-kitob raqami</span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className={styles.filterCard}>
            <div className={styles.filterRowTop}>
              {/* Branch Filter */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>O'quv Markazi</label>
                <select
                  className={styles.filterSelect}
                  value={selectedBranchId}
                  onChange={(e) => {
                    setSelectedBranchId(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  {isSuperAdmin && <option value="ALL">🏢 Barcha markazlar</option>}
                  {scopedBranches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Transaction Type Filter */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>Tranzaksiya Turi</label>
                <select
                  className={styles.filterSelect}
                  value={transactionTypeFilter}
                  onChange={(e) => {
                    setTransactionTypeFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">Hammasi (Kirim & Chiqim)</option>
                  <option value="INCOME">🟢 Faqat Kirim (To'lovlar)</option>
                  <option value="EXPENSE">🔴 Faqat Chiqim (Xarajatlar)</option>
                </select>
              </div>

              {/* Payment Method Filter */}
              <div className={styles.filterGroup}>
                <label className={styles.filterLabel}>To'lov Usuli</label>
                <select
                  className={styles.filterSelect}
                  value={methodFilter}
                  onChange={(e) => {
                    setMethodFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="ALL">Barcha to'lov usullari</option>
                  {methodsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Box */}
              <div className={styles.filterGroup} style={{ flex: 1.5 }}>
                <label className={styles.filterLabel}>Qidirish</label>
                <div className={styles.searchBoxWrapper}>
                  <Search size={15} color="#94a3b8" />
                  <input
                    type="text"
                    placeholder="Talaba ismi, izoh yoki tranzaksiya..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className={styles.tableSearchInput}
                  />
                  {searchQuery && (
                    <X
                      size={14}
                      color="#94a3b8"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSearchQuery('')}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className={styles.tableContainerCard}>
            {loading && !payments.length ? (
              <Loader text="To'lovlar yuklanmoqda..." />
            ) : (
              <>
                <Table
                  columns={tableColumns}
                  data={paginatedPayments}
                  emptyMessage="Belgilangan parametrlar bo'yicha to'lovlar topilmadi"
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredPayments.length / pageSize) || 1}
                  totalItems={filteredPayments.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </>
      )}

      {/* ======================================================== */}
      {/* TAB 3: MOLIYA ANALITIKASI & GRAFIKLAR                   */}
      {/* ======================================================== */}
      {activeTab === 'ANALYTICS' && (
        <div className={styles.analyticsLayout}>
          {/* Centers Revenue Share */}
          <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsCardTitle}>O'quv Markazlari Daromad Ulushi</h3>
            <span className={styles.analyticsCardSub}>
              Barcha markazlarning umumiy daromaddagi hissasi
            </span>

            <div className={styles.branchProgressList}>
              {centerReports.map((c) => {
                const percent =
                  overallTotals.kirim > 0
                    ? Math.round((c.kirim / overallTotals.kirim) * 100)
                    : 0;

                return (
                  <div key={c.id} className={styles.branchProgressItem}>
                    <div className={styles.branchProgressHeader}>
                      <span className={styles.branchNameText}>🏢 {c.name}</span>
                      <span className={styles.branchAmountText}>
                        {formatMoney(c.kirim)} ({percent}%)
                      </span>
                    </div>
                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment Methods Distribution */}
          <div className={styles.analyticsCard}>
            <h3 className={styles.analyticsCardTitle}>To'lov Usullari Taqsimoti</h3>
            <span className={styles.analyticsCardSub}>
              Mablag'larning tushum manbalari
            </span>

            <div className={styles.methodsShareGrid}>
              <div className={styles.methodShareBox}>
                <span className={styles.shareLabel}>💵 Naqd Pul</span>
                <span className={styles.shareVal}>{formatMoney(methodBalances.naqd)}</span>
                <span className={styles.sharePercent}>
                  {overallTotals.kirim > 0
                    ? Math.round((methodBalances.naqd / overallTotals.kirim) * 100)
                    : 0}
                  %
                </span>
              </div>

              <div className={styles.methodShareBox}>
                <span className={styles.shareLabel}>💳 Plastik Karta</span>
                <span className={styles.shareVal}>{formatMoney(methodBalances.plastik)}</span>
                <span className={styles.sharePercent}>
                  {overallTotals.kirim > 0
                    ? Math.round((methodBalances.plastik / overallTotals.kirim) * 100)
                    : 0}
                  %
                </span>
              </div>

              <div className={styles.methodShareBox}>
                <span className={styles.shareLabel}>📠 Terminal</span>
                <span className={styles.shareVal}>{formatMoney(methodBalances.terminal)}</span>
                <span className={styles.sharePercent}>
                  {overallTotals.kirim > 0
                    ? Math.round((methodBalances.terminal / overallTotals.kirim) * 100)
                    : 0}
                  %
                </span>
              </div>

              <div className={styles.methodShareBox}>
                <span className={styles.shareLabel}>🏛️ Hisob Raqami</span>
                <span className={styles.shareVal}>{formatMoney(methodBalances.bank)}</span>
                <span className={styles.sharePercent}>
                  {overallTotals.kirim > 0
                    ? Math.round((methodBalances.bank / overallTotals.kirim) * 100)
                    : 0}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* ======================================================== */}
      {/* 1-PAGE: + KIRIM (TO'LOV QABUL QILISH)                    */}
      {/* ======================================================== */}
      {viewMode === 'CREATE_KIRIM' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={styles.pageHeaderWrapper}>
            <div className={styles.pageHeaderTitleGroup}>
              <div className={`${styles.pageHeaderIconBox} ${styles.iconGreen}`}>
                <Plus size={22} />
              </div>
              <div>
                <h2 className={styles.pageMainTitle}>Yangi Kirim (To'lov Qabul Qilish)</h2>
                <p className={styles.pageMainSubtitle}>
                  Talaba o'qish to'lovi, kurs tanlash va kassa kvitansiyasini shakllantirish
                </p>
              </div>
            </div>
            <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
              Orqaga qaytish
            </Button>
          </div>

          {formError && (
            <div className={styles.modalAlert} style={{ margin: 0 }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className={styles.pageFormLayout}>
            {/* LEFT COLUMN: PAYMENT FORM */}
            <div className={styles.pageFormCard}>
              <form id="kirimPaymentForm" onSubmit={handleSubmitPayment}>
                {/* 1. O'quv Markazi & Kurs */}
                <div className={styles.pageSection}>
                  <div className={styles.pageSectionHeader}>
                    <div className={styles.pageSectionIcon}>
                      <Building2 size={15} />
                    </div>
                    <h3 className={styles.pageSectionTitle}>1. O'quv Markazi va Kurs</h3>
                  </div>

                  <div className={styles.pageGrid2}>
                    <div className={styles.pageField}>
                      <label className={styles.pageLabel}>
                        <Building2 size={13} />
                        O'quv Markazi (Filial) *
                      </label>
                      <select
                        className={styles.pageSelect}
                        value={formData.branch_id}
                        onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                        required
                      >
                        {scopedBranches.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.pageField}>
                      <label className={styles.pageLabel}>
                        <BookOpen size={13} />
                        Kurs Nomi *
                      </label>
                      <select
                        className={styles.pageSelect}
                        value={formData.course_id}
                        onChange={(e) => handleCourseChange(e.target.value)}
                        required
                      >
                        <option value="">Kursni tanlang...</option>
                        {coursesList.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.lesson_time || c.start_time ? ` • ${c.lesson_time || c.start_time}` : ''} {c.price ? `(${formatMoney(c.price)})` : ''}
                          </option>
                        ))}
                      </select>
                      {formData.course_name && (
                        <div className={styles.modalCourseInfo} style={{ marginTop: 6 }}>
                          <GraduationCap size={14} />
                          <span>
                            Tanlangan kurs: <strong>{getCourseDisplayTitle(formData.course_id, formData.course_name)}</strong>
                            {formData.course_id && !showAllStudents ? ` (${courseStudents.length} ta talaba topildi)` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Talaba & To'lov Summasi */}
                <div className={styles.pageSection}>
                  <div className={styles.pageSectionHeader}>
                    <div className={styles.pageSectionIcon}>
                      <Users size={15} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <h3 className={styles.pageSectionTitle}>2. Talaba va To'lov Summasi</h3>
                      {formData.course_id && (
                        <button
                          type="button"
                          onClick={() => setShowAllStudents(!showAllStudents)}
                          style={{
                            background: showAllStudents ? '#eff6ff' : 'transparent',
                            border: `1px solid ${showAllStudents ? '#93c5fd' : '#cbd5e1'}`,
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11.5,
                            color: showAllStudents ? '#1d4ed8' : '#64748b',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          {showAllStudents ? `Faqat "${getCourseDisplayTitle(formData.course_id, formData.course_name)}" talabalari` : "Barcha talabalarni ko'rsatish"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.pageGrid2}>
                    <div className={styles.pageField}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                        <label className={styles.pageLabel} style={{ marginBottom: 0 }}>
                          <Users size={13} />
                          To'lovchi (Talaba) *
                        </label>
                        {formData.course_id && !showAllStudents && (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, background: '#dcfce7', padding: '1px 6px', borderRadius: 4 }}>
                            ✓ {courseStudents.length} ta kurs talabasi
                          </span>
                        )}
                      </div>
                      <select
                        className={styles.pageSelect}
                        value={formData.student_id}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        required
                      >
                        <option value="">
                          {formData.course_id && !showAllStudents
                            ? courseStudents.length > 0
                              ? `Tanlangan kursdagi talabani tanlang (${courseStudents.length} ta)...`
                              : "Ushbu kursda talabalar topilmadi"
                            : "Talabani tanlang..."}
                        </option>
                        {courseStudents.map((s) => {
                          const sName = s.user?.full_name || s.parent_name || `Talaba #${s.id}`;
                          const cName = getStudentCourseName(s);
                          const gName = s.group?.name || s.group_students?.[0]?.group?.name;
                          return (
                            <option key={s.id} value={s.id}>
                              {sName} {gName ? ` • (${gName})` : cName ? ` • (${cName})` : ''}
                            </option>
                          );
                        })}
                      </select>

                      {formData.course_id && courseStudents.length === 0 && !showAllStudents && (
                        <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <AlertCircle size={13} />
                          <span>
                            Bu kursda hali o'quvchilar ro'yxatga olinmagan.{' '}
                            <button
                              type="button"
                              onClick={() => setShowAllStudents(true)}
                              style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                            >
                              Barcha talabalardan tanlash
                            </button>
                          </span>
                        </div>
                      )}

                      {formData.course_id && courseStudents.length > 0 && !showAllStudents && (
                        <div style={{ fontSize: 11.5, color: '#16a34a', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                          <Check size={12} />
                          <span>
                            Faqat <strong>{getCourseDisplayTitle(formData.course_id, formData.course_name)}</strong> kursi talabalari saralandi ({courseStudents.length} ta)
                          </span>
                        </div>
                      )}
                    </div>

                    <div className={styles.pageField}>
                      <label className={styles.pageLabel}>
                        <Wallet size={13} />
                        To'lov Summasi (UZS) *
                      </label>
                      <input
                        type="number"
                        className={styles.pageInput}
                        placeholder=""
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        required
                      />

                      {/* Quick Amount Pills */}
                      <div className={styles.quickAmountsWrapper}>
                        {[300000, 500000, 800000, 1000000, 1500000].map((amt) => (
                          <button
                            key={amt}
                            type="button"
                            className={styles.quickAmountPill}
                            onClick={() => setFormData({ ...formData, amount: String(amt) })}
                          >
                            {(amt / 1000).toLocaleString()} ming
                          </button>
                        ))}
                        {(() => {
                          const selectedCourse = coursesList.find((c) => String(c.id) === String(formData.course_id));
                          if (selectedCourse?.price) {
                            return (
                              <button
                                type="button"
                                className={styles.quickAmountPill}
                                style={{ background: '#dcfce7', borderColor: '#86efac', color: '#15803d' }}
                                onClick={() => setFormData({ ...formData, amount: String(selectedCourse.price) })}
                              >
                                To'liq kurs ({formatMoney(selectedCourse.price)})
                              </button>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. To'lov Usuli & Izoh */}
                <div className={styles.pageSection}>
                  <div className={styles.pageSectionHeader}>
                    <div className={styles.pageSectionIcon}>
                      <CreditCard size={15} />
                    </div>
                    <h3 className={styles.pageSectionTitle}>3. To'lov Usuli va Rekvizitlar</h3>
                  </div>

                  <div className={styles.pageGrid2}>
                    <div className={styles.pageField}>
                      <label className={styles.pageLabel}>
                        <CreditCard size={13} />
                        To'lov Usuli (Kassa) *
                      </label>
                      <select
                        className={styles.pageSelect}
                        value={formData.payment_method_id}
                        onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                        required
                      >
                        {methodsList.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.pageField}>
                      <label className={styles.pageLabel}>
                        <Receipt size={13} />
                        Tranzaksiya / Kvitansiya Nomi
                      </label>
                      <input
                        type="text"
                        className={styles.pageInput}
                        placeholder=""
                        value={formData.transaction_id}
                        onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                      />
                    </div>

                    <div className={styles.pageFieldFull}>
                      <label className={styles.pageLabel}>Qo'shimcha Izoh</label>
                      <input
                        type="text"
                        className={styles.pageInput}
                        placeholder=""
                        value={formData.note}
                        onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={styles.pageActionsRow}>
                  <button
                    type="button"
                    className={styles.pageCancelBtn}
                    onClick={() => setViewMode('LIST')}
                  >
                    Bekor qilish
                  </button>
                  <button type="submit" className={styles.pageSubmitBtn}>
                    <CheckCircle2 size={16} />
                    To'lovni Tasdiqlash & Chek Chiqarish
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: REAL-TIME LIVE RECEIPT PREVIEW */}
            <div className={styles.liveReceiptWrapper}>
              <div className={styles.liveReceiptCard}>
                <div className={styles.liveReceiptHeader}>
                  <div className={styles.liveReceiptBadge}>
                    <CheckCircle2 size={12} /> Haqiqiy Kvitansiya Loyihasi
                  </div>
                  <div className={styles.liveReceiptCenter}>
                    {scopedBranches.find((b) => String(b.id) === String(formData.branch_id))?.name || "Yuksalish Ta'lim Markazi"}
                  </div>
                  <div className={styles.liveReceiptSub}>Kassa To'lov Cheki</div>
                </div>

                <div className={styles.liveReceiptAmountBox}>
                  <div className={styles.liveReceiptAmountLabel}>Jami To'lanadigan Summa</div>
                  <div className={styles.liveReceiptAmountVal}>
                    {formatMoney(formData.amount || 0)}
                  </div>
                </div>

                <div className={styles.liveReceiptRows}>
                  <div className={styles.liveReceiptRow}>
                    <span className={styles.liveReceiptRowLabel}>
                      <Users size={14} /> To'lovchi (Talaba):
                    </span>
                    <span className={styles.liveReceiptRowVal}>
                      {(() => {
                        const st = studentsList.find((s) => String(s.id) === String(formData.student_id));
                        return st ? (st.user?.full_name || st.parent_name || `Talaba #${st.id}`) : "Tanlanmagan";
                      })()}
                    </span>
                  </div>

                  <div className={styles.liveReceiptRow}>
                    <span className={styles.liveReceiptRowLabel}>
                      <BookOpen size={14} /> Kurs:
                    </span>
                    <span className={styles.liveReceiptRowVal}>
                      {formData.course_name || coursesList.find((c) => String(c.id) === String(formData.course_id))?.name || "Tanlanmagan"}
                    </span>
                  </div>

                  <div className={styles.liveReceiptRow}>
                    <span className={styles.liveReceiptRowLabel}>
                      <CreditCard size={14} /> To'lov Usuli:
                    </span>
                    <span className={styles.liveReceiptRowVal}>
                      {methodsList.find((m) => String(m.id) === String(formData.payment_method_id))?.name || "Kassa to'lovi"}
                    </span>
                  </div>

                  <div className={styles.liveReceiptRow}>
                    <span className={styles.liveReceiptRowLabel}>
                      <Calendar size={14} /> Sana & Vaqt:
                    </span>
                    <span className={styles.liveReceiptRowVal}>
                      {formatDate(new Date())}
                    </span>
                  </div>

                  {formData.note && (
                    <div className={styles.liveReceiptRow}>
                      <span className={styles.liveReceiptRowLabel}>Izoh:</span>
                      <span className={styles.liveReceiptRowVal}>{formData.note}</span>
                    </div>
                  )}
                </div>

                <div className={styles.liveReceiptInfoNote}>
                  <Sparkles size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: 2 }} />
                  <span>
                    To'lov saqlangach, tizim avtomatik rasmiy kassa chekini taqdim etadi va chop etishga tayyorlaydi.
                  </span>
                </div>

                <button
                  type="submit"
                  form="kirimPaymentForm"
                  className={styles.pageSubmitBtn}
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  <Check size={16} />
                  To'lovni Tasdiqlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1-PAGE: - CHIQIM (XARAJAT QAYD ETISH)                    */}
      {/* ======================================================== */}
      {viewMode === 'CREATE_CHIQIM' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={styles.pageHeaderWrapper}>
            <div className={styles.pageHeaderTitleGroup}>
              <div className={`${styles.pageHeaderIconBox} ${styles.iconRed}`}>
                <Minus size={22} />
              </div>
              <div>
                <h2 className={styles.pageMainTitle}>Yangi Chiqim (Xarajat Yozish)</h2>
                <p className={styles.pageMainSubtitle}>
                  O'quv markazi xarajatlarini (ijara, kommunal, oylik maosh, xo'jalik) qayd etish
                </p>
              </div>
            </div>
            <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
              Orqaga qaytish
            </Button>
          </div>

          {formError && (
            <div className={styles.modalAlert} style={{ margin: 0 }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className={styles.pageFormCard} style={{ maxWidth: 860 }}>
            <form onSubmit={handleSubmitPayment}>
              <div className={styles.pageSection}>
                <div className={styles.pageSectionHeader}>
                  <div className={styles.pageSectionIcon}>
                    <TrendingDown size={15} style={{ color: '#ef4444' }} />
                  </div>
                  <h3 className={styles.pageSectionTitle}>Xarajat Tafsilotlari</h3>
                </div>

                <div className={styles.pageGrid2}>
                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>O'quv Markazi *</label>
                    <select
                      className={styles.pageSelect}
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      required
                    >
                      {scopedBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>Xarajat Nomi *</label>
                    <input
                      type="text"
                      className={styles.pageInput}
                      placeholder=""
                      value={formData.transaction_id}
                      onChange={(e) => setFormData({ ...formData, transaction_id: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>Xarajat Summasi (UZS) *</label>
                    <input
                      type="number"
                      className={styles.pageInput}
                      placeholder=""
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />

                    {/* Quick Amount Pills */}
                    <div className={styles.quickAmountsWrapper}>
                      {[100000, 200000, 500000, 1000000, 2000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className={styles.quickAmountPill}
                          onClick={() => setFormData({ ...formData, amount: String(amt) })}
                        >
                          {(amt / 1000).toLocaleString()} ming
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>To'lov Usuli (Kassa) *</label>
                    <select
                      className={styles.pageSelect}
                      value={formData.payment_method_id}
                      onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                      required
                    >
                      {methodsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.pageFieldFull}>
                    <label className={styles.pageLabel}>Qo'shimcha Izoh</label>
                    <input
                      type="text"
                      className={styles.pageInput}
                      placeholder="Xarajat sababi, chek yoki hisob-faktura raqami"
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.pageActionsRow}>
                <button
                  type="button"
                  className={styles.pageCancelBtn}
                  onClick={() => setViewMode('LIST')}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className={styles.pageSubmitBtn}
                  style={{ backgroundColor: '#ef4444', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                >
                  <TrendingDown size={16} />
                  Xarajatni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1-PAGE: ⇄ O'TKAZMA (TRANSFER)                            */}
      {/* ======================================================== */}
      {viewMode === 'TRANSFER' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className={styles.pageHeaderWrapper}>
            <div className={styles.pageHeaderTitleGroup}>
              <div className={`${styles.pageHeaderIconBox} ${styles.iconBlue}`}>
                <ArrowRightLeft size={22} />
              </div>
              <div>
                <h2 className={styles.pageMainTitle}>Kassalararo Pul O'tkazmasi</h2>
                <p className={styles.pageMainSubtitle}>
                  Bir o'quv markazi yoki filialdan boshqasiga mablag' ko'chirish
                </p>
              </div>
            </div>
            <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
              Orqaga qaytish
            </Button>
          </div>

          {formError && (
            <div className={styles.modalAlert} style={{ margin: 0 }}>
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <div className={styles.pageFormCard} style={{ maxWidth: 860 }}>
            <form onSubmit={handleSubmitPayment}>
              <div className={styles.pageSection}>
                <div className={styles.pageSectionHeader}>
                  <div className={styles.pageSectionIcon}>
                    <ArrowRightLeft size={15} style={{ color: '#2563eb' }} />
                  </div>
                  <h3 className={styles.pageSectionTitle}>O'tkazma Tafsilotlari</h3>
                </div>

                <div className={styles.pageGrid2}>
                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>Qaysi Markazdan *</label>
                    <select
                      className={styles.pageSelect}
                      value={formData.branch_id}
                      onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
                      required
                    >
                      {scopedBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>Qaysi Markazga *</label>
                    <select
                      className={styles.pageSelect}
                      value={formData.to_branch_id}
                      onChange={(e) => setFormData({ ...formData, to_branch_id: e.target.value })}
                      required
                    >
                      {scopedBranches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>O'tkazma Summasi (UZS) *</label>
                    <input
                      type="number"
                      className={styles.pageInput}
                      placeholder=""
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                    />

                    {/* Quick Amount Pills */}
                    <div className={styles.quickAmountsWrapper}>
                      {[500000, 1000000, 2000000, 5000000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          className={styles.quickAmountPill}
                          onClick={() => setFormData({ ...formData, amount: String(amt) })}
                        >
                          {(amt / 1000).toLocaleString()} ming
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.pageField}>
                    <label className={styles.pageLabel}>O'tkazma Turi *</label>
                    <select
                      className={styles.pageSelect}
                      value={formData.payment_method_id}
                      onChange={(e) => setFormData({ ...formData, payment_method_id: e.target.value })}
                      required
                    >
                      {methodsList.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.pageFieldFull}>
                    <label className={styles.pageLabel}>Qo'shimcha Izoh</label>
                    <input
                      type="text"
                      className={styles.pageInput}
                      placeholder=""
                      value={formData.note}
                      onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className={styles.pageActionsRow}>
                <button
                  type="button"
                  className={styles.pageCancelBtn}
                  onClick={() => setViewMode('LIST')}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className={styles.pageSubmitBtn}
                  style={{ backgroundColor: '#2563eb', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
                >
                  <ArrowRightLeft size={16} />
                  O'tkazmani Bajarish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GLOBAL RECEIPT MODAL PREVIEW FOR ADMIN & MANAGER */}
      {selectedReceipt && (
        <div className={styles.receiptModalOverlay} onClick={() => setSelectedReceipt(null)}>
          <div className={styles.receiptModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.receiptPaper} id="printableReceipt">
              <div className={styles.receiptHeader}>
                <div className={styles.receiptCenterName}>{selectedReceipt.center}</div>
                <div className={styles.receiptSub}>Rasmiy To'lov Kvitansiyasi</div>
                <span className={styles.receiptCheckId}>ID: #{selectedReceipt.id}</span>
              </div>

              <div className={styles.receiptAmountBox}>
                <div className={styles.receiptAmountLabel}>To'langan Summa</div>
                <div className={styles.receiptAmountVal}>{formatMoney(selectedReceipt.amount)}</div>
              </div>

              <div className={styles.receiptDetailsList}>
                <div className={styles.receiptRow}>
                  <span className={styles.receiptRowLabel}>To'lovchi (Talaba):</span>
                  <span className={styles.receiptRowVal}>{selectedReceipt.payer}</span>
                </div>

                <div className={styles.receiptRow}>
                  <span className={styles.receiptRowLabel}>Kurs Nomi:</span>
                  <span className={styles.receiptRowVal}>{selectedReceipt.course}</span>
                </div>

                <div className={styles.receiptRow}>
                  <span className={styles.receiptRowLabel}>To'lov Sanasi:</span>
                  <span className={styles.receiptRowVal}>{selectedReceipt.date}</span>
                </div>

                <div className={styles.receiptRow}>
                  <span className={styles.receiptRowLabel}>To'lov Usuli:</span>
                  <span className={styles.receiptRowVal}>{selectedReceipt.method}</span>
                </div>

                <div className={styles.receiptRow}>
                  <span className={styles.receiptRowLabel}>Izoh:</span>
                  <span className={styles.receiptRowVal}>{selectedReceipt.note}</span>
                </div>
              </div>

              <div className={styles.receiptStampBox}>
                <span className={styles.receiptStamp}>
                  <CheckCircle2 size={13} /> TASDIQLANGAN
                </span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  CRM ID: {selectedReceipt.id}
                </span>
              </div>
            </div>

            <div className={styles.receiptModalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setSelectedReceipt(null)}
              >
                Yopish
              </button>
              <button
                type="button"
                className={styles.receiptPrintBtn}
                onClick={() => window.print()}
              >
                <Printer size={14} />
                <span>Chekni chop etish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
