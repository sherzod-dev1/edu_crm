import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchExamResults,
  fetchExamResultById,
  createExamResult,
  updateExamResult,
  deleteExamResult,
  clearError,
} from '../../store/slices/examResultSlice';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import styles from './examResults.module.css';
import { Plus, Search, Eye, Edit2, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';

const ExamResults = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth || {});
  const userRole = (user?.role?.name || user?.role_name || user?.role || '').toUpperCase();
  const isStudent = userRole === 'STUDENT' || userRole === 'TALABA';

  const { items, selectedItem, loading, error } = useSelector((state) => state.examResult || {});

  const [viewMode, setViewMode] = useState('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState({"exam_id":"","student_id":"","score":""});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dispatch(fetchExamResults());
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenCreate = () => {
    setFormData({"exam_id":"","student_id":"","score":""});
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchExamResultById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item) => {
    setFormData(item);
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id) => {
    if (window.confirm("Haqiqatdan ham ushbu ma'lumotni o'chirmoqchimisiz?")) {
      const res = await dispatch(deleteExamResult(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchExamResults());
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

    const payload = { ...formData };
    Object.keys(payload).forEach((key) => {
      if (payload[key] === '') {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createExamResult(payload));
      if (!res.error) {
        dispatch(fetchExamResults());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateExamResult({ id: formData.id, data: payload }));
      if (!res.error) {
        dispatch(fetchExamResults());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  const filteredItems = (items || []).filter((item) => {
    if (isStudent) {
      const currentStudentId = user?.student?.id || user?.student_id;
      const currentUserId = user?.id;
      const itemStudentId = item.student_id || item.student?.id;
      const itemUserId = item.student?.user_id || item.user_id;

      const isMine =
        (currentStudentId && itemStudentId && String(currentStudentId) === String(itemStudentId)) ||
        (currentUserId && itemUserId && String(currentUserId) === String(itemUserId)) ||
        (currentUserId && itemStudentId && String(currentUserId) === String(itemStudentId));

      if (!isMine) return false;
    }
    if (!searchQuery) return true;
    return Object.values(item).some((val) => {
      if (typeof val === 'object' && val !== null) {
        return Object.values(val).some((v) =>
          String(v).toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      return String(val).toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const columns = [
    { title: 'ID', key: 'id', width: '60px' },
    {
      title: "Imtihon",
      key: "exam_id",
      render: (val, row) => {
        if (row.exam && row.exam.title) return row.exam.title;
        if (row.exam && row.exam.name) return row.exam.name;
        return val ? `Imtihon #${val}` : '—';
      }
    },
    ...(!isStudent ? [{
      title: "Talaba",
      key: "student_id",
      render: (val, row) => {
        const studentName = row.student?.user?.full_name || row.student?.name || (val ? `Talaba #${val}` : '—');
        return studentName;
      }
    }] : []),
    {
      title: "Olingan Ball",
      key: "score",
      render: (val, row) => {
        const score = val ?? row.score;
        return score !== undefined && score !== null ? (
          <span style={{ fontWeight: 700, color: '#16a34a' }}>⭐ {score} ball</span>
        ) : '—';
      }
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: isStudent ? '80px' : '130px',
      align: 'right',
      render: (_, row) => (
        <div className={styles.actionsCell}>
          <button className={styles.actionBtn} onClick={() => handleOpenDetails(row)} title="Ko'rish">
            <Eye size={15} />
          </button>
          {!isStudent && (
            <>
              <button className={styles.actionBtn} onClick={() => handleOpenEdit(row)} title="Tahrirlash">
                <Edit2 size={15} />
              </button>
              <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(row.id)} title="O'chirish">
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: isStudent ? "Mening Natijalarim" : "Imtihon Natijalari", path: viewMode !== 'LIST' ? '#' : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: "Tahrirlash" }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          <Header
            title={isStudent ? "Mening Natijalarim" : "Imtihon Natijalari"}
            subtitle={isStudent ? "Sizning imtihonlardan to'plagan ballaringiz va baholaringiz" : "Barcha imtihon natijalari ro'yxati va boshqaruvi"}
            actions={
              !isStudent && (
                <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
                  Yangi Imtihon Natijasi
                </Button>
              )
            }
          />

          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Imtihon Natijalari bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {loading ? (
              <Loader text="Imtihon Natijalari yuklanmoqda..." />
            ) : (
              <>
                <Table
                  columns={columns}
                  data={paginatedItems}
                  emptyMessage="Hozircha ma'lumotlar mavjud emas"
                />
                <Pagination
                  currentPage={currentPage}
                  totalPages={Math.ceil(filteredItems.length / pageSize) || 1}
                  totalItems={filteredItems.length}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </>
      )}

      {(viewMode === 'CREATE' || viewMode === 'EDIT') && (
        <>
          <Header
            title={viewMode === 'CREATE' ? "Yangi Imtihon Natijasi Yaratish" : "Imtihon Natijasini Tahrirlash"}
            subtitle="Kerakli ma'lumotlarni to'ldirib saqlang"
            actions={
              <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
                Orqaga
              </Button>
            }
          />

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
                  label="Imtihon ID"
                  name="exam_id"
                  type="number"
                  as="input"
                  value={formData.exam_id || ''}
                  onChange={handleChange}
                  placeholder="Imtihon IDni kiriting"
                  required={true}
                />
                <Inputs
                  label="Talaba ID"
                  name="student_id"
                  type="number"
                  as="input"
                  value={formData.student_id || ''}
                  onChange={handleChange}
                  placeholder="Talaba IDni kiriting"
                  required={true}
                />
                <Inputs
                  label="Olingan Ball"
                  name="score"
                  type="number"
                  as="input"
                  value={formData.score || ''}
                  onChange={handleChange}
                  placeholder="Olingan Ballni kiriting"
                  required={true}
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
          <Header
            title="Imtihon Natijasi Ma'lumotlari"
            subtitle="Tanlangan imtihon natijasi bo'yicha to'liq ko'rinish"
            actions={
              <Button variant="outline" icon={ArrowLeft} onClick={() => setViewMode('LIST')}>
                Orqaga
              </Button>
            }
          />

          <div className={styles.card}>
            {loading ? (
              <Loader text="Ma'lumotlar yuklanmoqda..." />
            ) : selectedItem ? (
              <div className={styles.detailsGrid}>
                {Object.entries(selectedItem).map(([k, v]) => (
                  <div key={k} className={styles.detailItem}>
                    <span className={styles.detailLabel}>{k.replace(/_/g, ' ')}</span>
                    <span className={styles.detailValue}>
                      {typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '—')}
                    </span>
                  </div>
                ))}
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

export default ExamResults;
