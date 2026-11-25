import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCourseModules,
  fetchCourseModuleById,
  createCourseModule,
  updateCourseModule,
  deleteCourseModule,
  clearError,
} from '../../store/slices/courseModuleSlice';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import styles from './courseModules.module.css';
import { Plus, Search, Eye, Edit2, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';

const CourseModules = () => {
  const dispatch = useDispatch();
  const { items, selectedItem, loading, error } = useSelector((state) => state.courseModule || {});

  const [viewMode, setViewMode] = useState('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState({"course_id":"","name":"","description":"","order_index":""});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dispatch(fetchCourseModules());
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenCreate = () => {
    setFormData({"course_id":"","name":"","description":"","order_index":""});
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchCourseModuleById(item.id));
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
      const res = await dispatch(deleteCourseModule(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchCourseModules());
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
      const res = await dispatch(createCourseModule(payload));
      if (!res.error) {
        dispatch(fetchCourseModules());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateCourseModule({ id: formData.id, data: payload }));
      if (!res.error) {
        dispatch(fetchCourseModules());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  const filteredItems = (items || []).filter((item) => {
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
      title: "Kurs ID",
      key: "course_id",
      render: (val, row) => {
        if (row.user && row.user["course_id"]) return row.user["course_id"];
        if (row.branch && row.branch["course_id"]) return row.branch["course_id"];
        if (row.course && row.course["course_id"]) return row.course["course_id"];
        return val ?? '—';
      }
    },
    {
      title: "Modul Nomi",
      key: "name",
      render: (val, row) => {
        if (row.user && row.user["name"]) return row.user["name"];
        if (row.branch && row.branch["name"]) return row.branch["name"];
        if (row.course && row.course["name"]) return row.course["name"];
        return val ?? '—';
      }
    },
    {
      title: "Tavsif",
      key: "description",
      render: (val, row) => {
        if (row.user && row.user["description"]) return row.user["description"];
        if (row.branch && row.branch["description"]) return row.branch["description"];
        if (row.course && row.course["description"]) return row.course["description"];
        return val ?? '—';
      }
    },
    {
      title: 'Amallar',
      key: 'actions',
      width: '130px',
      align: 'right',
      render: (_, row) => (
        <div className={styles.actionsCell}>
          <button className={styles.actionBtn} onClick={() => handleOpenDetails(row)} title="Ko'rish">
            <Eye size={15} />
          </button>
          <button className={styles.actionBtn} onClick={() => handleOpenEdit(row)} title="Tahrirlash">
            <Edit2 size={15} />
          </button>
          <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(row.id)} title="O'chirish">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: "Kurs Modullari", path: viewMode !== 'LIST' ? '#' : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: "Tahrirlash" }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          <Header
            title="Kurs Modullari"
            subtitle="Barcha kurs modullari ro'yxati va boshqaruvi"
            actions={
              <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
                Yangi Kurs Moduli
              </Button>
            }
          />

          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Kurs Modullari bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {loading ? (
              <Loader text="Kurs Modullari yuklanmoqda..." />
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
            title={viewMode === 'CREATE' ? "Yangi Kurs Moduli Yaratish" : "Kurs Modulini Tahrirlash"}
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
                  label="Kurs ID"
                  name="course_id"
                  type="number"
                  as="input"
                  value={formData.course_id || ''}
                  onChange={handleChange}
                  placeholder="Kurs IDni kiriting"
                  required={true}
                />
                <Inputs
                  label="Modul Nomi"
                  name="name"
                  type="text"
                  as="input"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder="Modul Nomini kiriting"
                  required={true}
                />
                <Inputs
                  label="Tavsif"
                  name="description"
                  type="text"
                  as="textarea"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Tavsifni kiriting"
                  required={false}
                />
                <Inputs
                  label="Tartib Raqami"
                  name="order_index"
                  type="number"
                  as="input"
                  value={formData.order_index || ''}
                  onChange={handleChange}
                  placeholder="Tartib Raqamini kiriting"
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
          <Header
            title="Kurs Moduli Ma'lumotlari"
            subtitle="Tanlangan kurs moduli bo'yicha to'liq ko'rinish"
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

export default CourseModules;
