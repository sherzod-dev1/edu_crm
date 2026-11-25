import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchClassrooms,
  fetchClassroomById,
  createClassroom,
  updateClassroom,
  deleteClassroom,
  clearError,
} from '../../store/slices/classroomSlice';
import branchApi from '../../services/branchApi';
import groupApi from '../../services/groupApi';
import lessonApi from '../../services/lessonApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './classrooms.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

const Classrooms = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.classroom || {}
  );
  const { user } = useSelector((state) => state.auth || {});

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const [branchesList, setBranchesList] = useState([]);
  const [groupsList, setGroupsList] = useState([]);
  const [lessonsList, setLessonsList] = useState([]);

  // Classroom Form Data (all inputs start completely empty)
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    branch_id: '',
    room_type: 'Standart',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadAllData = () => {
    dispatch(fetchClassrooms());

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

    groupApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setGroupsList(list);
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

  const handleOpenCreate = () => {
    const isSuperAdminUser = (user?.role || '').toUpperCase() === 'SUPER_ADMIN' || (user?.role || '').toUpperCase() === 'SUPERADMIN';
    const defaultBranchId = !isSuperAdminUser ? (user?.branch_id || user?.branch?.id || branchesList[0]?.id || '') : (branchesList[0]?.id || '');
    setFormData({
      name: '',
      capacity: '',
      branch_id: defaultBranchId,
      room_type: 'Standart',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchClassroomById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      id: item.id,
      name: item.name || '',
      capacity: item.capacity || '',
      branch_id: item.branch_id || item.branch?.id || '',
      room_type: item.room_type || 'Standart',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Xonani o'chirish",
      message: "Haqiqatdan ham ushbu xonani o'chirmoqchimisiz? Xonaga rejalashtirilgan darslar jadvaliga ta'sir qilishi mumkin.",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteClassroom(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchClassrooms());
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

    if (!formData.name.trim()) {
      setErrorMessage('Iltimos, xona nomini kiriting');
      return;
    }

    const payload = { ...formData };
    if (payload.branch_id) payload.branch_id = Number(payload.branch_id);
    if (payload.capacity) payload.capacity = Number(payload.capacity);

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createClassroom(payload));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateClassroom({ id: formData.id, data: payload }));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  const userRole = (user?.role || '').toUpperCase();
  const rawPosition = (
    user?.position ||
    user?.employee?.position ||
    user?.employee_profile?.position ||
    ''
  ).toLowerCase();
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
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
  const canManage = !isTeacher && !isStudent && !isManager && !isInspector;
  const userBranchId = user?.branch_id;

  const branchScopedItems = (!isSuperAdmin && userBranchId)
    ? (items || []).filter((item) => String(item.branch_id) === String(userBranchId))
    : (items || []);

  const filteredItems = branchScopedItems.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const branch = (item.branch?.name || '').toLowerCase();
    const type = (item.room_type || '').toLowerCase();
    return name.includes(q) || branch.includes(q) || type.includes(q);
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Helper for classroom occupancy & busy status calculation
  const getClassroomStats = (classroom) => {
    const roomId = classroom.id;

    // Groups assigned to this room
    const roomGroups = groupsList.filter(
      (g) => String(g.classroom_id) === String(roomId)
    );

    // Lessons in this room
    const roomLessons = lessonsList.filter(
      (l) => String(l.classroom_id) === String(roomId)
    );

    // Real Occupancy percentage based on assigned groups/lessons (0% if none)
    let occupancyPercent = 0;
    if (roomGroups.length > 0) {
      occupancyPercent = Math.min(roomGroups.length * 25, 100);
    }

    // Status: Dars ketmoqda only if an actual lesson is in progress right now
    const isBusy = roomLessons.some((l) => l.status === 'in_progress');

    const branchName = classroom.branch?.name || user?.branch?.name || user?.full_name || 'Yuksalish Talimi';
    const capacity = classroom.capacity || 20;

    return {
      occupancyPercent,
      isBusy,
      branchName,
      capacity,
    };
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Xonalar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: 'Tahrirlash' }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: 'Batafsil' }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header section matching exact UI */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Xonalar</h1>
              <p className={styles.mainSubtitle}>
                Xonalar va band qilinish holati
              </p>
            </div>
            {canManage && (
              <button className={styles.addButton} onClick={handleOpenCreate}>
                <Plus size={18} strokeWidth={2.5} />
                <span>Qo'shish</span>
              </button>
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

          {/* Classrooms Grid (4 columns) */}
          {loading ? (
            <Loader text="Xonalar yuklanmoqda..." />
          ) : paginatedItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Hozircha xonalar topilmadi</p>
            </div>
          ) : (
            <>
              <div className={styles.classroomsGrid}>
                {paginatedItems.map((item, idx) => {
                  const {
                    occupancyPercent,
                    isBusy,
                    branchName,
                    capacity,
                  } = getClassroomStats(item);

                  const displayName = item.name || `Xona ${idx + 1}`;

                  return (
                    <div
                      key={item.id}
                      className={styles.classroomCard}
                      onClick={() => handleOpenDetails(item)}
                    >
                      {/* Top Row: Name and Actions */}
                      <div className={styles.cardTop}>
                        <h3 className={styles.roomName}>{displayName}</h3>

                        {/* Quick action buttons on hover */}
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
                        </div>
                      </div>

                      {/* Info lines: Capacity & Branch */}
                      <div className={styles.infoDetails}>
                        <p className={styles.capacityText}>
                          Sig'im: {capacity} o'rin
                        </p>
                        <p className={styles.branchText}>
                          Filial: {branchName}
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className={styles.progressBarTrack}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${occupancyPercent}%` }}
                        />
                      </div>

                      {/* Occupancy percentage text */}
                      <p className={styles.bandText}>
                        Band: {occupancyPercent}%
                      </p>

                      {/* Status badge: Dars ketmoqda vs Bo'sh */}
                      <div className={styles.statusBadgeWrapper}>
                        {isBusy ? (
                          <span className={styles.statusBadgeBusy}>
                            Dars ketmoqda
                          </span>
                        ) : (
                          <span className={styles.statusBadgeFree}>
                            Bo'sh
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredItems.length > pageSize && (
                <div style={{ marginTop: '24px' }}>
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
        </>
      )}

      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>
                {viewMode === 'CREATE' ? 'Yangi Xona Qo\'shish' : 'Xonani Tahrirlash'}
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
                  label="Xona Nomi / Raqami *"
                  name="name"
                  type="text"
                  as="input"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                <Inputs
                  label="Sig'im (o'rinlar soni) *"
                  name="capacity"
                  type="number"
                  as="input"
                  value={formData.capacity || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

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

                <Select
                  label="Xona turi"
                  name="room_type"
                  value={formData.room_type || 'Standart'}
                  onChange={handleChange}
                  options={[
                    { value: 'Standart', label: 'Standart dars xonasi' },
                    { value: 'Kompyuter', label: 'Kompyuter xonasi (IT Lab)' },
                    { value: 'Laboratoriya', label: 'Laboratoriya' },
                    { value: 'Konferentsiya', label: 'Katta zal / Konferentsiya' },
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
              <h1 className={styles.mainTitle}>Xona Ma'lumotlari</h1>
              <p className={styles.mainSubtitle}>
                Tanlangan xona bo'yicha to'liq ma'lumot
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
              <div className={styles.detailsGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Xona Nomi</span>
                  <span className={styles.detailValue}>
                    {selectedItem.name || `Xona #${selectedItem.id}`}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Sig'imi</span>
                  <span className={styles.detailValue}>
                    {selectedItem.capacity ? `${selectedItem.capacity} o'rin` : '—'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Filial</span>
                  <span className={styles.detailValue}>
                    {selectedItem.branch?.name || 'Asosiy filial'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Xona Turi</span>
                  <span className={styles.detailValue}>
                    {selectedItem.room_type || 'Standart'}
                  </span>
                </div>
              </div>
            ) : (
              <p>Ma'lumot topilmadi</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Classrooms;
