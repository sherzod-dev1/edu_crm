import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPaymentMethods,
  fetchPaymentMethodById,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  clearError,
} from '../../store/slices/paymentMethodSlice';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Pagination, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './paymentMethods.module.css';
import {
  Plus,
  Search,
  Eye,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

const PaymentMethods = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { items, selectedItem, loading, error } = useSelector(
    (state) => state.paymentMethod || {}
  );

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT' | 'DETAILS'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  // Form Data (all inputs start completely empty)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    commission_fee: '',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    dispatch(fetchPaymentMethods());
  }, [dispatch]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      commission_fee: '',
      status: 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleOpenDetails = (item) => {
    dispatch(fetchPaymentMethodById(item.id));
    setViewMode('DETAILS');
  };

  const handleOpenEdit = (item, e) => {
    if (e) e.stopPropagation();
    setFormData({
      id: item.id,
      name: item.name || '',
      code: item.code || '',
      description: item.description || '',
      commission_fee: item.commission_fee || '',
      status: item.status || 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('EDIT');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "To'lov usulini o'chirish",
      message: "Haqiqatdan ham ushbu to'lov usulini o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deletePaymentMethod(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchPaymentMethods());
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
      setErrorMessage("Iltimos, to'lov usuli nomini kiriting");
      return;
    }

    const generatedCode = formData.code?.trim()
      ? formData.code.trim().toUpperCase().replace(/\s+/g, '_')
      : formData.name.trim().toUpperCase().replace(/\s+/g, '_') + '_' + Date.now().toString().slice(-4);

    const payload = {
      ...formData,
      code: generatedCode,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createPaymentMethod(payload));
      if (!res.error) {
        dispatch(fetchPaymentMethods());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    } else if (viewMode === 'EDIT') {
      const res = await dispatch(updatePaymentMethod({ id: formData.id, data: payload }));
      if (!res.error) {
        dispatch(fetchPaymentMethods());
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Tahrirlashda xatolik yuz berdi');
      }
    }
  };

  const filteredItems = (items || []).filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = (item.name || '').toLowerCase();
    const code = (item.code || '').toLowerCase();
    const desc = (item.description || '').toLowerCase();
    return name.includes(q) || code.includes(q) || desc.includes(q);
  });

  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Helper for subtitle description
  const getTypeDescription = (item) => {
    if (item.description && item.description.trim()) {
      return item.description;
    }
    const name = (item.name || '').toLowerCase();
    if (name.includes('naqd')) return 'Kassa orqali';
    if (name.includes('click') || name.includes('payme') || name.includes('uzum') || name.includes('onlayn')) {
      return "Onlayn to'lov";
    }
    if (name.includes('bank') || name.includes('hisob')) return 'Hisob raqamiga';
    if (name.includes('karta') || name.includes('terminal') || name.includes('humo') || name.includes('uzcard')) {
      return 'Terminal';
    }
    return "To'lov turi";
  };

  // Helper for commission text
  const getCommissionText = (item) => {
    if (item.commission_fee !== undefined && item.commission_fee !== null && item.commission_fee !== '') {
      return `Komissiya: ${item.commission_fee}%`;
    }
    const name = (item.name || '').toLowerCase();
    if (name.includes('click') || name.includes('payme') || name.includes('uzum')) {
      return 'Komissiya: 0.5%';
    }
    return 'Komissiya: 0%';
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: "To'lov usullari", onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
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
              <h1 className={styles.mainTitle}>To'lov usullari</h1>
              <p className={styles.mainSubtitle}>
                Qabul qilinadigan to'lov turlari
              </p>
            </div>
            <button className={styles.addButton} onClick={handleOpenCreate}>
              <Plus size={18} strokeWidth={2.5} />
              <span>Qo'shish</span>
            </button>
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

          {/* Payment Methods Grid (3 columns) */}
          {loading ? (
            <Loader text="To'lov usullari yuklanmoqda..." />
          ) : paginatedItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>Hozircha to'lov usullari topilmadi</p>
            </div>
          ) : (
            <>
              <div className={styles.paymentGrid}>
                {paginatedItems.map((item) => {
                  const isActive = item.status === 'active' || !item.status;
                  const descText = getTypeDescription(item);
                  const feeText = getCommissionText(item);

                  return (
                    <div
                      key={item.id}
                      className={styles.paymentCard}
                      onClick={() => handleOpenDetails(item)}
                    >
                      {/* Card Header: Name & Status Badge */}
                      <div className={styles.cardHeader}>
                        <h3 className={styles.methodName}>{item.name}</h3>

                        <div className={styles.headerRight}>
                          <span
                            className={`${styles.statusBadge} ${
                              !isActive ? styles.statusBadgeInactive : ''
                            }`}
                          >
                            {isActive ? 'Yoqilgan' : "O'chiq"}
                          </span>

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
                      </div>

                      {/* Card Details: Description & Fee */}
                      <div className={styles.cardDetails}>
                        <p className={styles.descText}>{descText}</p>
                        <p className={styles.feeText}>{feeText}</p>
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
                {viewMode === 'CREATE' ? "Yangi To'lov Usuli Qo'shish" : "To'lov Usulini Tahrirlash"}
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
                  label="To'lov Usuli Nomi *"
                  name="name"
                  type="text"
                  as="input"
                  value={formData.name || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={true}
                />

                <Inputs
                  label="Kod / Identifikator"
                  name="code"
                  type="text"
                  as="input"
                  value={formData.code || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Inputs
                  label="Komissiya (%)"
                  name="commission_fee"
                  type="number"
                  as="input"
                  value={formData.commission_fee || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Select
                  label="Holati"
                  name="status"
                  value={formData.status || 'active'}
                  onChange={handleChange}
                  options={[
                    { value: 'active', label: 'Yoqilgan (Faol)' },
                    { value: 'inactive', label: "O'chiq (Nofaol)" },
                  ]}
                  required={false}
                />

                <Inputs
                  label="Tavsif"
                  name="description"
                  type="text"
                  as="input"
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
              <h1 className={styles.mainTitle}>To'lov Usuli Ma'lumotlari</h1>
              <p className={styles.mainSubtitle}>
                Tanlangan to'lov usuli bo'yicha to'liq ma'lumot
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
              {selectedItem && (
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
                  <span className={styles.detailLabel}>Nomi</span>
                  <span className={styles.detailValue}>
                    {selectedItem.name || `To'lov #${selectedItem.id}`}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Kod</span>
                  <span className={styles.detailValue}>
                    {selectedItem.code || '—'}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Tavsif / Turi</span>
                  <span className={styles.detailValue}>
                    {getTypeDescription(selectedItem)}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Komissiya</span>
                  <span className={styles.detailValue}>
                    {getCommissionText(selectedItem)}
                  </span>
                </div>

                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Holati</span>
                  <span className={styles.detailValue}>
                    {selectedItem.status === 'active' ? 'Yoqilgan' : "O'chiq"}
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

export default PaymentMethods;
