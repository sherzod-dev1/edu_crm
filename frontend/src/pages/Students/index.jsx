import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as XLSX from 'xlsx';
import {
  fetchStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  clearError,
} from '../../store/slices/studentSlice';
import userApi from '../../services/userApi';
import branchApi from '../../services/branchApi';
import groupApi from '../../services/groupApi';
import groupStudentApi from '../../services/groupStudentApi';
import courseApi from '../../services/courseApi';
import smsApi from '../../services/smsApi';
import studentApi from '../../services/studentApi';
import parentApi from '../../services/parentApi';
import ParentPortal from '../ParentPortal';
import { Breadcrumbs } from '../../layout';
import { Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './students.module.css';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Mail,
  FileSpreadsheet,
  RotateCcw,
  Send,
  User,
  Users,
  Copy,
  Phone,
  CheckCircle2,
  AlertCircle,
  Save,
  KeyRound,
  X,
} from 'lucide-react';

const formatDateUz = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  const months = ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'Iyn', 'Iyl', 'Avg', 'Sen', 'Okt', 'Noy', 'Dek'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${month}, ${year} ${hours}:${minutes}`;
};

const getErpStatusDisplay = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'graduated' || s === 'bitirgan') return 'Bitirgan';
  if (s === 'dropped' || s === 'left' || s === 'ketgan') return 'Ketgan';
  if (s === 'frozen' || s === 'muzlatilgan') return 'Muzlatilgan';
  return "O'qiyabdi";
};

const Students = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, loading } = useSelector((state) => state.student || {});
  const { user } = useSelector((state) => state.auth || {});

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Dropdowns & Related Data
  const [branchesList, setBranchesList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);

  // Image 1 Marked Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterHolat, setFilterHolat] = useState(''); // '' | 'unblocked' | 'blocked'
  const [filterErpStatus, setFilterErpStatus] = useState(''); // '' | "O'qiyabdi" | 'Bitirgan' | 'Ketgan' | 'Muzlatilgan'

  // Toast Notification
  const [toastMessage, setToastMessage] = useState(null);

  // SMS Modal State
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsStudent, setSmsStudent] = useState(null);
  const [smsTargetPhone, setSmsTargetPhone] = useState('');
  const [smsRecipientType, setSmsRecipientType] = useState('student');
  const [smsText, setSmsText] = useState('');
  const [smsTemplate, setSmsTemplate] = useState('custom');
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatusAlert, setSmsStatusAlert] = useState(null);

  // Quick Action Modal (+)
  const [quickModalOpen, setQuickModalOpen] = useState(false);
  const [quickStudent, setQuickStudent] = useState(null);
  const [quickGroupId, setQuickGroupId] = useState('');
  const [quickErpStatus, setQuickErpStatus] = useState('active');
  const [quickSaving, setQuickSaving] = useState(false);

  // Ota-ona maxsus profili modal holatlari
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [parentModalStudent, setParentModalStudent] = useState(null);
  const [parentCreds, setParentCreds] = useState(null);
  const [parentCredsLoading, setParentCredsLoading] = useState(false);
  const [parentPasswordEdit, setParentPasswordEdit] = useState('');
  const [showParentPasswordEdit, setShowParentPasswordEdit] = useState(false);
  const [parentCopyToast, setParentCopyToast] = useState('');

  // Form Data for Create / Edit
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    password: '',
    course_id: '',
    group_id: '',
    parent_name: '',
    parent_phone: '',
    parent_password: '',
    address: '',
    branch_id: '',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadAllData = () => {
    dispatch(fetchStudents());

    branchApi.getAll({ limit: 100 }).then((res) => {
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
    }).catch(() => {});

    groupApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupsList(list);
    }).catch(() => {});

    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
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
        String(item.user?.branch_id) === String(userBranchId) ||
        String(item.group?.branch_id) === String(userBranchId)
    );
  }, [items, isSuperAdmin, userBranchId]);

  const checkIsBlocked = (student) =>
    (student.status || '').toLowerCase() === 'blocked' || Boolean(student.is_blocked);

  // Filter students
  const filteredItems = useMemo(() => {
    return branchScopedItems.filter((student) => {
      // 1. Search Query: Ism yoki telefon raqami / HHID
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idStr = String(student.id);
        const name = (student.user?.full_name || student.full_name || student.name || '').toLowerCase();
        const phone = (student.user?.phone || student.phone || '').toLowerCase();
        const parent = (student.parent_name || '').toLowerCase();
        const matches = idStr === q || name.includes(q) || phone.includes(q) || parent.includes(q);
        if (!matches) return false;
      }

      // 2. Guruh Filter
      if (filterGroup) {
        if (String(student.group_id) !== String(filterGroup)) return false;
      }

      // 3. Yo'nalish Filter
      if (filterCourse) {
        const matchGroup = groupsList.find((g) => String(g.id) === String(student.group_id));
        const courseId = student.course_id || matchGroup?.course_id;
        if (String(courseId) !== String(filterCourse)) return false;
      }

      // 4. Holat Filter (Bloklanmagan / Bloklangan)
      if (filterHolat === 'unblocked' && checkIsBlocked(student)) return false;
      if (filterHolat === 'blocked' && !checkIsBlocked(student)) return false;

      // 5. ERP Holati Filter
      if (filterErpStatus) {
        const currentErp = getErpStatusDisplay(student.status);
        if (currentErp.toLowerCase() !== filterErpStatus.toLowerCase()) return false;
      }

      return true;
    });
  }, [
    branchScopedItems,
    searchQuery,
    filterGroup,
    filterCourse,
    filterHolat,
    filterErpStatus,
    groupsList,
  ]);

  const resetAllFilters = () => {
    setSearchQuery('');
    setFilterGroup('');
    setFilterCourse('');
    setFilterHolat('');
    setFilterErpStatus('');
    setCurrentPage(1);
  };

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ==========================================
  // EXPORT XLSX FILE (100% Working)
  // ==========================================
  const handleExportXLSX = () => {
    if (filteredItems.length === 0) {
      alert("Eksport qilish uchun talabalar ro'yxati bo'sh");
      return;
    }

    const exportData = filteredItems.map((student, idx) => {
      const fullName = student.user?.full_name || student.full_name || student.name || `Talaba #${student.id}`;
      const phone = student.user?.phone || student.phone || '—';
      const group = student.group || groupsList.find((g) => String(g.id) === String(student.group_id));
      const course = student.course || coursesList.find((c) => String(c.id) === String(student.course_id || group?.course_id));
      const branch = student.branch || branchesList.find((b) => String(b.id) === String(student.branch_id));

      return {
        'No': idx + 1,
        'HHID': student.id,
        "To'liq Ismi": fullName,
        'Telefon raqami': phone,
        'Kurs': course?.name || group?.course?.name || 'Web Dasturlash',
        'Guruh': group?.name || '—',
        'Filial': branch?.name || 'Asosiy',
        'Ota-onasi': student.parent_name || '—',
        'Ota-onasi telefoni': student.parent_phone || '—',
        'ERP Holati': getErpStatusDisplay(student.status),
        'Tizim Holati': checkIsBlocked(student) ? 'Bloklangan' : 'Bloklanmagan',
        'Manzil': student.address || '—',
        "Qo'shilgan sanasi": formatDateUz(student.created_at || student.joined_at),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Talabalar');

    worksheet['!cols'] = [
      { wch: 6 },
      { wch: 8 },
      { wch: 26 },
      { wch: 18 },
      { wch: 22 },
      { wch: 16 },
      { wch: 16 },
      { wch: 22 },
      { wch: 18 },
      { wch: 15 },
      { wch: 16 },
      { wch: 22 },
      { wch: 20 },
    ];

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `talabalar_${todayStr}.xlsx`);

    setToastMessage("Excel fayli muvaffaqiyatli yuklab olindi!");
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ==========================================
  // LOCK / BLOCK TOGGLE (100% Working)
  // ==========================================
  const handleToggleBlock = async (student, e) => {
    if (e) e.stopPropagation();
    const currentlyBlocked = checkIsBlocked(student);
    const newStatus = currentlyBlocked ? 'active' : 'blocked';
    const studentName = student.user?.full_name || student.full_name || `Talaba #${student.id}`;

    const isConfirmed = await confirm({
      title: currentlyBlocked ? "Blokdan chiqarish" : "Talabani bloklash",
      message: currentlyBlocked
        ? `${studentName}ni blokdan chiqarmoqchimisiz?`
        : `${studentName}ni bloklamoqchimisiz?`,
      confirmText: currentlyBlocked ? "Ha, chiqarsin" : "Ha, bloklansin",
      cancelText: "Bekor qilish",
      type: currentlyBlocked ? "info" : "danger",
    });

    if (isConfirmed) {
      try {
        await studentApi.update(student.id, { status: newStatus });
        loadAllData();
        setToastMessage(currentlyBlocked ? "Talaba blokdan chiqarildi!" : "Talaba bloklandi!");
        setTimeout(() => setToastMessage(null), 3000);
      } catch (err) {
        alert("Xatolik yuz berdi: " + (err.response?.data?.message || err.message));
      }
    }
  };

  // ==========================================
  // SMS MODAL (100% Working)
  // ==========================================
  const handleOpenSmsModal = (student, e) => {
    if (e) e.stopPropagation();
    const studentPhone = student.user?.phone || student.phone || '';
    setSmsStudent(student);
    setSmsRecipientType('student');
    setSmsTargetPhone(studentPhone);
    setSmsTemplate('custom');
    const studentName = student.user?.full_name || student.full_name || 'Talaba';
    setSmsText(`Hurmatli ${studentName}, `);
    setSmsStatusAlert(null);
    setSmsModalOpen(true);
  };

  const handleApplySmsTemplate = (templateType) => {
    setSmsTemplate(templateType);
    const studentName = smsStudent?.user?.full_name || smsStudent?.full_name || 'Talaba';
    if (templateType === 'payment') {
      setSmsText(`Hurmatli ${studentName}, o'quv markazimiz to'lov muddatini eslatib o'tamiz. Iltimos, o'z vaqtida to'lovni amalga oshirishingizni so'raymiz.`);
    } else if (templateType === 'lesson') {
      setSmsText(`Hurmatli ${studentName}, navbatdagi darsingiz o'z vaqtida boshlanadi. Kechikmasdan kelishingizni so'raymiz.`);
    } else if (templateType === 'attendance') {
      setSmsText(`Hurmatli ota-ona, ${studentName} bugungi dars mashg'ulotlarida qatnashmadi. Sababini ma'lum qilishingizni so'raymiz.`);
    } else if (templateType === 'congrats') {
      setSmsText(`Hurmatli ${studentName}, o'quv kursini muvaffaqiyatli yakunlaganingiz bilan chin dildan tabriklaymiz!`);
    } else {
      setSmsText(`Hurmatli ${studentName}, `);
    }
  };

  const handleSendSms = async () => {
    if (!smsTargetPhone.trim()) {
      setSmsStatusAlert({ type: 'error', text: 'Qabul qiluvchi telefon raqami kiritilmagan' });
      return;
    }
    if (!smsText.trim()) {
      setSmsStatusAlert({ type: 'error', text: 'SMS matnini kiriting' });
      return;
    }

    setSmsSending(true);
    setSmsStatusAlert(null);
    try {
      const studentName = smsStudent?.user?.full_name || smsStudent?.full_name || 'Talaba';
      const res = await smsApi.send({
        phone: smsTargetPhone.trim(),
        message: smsText.trim(),
        student_id: smsStudent?.id,
        user_id: smsStudent?.user_id,
        student_name: studentName,
        template_type: smsTemplate,
      });

      if (res.data?.success) {
        setSmsStatusAlert({
          type: 'success',
          text: `SMS ${smsTargetPhone} raqamiga muvaffaqiyatli yuborildi!`,
        });
        setTimeout(() => {
          setSmsModalOpen(false);
          setToastMessage(`SMS xabari yuborildi!`);
          setTimeout(() => setToastMessage(null), 3000);
        }, 1500);
      } else {
        setSmsStatusAlert({
          type: 'error',
          text: res.data?.message || 'SMS yuborishda xatolik yuz berdi',
        });
      }
    } catch (err) {
      setSmsStatusAlert({
        type: 'error',
        text: err.response?.data?.message || err.message || 'SMS yuborishda server xatosi',
      });
    } finally {
      setSmsSending(false);
    }
  };

  // ==========================================
  // QUICK ENROLL / CHANGE STATUS MODAL (+)
  // ==========================================
  const handleOpenQuickModal = (student, e) => {
    if (e) e.stopPropagation();
    setQuickStudent(student);
    setQuickGroupId(student.group_id || '');
    setQuickErpStatus(student.status || 'active');
    setQuickModalOpen(true);
  };

  const handleSaveQuickModal = async () => {
    if (!quickStudent) return;
    setQuickSaving(true);
    try {
      await studentApi.update(quickStudent.id, {
        group_id: quickGroupId ? Number(quickGroupId) : null,
        status: quickErpStatus,
      });
      loadAllData();
      setQuickModalOpen(false);
      setToastMessage("Talaba ma'lumotlari yangilandi!");
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setQuickSaving(false);
    }
  };

  // ==========================================
  // OTA-ONA MAXSUS PROFILI HANDLERS
  // ==========================================
  const handleOpenParentModal = async (student, e) => {
    if (e) e.stopPropagation();
    setParentModalStudent(student);
    setParentModalOpen(true);
    setParentCredsLoading(true);
    setShowParentPasswordEdit(false);
    setParentPasswordEdit('');
    try {
      const res = await parentApi.getParentCredentials(student.id);
      if (res.data?.success) {
        setParentCreds(res.data.data);
      }
    } catch (err) {
      console.error('getParentCredentials error:', err);
    } finally {
      setParentCredsLoading(false);
    }
  };

  const handleSaveParentPassword = async () => {
    if (!parentModalStudent || !parentPasswordEdit.trim()) return;
    try {
      const res = await parentApi.updateParentCredentials(parentModalStudent.id, {
        parent_name: parentCreds?.parent_name || parentModalStudent.parent_name,
        parent_phone: parentCreds?.phone || parentModalStudent.parent_phone,
        password: parentPasswordEdit.trim()
      });
      if (res.data?.success) {
        setParentCreds((prev) => ({
          ...prev,
          password: parentPasswordEdit.trim()
        }));
        setShowParentPasswordEdit(false);
        setParentCopyToast("Ota-ona paroli muvaffaqiyatli yangilandi!");
        setTimeout(() => setParentCopyToast(''), 3500);
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCopyParentShareText = () => {
    if (!parentCreds || !parentModalStudent) return;
    const loginUrl = `${window.location.origin}/login`;
    const text = `Assalomu alaykum! Farzandingiz ${parentModalStudent.name || parentModalStudent.full_name}ning dars baholari, davomati va dars kunlarini kuzatib borishingiz uchun Ota-ona kabineti:\n\n🌐 Sayt: ${loginUrl}\n👤 Login: ${parentCreds.login}\n🔑 Parol: ${parentCreds.password}\n\nIltimos, ushbu ma'lumotlar orqali tizimga kirib farzandingiz o'quv natijalarini kuzatib boring!`;
    navigator.clipboard.writeText(text);
    setParentCopyToast("Ota-onaga yuborish matni nusxalandi!");
    setTimeout(() => setParentCopyToast(''), 3500);
  };

  // ==========================================
  // CREATE / EDIT HANDLERS
  // ==========================================
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
      course_id: '',
      group_id: '',
      parent_name: '',
      parent_phone: '',
      parent_password: '',
      address: '',
      branch_id: defaultBranchId,
      status: 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenEdit = (student) => {
    const matchedGroup = groupsList.find(
      (g) => String(g.id) === String(student.group_id || student.group?.id)
    );
    const initialCourseId =
      student.course_id ||
      student.course?.id ||
      matchedGroup?.course_id ||
      matchedGroup?.course?.id ||
      '';

    setFormData({
      id: student.id,
      user_id: student.user_id || student.user?.id || '',
      full_name: student.user?.full_name || student.full_name || student.name || '',
      phone: student.user?.phone || student.phone || '',
      email: student.user?.email || student.email || '',
      password: student.user?.plain_password || student.plain_password || '',
      course_id: initialCourseId,
      group_id: student.group_id || student.group?.id || '',
      parent_name: student.parent_name || '',
      parent_phone: student.parent_phone || '',
      parent_password: student.parent_user?.plain_password || '',
      address: student.address || '',
      branch_id: student.branch_id || student.branch?.id || '',
      status: student.status || 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (isManager) return;
    const isConfirmed = await confirm({
      title: "Talabani o'chirish",
      message: "Haqiqatdan ham ushbu talabani o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteStudent(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        loadAllData();
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.full_name.trim()) {
      setErrorMessage("Talaba ism-familiyasini kiriting");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage('Telefon raqamini kiriting');
      return;
    }

    try {
      if (viewMode === 'CREATE') {
        const generatedEmail = formData.email.trim()
          ? formData.email.trim()
          : `student_${Date.now()}@educrm.uz`;

        const userRes = await userApi.create({
          full_name: formData.full_name.trim(),
          phone: formData.phone.trim(),
          email: generatedEmail,
          password: formData.password || '123456',
          role: 'STUDENT',
          branch_id: formData.branch_id ? Number(formData.branch_id) : null,
          status: formData.status || 'active',
        });

        const createdUser = userRes.data?.data || userRes.data;
        if (!createdUser?.id) {
          throw new Error("Foydalanuvchi hisobini yaratib bo'lmadi");
        }

        const resolvedGroupId = formData.group_id
          ? formData.group_id
          : groupsList.find((g) => String(g.course_id) === String(formData.course_id))?.id || undefined;

        const res = await dispatch(
          createStudent({
            user_id: createdUser.id,
            group_id: resolvedGroupId ? Number(resolvedGroupId) : undefined,
            course_id: formData.course_id ? Number(formData.course_id) : undefined,
            parent_name: formData.parent_name?.trim(),
            parent_phone: formData.parent_phone?.trim(),
            parent_password: formData.parent_password?.trim() || undefined,
            address: formData.address?.trim(),
            branch_id: formData.branch_id ? Number(formData.branch_id) : undefined,
            status: formData.status || 'active',
          })
        );

        if (!res.error) {
          loadAllData();
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

        const resolvedGroupId = formData.group_id
          ? formData.group_id
          : groupsList.find((g) => String(g.course_id) === String(formData.course_id))?.id || null;

        const res = await dispatch(
          updateStudent({
            id: formData.id,
            data: {
              user_id: formData.user_id ? Number(formData.user_id) : undefined,
              group_id: resolvedGroupId ? Number(resolvedGroupId) : null,
              course_id: formData.course_id ? Number(formData.course_id) : null,
              parent_name: formData.parent_name?.trim() || null,
              parent_phone: formData.parent_phone?.trim() || null,
              parent_password: formData.parent_password?.trim() || undefined,
              address: formData.address?.trim() || null,
              branch_id: formData.branch_id ? Number(formData.branch_id) : null,
              status: formData.status || 'active',
            },
          })
        );

        if (!res.error) {
          loadAllData();
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

  return (
    <div className={styles.container}>
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 9999,
          background: '#0f172a',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13.5px',
          fontWeight: 600,
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      <Breadcrumbs
        items={[
          {
            label: 'Talabalar',
            onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined,
          },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
        ]}
      />

      {/* ======================================================== */}
      {/* 1. MAIN LIST VIEW: EXACT IMAGE 2 THEME + IMAGE 1 ITEMS    */}
      {/* ======================================================== */}
      {viewMode === 'LIST' && (
        <>
          {/* Top Toolbar: Left = Image 1 Marked Filters | Right = Search + Export + Yaratish */}
          <div className={styles.topBar}>
            {/* Filter Dropdowns marked in Image 1 (Guruh, Yo'nalish, Holat, ERP holati) */}
            <div className={styles.filtersGroup}>
              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>Guruh:</span>
                <select
                  className={styles.filterSelect}
                  value={filterGroup}
                  onChange={(e) => {
                    setFilterGroup(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Barchasi</option>
                  {groupsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>Yo'nalish:</span>
                <select
                  className={styles.filterSelect}
                  value={filterCourse}
                  onChange={(e) => {
                    setFilterCourse(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Barchasi</option>
                  {coursesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>Holat:</span>
                <select
                  className={styles.filterSelect}
                  value={filterHolat}
                  onChange={(e) => {
                    setFilterHolat(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Barchasi</option>
                  <option value="unblocked">Bloklanmagan</option>
                  <option value="blocked">Bloklangan</option>
                </select>
              </div>

              <div className={styles.filterItem}>
                <span className={styles.filterLabel}>ERP holati:</span>
                <select
                  className={styles.filterSelect}
                  value={filterErpStatus}
                  onChange={(e) => {
                    setFilterErpStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                >
                  <option value="">Barchasi</option>
                  <option value="O'qiyabdi">O'qiyabdi</option>
                  <option value="Bitirgan">Bitirgan</option>
                  <option value="Ketgan">Ketgan</option>
                  <option value="Muzlatilgan">Muzlatilgan</option>
                </select>
              </div>

              <button
                type="button"
                title="Filtrlarni tozalash"
                className={styles.filterResetBtn}
                onClick={resetAllFilters}
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Right Controls: Search Box + Export XLSX (+ Yaratish for Admin) */}
            <div className={styles.rightControls}>
              <div className={styles.searchBox}>
                <Search size={16} color="#64748b" />
                <input
                  type="text"
                  placeholder="Ism yoki telefon raqami bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className={styles.searchInput}
                />
              </div>

              {/* Export XLSX button placed at the top right */}
              <button
                type="button"
                className={styles.exportXlsxBtn}
                onClick={handleExportXLSX}
                title="Talabalar ro'yxatini Excel (.xlsx) formatida saqlab olish"
              >
                <FileSpreadsheet size={16} strokeWidth={2.2} />
                <span>Export XLSX file</span>
              </button>

              {/* Mint Create Button (only for Admins / hidden for Nazoratchi) */}
              {canManage && (
                <button
                  type="button"
                  className={styles.createBtn}
                  onClick={handleOpenCreate}
                >
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Yaratish</span>
                </button>
              )}
            </div>
          </div>

          {/* Table Container: EXACT BLUE HEADER THEME FROM IMAGE 2 */}
          {loading ? (
            <Loader text="Talabalar yuklanmoqda..." />
          ) : paginatedItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Talabalar topilmadi</p>
            </div>
          ) : (
            <div className={styles.tableCard}>
              <table className={styles.customTable}>
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                    <th>To'liq Ismi</th>
                    <th>Telefon raqami</th>
                    <th>Kurs</th>
                    <th>Ota-onasi</th>
                    <th style={{ textAlign: 'center' }}>ERP holat</th>
                    <th style={{ textAlign: 'center' }}>Holati</th>
                    <th style={{ textAlign: 'center' }}>Qo'shilgan sanasi</th>
                    <th style={{ textAlign: 'center', width: '220px' }}>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((student, idx) => {
                    const rowNumber = (currentPage - 1) * pageSize + idx + 1;
                    const fullName =
                      student.user?.full_name ||
                      student.full_name ||
                      student.name ||
                      `Talaba #${student.id}`;
                    const phone =
                      student.user?.phone || student.phone || '+998901234567';

                    // Course info
                    const group =
                      student.group ||
                      groupsList.find((g) => String(g.id) === String(student.group_id));
                    const course =
                      student.course ||
                      coursesList.find((c) => String(c.id) === String(student.course_id || group?.course_id));
                    const courseTitle = course?.name || group?.course?.name || 'Web Dasturlash';

                    const parentDisplay = student.parent_name
                      ? `${student.parent_name} (${student.parent_phone || '—'})`
                      : '—';

                    const isBlocked = checkIsBlocked(student);
                    const erpDisplay = getErpStatusDisplay(student.status);
                    const dateDisplay = formatDateUz(student.created_at || student.joined_at);

                    return (
                      <tr key={student.id}>
                        <td className={styles.indexCell}>{rowNumber}</td>
                        <td className={styles.nameCell}>{fullName}</td>
                        <td className={styles.phoneCell}>{phone}</td>
                        <td>
                          <span className={styles.courseBadge}>
                            {courseTitle}
                          </span>
                        </td>
                        <td style={{ color: '#475569', fontSize: '13px' }}>
                          {parentDisplay}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span className={styles.erpHolatText}>
                            {erpDisplay}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={
                              isBlocked ? styles.pillBlocked : styles.pillUnblocked
                            }
                          >
                            {isBlocked ? 'BLOKLANGAN' : 'FAOL'}
                          </span>
                        </td>
                        <td className={styles.dateCell} style={{ textAlign: 'center' }}>
                          {dateDisplay}
                        </td>
                        <td>
                          <div className={styles.actionsWrapper}>
                            {/* 1. Quick Add / Group Assign button (+) */}
                            <button
                              type="button"
                              className={styles.btnActionPlus}
                              title="Tezkor guruh biriktirish va holat"
                              onClick={(e) => handleOpenQuickModal(student, e)}
                            >
                              <Plus size={15} strokeWidth={2.5} />
                            </button>

                            {/* 2. Lock / Unlock Toggle button */}
                            <button
                              type="button"
                              className={
                                isBlocked ? styles.btnActionUnlock : styles.btnActionLock
                              }
                              title={
                                isBlocked ? 'Blokdan chiqarish' : 'Talabani bloklash'
                              }
                              onClick={(e) => handleToggleBlock(student, e)}
                            >
                              {isBlocked ? (
                                <Unlock size={14} strokeWidth={2.2} />
                              ) : (
                                <Lock size={14} strokeWidth={2.2} />
                              )}
                            </button>

                            {/* 3. SMS yuborish (Mail button) */}
                            <button
                              type="button"
                              className={styles.btnActionSms}
                              title="SMS yuborish"
                              onClick={(e) => handleOpenSmsModal(student, e)}
                            >
                              <Mail size={15} strokeWidth={2} />
                            </button>

                            {/* 3.1. Ota-ona maxsus profili & kirish ma'lumotlari */}
                            <button
                              type="button"
                              className={styles.btnActionParent}
                              title="Ota-ona maxsus profili va kirish ma'lumotlari"
                              onClick={(e) => handleOpenParentModal(student, e)}
                            >
                              <Users size={14} strokeWidth={2.2} />
                            </button>

                            {/* 4. Edit button & 5. Delete button */}
                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  className={styles.btnActionEdit}
                                  title="Tahrirlash"
                                  onClick={() => handleOpenEdit(student)}
                                >
                                  <Edit2 size={12} />
                                  <span>Tahrir</span>
                                </button>

                                <button
                                  type="button"
                                  className={styles.btnActionDelete}
                                  title="O'chirish"
                                  onClick={(e) => handleDelete(student.id, e)}
                                >
                                  <Trash2 size={12} />
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
      {/* 2. SMS YUBORISH MODAL (100% Functional)                  */}
      {/* ======================================================== */}
      {smsModalOpen && smsStudent && (
        <div className={styles.modalBackdrop} onClick={() => setSmsModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <Mail size={18} color="#2563eb" />
                <span>SMS Yuborish</span>
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setSmsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Recipient Details Card */}
              <div className={styles.recipientCard}>
                <div className={styles.recipientRow}>
                  <div className={styles.recipientName}>
                    {smsStudent.user?.full_name || smsStudent.full_name || 'Talaba'}
                  </div>
                  <div className={styles.recipientHhid}>
                    ID: #{smsStudent.id}
                  </div>
                </div>

                {/* Recipient Phone Selector */}
                <div className={styles.phoneSelectionGroup}>
                  <button
                    type="button"
                    className={`${styles.phoneOptionBtn} ${
                      smsRecipientType === 'student' ? styles.phoneOptionBtnActive : ''
                    }`}
                    onClick={() => {
                      setSmsRecipientType('student');
                      setSmsTargetPhone(smsStudent.user?.phone || smsStudent.phone || '');
                    }}
                  >
                    <User size={13} />
                    <span>Talaba: {smsStudent.user?.phone || smsStudent.phone || '—'}</span>
                  </button>

                  {smsStudent.parent_phone && (
                    <button
                      type="button"
                      className={`${styles.phoneOptionBtn} ${
                        smsRecipientType === 'parent' ? styles.phoneOptionBtnActive : ''
                      }`}
                      onClick={() => {
                        setSmsRecipientType('parent');
                        setSmsTargetPhone(smsStudent.parent_phone || '');
                      }}
                    >
                      <Phone size={13} />
                      <span>Ota-ona: {smsStudent.parent_phone}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ready SMS Templates */}
              <div className={styles.templatesSection}>
                <label className={styles.sectionSmallTitle}>Tayyor shablonlar:</label>
                <div className={styles.templatesGrid}>
                  <button
                    type="button"
                    className={styles.templateChip}
                    onClick={() => handleApplySmsTemplate('payment')}
                  >
                    To'lov eslatmasi
                  </button>
                  <button
                    type="button"
                    className={styles.templateChip}
                    onClick={() => handleApplySmsTemplate('lesson')}
                  >
                    Dars jadvali
                  </button>
                  <button
                    type="button"
                    className={styles.templateChip}
                    onClick={() => handleApplySmsTemplate('attendance')}
                  >
                    Davomat to'g'risida
                  </button>
                  <button
                    type="button"
                    className={styles.templateChip}
                    onClick={() => handleApplySmsTemplate('congrats')}
                  >
                    Tabriknoma
                  </button>
                  <button
                    type="button"
                    className={styles.templateChip}
                    onClick={() => handleApplySmsTemplate('custom')}
                  >
                    Bo'sh xabar
                  </button>
                </div>
              </div>

              {/* SMS Message Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className={styles.sectionSmallTitle}>SMS Matni:</label>
                <textarea
                  className={styles.smsTextarea}
                  rows={4}
                  placeholder="Xabar matnini kiriting..."
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                />
                <div className={styles.charCounter}>
                  <span>Qabul qiluvchi: <strong>{smsTargetPhone || '—'}</strong></span>
                  <span>{smsText.length} ta belgi ({Math.ceil(smsText.length / 160) || 1} ta SMS)</span>
                </div>
              </div>

              {/* Status Alert Banner */}
              {smsStatusAlert && (
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: smsStatusAlert.type === 'success' ? '#ecfdf5' : '#fef2f2',
                  color: smsStatusAlert.type === 'success' ? '#065f46' : '#991b1b',
                  border: `1px solid ${smsStatusAlert.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
                }}>
                  {smsStatusAlert.type === 'success' ? (
                    <CheckCircle2 size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  <span>{smsStatusAlert.text}</span>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setSmsModalOpen(false)}
                disabled={smsSending}
              >
                Bekor qilish
              </button>

              <button
                type="button"
                className={styles.btnPrimarySms}
                onClick={handleSendSms}
                disabled={smsSending || !smsTargetPhone.trim() || !smsText.trim()}
              >
                <Send size={15} />
                <span>{smsSending ? 'Yuborilmoqda...' : 'SMS Yuborish'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. QUICK GROUP & ERP STATUS MODAL (+)                    */}
      {/* ======================================================== */}
      {quickModalOpen && quickStudent && (
        <div className={styles.modalBackdrop} onClick={() => setQuickModalOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                <Plus size={18} color="#10b981" />
                <span>Guruh va ERP holati</span>
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setQuickModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.recipientCard}>
                <div className={styles.recipientName}>
                  {quickStudent.user?.full_name || quickStudent.full_name || 'Talaba'}
                </div>
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  ID: #{quickStudent.id} • {quickStudent.user?.phone || quickStudent.phone || '—'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className={styles.filterLabel}>Guruhga biriktirish:</label>
                <select
                  className={styles.filterSelect}
                  value={quickGroupId}
                  onChange={(e) => setQuickGroupId(e.target.value)}
                >
                  <option value="">Guruhsiz</option>
                  {groupsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label className={styles.filterLabel}>ERP holati:</label>
                <select
                  className={styles.filterSelect}
                  value={quickErpStatus}
                  onChange={(e) => setQuickErpStatus(e.target.value)}
                >
                  <option value="active">O'qiyabdi (Faol)</option>
                  <option value="graduated">Bitirgan</option>
                  <option value="dropped">Ketgan</option>
                  <option value="frozen">Muzlatilgan</option>
                </select>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setQuickModalOpen(false)}
                disabled={quickSaving}
              >
                Bekor qilish
              </button>
              <button
                type="button"
                className={styles.exportXlsxBtn}
                onClick={handleSaveQuickModal}
                disabled={quickSaving}
              >
                <Save size={15} />
                <span>{quickSaving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* OTA-ONA MAXSUS PROFILI MODALI                           */}
      {/* ======================================================== */}
      {parentModalOpen && parentModalStudent && (
        <div className={styles.modalBackdrop} onClick={() => setParentModalOpen(false)}>
          <div
            className={styles.modalContent}
            style={{ maxWidth: '980px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 34,
                  height: 34,
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={18} />
                </div>
                <div>
                  <h3 className={styles.modalTitle} style={{ margin: 0, fontSize: '15.5px' }}>
                    Ota-ona profili: {parentModalStudent.user?.full_name || parentModalStudent.name || parentModalStudent.full_name}
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Tizimga kirish hisobi va umumiy o'quv natijalari
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setParentModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody} style={{ padding: '16px 20px' }}>
              {/* Credentials Box */}
              <div className={styles.parentCredsCard}>
                <div className={styles.parentCredsHeader}>
                  <div className={styles.parentCredsTitle}>
                    <KeyRound size={15} color="#2563eb" />
                    <span>Kirish ma'lumotlari</span>
                  </div>
                  <div className={styles.parentCredsActions}>
                    <button
                      type="button"
                      className={styles.btnSecondarySm}
                      onClick={handleCopyParentShareText}
                      title="Ota-onaga yuborish uchun matnni nusxalash"
                    >
                      <Copy size={13} />
                      <span>Nusxalash</span>
                    </button>

                    <button
                      type="button"
                      className={styles.btnSecondarySm}
                      onClick={() => setShowParentPasswordEdit(!showParentPasswordEdit)}
                    >
                      <Edit2 size={13} />
                      <span>Parolni yangilash</span>
                    </button>
                  </div>
                </div>

                {parentCopyToast && (
                  <div style={{
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#16a34a',
                    fontSize: '12px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    fontWeight: 600
                  }}>
                    ✓ {parentCopyToast}
                  </div>
                )}

                <div className={styles.parentCredsGrid}>
                  <div className={styles.parentCredsCol}>
                    <span className={styles.credLabel}>Ota-onasi</span>
                    <span className={styles.credVal}>
                      {parentCreds?.parent_name || parentModalStudent.parent_name || 'Kiritilmagan'}
                    </span>
                  </div>

                  <div className={styles.parentCredsCol}>
                    <span className={styles.credLabel}>Login (Telefon)</span>
                    <span className={styles.credValPhone}>
                      {parentCreds?.login || parentModalStudent.parent_phone || '—'}
                    </span>
                  </div>

                  <div className={styles.parentCredsCol}>
                    <span className={styles.credLabel}>Parol</span>
                    <span className={styles.credValPass}>
                      {parentCreds?.password || '123456'}
                    </span>
                  </div>
                </div>

                {showParentPasswordEdit && (
                  <div className={styles.parentPasswordEditRow}>
                    <input
                      type="text"
                      placeholder="Yangi parol"
                      value={parentPasswordEdit}
                      onChange={(e) => setParentPasswordEdit(e.target.value)}
                      className={styles.cleanInputSm}
                    />
                    <button
                      type="button"
                      onClick={handleSaveParentPassword}
                      className={styles.btnSaveSm}
                    >
                      Saqlash
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowParentPasswordEdit(false)}
                      className={styles.btnCancelSm}
                    >
                      Bekor qilish
                    </button>
                  </div>
                )}
              </div>

              {/* Real-time Embedded Parent View (Baholar, Davomat, Dars kunlari) */}
              <ParentPortal studentId={parentModalStudent.id} isModal={true} />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. CREATE & EDIT FORM VIEW                               */}
      {/* ======================================================== */}
      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <div className={styles.formCard}>
          <div style={{ marginBottom: '20px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {viewMode === 'CREATE' ? "Yangi Talaba Qo'shish" : "Talaba Ma'lumotlarini Tahrirlash"}
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
              Kerakli ma'lumotlarni to'ldiring va saqlang
            </p>
          </div>

          {errorMessage && (
            <div style={{
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
            }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Talaba Ism-Familiyasi (F.I.SH) *</label>
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
                <label className={styles.formLabel}>Tizimga kirish paroli</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Kurs</label>
                <select
                  className={styles.formInput}
                  value={formData.course_id || ''}
                  onChange={(e) => {
                    const selectedCourseId = e.target.value;
                    const matchedGroup = groupsList.find(
                      (g) => String(g.course_id) === String(selectedCourseId)
                    );
                    setFormData({
                      ...formData,
                      course_id: selectedCourseId,
                      group_id: matchedGroup ? matchedGroup.id : '',
                    });
                  }}
                >
                  <option value="">Kursni tanlang</option>
                  {coursesList.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Guruh</label>
                <select
                  className={styles.formInput}
                  value={formData.group_id || ''}
                  onChange={(e) => {
                    const selectedGroupId = e.target.value;
                    const grp = groupsList.find((g) => String(g.id) === String(selectedGroupId));
                    setFormData({
                      ...formData,
                      group_id: selectedGroupId,
                      course_id: grp?.course_id || formData.course_id,
                    });
                  }}
                >
                  <option value="">Guruhni tanlang</option>
                  {groupsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ota-onasi ismi</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ota-onasi telefon raqami</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Ota-onasi tizimga kirish paroli</label>
                <input
                  type="text"
                  placeholder="Standart parol: 123456"
                  className={styles.formInput}
                  value={formData.parent_password}
                  onChange={(e) => setFormData({ ...formData, parent_password: e.target.value })}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Manzil</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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

              <div className={`${styles.formGroup} ${styles.formGroupFull}`}>
                <label className={styles.formLabel}>ERP Holati</label>
                <select
                  className={styles.formInput}
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="active">O'qiyabdi (Faol)</option>
                  <option value="graduated">Bitirgan</option>
                  <option value="dropped">Ketgan</option>
                  <option value="frozen">Muzlatilgan</option>
                  <option value="blocked">Bloklangan</option>
                </select>
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
                    <span>{viewMode === 'CREATE' ? 'Yaratish' : 'Saqlash'}</span>
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

export default Students;
