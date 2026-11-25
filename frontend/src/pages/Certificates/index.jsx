import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchCertificates,
  createCertificate,
  updateCertificate,
  deleteCertificate,
  clearError,
} from '../../store/slices/certificateSlice';
import studentApi from '../../services/studentApi';
import courseApi from '../../services/courseApi';
import { Breadcrumbs } from '../../layout';
import { Button, Inputs, Select, Loader } from '../../components';
import { useConfirm } from '../../context/ConfirmContext';
import styles from './certificates.module.css';
import {
  Plus,
  ArrowLeft,
  AlertCircle,
  Printer,
  Download,
  Trash2,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'SR';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Certificates = () => {
  const dispatch = useDispatch();
  const confirm = useConfirm();
  const { user } = useSelector((state) => state.auth || {});
  const centerName = user?.branch?.name || "Yuksalish Ta'limi";

  const { items, loading, error } = useSelector(
    (state) => state.certificate || {}
  );

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CREATE' | 'EDIT'
  const [certTheme, setCertTheme] = useState('themeGold'); // 'themeGold' | 'themeEmerald' | 'themePlatinum'
  const [studentsList, setStudentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(0);

  // Form Data (all inputs start completely empty)
  const [formData, setFormData] = useState({
    student_id: '',
    course_id: '',
    certificate_number: '',
    title: 'Kursni tamomlaganlik sertifikati',
    issue_date: '',
    status: 'active',
  });
  const [errorMessage, setErrorMessage] = useState('');

  const loadAllData = () => {
    dispatch(fetchCertificates());

    studentApi.getAll({ limit: 300 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setStudentsList(list);
    }).catch(() => {});

    courseApi.getAll({ limit: 100 }).then((res) => {
      const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setCoursesList(list);
    }).catch(() => {});
  };

  useEffect(() => {
    loadAllData();
  }, [dispatch]);

  const handleOpenCreate = () => {
    setFormData({
      student_id: studentsList[0]?.id || '',
      course_id: coursesList[0]?.id || '',
      certificate_number: `CERT-${Date.now().toString().slice(-5)}`,
      title: 'Kursni tamomlaganlik sertifikati',
      issue_date: new Date().toISOString().split('T')[0],
      status: 'active',
    });
    setErrorMessage('');
    dispatch(clearError());
    setViewMode('CREATE');
  };

  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    const isConfirmed = await confirm({
      title: "Sertifikatni o'chirish",
      message: "Haqiqatdan ham ushbu sertifikatni o'chirmoqchimisiz?",
      confirmText: "Ha, o'chirilsin",
      cancelText: 'Bekor qilish',
      type: 'danger',
    });

    if (isConfirmed) {
      const res = await dispatch(deleteCertificate(id));
      if (res.error) {
        alert("O'chirishda xatolik: " + (res.payload || res.error.message));
      } else {
        dispatch(fetchCertificates());
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

    if (!formData.student_id) {
      setErrorMessage('Iltimos, talabani tanlang');
      return;
    }
    if (!formData.course_id) {
      setErrorMessage('Iltimos, kursni tanlang');
      return;
    }

    const payload = {
      ...formData,
      student_id: Number(formData.student_id),
      course_id: Number(formData.course_id),
      certificate_number:
        formData.certificate_number?.trim() ||
        `CERT-${Date.now().toString().slice(-6)}`,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === '' || payload[key] === null || payload[key] === undefined) {
        delete payload[key];
      }
    });

    if (viewMode === 'CREATE') {
      const res = await dispatch(createCertificate(payload));
      if (!res.error) {
        loadAllData();
        setViewMode('LIST');
      } else {
        setErrorMessage(res.payload || res.error.message || 'Yaratishda xatolik yuz berdi');
      }
    }
  };

  // Compile list of students for certificate display
  const certificateStudents = useMemo(() => {
    // If certificates exist in store, map them
    if (items && items.length > 0) {
      return items.map((cert, idx) => {
        const student =
          cert.student ||
          studentsList.find((s) => String(s.id) === String(cert.student_id));
        const fullName =
          student?.user?.full_name || student?.name || `Talaba #${cert.student_id}`;

        const course =
          cert.course ||
          coursesList.find((c) => String(c.id) === String(cert.course_id));
        const courseName = course?.name || 'Ingliz tili (IELTS)';

        const isIssued = cert.status === 'active' || !cert.status;
        const certNumber = cert.certificate_number || `CERT-108${idx + 1}`;
        const issueDate = cert.issue_date
          ? String(cert.issue_date).split('T')[0]
          : '05.10.2024';

        return {
          id: cert.id,
          fullName,
          courseName,
          certNumber,
          issueDate,
          isIssued,
        };
      });
    }

    // Fallback sample students if fresh DB
    const sampleStudents = [
      { id: 1, fullName: 'Aziza Karimova', courseName: 'Ingliz tili (IELTS)', certNumber: 'CERT-10824', issueDate: '05.10.2024', isIssued: true },
      { id: 2, fullName: 'Jasur Toshmatov', courseName: 'Dasturlash (Full-Stack)', certNumber: 'CERT-10825', issueDate: '08.10.2024', isIssued: false },
      { id: 3, fullName: 'Malika Rahimova', courseName: 'Matematika (SAT)', certNumber: 'CERT-10826', issueDate: '10.10.2024', isIssued: true },
      { id: 4, fullName: 'Bekzod Aliyev', courseName: 'Grafik dizayn', certNumber: 'CERT-10827', issueDate: '12.10.2024', isIssued: false },
      { id: 5, fullName: 'Nilufar Yusupova', courseName: 'Rus tili', certNumber: 'CERT-10828', issueDate: '15.10.2024', isIssued: true },
      { id: 6, fullName: 'Sardor Ergashev', courseName: 'IELTS Intensive', certNumber: 'CERT-10829', issueDate: '18.10.2024', isIssued: false },
    ];

    if (studentsList.length > 0) {
      return studentsList.slice(0, 6).map((st, i) => {
        const isIssued = i % 2 === 0;
        return {
          id: st.id || i + 1,
          fullName: st.user?.full_name || st.name || `Talaba #${i + 1}`,
          courseName: st.education || 'Ingliz tili (IELTS)',
          certNumber: `CERT-1082${i + 4}`,
          issueDate: '05.10.2024',
          isIssued,
        };
      });
    }

    return sampleStudents;
  }, [items, studentsList, coursesList]);

  // Current active certificate for left preview
  const activeCertificate =
    certificateStudents[selectedStudentIndex] ||
    certificateStudents[0] || {
      fullName: 'Aziza Karimova',
      courseName: 'Ingliz tili (IELTS)',
      certNumber: 'CERT-10824',
      issueDate: '05.10.2024',
    };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Sertifikatlar', onClick: viewMode !== 'LIST' ? () => setViewMode('LIST') : undefined },
          ...(viewMode === 'CREATE' ? [{ label: "Sertifikat Berish" }] : []),
        ]}
      />

      {viewMode === 'LIST' && (
        <>
          {/* Header section matching exact UI */}
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Sertifikatlar</h1>
              <p className={styles.mainSubtitle}>Berilgan sertifikatlar</p>
            </div>

            <button className={styles.addButton} onClick={handleOpenCreate}>
              <span>+ Sertifikat berish</span>
            </button>
          </div>

          {loading ? (
            <Loader text="Sertifikatlar yuklanmoqda..." />
          ) : (
            <div className={styles.mainLayout}>
              {/* Left Column: Modern Luxury Certificate Frame */}
              <div className={styles.previewWrapper}>
                {/* Theme Selector Bar */}
                <div className={styles.themeSelectorBar}>
                  <span className={styles.themeLabel}>
                    <span>🎨</span>
                    <span>Sertifikat Uslubi:</span>
                  </span>
                  <div className={styles.themeButtons}>
                    <button
                      type="button"
                      className={`${styles.themeBtn} ${certTheme === 'themeGold' ? styles.themeBtnActive : ''}`}
                      onClick={() => setCertTheme('themeGold')}
                      title="Qirollik Oltin & To'q Ko'k"
                    >
                      <span>🌟</span>
                      <span>Oltin & To'q Ko'k</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.themeBtn} ${certTheme === 'themeEmerald' ? styles.themeBtnActive : ''}`}
                      onClick={() => setCertTheme('themeEmerald')}
                      title="Zumrad & Zarhal"
                    >
                      <span>💎</span>
                      <span>Zumrad & Oltin</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.themeBtn} ${certTheme === 'themePlatinum' ? styles.themeBtnActive : ''}`}
                      onClick={() => setCertTheme('themePlatinum')}
                      title="Qora & Platina"
                    >
                      <span>🌙</span>
                      <span>Platina & Qora</span>
                    </button>
                  </div>
                </div>

                {/* Main Luxury Certificate Container */}
                <div className={`${styles.certificateContainer} ${styles[certTheme]}`}>
                  <div className={styles.certificateInner}>
                    {/* SVG Definitions for Gradients */}
                    <svg width="0" height="0" style={{ position: 'absolute' }}>
                      <defs>
                        <linearGradient id="certGoldGrad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fef08a" />
                          <stop offset="50%" stopColor="#eab308" />
                          <stop offset="100%" stopColor="#ca8a04" />
                        </linearGradient>
                        <linearGradient id="crestBgGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0f172a" />
                          <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Watermark Crest in background */}
                    <div className={styles.watermark}>
                      <svg width="260" height="260" viewBox="0 0 100 100" fill="none">
                        <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2" />
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.6" />
                        <polygon points="50,22 28,34 50,46 72,34" fill="currentColor" fillOpacity="0.25" />
                        <path d="M 34 40 L 34 56 Q 50 64 66 56 L 66 40" fill="currentColor" fillOpacity="0.2" />
                        <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="0.8" />
                        <text x="50" y="76" textAnchor="middle" fill="currentColor" fontSize="5.5" fontWeight="800" letterSpacing="1.5">
                          ★ EXCELLENCE ★
                        </text>
                      </svg>
                    </div>

                    {/* 4 Elegant Corner Ornaments */}
                    <div className={`${styles.cornerOrnament} ${styles.cornerTopLeft}`}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <path d="M 2 2 L 32 2 L 32 5 L 5 5 L 5 32 L 2 32 Z" fill="url(#certGoldGrad)" />
                        <rect x="9" y="9" width="4" height="4" fill="url(#certGoldGrad)" />
                        <circle cx="4" cy="4" r="2" fill="#ca8a04" />
                      </svg>
                    </div>
                    <div className={`${styles.cornerOrnament} ${styles.cornerTopRight}`}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <path d="M 34 2 L 4 2 L 4 5 L 31 5 L 31 32 L 34 32 Z" fill="url(#certGoldGrad)" />
                        <rect x="23" y="9" width="4" height="4" fill="url(#certGoldGrad)" />
                        <circle cx="32" cy="4" r="2" fill="#ca8a04" />
                      </svg>
                    </div>
                    <div className={`${styles.cornerOrnament} ${styles.cornerBottomLeft}`}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <path d="M 2 34 L 32 34 L 32 31 L 5 31 L 5 4 L 2 4 Z" fill="url(#certGoldGrad)" />
                        <rect x="9" y="23" width="4" height="4" fill="url(#certGoldGrad)" />
                        <circle cx="4" cy="32" r="2" fill="#ca8a04" />
                      </svg>
                    </div>
                    <div className={`${styles.cornerOrnament} ${styles.cornerBottomRight}`}>
                      <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                        <path d="M 34 34 L 4 34 L 4 31 L 31 31 L 31 4 L 34 4 Z" fill="url(#certGoldGrad)" />
                        <rect x="23" y="23" width="4" height="4" fill="url(#certGoldGrad)" />
                        <circle cx="32" cy="32" r="2" fill="#ca8a04" />
                      </svg>
                    </div>

                    {/* Certificate Top Header */}
                    <div className={styles.certHeaderTop}>
                      <div className={styles.laurelCrest}>
                        <svg width="42" height="42" viewBox="0 0 48 48" fill="none">
                          <circle cx="24" cy="24" r="20" fill="url(#crestBgGrad)" />
                          {/* Laurel branch left */}
                          <path d="M 12 30 Q 11 20 18 14 Q 17 22 20 26" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                          {/* Laurel branch right */}
                          <path d="M 36 30 Q 37 20 30 14 Q 31 22 28 26" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                          {/* Graduation Cap in center */}
                          <polygon points="24,15 16,20 24,25 32,20" fill="#facc15" />
                          <path d="M 18 23 L 18 28 Q 24 32 30 28 L 30 23" fill="#eab308" />
                        </svg>
                      </div>

                      <div className={styles.centerMeta}>
                        <span className={styles.topLuxuryPill}>★ RASMIY MALAKA SERTIFIKATI ★</span>
                        <h3 className={styles.centerBrandTitle}>{centerName.toUpperCase()}</h3>
                        <span className={styles.centerBrandSub}>O'QUV VA KASBIY RIVOJLANISH MARKAZI</span>
                      </div>
                    </div>

                    {/* Main Title Group */}
                    <div className={styles.mainTitleGroup}>
                      <h1 className={styles.certHeading}>SERTIFIKAT</h1>
                      <span className={styles.certHeadingSub}>CERTIFICATE OF ACHIEVEMENT</span>
                      <div className={styles.ornateDivider}>
                        <span className={styles.dividerLine} />
                        <span className={styles.dividerDiamond}>✦</span>
                        <span className={styles.dividerLine} />
                      </div>
                    </div>

                    {/* Presentation Line */}
                    <p className={styles.presentationText}>Ushbu rasmiy hujjat orqali tasdiqlanadiki:</p>

                    {/* Student Name */}
                    <div className={styles.recipientWrapper}>
                      <h2 className={styles.studentFullName}>
                        {activeCertificate.fullName || 'Talaba F.I.SH'}
                      </h2>
                      <div className={styles.nameUnderline} />
                    </div>

                    {/* Course Achievement Description */}
                    <p className={styles.achievementDescription}>
                      muvaffaqiyatli ravishda <span className={styles.courseNameHighlight}>«{activeCertificate.courseName || 'Kurs'}»</span> o'quv dasturi bo'yicha barcha nazariy va amaliy mashg'ulotlarni to'liq tamomladi hamda tegishli professional malaka darajasiga erishdi.
                    </p>

                    {/* Bottom Signatures & 3D Gold Seal Row */}
                    <div className={styles.certBottomRow}>
                      {/* Left: Director Signature Area (Ochiq joy, qo'lda imzo qo'yish uchun) */}
                      <div className={styles.signatureBlock}>
                        <div className={styles.sigCanvas} />
                        <div className={styles.sigLine} />
                        <span className={styles.sigRole}>Markaz Rahbari / Direktor</span>
                      </div>

                      {/* Center: 3D Gold Academy Medal Seal */}
                      <div className={styles.goldMedalSeal}>
                        <svg width="74" height="92" viewBox="0 0 80 100" fill="none">
                          <defs>
                            <linearGradient id="sealGold" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#fef08a" />
                              <stop offset="35%" stopColor="#f59e0b" />
                              <stop offset="70%" stopColor="#d97706" />
                              <stop offset="100%" stopColor="#92400e" />
                            </linearGradient>
                            <linearGradient id="ribbonRed" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#dc2626" />
                              <stop offset="100%" stopColor="#991b1b" />
                            </linearGradient>
                            <filter id="sealShadow" x="-15%" y="0%" width="130%" height="125%">
                              <feDropShadow dx="0" dy="4" stdDeviation="3" floodColor="#000000" floodOpacity="0.22" />
                            </filter>
                          </defs>

                          {/* Red Ribbon Tails */}
                          <path d="M 28 65 L 18 95 L 32 88 L 38 95 L 36 65 Z" fill="url(#ribbonRed)" />
                          <path d="M 52 65 L 44 95 L 48 88 L 62 95 L 52 65 Z" fill="url(#ribbonRed)" />

                          {/* Scalloped Gold Medal Body */}
                          <g filter="url(#sealShadow)">
                            <circle cx="40" cy="45" r="32" fill="url(#sealGold)" />
                            <circle cx="40" cy="45" r="28" stroke="#ffffff" strokeWidth="1" strokeDasharray="2 1.5" fill="none" opacity="0.6" />
                            <circle cx="40" cy="45" r="24" fill="#0f172a" fillOpacity="0.1" stroke="url(#sealGold)" strokeWidth="1.5" />

                            <circle cx="40" cy="45" r="17" fill="url(#sealGold)" stroke="#fef08a" strokeWidth="0.8" />
                            <polygon points="40,33 42,39 48,39 43,43 45,49 40,45 35,49 37,43 32,39 38,39" fill="#ffffff" />
                            <text x="40" y="55" textAnchor="middle" fill="#78350f" fontSize="4" fontWeight="800" letterSpacing="0.5">
                              VERIFIED
                            </text>
                            <text x="40" y="60" textAnchor="middle" fill="#78350f" fontSize="3.2" fontWeight="700">
                              OFFICIAL SEAL
                            </text>
                          </g>
                        </svg>
                      </div>

                      {/* Right: Instructor Signature Area (Ochiq joy, qo'lda imzo qo'yish uchun) */}
                      <div className={styles.signatureBlock}>
                        <div className={styles.sigCanvas} />
                        <div className={styles.sigLine} />
                        <span className={styles.sigRole}>Katta O'qituvchi / Mentor</span>
                      </div>
                    </div>

                    {/* Security Footer Details */}
                    <div className={styles.certSecurityFooter}>
                      <div className={styles.footerItem}>
                        <span className={styles.footerLabel}>BERILGAN SANA:</span>
                        <span className={styles.footerValue}>{activeCertificate.issueDate || '05.10.2024'}</span>
                      </div>

                      {/* Modern Vector QR Code (Yozuvsiz, zamonaviy) */}
                      <div className={styles.qrBadge} title="Sertifikat raqami va haqiqiyligi">
                        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                          <defs>
                            <linearGradient id="qrGrad" x1="0" y1="0" x2="1" y2="1">
                              <stop offset="0%" stopColor="#1e3a8a" />
                              <stop offset="100%" stopColor="#0f172a" />
                            </linearGradient>
                          </defs>
                          <rect width="36" height="36" rx="6" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1" />
                          {/* Top-Left Eye */}
                          <rect x="4" y="4" width="8" height="8" rx="2" stroke="url(#qrGrad)" strokeWidth="1.6" fill="none" />
                          <rect x="6.5" y="6.5" width="3" height="3" rx="1" fill="#1e3a8a" />
                          {/* Top-Right Eye */}
                          <rect x="24" y="4" width="8" height="8" rx="2" stroke="url(#qrGrad)" strokeWidth="1.6" fill="none" />
                          <rect x="26.5" y="6.5" width="3" height="3" rx="1" fill="#1e3a8a" />
                          {/* Bottom-Left Eye */}
                          <rect x="4" y="24" width="8" height="8" rx="2" stroke="url(#qrGrad)" strokeWidth="1.6" fill="none" />
                          <rect x="6.5" y="26.5" width="3" height="3" rx="1" fill="#1e3a8a" />
                          {/* Modern Matrix Patterns */}
                          <rect x="15" y="5" width="2.5" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="19" y="5" width="2.5" height="2.5" rx="0.8" fill="#ca8a04" />
                          <rect x="15" y="9" width="2.5" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="19" y="9" width="2.5" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="5" y="15" width="2.5" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="9" y="15" width="2.5" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="9" y="19" width="2.5" height="2.5" rx="0.8" fill="#ca8a04" />
                          {/* Center Tech Node */}
                          <rect x="15" y="15" width="6" height="6" rx="1.5" fill="#1e40af" />
                          <circle cx="18" cy="18" r="1.5" fill="#ffffff" />
                          <rect x="24" y="15" width="3" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="28.5" y="15" width="3" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="24" y="19" width="2.5" height="3" rx="0.8" fill="#0f172a" />
                          <rect x="15" y="24" width="3" height="2.5" rx="0.8" fill="#ca8a04" />
                          <rect x="19" y="24" width="2.5" height="3" rx="0.8" fill="#0f172a" />
                          <rect x="15" y="28.5" width="2.5" height="3" rx="0.8" fill="#0f172a" />
                          <rect x="19" y="28.5" width="3" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="24" y="24" width="3" height="2.5" rx="0.8" fill="#0f172a" />
                          <rect x="28.5" y="28" width="3" height="3.5" rx="0.8" fill="#0f172a" />
                        </svg>
                      </div>

                      <div className={styles.footerItem} style={{ textAlign: 'right' }}>
                        <span className={styles.footerLabel}>SERTIFIKAT RAQAMI:</span>
                        <span className={styles.footerValue}>{activeCertificate.certNumber || 'CERT-10824'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Print & Action Buttons */}
                <div className={styles.previewActions}>
                  <button
                    type="button"
                    className={styles.printBtn}
                    onClick={handlePrint}
                    title="Chop etish"
                  >
                    <Printer size={16} />
                    <span>Sertifikatni Chop Etish</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Students List Card */}
              <div className={styles.listContainer}>
                <div className={styles.listHeader}>
                  <span>TALABA</span>
                  <span>HOLAT</span>
                </div>

                <div className={styles.studentsList}>
                  {certificateStudents.map((st, idx) => {
                    const initials = getInitials(st.fullName);
                    const isSelected = idx === selectedStudentIndex;

                    return (
                      <div
                        key={st.id || idx}
                        className={`${styles.studentRow} ${
                          isSelected ? styles.studentRowActive : ''
                        }`}
                        onClick={() => setSelectedStudentIndex(idx)}
                      >
                        <div className={styles.studentInfo}>
                          <div className={styles.avatar}>
                            {initials}
                          </div>
                          <span className={styles.studentName} title={st.fullName}>
                            {st.fullName}
                          </span>
                        </div>

                        <div className={styles.rowRight}>
                          {st.isIssued ? (
                            <span
                              className={`${styles.statusBadge} ${styles.statusIssued}`}
                            >
                              Berilgan
                            </span>
                          ) : (
                            <span
                              className={`${styles.statusBadge} ${styles.statusPreparing}`}
                            >
                              Tayyorlanmoqda
                            </span>
                          )}

                          {st.id && items.some((it) => it.id === st.id) && (
                            <button
                              type="button"
                              className={styles.cardActionBtnDanger}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#94a3b8',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              onClick={(e) => handleDelete(st.id, e)}
                              title="O'chirish"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {viewMode === 'CREATE' && (
        <>
          <div className={styles.headerWrapper}>
            <div className={styles.headerTitleGroup}>
              <h1 className={styles.mainTitle}>Yangi Sertifikat Berish</h1>
              <p className={styles.mainSubtitle}>
                Talaba va kursni tanlab sertifikatni rasmiylashtiring
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
                <Select
                  label="Talabani tanlang *"
                  name="student_id"
                  value={formData.student_id}
                  onChange={handleChange}
                  options={[
                    { value: '', label: 'Talabani tanlang' },
                    ...studentsList.map((s) => ({
                      value: s.id,
                      label: `${s.user?.full_name || `Talaba #${s.id}`} (${s.user?.phone || ''})`,
                    })),
                  ]}
                  required={true}
                />

                <Select
                  label="Tegishli Kurs *"
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
                  required={true}
                />

                <Inputs
                  label="Sertifikat Raqami"
                  name="certificate_number"
                  type="text"
                  as="input"
                  value={formData.certificate_number || ''}
                  onChange={handleChange}
                  placeholder=""
                  required={false}
                />

                <Inputs
                  label="Berilgan Sana"
                  name="issue_date"
                  type="date"
                  as="input"
                  value={formData.issue_date || ''}
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
                    { value: 'active', label: 'Berilgan (Active)' },
                    { value: 'pending', label: 'Tayyorlanmoqda (Pending)' },
                  ]}
                  required={false}
                />
              </div>

              <div className={styles.formActions}>
                <Button variant="outline" onClick={() => setViewMode('LIST')}>
                  Bekor qilish
                </Button>
                <Button type="submit" variant="primary" loading={loading}>
                  Sertifikatni Tasdiqlash
                </Button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default Certificates;
