import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import teacherApi from '../../services/teacherApi';
import groupApi from '../../services/groupApi';
import branchApi from '../../services/branchApi';
import teacherAttendanceApi from '../../services/teacherAttendanceApi';
import { exportTeacherAttendanceExcel } from '../../utils/helpers/exportTeacherAttendanceExcel';
import { Loader } from '../../components';
import styles from './teacherAttendance.module.css';
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  Save,
  RefreshCw,
  Table,
  List,
  Sparkles,
  X,
  History,
  TrendingUp,
  Banknote,
  DollarSign,
  Printer,
  ShieldCheck,
  Eye,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Filter,
  SlidersHorizontal,
  Building2,
} from 'lucide-react';

const MONTH_NAMES_UZ = [
  'Yanvar',
  'Fevral',
  'Mart',
  'Aprel',
  'May',
  'Iyun',
  'Iyul',
  'Avgust',
  'Sentyabr',
  'Oktyabr',
  'Noyabr',
  'Dekabr',
];

const UZ_DAYS_SHORT = ['Ya', 'Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'OQ';
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

const pad2 = (n) => String(n).padStart(2, '0');

export const TeacherAttendanceSection = () => {
  const { user } = useSelector((state) => state.auth || {});
  const [searchParams] = useSearchParams();

  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const canManage = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'NAZORATCHI', 'SUPERVISOR', 'INSPECTOR', 'ACCOUNTANT', 'BUXGALTER', 'STAFF'].includes(userRole);
  if (!canManage) {
    return null;
  }
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN' || user?.is_superadmin;
  const userBranchId = user?.branch_id || user?.branch?.id;
  const userCenterName = user?.branch?.name || "Yuksalish Talimi";

  const rawPosition = (user?.position || user?.employee?.position || user?.employee_profile?.position || user?.role || '').toLowerCase();
  const isAccountant = rawPosition.includes('buxgalter') || rawPosition.includes('bugalter') || rawPosition.includes('accountant');

  // Current real-world date
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;

  // Month state (defaults to current month)
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth() + 1); // 1-indexed (1..12)

  // View Mode: 'monthly' (1 oylik to'liq jadval) | 'daily' (kunlik tafsilot) | 'payroll' (Buxgalteriya oylik hisobi)
  const initialViewMode = searchParams.get('view') === 'payroll' || isAccountant ? 'payroll' : 'monthly';
  const [viewMode, setViewMode] = useState(initialViewMode);

  // Selected date for daily mode
  const [selectedDailyDate, setSelectedDailyDate] = useState(todayIso);

  // Active cell popover for quick status selection: `${teacherId}_${dateIso}`
  const [activeCellKey, setActiveCellKey] = useState(null);

  const [teachersList, setTeachersList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [branchesList, setBranchesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'present' | 'absent' | 'late' | 'excused'
  const [branchFilter, setBranchFilter] = useState('all');
  const [successToast, setSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Excel (.xlsx) Export & Advanced Filter State
  const [isExportModalOpen, setIsExportModalOpen] = useState(
    () => searchParams.get('export') === 'true'
  );
  const [exporting, setExporting] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    dateMode: 'month', // 'month' | 'other_month' | 'range' | 'single'
    selectedYear: now.getFullYear(),
    selectedMonth: now.getMonth() + 1,
    startDate: `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-01`,
    endDate: todayIso,
    singleDate: todayIso,
    teacherId: 'all',
    status: 'all',
    branchId: !isSuperAdmin && userBranchId ? String(userBranchId) : 'all',
  });
  const [exportSheets, setExportSheets] = useState({
    detailed: true,
    matrix: true,
    summary: true,
  });

  // Payroll & Deductions state for Buxgalteriya
  const [payrollData, setPayrollData] = useState(null);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [latePenaltyRate, setLatePenaltyRate] = useState(10000); // 10,000 UZS per late arrival
  const [selectedTeacherForLateDetails, setSelectedTeacherForLateDetails] = useState(null);
  const [isLateModalOpen, setIsLateModalOpen] = useState(false);

  // Matrix: { [`${teacherId}_${dateIso}`]: { status: 'present'|'absent'|'late'|'excused', check_in, check_out, note, isModified } }
  const [attendanceMatrix, setAttendanceMatrix] = useState({});

  // 1. Generate Days in the Selected Month
  const monthDays = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth, 0).getDate();
    const days = [];
    for (let day = 1; day <= totalDays; day++) {
      const dateIso = `${currentYear}-${pad2(currentMonth)}-${pad2(day)}`;
      const dObj = new Date(currentYear, currentMonth - 1, day);
      const dayOfWeek = dObj.getDay(); // 0 = Sun
      const isSunday = dayOfWeek === 0;
      const isToday = dateIso === todayIso;
      const isPast = dateIso < todayIso;
      const isFuture = dateIso > todayIso;

      days.push({
        dayNumber: day,
        dayNumberPadded: pad2(day),
        dateIso,
        dayOfWeek,
        shortDayName: UZ_DAYS_SHORT[dayOfWeek],
        isSunday,
        isToday,
        isPast,
        isFuture,
      });
    }
    return days;
  }, [currentYear, currentMonth, todayIso]);

  // 2. Fetch Foundation Data (Teachers, Groups & Branches)
  useEffect(() => {
    const fetchBase = async () => {
      try {
        const [resTeachers, resGroups, resBranches] = await Promise.all([
          teacherApi.getAll({ limit: 150 }).catch(() => ({ data: [] })),
          groupApi.getAll({ limit: 300 }).catch(() => ({ data: [] })),
          branchApi.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        ]);
        let tList = resTeachers.data?.data || (Array.isArray(resTeachers.data) ? resTeachers.data : []);
        let gList = resGroups.data?.data || (Array.isArray(resGroups.data) ? resGroups.data : []);
        let bList = resBranches.data?.data || (Array.isArray(resBranches.data) ? resBranches.data : []);

        // Nazoratchi va filial xodimlari uchun filial filtri (agar mos kelsa)
        if (!isSuperAdmin && userBranchId) {
          const branchTeachers = tList.filter((t) => String(t.branch_id || t.user?.branch_id) === String(userBranchId));
          if (branchTeachers.length > 0) {
            tList = branchTeachers;
          }
          const branchGroups = gList.filter((g) => String(g.branch_id) === String(userBranchId));
          if (branchGroups.length > 0) {
            gList = branchGroups;
          }
          const branchMatched = bList.filter((b) => String(b.id) === String(userBranchId));
          if (branchMatched.length > 0) {
            bList = branchMatched;
          } else {
            bList = [{ id: userBranchId, name: userCenterName }];
          }
        }

        setTeachersList(tList);
        setGroupsList(gList);
        setBranchesList(bList);
      } catch (err) {
        console.error('Failed to load teachers/groups/branches:', err);
      }
    };
    fetchBase();
  }, [isSuperAdmin, userBranchId, userCenterName]);

  // 3. Load 1-Month Attendance Data for Current Year and Month
  const loadMonthData = async (year, month) => {
    setLoading(true);
    try {
      const totalDays = new Date(year, month, 0).getDate();
      const startDate = `${year}-${pad2(month)}-01`;
      const endDate = `${year}-${pad2(month)}-${pad2(totalDays)}`;

      const res = await teacherAttendanceApi.getAll({ startDate, endDate });
      const records = res.data?.data || (Array.isArray(res.data) ? res.data : []);

      const matrix = {};
      let hasFutureStoredRecords = false;
      records.forEach((rec) => {
        if (rec.teacher_id && rec.date) {
          // Kelajakdagi kunlar bazada bo'lsa ham ularni matritsaga chiqarmaymiz
          if (rec.date > todayIso) {
            hasFutureStoredRecords = true;
            return;
          }
          const key = `${rec.teacher_id}_${rec.date}`;
          matrix[key] = {
            id: rec.id,
            status: rec.status || 'present',
            check_in: rec.check_in || '',
            check_out: rec.check_out || '',
            note: rec.note || '',
            isModified: false,
          };
        }
      });
      setAttendanceMatrix(matrix);

      // Agar bazada kelajak sanasidagi yozuvlar bo'lsa, ularni tozalaymiz
      if (hasFutureStoredRecords && teacherAttendanceApi.cleanupFuture) {
        teacherAttendanceApi.cleanupFuture().catch((err) => {
          console.warn('Avtomatik cleanup da xatolik:', err);
        });
      }
    } catch (err) {
      console.error('Failed to load monthly teacher attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthData(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const loadPayrollData = async (y = currentYear, m = currentMonth, penalty = latePenaltyRate) => {
    setPayrollLoading(true);
    try {
      const res = await teacherAttendanceApi.getPayrollReport({
        year: y,
        month: m,
        latePenalty: penalty,
        branch_id: user?.branch_id || undefined,
      });
      if (res?.data?.success) {
        setPayrollData(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load payroll report:', err);
    } finally {
      setPayrollLoading(false);
    }
  };

  useEffect(() => {
    loadPayrollData(currentYear, currentMonth, latePenaltyRate);
  }, [currentYear, currentMonth, latePenaltyRate]);

  // Outside click to close popover
  useEffect(() => {
    const handleOutside = (e) => {
      if (!e.target.closest(`.${styles.matrixCellWrapper}`)) {
        setActiveCellKey(null);
      }
    };
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, []);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonthJump = () => {
    const d = new Date();
    setCurrentYear(d.getFullYear());
    setCurrentMonth(d.getMonth() + 1);
  };

  // Set single cell status and immediately persist to Database
  const handleSetCellStatus = async (teacherId, dateIso, status) => {
    if (dateIso > todayIso) {
      setToastMessage("Kelajakdagi sana uchun davomat belgilab bo'lmaydi!");
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 2500);
      return;
    }

    const key = `${teacherId}_${dateIso}`;
    const curr = attendanceMatrix[key] || {};
    setActiveCellKey(null);

    if (!status) {
      // Clear/delete
      setAttendanceMatrix((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });

      if (curr.id) {
        try {
          await teacherAttendanceApi.delete(curr.id);
          loadPayrollData(currentYear, currentMonth, latePenaltyRate);
        } catch (e) {
          console.error('Delete attendance error:', e);
        }
      }
      return;
    }

    const checkInTime = curr.check_in || (status === 'present' || status === 'late' ? '09:00' : null);

    // Optimistically update
    setAttendanceMatrix((prev) => ({
      ...prev,
      [key]: {
        ...curr,
        status,
        check_in: checkInTime,
        isModified: false,
      },
    }));

    try {
      const res = await teacherAttendanceApi.create({
        teacher_id: Number(teacherId),
        date: dateIso,
        status,
        check_in: checkInTime,
        check_out: curr.check_out || null,
        note: curr.note || null,
        marked_by: user?.id || null,
      });

      if (res?.data?.data?.id) {
        setAttendanceMatrix((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            id: res.data.data.id,
            isModified: false,
          },
        }));
      }

      loadPayrollData(currentYear, currentMonth, latePenaltyRate);
    } catch (e) {
      console.error('Single cell save error:', e);
      // Mark as modified if failed so user can manually use Saqlash button
      setAttendanceMatrix((prev) => ({
        ...prev,
        [key]: { ...prev[key], isModified: true },
      }));
    }
  };

  // Cycle status on cell click if not using popover
  const handleCellClick = (teacherId, dateIso) => {
    if (dateIso > todayIso) {
      return; // Kelajakdagi kunlar bloklangan
    }
    const key = `${teacherId}_${dateIso}`;
    if (activeCellKey === key) {
      setActiveCellKey(null);
    } else {
      setActiveCellKey(key);
    }
  };

  // Bulk mark all teachers as Present for TODAY and save directly to DB
  const handleBulkPresentToday = async () => {
    if (bulkSaving || saving) return;

    const targetDate = todayIso;
    const targetTeachers = filteredTeachers && filteredTeachers.length > 0 ? filteredTeachers : teachersList;

    if (!targetTeachers || targetTeachers.length === 0) {
      setToastMessage("Belgilash uchun o'qituvchilar topilmadi");
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 2500);
      return;
    }

    setBulkSaving(true);

    // 1. Optimistically update local matrix
    setAttendanceMatrix((prev) => {
      const next = { ...prev };
      targetTeachers.forEach((t) => {
        const key = `${t.id}_${targetDate}`;
        next[key] = {
          ...(prev[key] || {}),
          status: 'present',
          check_in: prev[key]?.check_in || '09:00',
          isModified: false,
        };
      });
      return next;
    });

    // 2. Persist to backend database via bulk API
    try {
      const itemsToSave = targetTeachers.map((t) => {
        const key = `${t.id}_${targetDate}`;
        const existing = attendanceMatrix[key] || {};
        return {
          teacher_id: Number(t.id),
          date: targetDate,
          status: 'present',
          check_in: existing.check_in || '09:00',
          check_out: existing.check_out || null,
          note: existing.note || null,
          marked_by: user?.id || null,
          branch_id: t.branch_id || t.user?.branch_id || user?.branch_id || null,
        };
      });

      await teacherAttendanceApi.bulk({
        items: itemsToSave,
        meta: { marked_by: user?.id, branch_id: user?.branch_id },
      });

      setToastMessage(`Bugungi kun (${targetDate}) barcha ${itemsToSave.length} ta o'qituvchiga 'Keldi' belgilandi va bazada muvaffaqiyatli saqlandi!`);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);

      // 3. Reload fresh data to sync with DB
      await loadMonthData(currentYear, currentMonth);
      loadPayrollData(currentYear, currentMonth, latePenaltyRate);
    } catch (err) {
      console.error("Bulk mark present error:", err);
      alert("Davomatni bazaga saqlashda xatolik yuz berdi: " + (err.response?.data?.message || err.message));
      await loadMonthData(currentYear, currentMonth);
    } finally {
      setBulkSaving(false);
    }
  };

  // Save All Modified Records for the Month
  const handleSaveMonthChanges = async () => {
    setSaving(true);
    try {
      const itemsToSave = [];
      Object.keys(attendanceMatrix).forEach((key) => {
        const item = attendanceMatrix[key];
        if (item && item.isModified && item.status) {
          const [teacherId, dateIso] = key.split('_');
          if (dateIso <= todayIso) {
            itemsToSave.push({
              teacher_id: Number(teacherId),
              date: dateIso,
              status: item.status,
              check_in: item.check_in || null,
              check_out: item.check_out || null,
              note: item.note || null,
              marked_by: user?.id || null,
            });
          }
        }
      });

      if (itemsToSave.length === 0) {
        setToastMessage("Saqlash uchun o'zgarishlar kiritilmagan");
        setSuccessToast(true);
        setTimeout(() => setSuccessToast(false), 2000);
        setSaving(false);
        return;
      }

      await teacherAttendanceApi.bulk({
        items: itemsToSave,
        meta: { marked_by: user?.id, branch_id: user?.branch_id },
      });

      setToastMessage(`${itemsToSave.length} ta davomat saqlandi va Buxgalteriyaga avtomatik yo'naltirildi! (Oylik ushlanmalari sinxronlandi)`);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3500);

      // Reload fresh data and payroll data
      await loadMonthData(currentYear, currentMonth);
      loadPayrollData(currentYear, currentMonth, latePenaltyRate);
    } catch (err) {
      alert("Davomatni saqlashda xatolik: " + (err.response?.data?.message || err.message));
    } finally {
      setSaving(false);
    }
  };

  // Filtered teachers list with on-screen Search, Status and Branch filters
  const filteredTeachers = useMemo(() => {
    return teachersList.filter((t) => {
      const fullName = (t.user?.full_name || t.name || '').toLowerCase();
      const spec = (t.specialization || '').toLowerCase();
      const phone = (t.user?.phone || t.phone || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || fullName.includes(q) || spec.includes(q) || phone.includes(q);
      if (!matchesSearch) return false;

      // Status filter
      if (statusFilter && statusFilter !== 'all') {
        let hasStatus = false;
        for (const d of monthDays) {
          const rec = attendanceMatrix[`${t.id}_${d.dateIso}`];
          if (rec && rec.status === statusFilter) {
            hasStatus = true;
            break;
          }
        }
        if (!hasStatus) return false;
      }

      // Branch filter
      if (branchFilter && branchFilter !== 'all') {
        const bId = t.branch_id || t.user?.branch_id || t.branch?.id;
        if (String(bId) !== String(branchFilter)) return false;
      }

      return true;
    });
  }, [teachersList, searchQuery, statusFilter, branchFilter, monthDays, attendanceMatrix]);

  // Handle Export Excel with AutoFilter
  const handleExportExcel = async (overrideConfig = null) => {
    setExporting(true);
    try {
      const cfg = overrideConfig || exportFilters;
      let extraRecords = [];

      // If user selected a custom date range or single date or another month
      if (cfg.dateMode === 'range' && cfg.startDate && cfg.endDate) {
        const res = await teacherAttendanceApi.getAll({
          startDate: cfg.startDate,
          endDate: cfg.endDate,
          teacher_id: cfg.teacherId !== 'all' ? cfg.teacherId : undefined,
          branch_id: cfg.branchId !== 'all' ? cfg.branchId : undefined,
          status: cfg.status !== 'all' ? cfg.status : undefined,
        });
        extraRecords = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      } else if (cfg.dateMode === 'single' && cfg.singleDate) {
        const res = await teacherAttendanceApi.getAll({
          date: cfg.singleDate,
          teacher_id: cfg.teacherId !== 'all' ? cfg.teacherId : undefined,
          branch_id: cfg.branchId !== 'all' ? cfg.branchId : undefined,
          status: cfg.status !== 'all' ? cfg.status : undefined,
        });
        extraRecords = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      } else if (
        cfg.dateMode === 'other_month' &&
        (Number(cfg.selectedYear) !== currentYear || Number(cfg.selectedMonth) !== currentMonth)
      ) {
        const totalDays = new Date(cfg.selectedYear, cfg.selectedMonth, 0).getDate();
        const res = await teacherAttendanceApi.getAll({
          startDate: `${cfg.selectedYear}-${pad2(cfg.selectedMonth)}-01`,
          endDate: `${cfg.selectedYear}-${pad2(cfg.selectedMonth)}-${pad2(totalDays)}`,
          teacher_id: cfg.teacherId !== 'all' ? cfg.teacherId : undefined,
          branch_id: cfg.branchId !== 'all' ? cfg.branchId : undefined,
          status: cfg.status !== 'all' ? cfg.status : undefined,
        });
        extraRecords = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      }

      const res = await exportTeacherAttendanceExcel({
        teachers: teachersList,
        groups: groupsList,
        branches: branchesList,
        matrix: attendanceMatrix,
        monthDays,
        year: cfg.dateMode === 'other_month' ? cfg.selectedYear : currentYear,
        month: cfg.dateMode === 'other_month' ? cfg.selectedMonth : currentMonth,
        payrollData,
        latePenaltyRate,
        filters: cfg,
        sheetOptions: exportSheets,
        extraRecords,
      });

      setToastMessage(
        `O'qituvchilar davomati Excel (.xlsx) faylga muvaffaqiyatli yuklandi! (${res.totalTeachers} ustoz, AutoFilter faollashtirilgan)`
      );
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 4000);
      setIsExportModalOpen(false);
    } catch (err) {
      alert("Excelga eksport qilishda xatolik: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleQuickExport = () => {
    handleExportExcel({
      dateMode: 'month',
      selectedYear: currentYear,
      selectedMonth: currentMonth,
      startDate: '',
      endDate: '',
      singleDate: '',
      teacherId: 'all',
      status: statusFilter || 'all',
      branchId: branchFilter || 'all',
    });
  };

  // Calculate monthly stats per teacher and staff-wide totals
  const { teacherStatsMap, staffWideStats } = useMemo(() => {
    const tStatsMap = {};
    let totalPresents = 0;
    let totalAbsents = 0;
    let totalLates = 0;
    let totalExcused = 0;

    // Working days up to today in this month (exclude Sundays)
    const activeWorkingDays = monthDays.filter((d) => !d.isSunday && !d.isFuture);
    const totalWorkingDaysCount = activeWorkingDays.length || 1;

    teachersList.forEach((t) => {
      let p = 0;
      let a = 0;
      let l = 0;
      let e = 0;

      monthDays.forEach((d) => {
        if (d.isFuture) return; // Kelajak kunlarni hisoblamaymiz
        const key = `${t.id}_${d.dateIso}`;
        const rec = attendanceMatrix[key];
        if (rec && rec.status) {
          const s = rec.status.toLowerCase();
          if (s === 'present') p++;
          else if (s === 'absent') a++;
          else if (s === 'late') l++;
          else if (s === 'excused') e++;
        }
      });

      totalPresents += p;
      totalAbsents += a;
      totalLates += l;
      totalExcused += e;

      // Rate: based on working days up to today
      const pct = Math.min(100, Math.round((p / totalWorkingDaysCount) * 100));

      tStatsMap[t.id] = {
        present: p,
        absent: a,
        late: l,
        excused: e,
        percentage: pct,
      };
    });

    const totalTeachersCount = teachersList.length || 1;
    const avgPercentage = Math.round(
      Object.values(tStatsMap).reduce((acc, curr) => acc + curr.percentage, 0) / totalTeachersCount
    );

    return {
      teacherStatsMap: tStatsMap,
      staffWideStats: {
        totalTeachers: teachersList.length,
        avgPercentage: avgPercentage || 0,
        totalPresents,
        totalAbsents,
        totalLates,
        totalExcused,
        workingDaysCount: totalWorkingDaysCount,
      },
    };
  }, [teachersList, monthDays, attendanceMatrix]);

  return (
    <div className={styles.sectionWrapper}>
      {/* Toast Notification */}
      {successToast && (
        <div className={styles.toastSuccess}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 5 KPI Metric Cards for the 1-Month Period */}
      {viewMode !== 'payroll' && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLeft}>
              <span className={styles.statLabel}>Oy davomati ko'rsatkichi</span>
              <div className={styles.statValue}>{staffWideStats.avgPercentage}%</div>
              <span className={styles.statSubtext}>
                {MONTH_NAMES_UZ[currentMonth - 1]} oyi o'rtacha davomati
              </span>
            </div>
            <div className={`${styles.statIconBadge} ${styles.statIconBlue}`}>
              <TrendingUp size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLeft}>
              <span className={styles.statLabel}>Jami Keldi (K)</span>
              <div className={styles.statValue}>{staffWideStats.totalPresents} ta</div>
              <span className={styles.statSubtext}>Barcha ustozlar bo'yicha jami kelishlar</span>
            </div>
            <div className={`${styles.statIconBadge} ${styles.statIconGreen}`}>
              <CheckCircle2 size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLeft}>
              <span className={styles.statLabel}>Jami Kelmadi (Y)</span>
              <div className={styles.statValue}>{staffWideStats.totalAbsents} ta</div>
              <span className={styles.statSubtext}>Ustozlar darsga chiqmagan holatlar</span>
            </div>
            <div className={`${styles.statIconBadge} ${styles.statIconRed}`}>
              <XCircle size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLeft}>
              <span className={styles.statLabel}>Kechikishlar (KCH)</span>
              <div className={styles.statValue}>{staffWideStats.totalLates} ta</div>
              <span className={styles.statSubtext}>Darsga kech qolgan holatlar</span>
            </div>
            <div className={`${styles.statIconBadge} ${styles.statIconYellow}`}>
              <Clock size={22} />
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statLeft}>
              <span className={styles.statLabel}>Sababli (S)</span>
              <div className={styles.statValue}>{staffWideStats.totalExcused} ta</div>
              <span className={styles.statSubtext}>Ariza / sababli qoldirilgan</span>
            </div>
            <div className={`${styles.statIconBadge} ${styles.statIconPurple}`}>
              <AlertCircle size={22} />
            </div>
          </div>
        </div>
      )}

      {/* Control Row: Month Selector, Mode Tabs, Search & Save */}
      <div className={styles.controlRow}>
        {/* Month Selector */}
        <div className={styles.monthNavGroup}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={handlePrevMonth}
            title="Oldingi oy"
          >
            <ChevronLeft size={18} />
          </button>

          <div className={styles.monthTitleBadge}>
            <Calendar size={16} color="#2563eb" />
            <span>
              {currentYear}-yil {MONTH_NAMES_UZ[currentMonth - 1]} ({monthDays.length} kun)
            </span>
          </div>

          <button
            type="button"
            className={styles.navBtn}
            onClick={handleNextMonth}
            title="Keyingi oy"
          >
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className={styles.todayPill}
            onClick={handleCurrentMonthJump}
            title="Hozirgi joriy oyga o'tish"
          >
            Joriy oy
          </button>
        </div>

        {/* View Mode Switcher: Oylik Jadval vs Kunlik Tafsilot vs Oylik Maosh */}
        <div className={styles.modeTabsGroup}>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${viewMode === 'monthly' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setViewMode('monthly')}
          >
            <Table size={15} />
            <span>1 Oylik Jadval</span>
          </button>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${viewMode === 'daily' ? styles.modeTabBtnActive : ''}`}
            onClick={() => setViewMode('daily')}
          >
            <List size={15} />
            <span>Kunlik Tafsilot</span>
          </button>
          <button
            type="button"
            className={`${styles.modeTabBtn} ${styles.modeTabBtnPayroll} ${viewMode === 'payroll' ? styles.modeTabBtnPayrollActive : ''}`}
            onClick={() => setViewMode('payroll')}
          >
            <Banknote size={15} />
            <span>Oylik Maosh & Ushlanmalar</span>
            {staffWideStats.totalLates > 0 && (
              <span className={styles.payrollLateCounterBadge}>
                {staffWideStats.totalLates} kechikish
              </span>
            )}
          </button>
        </div>

        {/* Search, Filters & Actions */}
        <div className={styles.searchAndActions}>
          <div className={styles.searchBox}>
            <Search size={15} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="O'qituvchini qidirish..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Quick Status Filter on screen */}
          <select
            className={styles.toolbarFilterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Davomat holati bo'yicha saralash"
          >
            <option value="all">Barcha holatlar</option>
            <option value="present">Faqat Keldi (K)</option>
            <option value="absent">Faqat Kelmadi (Y)</option>
            <option value="late">Faqat Kechikdi (KCH)</option>
            <option value="excused">Faqat Sababli (S)</option>
          </select>

          {statusFilter !== 'all' && (
            <button
              type="button"
              className={styles.resetFilterChipBtn}
              onClick={() => setStatusFilter('all')}
              title="Davomat holati filtrini bekor qilish"
            >
              <X size={13} />
              <span>Barchasi</span>
            </button>
          )}

          {/* Branch Filter / Single Center Badge */}
          {!isSuperAdmin ? (
            <div className={styles.singleCenterBadge} title="Siz biriktirilgan o'quv markazi">
              <Building2 size={15} className={styles.centerBadgeIcon} />
              <span className={styles.centerBadgeText}>
                {user?.branch?.name || branchesList[0]?.name || userCenterName}
              </span>
            </div>
          ) : (
            branchesList.length > 1 && (
              <select
                className={styles.toolbarFilterSelect}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                title="Filial bo'yicha saralash"
              >
                <option value="all">Barcha filiallar</option>
                {branchesList.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )
          )}

          {/* Excel Export Button with AutoFilter badge */}
          <button
            type="button"
            className={styles.exportXlsxBtn}
            onClick={() => setIsExportModalOpen(true)}
            title="O'qituvchilar davomatini Excel (.xlsx) formatida avto-filtrlar bilan yuklab olish"
          >
            <FileSpreadsheet size={16} />
            <span>Excel (.xlsx) Yuklab Olish</span>
            <span className={styles.excelBadgeTag}>Filtrli</span>
          </button>

          <button
            type="button"
            className={styles.bulkPresentBtn}
            onClick={handleBulkPresentToday}
            disabled={bulkSaving || saving}
            title="Bugungi kunga barcha o'qituvchilarga 'Keldi' belgilash va bazada saqlash"
          >
            {bulkSaving ? (
              <RefreshCw size={15} className={styles.spinIcon} />
            ) : (
              <Check size={15} strokeWidth={2.5} />
            )}
            <span>{bulkSaving ? "Saqlanmoqda..." : "Bugun: Barchasi Keldi"}</span>
          </button>

          <button
            type="button"
            className={styles.saveChangesBtn}
            onClick={handleSaveMonthChanges}
            disabled={saving || bulkSaving}
          >
            <Save size={15} />
            <span>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</span>
          </button>
        </div>
      </div>

      {/* Active Filter Notice */}
      {(statusFilter !== 'all' || branchFilter !== 'all' || searchQuery.trim()) && (
        <div className={styles.activeFilterNotice}>
          <AlertCircle size={16} />
          <span>
            {statusFilter !== 'all' && (
              <>
                Filtr faol: Faqat <strong>{statusFilter === 'present' ? "Keldi (K)" : statusFilter === 'absent' ? "Kelmadi (Y)" : statusFilter === 'late' ? "Kechikdi (KCH)" : "Sababli (S)"}</strong> bo'lgan ustozlar ko'rsatilmoqda ({filteredTeachers.length} / {teachersList.length} ta).
              </>
            )}
            {branchFilter !== 'all' && (
              <> Filial filtri faol.</>
            )}
            {searchQuery.trim() && (
              <> "{searchQuery}" bo'yicha qidirilmoqda.</>
            )}
            {' '}Barcha ustozlarni ko'rish uchun:{' '}
          </span>
          <button
            type="button"
            className={styles.inlineResetFilterLink}
            onClick={() => {
              setStatusFilter('all');
              setBranchFilter('all');
              setSearchQuery('');
            }}
          >
            Filtrni tozalash (Barchasini ko'rsatish)
          </button>
        </div>
      )}

      {/* ========================================================
          1. OYLIK JADVAL (FULL 1-MONTH ATTENDANCE MATRIX)
          ======================================================== */}
      {viewMode === 'monthly' ? (
        <div className={styles.matrixWrapper}>
          {loading ? (
            <Loader text="Oylik davomat ma'lumotlari yuklanmoqda..." />
          ) : (
            <div className={styles.matrixScrollable}>
              <table className={styles.matrixTable}>
                <thead>
                  <tr>
                    <th className={styles.stickyIndexCol}>#</th>
                    <th className={styles.stickyTeacherCol}>O'QITUVCHI</th>

                    {/* All 1..31 Days of the Month */}
                    {monthDays.map((d) => (
                      <th
                        key={d.dateIso}
                        className={`${d.isSunday ? styles.sundayHeader : ''} ${d.isToday ? styles.todayHeader : ''} ${d.isFuture ? styles.futureHeader : ''}`}
                        title={`${d.dateIso} (${d.shortDayName})${d.isFuture ? " — Bo'lajak sana" : ""}`}
                      >
                        <div className={styles.dayHeaderCell}>
                          <span className={styles.dayNum}>{d.dayNumber}</span>
                          <span className={styles.dayWeekName}>{d.shortDayName}</span>
                          {d.isToday && <span className={styles.todayTag}>Bugun</span>}
                        </div>
                      </th>
                    ))}

                    {/* Monthly Summary Headers */}
                    <th className={styles.summaryHeaderCol} title="Oydagi jami kelgan kunlar">
                      Keldi (K)
                    </th>
                    <th className={styles.summaryHeaderCol} title="Oydagi jami kelmagan kunlar">
                      Kelmadi (Y)
                    </th>
                    <th className={styles.summaryHeaderCol} title="Oydagi jami kechikishlar">
                      Kechikdi
                    </th>
                    <th className={styles.summaryHeaderCol} title="Oy davomati foizi">
                      Foiz (%)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td colSpan={monthDays.length + 6} style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle size={24} color="#94a3b8" />
                          <span style={{ fontWeight: 600, fontSize: '14px' }}>
                            {teachersList.length === 0 ? "O'qituvchilar topilmadi" : "Filtr bo'yicha mos o'qituvchilar topilmadi"}
                          </span>
                          {(statusFilter !== 'all' || branchFilter !== 'all' || searchQuery.trim()) && (
                            <button
                              type="button"
                              className={styles.resetFilterChipBtn}
                              onClick={() => {
                                setStatusFilter('all');
                                setBranchFilter('all');
                                setSearchQuery('');
                              }}
                              style={{ marginTop: '4px' }}
                            >
                              Filtrni tozalash (Barchasini ko'rsatish)
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((teacher, tIdx) => {
                    const fullName = teacher.user?.full_name || teacher.name || `Ustoz #${teacher.id}`;
                    const spec = teacher.specialization || "O'qituvchi";
                    const initials = getInitials(fullName);
                    const avatarClass = styles[`avatar${tIdx % 5}`] || styles.matrixAvatar;
                    const st = teacherStatsMap[teacher.id] || { present: 0, absent: 0, late: 0, percentage: 0 };
                    const nameParts = fullName.trim().split(/\s+/);
                    const lastName = nameParts[0] || '';
                    const firstAndMiddle = nameParts.slice(1).join(' ');

                    let percentClass = styles.percentGreen;
                    if (st.percentage < 70) percentClass = styles.percentRed;
                    else if (st.percentage < 85) percentClass = styles.percentYellow;

                    return (
                      <tr key={teacher.id}>
                        {/* Index */}
                        <td className={styles.stickyIndexCol}>{tIdx + 1}</td>

                        {/* Teacher Name & Avatar */}
                        <td className={styles.stickyTeacherCol}>
                          <div className={styles.matrixTeacherInfo}>
                            <div className={`${styles.matrixAvatar} ${avatarClass}`}>
                              {initials}
                            </div>
                            <div className={styles.matrixTeacherText}>
                              <div className={styles.matrixTeacherName} title={fullName}>
                                <span className={styles.teacherLastName}>{lastName}</span>
                                {firstAndMiddle && (
                                  <span className={styles.teacherFirstName}> {firstAndMiddle}</span>
                                )}
                              </div>
                              <span className={styles.matrixTeacherSpec} title={spec}>
                                {spec}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* All Month Days Cells */}
                        {monthDays.map((d) => {
                          const key = `${teacher.id}_${d.dateIso}`;
                          const rec = attendanceMatrix[key];
                          const status = rec?.status || '';
                          const isOpen = activeCellKey === key && !d.isFuture;

                          let cellClass = styles.cellEmpty;
                          let cellContent = '—';
                          if (d.isFuture) {
                            cellClass = styles.cellFuture;
                            cellContent = '—';
                          } else if (status === 'present') {
                            cellClass = styles.cellPresent;
                            cellContent = 'K';
                          } else if (status === 'absent') {
                            cellClass = styles.cellAbsent;
                            cellContent = 'Y';
                          } else if (status === 'late') {
                            cellClass = styles.cellLate;
                            cellContent = 'KCH';
                          } else if (status === 'excused') {
                            cellClass = styles.cellExcused;
                            cellContent = 'S';
                          }

                          return (
                            <td
                              key={d.dateIso}
                              className={`${d.isSunday ? styles.sundayCol : ''} ${d.isToday ? styles.todayCol : ''} ${d.isFuture ? styles.futureCol : ''}`}
                            >
                              <div className={styles.matrixCellWrapper}>
                                <button
                                  type="button"
                                  disabled={d.isFuture}
                                  className={`${styles.cellMarkBtn} ${cellClass}`}
                                  onClick={() => !d.isFuture && handleCellClick(teacher.id, d.dateIso)}
                                  title={
                                    d.isFuture
                                      ? `${d.dateIso}: Bo'lajak sana — davomat faqat dars kunida olinadi`
                                      : `${d.dateIso}: ${fullName} — ${status || "Belgilanmagan"}`
                                  }
                                >
                                  {cellContent}
                                </button>

                                {/* Quick Mark Popover (Kelajak kunlar uchun ko'rsatilmaydi) */}
                                {isOpen && !d.isFuture && (
                                  <div className={styles.popoverMenu}>
                                    <button
                                      type="button"
                                      className={`${styles.popoverBtn} ${styles.cellPresent}`}
                                      onClick={() => handleSetCellStatus(teacher.id, d.dateIso, 'present')}
                                      title="Keldi (K)"
                                    >
                                      K
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.popoverBtn} ${styles.cellAbsent}`}
                                      onClick={() => handleSetCellStatus(teacher.id, d.dateIso, 'absent')}
                                      title="Kelmadi (Y)"
                                    >
                                      Y
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.popoverBtn} ${styles.cellLate}`}
                                      onClick={() => handleSetCellStatus(teacher.id, d.dateIso, 'late')}
                                      title="Kechikdi (KCH)"
                                    >
                                      KCH
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.popoverBtn} ${styles.cellExcused}`}
                                      onClick={() => handleSetCellStatus(teacher.id, d.dateIso, 'excused')}
                                      title="Sababli (S)"
                                    >
                                      S
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.popoverBtn} ${styles.popoverClear}`}
                                      onClick={() => handleSetCellStatus(teacher.id, d.dateIso, '')}
                                      title="Tozalash"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* Summary Columns */}
                        <td className={styles.summaryTotalCell}>
                          <span className={styles.badgePresentTotal}>{st.present}</span>
                        </td>
                        <td className={styles.summaryTotalCell}>
                          <span className={styles.badgeAbsentTotal}>{st.absent}</span>
                        </td>
                        <td className={styles.summaryTotalCell}>
                          <span className={styles.badgeLateTotal}>{st.late}</span>
                        </td>
                        <td className={styles.summaryTotalCell}>
                          <span className={`${styles.badgePercentTotal} ${percentClass}`}>
                            {st.percentage}%
                          </span>
                        </td>
                      </tr>
                    );
                  }))}
                </tbody>
              </table>
            </div>
          )}

          {/* Quick Legend at the bottom of matrix */}
          <div className={styles.legendRow}>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBadge} ${styles.cellPresent}`}>K</span>
                <span>Keldi</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBadge} ${styles.cellAbsent}`}>Y</span>
                <span>Kelmadi</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBadge} ${styles.cellLate}`}>KCH</span>
                <span>Kechikdi</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBadge} ${styles.cellExcused}`}>S</span>
                <span>Sababli</span>
              </div>
              <div className={styles.legendItem}>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>Ya</span>
                <span>Yakshanba (Dam olish kuni)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendBadge} ${styles.cellFuture}`}>—</span>
                <span>Bo'lajak sana (Qulflangan)</span>
              </div>
            </div>
            <span style={{ fontSize: '11px', color: '#64748b' }}>
              💡 Maslahat: Har qanday katakchani bosib tezda <b>K</b>, <b>Y</b>, <b>KCH</b> yoki <b>S</b> holatini belgilashingiz mumkin. Kelajakdagi kunlar qulflangan.
            </span>
          </div>
        </div>
      ) : viewMode === 'daily' ? (
        /* ========================================================
           2. KUNLIK TAFSILOT (DAILY DETAIL VIEW WITH TIMES & NOTES)
           ======================================================== */
        <div className={styles.dailyTableWrapper}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
              Tanlangan sana bo'yicha tafsilot:
            </span>
            <input
              type="date"
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '13px',
                fontWeight: 600,
                outline: 'none',
              }}
              value={selectedDailyDate}
              max={todayIso}
              onChange={(e) => {
                const val = e.target.value;
                if (val > todayIso) {
                  setSelectedDailyDate(todayIso);
                } else {
                  setSelectedDailyDate(val);
                }
              }}
            />
            {selectedDailyDate > todayIso && (
              <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                ⚠️ Tanlangan sana kelajakda. Bo'lajak sanalar uchun davomat olib bo'lmaydi.
              </span>
            )}
          </div>

          <table className={styles.dailyTable}>
            <thead>
              <tr>
                <th style={{ width: '280px' }}>O'qituvchi</th>
                <th>Biriktirilgan Guruhlar</th>
                <th style={{ width: '240px' }}>Holat</th>
                <th style={{ width: '120px' }}>Kelish Vaqti</th>
                <th style={{ width: '120px' }}>Ketish Vaqti</th>
                <th>Izoh (Sabab)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <AlertCircle size={22} color="#94a3b8" />
                      <span>O'qituvchilar topilmadi</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher, idx) => {
                const fullName = teacher.user?.full_name || teacher.name || `Ustoz #${teacher.id}`;
                const spec = teacher.specialization || "O'qituvchi";
                const initials = getInitials(fullName);
                const avatarClass = styles[`avatar${idx % 5}`] || styles.matrixAvatar;

                const teacherGroups = groupsList.filter(
                  (g) => String(g.teacher_id) === String(teacher.id)
                );

                const key = `${teacher.id}_${selectedDailyDate}`;
                const isDailyFuture = selectedDailyDate > todayIso;
                const currentRecord = attendanceMatrix[key] || {
                  status: '',
                  check_in: '',
                  check_out: '',
                  note: '',
                };

                return (
                  <tr key={teacher.id}>
                    <td>
                      <div className={styles.matrixTeacherInfo}>
                        <div className={`${styles.matrixAvatar} ${avatarClass}`}>
                          {initials}
                        </div>
                        <div className={styles.matrixTeacherText}>
                          <span className={styles.matrixTeacherName}>{fullName}</span>
                          <span className={styles.matrixTeacherSpec}>{spec}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        {teacherGroups.length} ta guruh ({teacherGroups.slice(0, 2).map((g) => g.name).join(', ')})
                      </span>
                    </td>

                    <td>
                      <div className={styles.statusButtonGroup}>
                        <button
                          type="button"
                          disabled={isDailyFuture}
                          className={`${styles.statusBtn} ${currentRecord.status === 'present' ? styles.statusBtnActivePresent : ''}`}
                          onClick={() => !isDailyFuture && handleSetCellStatus(teacher.id, selectedDailyDate, 'present')}
                        >
                          <Check size={13} strokeWidth={2.5} />
                          <span>K</span>
                        </button>
                        <button
                          type="button"
                          disabled={isDailyFuture}
                          className={`${styles.statusBtn} ${currentRecord.status === 'absent' ? styles.statusBtnActiveAbsent : ''}`}
                          onClick={() => !isDailyFuture && handleSetCellStatus(teacher.id, selectedDailyDate, 'absent')}
                        >
                          <X size={13} strokeWidth={2.5} />
                          <span>Y</span>
                        </button>
                        <button
                          type="button"
                          disabled={isDailyFuture}
                          className={`${styles.statusBtn} ${currentRecord.status === 'late' ? styles.statusBtnActiveLate : ''}`}
                          onClick={() => !isDailyFuture && handleSetCellStatus(teacher.id, selectedDailyDate, 'late')}
                        >
                          <Clock size={13} />
                          <span>KCH</span>
                        </button>
                        <button
                          type="button"
                          disabled={isDailyFuture}
                          className={`${styles.statusBtn} ${currentRecord.status === 'excused' ? styles.statusBtnActiveExcused : ''}`}
                          onClick={() => !isDailyFuture && handleSetCellStatus(teacher.id, selectedDailyDate, 'excused')}
                        >
                          <AlertCircle size={13} />
                          <span>S</span>
                        </button>
                      </div>
                    </td>

                    <td>
                      <input
                        type="time"
                        disabled={isDailyFuture}
                        className={styles.timeInput}
                        value={currentRecord.check_in || ''}
                        onChange={(e) => {
                          if (isDailyFuture) return;
                          const val = e.target.value;
                          setAttendanceMatrix((prev) => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), check_in: val, isModified: true },
                          }));
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="time"
                        disabled={isDailyFuture}
                        className={styles.timeInput}
                        value={currentRecord.check_out || ''}
                        onChange={(e) => {
                          if (isDailyFuture) return;
                          const val = e.target.value;
                          setAttendanceMatrix((prev) => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), check_out: val, isModified: true },
                          }));
                        }}
                      />
                    </td>

                    <td>
                      <input
                        type="text"
                        disabled={isDailyFuture}
                        className={styles.noteInput}
                        placeholder="Izoh kiritish..."
                        value={currentRecord.note || ''}
                        onChange={(e) => {
                          if (isDailyFuture) return;
                          const val = e.target.value;
                          setAttendanceMatrix((prev) => ({
                            ...prev,
                            [key]: { ...(prev[key] || {}), note: val, isModified: true },
                          }));
                        }}
                      />
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ========================================================
           3. OYLIK MAOSH & USHLANMALAR (BUXGALTERIYA PAYROLL VIEW)
           ======================================================== */
        <div className={styles.payrollWrapper}>
          {payrollLoading && !payrollData ? (
            <Loader text="Buxgalteriya oylik hisob-kitoblari yuklanmoqda..." />
          ) : (
            <>
              {/* 5 KPI Metric Cards for Payroll */}
              <div className={styles.payrollStatsGrid}>
                <div className={styles.payrollStatCard}>
                  <div>
                    <span className={styles.statLabel}>Rejalashtirilgan Oylik Fondi</span>
                    <div className={styles.payrollStatValue}>
                      {formatCurrency(payrollData?.summary?.totalBasePayroll || 0)} so'm
                    </div>
                    <span className={styles.statSubtext}>
                      {payrollData?.summary?.totalTeachers || 0} ta o'qituvchi stavkasi
                    </span>
                  </div>
                  <div className={`${styles.statIconBadge} ${styles.statIconBlue}`}>
                    <Banknote size={22} />
                  </div>
                </div>

                <div className={styles.payrollStatCard}>
                  <div>
                    <span className={styles.statLabel}>Kechikishlar Jarimasi</span>
                    <div className={`${styles.payrollStatValue} ${styles.payrollStatValueRed}`}>
                      -{formatCurrency(payrollData?.summary?.totalLatePenalties || 0)} so'm
                    </div>
                    <span className={styles.statSubtext}>
                      {payrollData?.summary?.totalLateCount || 0} ta kechikish qayd etilgan
                    </span>
                  </div>
                  <div className={`${styles.statIconBadge} ${styles.statIconYellow}`}>
                    <Clock size={22} />
                  </div>
                </div>

                <div className={styles.payrollStatCard}>
                  <div>
                    <span className={styles.statLabel}>Dars Qoldirish Ushlanmasi</span>
                    <div className={`${styles.payrollStatValue} ${styles.payrollStatValueRed}`}>
                      -{formatCurrency(payrollData?.summary?.totalAbsenceDeductions || 0)} so'm
                    </div>
                    <span className={styles.statSubtext}>
                      Kelmadi deb belgilangan kunlar
                    </span>
                  </div>
                  <div className={`${styles.statIconBadge} ${styles.statIconRed}`}>
                    <XCircle size={22} />
                  </div>
                </div>

                <div className={styles.payrollStatCard}>
                  <div>
                    <span className={styles.statLabel}>Jami Ushlanmalar</span>
                    <div className={`${styles.payrollStatValue} ${styles.payrollStatValueRed}`}>
                      -{formatCurrency(payrollData?.summary?.totalDeductions || 0)} so'm
                    </div>
                    <span className={styles.statSubtext}>
                      Kechikish + Qoldirilgan darslar
                    </span>
                  </div>
                  <div className={`${styles.statIconBadge} ${styles.statIconRed}`}>
                    <AlertTriangle size={22} />
                  </div>
                </div>

                <div className={styles.payrollStatCard} style={{ border: '2px solid #10b981', backgroundColor: '#f0fdf4' }}>
                  <div>
                    <span className={styles.statLabel} style={{ color: '#065f46', fontWeight: 800 }}>To'lanadigan Sof Oylik</span>
                    <div className={`${styles.payrollStatValue} ${styles.payrollStatValueGreen}`}>
                      {formatCurrency(payrollData?.summary?.totalNetPayroll || 0)} so'm
                    </div>
                    <span className={styles.statSubtext} style={{ color: '#047857' }}>
                      Buxgalteriya to'lashi lozim bo'lgan summa
                    </span>
                  </div>
                  <div className={`${styles.statIconBadge} ${styles.statIconGreen}`}>
                    <CheckCircle2 size={22} />
                  </div>
                </div>
              </div>

              {/* Payroll Table */}
              <div className={styles.payrollTableWrapper}>
                <div className={styles.payrollTableTopBar}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                      {MONTH_NAMES_UZ[currentMonth - 1]} {currentYear} oyi uchun o'qituvchilar maoshi va davomat ushlanmalari
                    </span>
                    <span style={{ display: 'block', fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Ish kunlari: {payrollData?.period?.workingDays || 26} kun | Kechikish stavkasi: {formatCurrency(latePenaltyRate)} so'm / marta
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className={styles.printBtn}
                      onClick={() => window.print()}
                      title="Hisobotni chop etish yoki PDF sifatida saqlash"
                    >
                      <Printer size={15} />
                      <span>Chop etish / PDF</span>
                    </button>
                  </div>
                </div>

                <table className={styles.payrollTable}>
                  <thead>
                    <tr>
                      <th style={{ width: '40px' }}>#</th>
                      <th style={{ width: '220px' }}>O'qituvchi</th>
                      <th>Filial</th>
                      <th style={{ width: '130px' }}>Asosiy Oylik</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Ish Kunlari</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Keldi</th>
                      <th style={{ width: '130px', textAlign: 'center' }}>Kelmadi (Kun)</th>
                      <th style={{ width: '140px', textAlign: 'center' }}>Kechikishlar</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Kechikish Jarimasi</th>
                      <th style={{ width: '130px', textAlign: 'right' }}>Jami Ushlanma</th>
                      <th style={{ width: '160px', textAlign: 'right' }}>Sof To'lanadigan Oylik</th>
                      <th style={{ width: '90px', textAlign: 'center' }}>Harakat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(payrollData?.teachers || []).filter((t) => {
                      const q = searchQuery.toLowerCase().trim();
                      if (!q) return true;
                      return t.full_name.toLowerCase().includes(q) || t.specialization.toLowerCase().includes(q);
                    }).map((t, idx) => {
                      const initials = getInitials(t.full_name);
                      const avatarClass = styles[`avatar${idx % 5}`] || styles.matrixAvatar;

                      return (
                        <tr key={t.teacher_id}>
                          <td style={{ fontWeight: 700, color: '#94a3b8', fontSize: '12px' }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className={`${styles.matrixAvatar} ${avatarClass}`} style={{ width: '32px', height: '32px', fontSize: '11px' }}>
                                {initials}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>
                                  {t.full_name}
                                </div>
                                <div style={{ fontSize: '11px', color: '#2563eb', fontWeight: 600 }}>
                                  {t.specialization} {t.phone ? `• ${t.phone}` : ''}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: '#64748b' }}>
                            {t.branch_name}
                          </td>
                          <td>
                            <span style={{ fontWeight: 700, color: '#1e293b' }}>
                              {formatCurrency(t.base_salary)} so'm
                            </span>
                            <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>
                              {t.salary_type === 'hourly' ? 'Soatbay' : 'Oylik stavka'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>
                            {t.working_days} kun
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ backgroundColor: '#ecfdf5', color: '#059669', padding: '3px 8px', borderRadius: '6px', fontWeight: 800, fontSize: '12px' }}>
                              {t.present_count} kun
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {t.absent_count > 0 ? (
                              <div>
                                <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontSize: '11px' }}>
                                  {t.absent_count} kun
                                </span>
                                <span style={{ display: 'block', fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>
                                  -{formatCurrency(t.absence_deduction)} so'm
                                </span>
                              </div>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>0 kun</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {t.late_count > 0 ? (
                              <button
                                type="button"
                                className={styles.latePillClickable}
                                onClick={() => {
                                  setSelectedTeacherForLateDetails(t);
                                  setIsLateModalOpen(true);
                                }}
                                title="Kechikkan kunlar tafsilotini ko'rish"
                              >
                                <Clock size={12} />
                                <span>{t.late_count} marta kechikdi</span>
                              </button>
                            ) : (
                              <span className={styles.latePillZero}>
                                <CheckCircle2 size={12} color="#10b981" />
                                <span>0 marta</span>
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {t.late_deduction > 0 ? (
                              <span style={{ color: '#d97706', fontWeight: 800, fontSize: '12.5px' }}>
                                -{formatCurrency(t.late_deduction)} so'm
                              </span>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '12px' }}>0</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            {t.total_deductions > 0 ? (
                              <span className={styles.deductionBadge}>
                                -{formatCurrency(t.total_deductions)} so'm
                              </span>
                            ) : (
                              <span style={{ color: '#10b981', fontWeight: 700, fontSize: '12px' }}>
                                Ushlanma yo'q
                              </span>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={styles.netSalaryBadge}>
                              {formatCurrency(t.net_salary)} so'm
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className={styles.printBtn}
                              style={{ padding: '4px 8px', fontSize: '11px' }}
                              onClick={() => {
                                setSelectedTeacherForLateDetails(t);
                                setIsLateModalOpen(true);
                              }}
                              title="To'liq tafsilotlarni ochish"
                            >
                              <Eye size={13} />
                              <span>Tafsilot</span>
                            </button>
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
      )}

      {/* Kechikishlar va Ushlanmalar Tafsilot Modali */}
      {isLateModalOpen && selectedTeacherForLateDetails && (
        <div className={styles.modalBackdrop} onClick={() => setIsLateModalOpen(false)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#d97706" />
                <h4 className={styles.modalTitle}>
                  {selectedTeacherForLateDetails.full_name} — Kechikishlar Tarixi
                </h4>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsLateModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>Jami kechikishlar soni:</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#b45309' }}>
                      {selectedTeacherForLateDetails.late_count} marta
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 600 }}>Oylikdan ushlangan jarima:</span>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#dc2626' }}>
                      -{formatCurrency(selectedTeacherForLateDetails.late_deduction)} so'm
                    </div>
                  </div>
                </div>
              </div>

              {selectedTeacherForLateDetails.late_records && selectedTeacherForLateDetails.late_records.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    Nazoratchi tomonidan qayd etilgan sanalar va vaqtlar:
                  </span>
                  {selectedTeacherForLateDetails.late_records.map((rec, rIdx) => (
                    <div
                      key={rIdx}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>
                          📅 {rec.date}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          Kelgan vaqti: <b style={{ color: '#d97706' }}>{rec.check_in || '09:00'}</b>
                          {rec.note && ` • Izoh: ${rec.note}`}
                        </div>
                      </div>
                      <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                        -{formatCurrency(latePenaltyRate)} so'm
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#10b981' }}>
                  <CheckCircle2 size={36} style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Ushbu oyda kechikishlar qayd etilmagan</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>O'qituvchi barcha darslarga o'z vaqtida kelgan</div>
                </div>
              )}

              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  style={{
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                  onClick={() => setIsLateModalOpen(false)}
                >
                  Yopish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          EXCEL EXPORT & ADVANCED FILTER MODAL
          ======================================================== */}
      {isExportModalOpen && (
        <div
          className={styles.exportModalBackdrop}
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className={styles.exportModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={styles.exportModalHeader}>
              <div className={styles.exportModalTitleGroup}>
                <div className={styles.excelIconWrapper}>
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className={styles.exportModalTitle}>
                    O'qituvchilar Davomatini Excel (.xlsx) Ga Eksport Qilish
                  </h3>
                  <p className={styles.exportModalSubtitle}>
                    Nazoratchi paneli • Excelda avto-filtr (AutoFilter) va 3 xil hisobot varaqlari
                  </p>
                </div>
              </div>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsExportModalOpen(false)}
                title="Yopish"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.exportModalBody}>
              {/* Excel AutoFilter Info Card */}
              <div className={styles.autofilterNoticeCard}>
                <CheckCircle2 size={16} className={styles.autofilterNoticeIcon} />
                <div className={styles.noticeTextGroup}>
                  <span className={styles.autofilterNoticeTitle}>
                    Excel Avto-Filtr (AutoFilter) faol:
                  </span>
                  <span className={styles.autofilterNoticeText}>
                    Har bir ustunda avtomatik filtr strelkalari yoqilgan holda yuklanadi.
                  </span>
                </div>
              </div>

              {/* 1. Period Selection */}
              <div className={styles.modalSection}>
                <span className={styles.sectionLabel}>
                  <Calendar size={14} color="#2563eb" />
                  <span>1. Hisobot davrini tanlang:</span>
                </span>

                <div className={styles.periodModesGrid}>
                  <div
                    className={`${styles.periodOptionCard} ${exportFilters.dateMode === 'month' ? styles.periodOptionActive : ''}`}
                    onClick={() => setExportFilters((prev) => ({ ...prev, dateMode: 'month' }))}
                  >
                    <div className={`${styles.periodRadioDot} ${exportFilters.dateMode === 'month' ? styles.periodRadioDotActive : ''}`}>
                      {exportFilters.dateMode === 'month' && <div className={styles.periodRadioDotInner} />}
                    </div>
                    <div>
                      <div className={styles.periodOptionTitle}>
                        Joriy oy ({currentYear}-{pad2(currentMonth)})
                      </div>
                      <div className={styles.periodOptionSub}>
                        {monthDays.length} kunlik to'liq jadval
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${styles.periodOptionCard} ${exportFilters.dateMode === 'other_month' ? styles.periodOptionActive : ''}`}
                    onClick={() => setExportFilters((prev) => ({ ...prev, dateMode: 'other_month' }))}
                  >
                    <div className={`${styles.periodRadioDot} ${exportFilters.dateMode === 'other_month' ? styles.periodRadioDotActive : ''}`}>
                      {exportFilters.dateMode === 'other_month' && <div className={styles.periodRadioDotInner} />}
                    </div>
                    <div>
                      <div className={styles.periodOptionTitle}>Boshqa oy</div>
                      <div className={styles.periodOptionSub}>
                        Yil va oyni tanlash
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${styles.periodOptionCard} ${exportFilters.dateMode === 'range' ? styles.periodOptionActive : ''}`}
                    onClick={() => setExportFilters((prev) => ({ ...prev, dateMode: 'range' }))}
                  >
                    <div className={`${styles.periodRadioDot} ${exportFilters.dateMode === 'range' ? styles.periodRadioDotActive : ''}`}>
                      {exportFilters.dateMode === 'range' && <div className={styles.periodRadioDotInner} />}
                    </div>
                    <div>
                      <div className={styles.periodOptionTitle}>Sana oralig'i</div>
                      <div className={styles.periodOptionSub}>
                        Boshlanish va tugash sanalari
                      </div>
                    </div>
                  </div>

                  <div
                    className={`${styles.periodOptionCard} ${exportFilters.dateMode === 'single' ? styles.periodOptionActive : ''}`}
                    onClick={() => setExportFilters((prev) => ({ ...prev, dateMode: 'single' }))}
                  >
                    <div className={`${styles.periodRadioDot} ${exportFilters.dateMode === 'single' ? styles.periodRadioDotActive : ''}`}>
                      {exportFilters.dateMode === 'single' && <div className={styles.periodRadioDotInner} />}
                    </div>
                    <div>
                      <div className={styles.periodOptionTitle}>Kunlik davomat</div>
                      <div className={styles.periodOptionSub}>
                        Aniq bitta sana bo'yicha
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conditional Inputs depending on selected dateMode */}
                {exportFilters.dateMode === 'other_month' && (
                  <div className={styles.periodCustomInputsRow}>
                    <div className={styles.inputGroupMini}>
                      <span className={styles.inputLabelMini}>Yil</span>
                      <select
                        className={styles.inputMini}
                        value={exportFilters.selectedYear}
                        onChange={(e) => setExportFilters((prev) => ({ ...prev, selectedYear: Number(e.target.value) }))}
                      >
                        {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                          <option key={y} value={y}>{y}-yil</option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.inputGroupMini}>
                      <span className={styles.inputLabelMini}>Oy</span>
                      <select
                        className={styles.inputMini}
                        value={exportFilters.selectedMonth}
                        onChange={(e) => setExportFilters((prev) => ({ ...prev, selectedMonth: Number(e.target.value) }))}
                      >
                        {MONTH_NAMES_UZ.map((mName, mIdx) => (
                          <option key={mIdx + 1} value={mIdx + 1}>
                            {mName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {exportFilters.dateMode === 'range' && (
                  <div className={styles.periodCustomInputsRow}>
                    <div className={styles.inputGroupMini}>
                      <span className={styles.inputLabelMini}>Boshlanish sanasi</span>
                      <input
                        type="date"
                        className={styles.inputMini}
                        value={exportFilters.startDate}
                        onChange={(e) => setExportFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>

                    <div className={styles.inputGroupMini}>
                      <span className={styles.inputLabelMini}>Tugash sanasi</span>
                      <input
                        type="date"
                        className={styles.inputMini}
                        value={exportFilters.endDate}
                        onChange={(e) => setExportFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {exportFilters.dateMode === 'single' && (
                  <div className={styles.periodCustomInputsRow}>
                    <div className={styles.inputGroupMini}>
                      <span className={styles.inputLabelMini}>Tanlangan sana</span>
                      <input
                        type="date"
                        className={styles.inputMini}
                        value={exportFilters.singleDate}
                        onChange={(e) => setExportFilters((prev) => ({ ...prev, singleDate: e.target.value }))}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Detailed Filter Criteria (Teacher, Status, Branch) */}
              <div className={styles.modalSection}>
                <span className={styles.sectionLabel}>
                  <Filter size={14} color="#107c41" />
                  <span>2. Filtrlash parametrlari:</span>
                </span>

                <div className={styles.filtersRowGrid}>
                  {/* Teacher Filter */}
                  <div className={styles.filterField}>
                    <label className={styles.filterFieldLabel}>O'qituvchi</label>
                    <select
                      className={styles.filterFieldSelect}
                      value={exportFilters.teacherId}
                      onChange={(e) => setExportFilters((prev) => ({ ...prev, teacherId: e.target.value }))}
                    >
                      <option value="all">Barcha o'qituvchilar ({teachersList.length})</option>
                      {teachersList.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.user?.full_name || t.name || `Ustoz #${t.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Status Filter */}
                  <div className={styles.filterField}>
                    <label className={styles.filterFieldLabel}>Davomat holati</label>
                    <select
                      className={styles.filterFieldSelect}
                      value={exportFilters.status}
                      onChange={(e) => setExportFilters((prev) => ({ ...prev, status: e.target.value }))}
                    >
                      <option value="all">Barchasi (K, Y, KCH, S)</option>
                      <option value="present">Faqat Kelganlar (K)</option>
                      <option value="absent">Faqat Kelmaganlar (Y)</option>
                      <option value="late">Faqat Kechikkanlar (KCH)</option>
                      <option value="excused">Faqat Sabablilar (S)</option>
                    </select>
                  </div>

                  {/* Branch Filter */}
                  <div className={styles.filterField}>
                    <label className={styles.filterFieldLabel}>O'quv markazi / Filial</label>
                    {!isSuperAdmin ? (
                      <div className={styles.singleCenterBadgeModal}>
                        <Building2 size={14} color="#107c41" />
                        <span>{user?.branch?.name || branchesList[0]?.name || userCenterName}</span>
                      </div>
                    ) : (
                      <select
                        className={styles.filterFieldSelect}
                        value={exportFilters.branchId}
                        onChange={(e) => setExportFilters((prev) => ({ ...prev, branchId: e.target.value }))}
                      >
                        <option value="all">Barcha filiallar</option>
                        {branchesList.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Sheet Selection */}
              <div className={styles.modalSection}>
                <span className={styles.sectionLabel}>
                  <Table size={14} color="#8b5cf6" />
                  <span>3. Excel kitobidagi varaqlar (Sheets):</span>
                </span>

                <div className={styles.sheetsCheckboxList}>
                  {/* Detailed */}
                  <div
                    className={`${styles.sheetCheckboxCard} ${exportSheets.detailed ? styles.sheetCheckboxCardChecked : ''}`}
                    onClick={() => setExportSheets((prev) => ({ ...prev, detailed: !prev.detailed }))}
                  >
                    <div className={styles.sheetCheckboxLeft}>
                      <div className={`${styles.customCheckbox} ${exportSheets.detailed ? styles.customCheckboxChecked : ''}`}>
                        {exportSheets.detailed && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className={styles.sheetTitleText}>
                          📋 Davomat_Batafsil
                        </div>
                        <div className={styles.sheetDescText}>
                          Har bir kun va ustoz qatori, vaqti, izohlar (AutoFilter yoqilgan)
                        </div>
                      </div>
                    </div>
                    <span className={`${styles.sheetTagPill} ${styles.sheetTagPillGreen}`}>
                      Tavsiya etiladi
                    </span>
                  </div>

                  {/* Matrix */}
                  <div
                    className={`${styles.sheetCheckboxCard} ${exportSheets.matrix ? styles.sheetCheckboxCardChecked : ''}`}
                    onClick={() => setExportSheets((prev) => ({ ...prev, matrix: !prev.matrix }))}
                  >
                    <div className={styles.sheetCheckboxLeft}>
                      <div className={`${styles.customCheckbox} ${exportSheets.matrix ? styles.customCheckboxChecked : ''}`}>
                        {exportSheets.matrix && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className={styles.sheetTitleText}>
                          📅 Oylik_Matritsa
                        </div>
                        <div className={styles.sheetDescText}>
                          Ustozlar x 1..31 kunlar jadvali (K, Y, KCH, S katakchalari bilan)
                        </div>
                      </div>
                    </div>
                    <span className={styles.sheetTagPill}>
                      1 oylik jadval
                    </span>
                  </div>

                  {/* Summary */}
                  <div
                    className={`${styles.sheetCheckboxCard} ${exportSheets.summary ? styles.sheetCheckboxCardChecked : ''}`}
                    onClick={() => setExportSheets((prev) => ({ ...prev, summary: !prev.summary }))}
                  >
                    <div className={styles.sheetCheckboxLeft}>
                      <div className={`${styles.customCheckbox} ${exportSheets.summary ? styles.customCheckboxChecked : ''}`}>
                        {exportSheets.summary && <Check size={12} strokeWidth={3} />}
                      </div>
                      <div>
                        <div className={styles.sheetTitleText}>
                          📊 Oylik_Xulosa_Maosh
                        </div>
                        <div className={styles.sheetDescText}>
                          Davomat foizlari, jarimalar va sof maosh statistikasi
                        </div>
                      </div>
                    </div>
                    <span className={styles.sheetTagPill}>
                      Statistika
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.exportModalFooter}>
              <button
                type="button"
                className={styles.modalCancelBtn}
                onClick={() => setIsExportModalOpen(false)}
              >
                Bekor qilish
              </button>

              <div className={styles.modalActionButtonsGroup}>
                <button
                  type="button"
                  className={styles.quickExportInModalBtn}
                  onClick={handleQuickExport}
                  disabled={exporting}
                  title="Joriy oyning barcha ma'lumotlarini to'g'ridan-to'g'ri yuklab olish"
                >
                  <Sparkles size={14} color="#107c41" />
                  <span>Tezkor yuklab olish</span>
                </button>

                <button
                  type="button"
                  className={styles.submitExportModalBtn}
                  onClick={() => handleExportExcel()}
                  disabled={exporting || (!exportSheets.detailed && !exportSheets.matrix && !exportSheets.summary)}
                >
                  <FileSpreadsheet size={15} />
                  <span>{exporting ? 'Yuklanmoqda...' : 'Excel (.xlsx) Yuklab Olish'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendanceSection;
