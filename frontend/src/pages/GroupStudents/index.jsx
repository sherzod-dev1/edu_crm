import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchGroupStudents,
  fetchGroupStudentById,
  createGroupStudent,
  updateGroupStudent,
  deleteGroupStudent,
  clearError,
} from '../../store/slices/groupStudentSlice';
import { Header, Breadcrumbs } from '../../layout';
import { Button, Inputs, Table, Select, Pagination, Loader } from '../../components';
import styles from './groupStudents.module.css';
import { Plus, Search, Eye, Edit2, Trash2, ArrowLeft, AlertCircle } from 'lucide-react';

const GroupStudents = () => {
  const dispatch = useDispatch();
  const { items, selectedItem, loading, error } = useSelector((state) => state.groupStudent || {});

  const [viewMode, setViewMode] = useState('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const [formData, setFormData] = useState({"group_id":"","student_id":"","status":""});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dispatch(fetchGroupStudents());
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleOpenCreate = () => {
    setFormData({"group_id":"","student_id":"","status":""});
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchGroupStudentById(item.id));
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
      const res = await dispatch(deleteGroupStudent(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchGroupStudents());
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
      const res = await dispatch(createGroupStudent(payload));
      if (!res.error) {
        dispatch(fetchGroupStudents());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updateGroupStudent({ id: formData.id, data: payload }));
      if (!res.error) {
        dispatch(fetchGroupStudents());
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
      title: "Guruh ID",
      key: "group_id",
      render: (val, row) => {
        if (row.user && row.user["group_id"]) return row.user["group_id"];
        if (row.branch && row.branch["group_id"]) return row.branch["group_id"];
        if (row.course && row.course["group_id"]) return row.course["group_id"];
        return val ?? '—';
      }
    },
    {
      title: "Talaba ID",
      key: "student_id",
      render: (val, row) => {
        if (row.user && row.user["student_id"]) return row.user["student_id"];
        if (row.branch && row.branch["student_id"]) return row.branch["student_id"];
        if (row.course && row.course["student_id"]) return row.course["student_id"];
        return val ?? '—';
      }
    },
    {
      title: "Holati",
      key: "status",
      render: (val, row) => {
        if (row.user && row.user["status"]) return row.user["status"];
        if (row.branch && row.branch["status"]) return row.branch["status"];
        if (row.course && row.course["status"]) return row.course["status"];
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
          { label: "Guruh Talabalari", path: viewMode !== 'LIST' ? '#' : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Yangi Qo'shish" }] : []),
          ...(viewMode === 'EDIT' ? [{ label: "Tahrirlash" }] : []),
          ...(viewMode === 'DETAILS' ? [{ label: "Batafsil" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          <Header
            title="Guruh Talabalari"
            subtitle="Barcha guruh talabalari ro'yxati va boshqaruvi"
            actions={
              <Button variant="primary" icon={Plus} onClick={handleOpenCreate}>
                Yangi Guruh Talabasi
              </Button>
            }
          />

          <div className={styles.card}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Guruh Talabalari bo'yicha qidirish..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {loading ? (
              <Loader text="Guruh Talabalari yuklanmoqda..." />
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
            title={viewMode === 'CREATE' ? "Yangi Guruh Talabasi Yaratish" : "Guruh Talabasini Tahrirlash"}
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
                  label="Guruh ID"
                  name="group_id"
                  type="number"
                  as="input"
                  value={formData.group_id || ''}
                  onChange={handleChange}
                  placeholder="Guruh IDni kiriting"
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
                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  options={[{"value":"active","label":"Faol"},{"value":"dropped","label":"Chiqib ketgan"}]}
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
            title="Guruh Talabasi Ma'lumotlari"
            subtitle="Tanlangan guruh talabasi bo'yicha to'liq ko'rinish"
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

export default GroupStudents;
