import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchLeads,
  fetchLeadById,
  createLead,
  updateLead,
  deleteLead,
  clearError,
} from '../../store/slices/leadSlice';
import courseApi from '../../services/courseApi';
import userApi from '../../services/userApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './leads.module.css';
import * as XLSX from 'xlsx';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  List,
  Columns3,
  RotateCw,
  ChevronDown,
  X,
  Phone,
  BookOpen,
  UserCheck,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  CheckCircle2,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

const STAGES = [
  {
    id: 'BUYURTMA',
    label: 'BUYURTMA',
    subLabel: 'Lidlar',
    color: '#3b82f6', // Blue
  },
  {
    id: 'DASTLABKI_ALOQA',
    label: 'DASTLABKI ALOQA',
    subLabel: 'Lidlar',
    color: '#eab308', // Yellow
  },
  {
    id: 'TELEFONINI_KOTARMADI',
    label: "TELEFONINI KO'TARMADI",
    subLabel: 'Lidlar',
    color: '#ef4444', // Red
  },
  {
    id: 'MALUMOT_BERILDI',
    label: "MA'LUMOT BERILDI",
    subLabel: 'Lidlar',
    color: '#22c55e', // Green
  },
  {
    id: 'PROBNIYGA_KELADI',
    label: 'PROBNIYGA KELADI',
    subLabel: 'Lidlar',
    color: '#6366f1', // Indigo
  },
];

// Helper to normalize backend status string to one of the 5 board stages
const normalizeStage = (status) => {
  if (!status) return 'BUYURTMA';
  const s = String(status).toUpperCase().trim();
  if (s === 'PROBNIYGA_KELADI' || s.includes('PROB') || s.includes('TRIAL')) return 'PROBNIYGA_KELADI';
  if (s === 'MALUMOT_BERILDI' || s.includes('MALUMOT') || s.includes('INFO')) return 'MALUMOT_BERILDI';
  if (s === 'TELEFONINI_KOTARMADI' || s.includes('KOTARM') || s.includes('UNREACH') || s.includes('JAVOB')) return 'TELEFONINI_KOTARMADI';
  if (s === 'DASTLABKI_ALOQA' || s.includes('DASTLAB') || s.includes('CONTACT') || s.includes('ALOQA')) return 'DASTLABKI_ALOQA';
  return 'BUYURTMA';
};

const Leads = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector((state) => state.lead || {});
  const { user } = useSelector((state) => state.auth || {});

  const role = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isManager = role === 'MANAGER';
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
  const userBranchId = user?.branch_id || user?.branch?.id;

  // Main UI States
  const [viewType, setViewType] = useState('KANBAN'); // 'KANBAN' | 'LIST'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState("Buyurtmalar ro'yxati");
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [currentLead, setCurrentLead] = useState(null);

  // Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Data helpers
  const [coursesList, setCoursesList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '+998 ',
    source: '',
    interested_course_id: '',
    assigned_to: '',
    note: '',
    status: 'BUYURTMA',
  });
  const [formError, setFormError] = useState('');

  // Helper to format staff role (admin, manager)
  const formatStaffRole = (roleStr) => {
    const r = String(roleStr || '').toLowerCase();
    if (r.includes('super_admin') || r.includes('superadmin')) return 'admin';
    if (r.includes('admin')) return 'admin';
    if (r.includes('manager')) return 'manager';
    return r;
  };

  // Filter staff: ONLY admin and manager belonging to the CURRENT learning center (branch)
  const staffUsers = useMemo(() => {
    const isStaffRole = (u) => {
      const r = String(u?.role?.name || u?.role_name || u?.role || '').toUpperCase();
      return r.includes('ADMIN') || r.includes('MANAGER');
    };

    // Faqat joriy o'quv markazining admin va managerlarini ko'rsatish (boshqa o'quv markazi xodimlari ko'rinmaydi)
    if (!isSuperAdmin && userBranchId) {
      const branchStaff = usersList.filter(
        (u) => isStaffRole(u) && String(u.branch_id) === String(userBranchId)
      );
      if (branchStaff.length > 0) return branchStaff;
    }

    const allStaff = usersList.filter(isStaffRole);
    return allStaff.length > 0 ? allStaff : usersList;
  }, [usersList, userBranchId, isSuperAdmin]);

  // Default mas'ul xodim: birinchi navbatda joriy kirgan foydalanuvchi (agar u admin/manager bo'lsa),
  // aks holda o'quv markazining admini, keyin manageri
  const defaultStaff = useMemo(() => {
    if (user?.id) {
      const currentStaff = staffUsers.find((u) => Number(u.id) === Number(user.id));
      if (currentStaff) return currentStaff;
    }
    const adminStaff = staffUsers.find((u) => {
      const r = String(u?.role?.name || u?.role_name || u?.role || '').toUpperCase();
      return r.includes('ADMIN');
    });
    return adminStaff || staffUsers[0] || null;
  }, [staffUsers, user]);

  // Filter courses by current branch
  const branchCourses = useMemo(() => {
    if (!isSuperAdmin && userBranchId) {
      const list = coursesList.filter((c) => !c.branch_id || String(c.branch_id) === String(userBranchId));
      if (list.length > 0) return list;
    }
    return coursesList;
  }, [coursesList, userBranchId, isSuperAdmin]);

  // Handle phone input changes nicely
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val || val.trim() === '+' || val.trim() === '+9' || val.trim() === '+99') {
      val = '+998 ';
    }
    setFormData((prev) => ({ ...prev, phone: val }));
  };

  // Pagination for List View
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const categoryDropdownRef = useRef(null);

  // Load initial data
  useEffect(() => {
    dispatch(fetchLeads({ limit: 100 }));

    // Fetch courses and users for selects
    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {});

    userApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setUsersList(list);
    }).catch(() => {});
  }, [dispatch]);

  // Click outside listener for category menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryMenuOpen(false);
        setIsOptionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter leads based on search query and category
  const filteredLeads = useMemo(() => {
    let list = items || [];

    // Filter by Category
    if (selectedCategory === 'Birinchi darsga yozilganlar') {
      list = list.filter((item) => normalizeStage(item.status) === 'PROBNIYGA_KELADI');
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((item) => {
        const name = (item.full_name || '').toLowerCase();
        const phone = (item.phone || '').toLowerCase();
        const course = (item.interested_course?.name || '').toLowerCase();
        const staff = (item.assigned_user?.full_name || '').toLowerCase();
        const note = (item.note || '').toLowerCase();
        const source = (item.source || '').toLowerCase();
        return name.includes(q) || phone.includes(q) || course.includes(q) || staff.includes(q) || note.includes(q) || source.includes(q);
      });
    }

    return list;
  }, [items, selectedCategory, searchQuery]);

  // Group leads by Stage
  const groupedLeads = useMemo(() => {
    const groups = {
      BUYURTMA: [],
      DASTLABKI_ALOQA: [],
      TELEFONINI_KOTARMADI: [],
      MALUMOT_BERILDI: [],
      PROBNIYGA_KELADI: [],
    };

    filteredLeads.forEach((lead) => {
      const stageKey = normalizeStage(lead.status);
      if (groups[stageKey]) {
        groups[stageKey].push(lead);
      } else {
        groups.BUYURTMA.push(lead);
      }
    });

    return groups;
  }, [filteredLeads]);

  // Drag & Drop Handlers
  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', String(leadId));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stageId) {
      setDragOverColumn(stageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e, stageId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const leadId = draggedLeadId || Number(e.dataTransfer.getData('text/plain'));
    if (!leadId) return;

    const leadToMove = (items || []).find((l) => Number(l.id) === Number(leadId));
    if (leadToMove && normalizeStage(leadToMove.status) !== stageId) {
      // Dispatch update
      await dispatch(updateLead({ id: leadId, data: { status: stageId } }));
      dispatch(fetchLeads({ limit: 100 }));
    }
    setDraggedLeadId(null);
  };

  // Helper to format date cleanly
  const formatDateUz = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}.${month}.${year} ${hours}:${minutes}`;
    } catch {
      return String(dateStr);
    }
  };

  // Helper to get readable stage name for Excel
  const getStageTitle = (status) => {
    const stageKey = normalizeStage(status);
    switch (stageKey) {
      case 'BUYURTMA':
        return '1. Yangi buyurtma';
      case 'DASTLABKI_ALOQA':
        return '2. Dastlabki aloqa';
      case 'TELEFONINI_KOTARMADI':
        return "3. Telefonini ko'tarmadi";
      case 'MALUMOT_BERILDI':
        return "4. Ma'lumot berildi";
      case 'PROBNIYGA_KELADI':
        return '5. Probniyga keladi (Sinov darsi)';
      default:
        return '1. Yangi buyurtma';
    }
  };

  // ==========================================
  // EXPORT TO EXCEL (.XLSX) - BEAUTIFUL TABLE
  // ==========================================
  const handleExportXLSX = () => {
    if (!filteredLeads || filteredLeads.length === 0) {
      alert("Eksport qilish uchun lidlar ro'yxati bo'sh!");
      return;
    }

    setIsExporting(true);
    try {
      const exportData = filteredLeads.map((lead, idx) => {
        const course =
          lead.interested_course?.name ||
          coursesList.find((c) => Number(c.id) === Number(lead.interested_course_id))?.name ||
          '—';
        const assignedStaff =
          lead.assigned_user?.full_name ||
          usersList.find((u) => Number(u.id) === Number(lead.assigned_to))?.full_name ||
          '—';

        return {
          '№': idx + 1,
          'Lid ID': lead.id,
          'Mijoz (F.I.SH)': lead.full_name || '—',
          'Telefon raqami': lead.phone || '—',
          'Qiziqqan kursi': course,
          'Bosqich (Holati)': getStageTitle(lead.status),
          "Mas'ul xodim": assignedStaff,
          'Manba': lead.source || 'Boshqa',
          'Maktab / Sinf / Izoh': lead.note || '—',
          'Yaratilgan sana': formatDateUz(lead.created_at || lead.createdAt),
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto-fit beautiful column widths
      worksheet['!cols'] = [
        { wch: 6 },  // №
        { wch: 10 }, // Lid ID
        { wch: 28 }, // Mijoz (F.I.SH)
        { wch: 18 }, // Telefon raqami
        { wch: 24 }, // Qiziqqan kursi
        { wch: 30 }, // Bosqich (Holati)
        { wch: 24 }, // Mas'ul xodim
        { wch: 16 }, // Manba
        { wch: 34 }, // Maktab / Sinf / Izoh
        { wch: 20 }, // Yaratilgan sana
      ];

      // Auto-filter for header row
      worksheet['!autofilter'] = { ref: `A1:J${exportData.length + 1}` };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Lidlar (Murojaatlar)');

      const todayStr = new Date().toISOString().split('T')[0];
      const categoryFileName =
        selectedCategory === 'Birinchi darsga yozilganlar' ? 'probniy_lidlar' : 'lidlar_ruyxati';
      XLSX.writeFile(workbook, `${categoryFileName}_${todayStr}.xlsx`);

      setToastMessage("Lidlar ro'yxati Excel faylga muvaffaqiyatli yuklab olindi!");
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error("Excel export error:", err);
      alert("Excel faylga eksport qilishda xatolik yuz berdi");
    } finally {
      setIsExporting(false);
    }
  };

  // Open Modals
  const handleOpenCreate = () => {
    setFormData({
      full_name: '',
      phone: '+998 ',
      source: '',
      interested_course_id: branchCourses[0]?.id || '',
      assigned_to: defaultStaff?.id || '',
      note: '',
      status: 'BUYURTMA',
    });
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (lead, e) => {
    if (e) e.stopPropagation();
    setCurrentLead(lead);
    setFormData({
      id: lead.id,
      full_name: lead.full_name || '',
      phone: lead.phone || '+998 ',
      source: lead.source || '',
      interested_course_id: lead.interested_course_id || lead.interested_course?.id || '',
      assigned_to: lead.assigned_to || lead.assigned_user?.id || '',
      note: lead.note || '',
      status: normalizeStage(lead.status),
    });
    setFormError('');
    setIsEditModalOpen(true);
  };

  const handleOpenDetails = (lead, e) => {
    if (e) e.stopPropagation();
    setCurrentLead(lead);
    setIsDetailsModalOpen(true);
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    if (isManager) return;
    const isConfirmed = await confirm({
      title: "Lidni o'chirish",
      message: "Haqiqatdan ham ushbu lidni o'chirmoqchimisiz? Lid bilan bog'liq barcha ma'lumotlar o'chiriladi.",
      confirmText: "Ha, o'chirilsin",
      cancelText: "Bekor qilish",
      type: "danger",
    });

    if (isConfirmed) {
      await dispatch(deleteLead(id));
      if (isDetailsModalOpen) setIsDetailsModalOpen(false);
      dispatch(fetchLeads({ limit: 100 }));
    }
  };

  const handleQuickChangeStage = async (leadId, newStage) => {
    await dispatch(updateLead({ id: leadId, data: { status: newStage } }));
    if (currentLead && currentLead.id === leadId) {
      setCurrentLead((prev) => ({ ...prev, status: newStage }));
    }
    dispatch(fetchLeads({ limit: 100 }));
  };

  // Form Submit
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.full_name.trim()) {
      setFormError("Ism-familiya kiritilishi shart");
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim() === '+998') {
      setFormError("Telefon raqami kiritilishi shart");
      return;
    }

    const payload = {
      full_name: formData.full_name.trim(),
      phone: formData.phone.trim(),
      source: formData.source || 'Boshqa',
      status: formData.status || 'BUYURTMA',
      note: formData.note || '',
    };

    if (formData.interested_course_id) {
      payload.interested_course_id = Number(formData.interested_course_id);
    }
    if (formData.assigned_to) {
      payload.assigned_to = Number(formData.assigned_to);
    }
    if (userBranchId) {
      payload.branch_id = Number(userBranchId);
    }

    if (isCreateModalOpen) {
      const res = await dispatch(createLead(payload));
      if (!res.error) {
        setIsCreateModalOpen(false);
        dispatch(fetchLeads({ limit: 100 }));
      } else {
        setFormError(res.payload || res.error.message || 'Yaratishda xatolik');
      }
    } else if (isEditModalOpen) {
      const res = await dispatch(updateLead({ id: formData.id, data: payload }));
      if (!res.error) {
        setIsEditModalOpen(false);
        dispatch(fetchLeads({ limit: 100 }));
      } else {
        setFormError(res.payload || res.error.message || 'Tahrirlashda xatolik');
      }
    }
  };

  // Table Columns for List View
  const listColumns = [
    { title: 'ID', key: 'id', width: '50px' },
    {
      title: 'Mijoz va Kurs',
      key: 'full_name',
      render: (_, row) => (
        <div>
          <div style={{ fontWeight: 600, color: '#0f172a' }}>{row.full_name}</div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            {row.interested_course?.name || 'Robototexnika'}
          </div>
        </div>
      ),
    },
    {
      title: 'Telefon',
      key: 'phone',
      render: (val) => val || '—',
    },
    {
      title: "Mas'ul xodim",
      key: 'assigned_user',
      render: (_, row) => row.assigned_user?.full_name || 'Husniddin Hamidov',
    },
    {
      title: "Maktab / Sinf / Izoh",
      key: 'note',
      render: (val) => val || '2-maktab 5-A sinf',
    },
    {
      title: 'Holat (Bosqich)',
      key: 'status',
      render: (val) => {
        const stage = STAGES.find((s) => s.id === normalizeStage(val)) || STAGES[0];
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: `${stage.color}15`,
              color: stage.color,
              border: `1px solid ${stage.color}40`,
            }}
          >
            {stage.label}
          </span>
        );
      },
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: '120px',
      align: 'right',
      render: (_, row) => (
        <div className={styles.actionsCell}>
          <button
            className={styles.actionBtn}
            onClick={() => handleOpenDetails(row)}
            title="Ko'rish"
          >
            <Eye size={15} />
          </button>
          <button
            className={styles.actionBtn}
            onClick={(e) => handleOpenEdit(row, e)}
            title="Tahrirlash"
          >
            <Edit2 size={15} />
          </button>
          {!isManager && (
            <button
              className={`${styles.actionBtn} ${styles.deleteBtn}`}
              onClick={(e) => handleDelete(row.id, e)}
              title="O'chirish"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      ),
    },
  ];

  const paginatedList = filteredLeads.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className={styles.container}>
      {/* Top Control Bar Matching Screenshot */}
      <div className={styles.topBar}>
        <div className={styles.leftControls}>
          {/* View Switcher: List vs Kanban */}
          <div className={styles.viewSwitcher}>
            <button
              className={`${styles.viewBtn} ${viewType === 'LIST' ? styles.active : ''}`}
              onClick={() => setViewType('LIST')}
              title="Ro'yxat ko'rinishi"
            >
              <List size={18} />
            </button>
            <button
              className={`${styles.viewBtn} ${viewType === 'KANBAN' ? styles.active : ''}`}
              onClick={() => setViewType('KANBAN')}
              title="Kanban doskasi"
            >
              <Columns3 size={18} />
            </button>
          </div>

          {/* Search Input */}
          <div className={styles.searchBox}>
            <Search size={15} color="#94a3b8" />
            <input
              type="text"
              placeholder="Qidirish"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <X size={14} color="#94a3b8" />
              </button>
            )}
          </div>

          {/* Sub-Category Dropdown (Buyurtmalar ro'yxati / Birinchi darsga yozilganlar) */}
          <div className={styles.categoryDropdown} ref={categoryDropdownRef}>
            <button
              className={styles.categoryBtn}
              onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
            >
              <span>{selectedCategory}</span>
              <ChevronDown size={14} />
            </button>

            {isCategoryMenuOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  className={`${styles.dropdownItem} ${
                    selectedCategory === "Buyurtmalar ro'yxati" ? styles.active : ''
                  }`}
                  onClick={() => {
                    setSelectedCategory("Buyurtmalar ro'yxati");
                    setIsCategoryMenuOpen(false);
                  }}
                >
                  <span>Buyurtmalar ro'yxati</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {items?.length || 0}
                  </span>
                </button>
                <button
                  className={`${styles.dropdownItem} ${
                    selectedCategory === 'Birinchi darsga yozilganlar' ? styles.active : ''
                  }`}
                  onClick={() => {
                    setSelectedCategory('Birinchi darsga yozilganlar');
                    setIsCategoryMenuOpen(false);
                  }}
                >
                  <span>Birinchi darsga yozilganlar</span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {groupedLeads.PROBNIYGA_KELADI?.length || 0}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Buttons */}
        <div className={styles.rightControls}>
          <button
            type="button"
            className={styles.exportXlsxBtn}
            onClick={handleExportXLSX}
            disabled={isExporting}
            title="Lidlar ro'yxatini chiroyli Excel (.xlsx) formatida yuklab olish"
          >
            <Download size={15} />
            <span>{isExporting ? "Yuklanmoqda..." : "Excelga yuklash"}</span>
          </button>

          <button
            className={`${styles.iconBtn} ${loading ? styles.spinning : ''}`}
            onClick={() => dispatch(fetchLeads({ limit: 100 }))}
            disabled={loading}
            title="Ro'yxatni yangilash"
          >
            <RotateCw size={17} />
          </button>

          <button className={styles.addBtn} onClick={handleOpenCreate}>
            <Plus size={16} />
            <span>Qo'shish</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className={styles.toastSuccess}>
          <CheckCircle2 size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      {loading && !items.length ? (
        <Loader text="Lidlar yuklanmoqda..." />
      ) : viewType === 'KANBAN' ? (
        /* KANBAN BOARD VIEW */
        <div className={styles.kanbanBoard}>
          {STAGES.map((stage) => {
            const stageLeads = groupedLeads[stage.id] || [];
            const isDragTarget = dragOverColumn === stage.id;

            return (
              <div
                key={stage.id}
                className={`${styles.column} ${isDragTarget ? styles.dragOver : ''}`}
                onDragOver={(e) => handleDragOver(e, stage.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, stage.id)}
              >
                {/* Column Header */}
                <div className={styles.columnHeader}>
                  <div
                    className={styles.columnTopBar}
                    style={{ backgroundColor: stage.color }}
                  />
                  <div className={styles.columnTitle}>{stage.label}</div>
                  <div className={styles.columnSubtitle}>
                    {stageLeads.length} {stage.subLabel}
                  </div>
                </div>

                {/* Cards Container */}
                <div className={styles.cardsList}>
                  {stageLeads.length > 0 ? (
                    stageLeads.map((lead) => {
                      const isDragging = draggedLeadId === lead.id;
                      const courseName =
                        lead.interested_course?.name ||
                        lead.course_name ||
                        'Robototexnika';
                      const staffName =
                        lead.assigned_user?.full_name || 'Husniddin Hamidov';
                      const schoolInfo = lead.note || lead.phone || '2-maktab 5-A sinf';

                      return (
                        <div
                          key={lead.id}
                          className={`${styles.leadCard} ${isDragging ? styles.dragging : ''}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, lead.id)}
                          onClick={() => handleOpenDetails(lead)}
                        >
                          <div className={styles.cardHeader}>
                            <span className={styles.cardName}>{lead.full_name}</span>
                            <span className={styles.cardCourse}>, {courseName}</span>
                          </div>

                          <div className={styles.cardStaff}>{staffName}</div>

                          <div className={styles.cardNote}>{schoolInfo}</div>

                          <div className={styles.cardFooter}>
                            <div className={styles.cardActions} onClick={(e) => e.stopPropagation()}>
                              <button
                                className={styles.cardActionBtn}
                                onClick={(e) => handleOpenEdit(lead, e)}
                                title="Tahrirlash"
                              >
                                <Edit2 size={13} />
                              </button>
                              {!isManager && (
                                <button
                                  className={styles.cardActionBtn}
                                  onClick={(e) => handleDelete(lead.id, e)}
                                  title="O'chirish"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>

                            <div className={styles.taskIndicator}>
                              <span
                                className={`${styles.taskDot} ${
                                  lead.next_follow_up ? styles.taskDotActive : ''
                                }`}
                              />
                              <span>
                                {lead.next_follow_up ? "Topshiriq bor" : "Topshiriq yo'q"}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className={styles.emptyColumn}>Lidlar yo'q</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className={styles.card}>
          <Table
            columns={listColumns}
            data={paginatedList}
            emptyMessage="Hozircha birorta lid topilmadi"
          />
          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredLeads.length / pageSize) || 1}
            totalItems={filteredLeads.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* CREATE / EDIT LEAD MODAL */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {isCreateModalOpen ? "Yangi Lid Qo'shish" : "Lidni Tahrirlash"}
              </h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className={styles.modalBody}>
                {formError && (
                  <div className={styles.alert}>
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <Inputs
                  label="Mijoz Ism-Familiyasi"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder=""
                  required
                />

                <Inputs
                  label="Telefon raqami"
                  name="phone"
                  type="text"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder=""
                  required
                />

                <Select
                  label="Qiziqqan kursi"
                  name="interested_course_id"
                  value={formData.interested_course_id}
                  onChange={(e) => setFormData({ ...formData, interested_course_id: e.target.value })}
                  options={[
                    { value: '', label: 'Kursni tanlang' },
                    ...branchCourses.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />

                <Select
                  label="Mas'ul xodim"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                  options={[
                    { value: '', label: 'Xodimni tanlang' },
                    ...staffUsers.map((u) => {
                      const roleDisplay = formatStaffRole(u?.role?.name || u?.role_name || u?.role);
                      return {
                        value: u.id,
                        label: `${u.full_name} (${roleDisplay})`,
                      };
                    }),
                  ]}
                />

                <Select
                  label="Bosqich (Holat)"
                  name="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={STAGES.map((s) => ({ value: s.id, label: s.label }))}
                />

                <Inputs
                  label="Manba (Qayerdan eshitgan)"
                  name="source"
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder=""
                />

                <Inputs
                  label="Qo'shimcha ma'lumot (Maktab, sinf, izoh)"
                  name="note"
                  type="text"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder=""
                />
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setIsCreateModalOpen(false); setIsEditModalOpen(false); }}
                >
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary">
                  {isCreateModalOpen ? "Lidni Qo'shish" : "Saqlash"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEAD DETAILS MODAL */}
      {isDetailsModalOpen && currentLead && (
        <div className={styles.modalOverlay} onClick={() => setIsDetailsModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Lid Ma'lumotlari</h3>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setIsDetailsModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                <div>
                  <h4 style={{ fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                    {currentLead.full_name}
                  </h4>
                  <p style={{ fontSize: '13px', color: '#64748b' }}>
                    {currentLead.interested_course?.name || 'Robototexnika'}
                  </p>
                </div>

                <a
                  href={`tel:${currentLead.phone}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                    textDecoration: 'none',
                    border: '1px solid #a7f3d0',
                  }}
                >
                  <Phone size={14} />
                  <span>{currentLead.phone}</span>
                </a>
              </div>

              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Telefon</span>
                  <span className={styles.detailValue}>{currentLead.phone || '—'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Manba</span>
                  <span className={styles.detailValue}>{currentLead.source || 'Telegram'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Mas'ul xodim</span>
                  <span className={styles.detailValue}>
                    {currentLead.assigned_user?.full_name || 'Husniddin Hamidov'}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Maktab / Sinf / Izoh</span>
                  <span className={styles.detailValue}>
                    {currentLead.note || '2-maktab 5-A sinf'}
                  </span>
                </div>
              </div>

              {/* Stage Quick Movement */}
              <div className={styles.stageChangeSection}>
                <span className={styles.detailLabel}>Bosqichni o'zgartirish:</span>
                <div className={styles.stageButtons}>
                  {STAGES.map((s) => {
                    const isActive = normalizeStage(currentLead.status) === s.id;
                    return (
                      <button
                        key={s.id}
                        className={`${styles.stageBtn} ${isActive ? styles.activeStage : ''}`}
                        onClick={() => handleQuickChangeStage(currentLead.id, s.id)}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              {!isManager && (
                <Button
                  variant="outline"
                  onClick={() => handleDelete(currentLead.id)}
                  style={{ color: '#ef4444', borderColor: '#fca5a5' }}
                >
                  O'chirish
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  handleOpenEdit(currentLead);
                }}
              >
                Tahrirlash
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leads;
