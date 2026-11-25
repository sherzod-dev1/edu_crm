import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '../../layout';
import styles from './badge.module.css';
import {
  ShieldCheck,
  CheckCircle2,
  Printer,
  Calendar,
  Clock,
  ClipboardCheck,
  Users,
  QrCode,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  GraduationCap,
  FileSpreadsheet,
} from 'lucide-react';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'NZ';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export const InspectorBadge = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth || {});

  const [isOnDuty, setIsOnDuty] = useState(() => {
    return localStorage.getItem('nazoratchi_badge_active') !== 'false';
  });

  const handleToggleDuty = () => {
    const nextStatus = !isOnDuty;
    setIsOnDuty(nextStatus);
    localStorage.setItem('nazoratchi_badge_active', String(nextStatus));
    window.dispatchEvent(new Event('badgeStatusChanged'));
  };

  const handlePrint = () => {
    window.print();
  };

  const fullName = user?.full_name || 'Ibrohimov Rustam Anvar o\'g\'li';
  const badgeId = `NZ-${String(user?.id || 53).padStart(3, '0')}-2026`;
  const branchName = user?.branch?.name || 'Toshkent Bosh Bino / Filial';
  const initials = getInitials(fullName);

  return (
    <div className={styles.container}>
      <Breadcrumbs
        items={[
          { label: 'Rasmiy Nazoratchi Bejigi' },
        ]}
      />

      {/* Header */}
      <div className={styles.headerWrapper}>
        <div className={styles.titleGroup}>
          <h1 className={styles.mainTitle}>
            <ShieldCheck size={28} color="#2563eb" />
            <span>Nazoratchi Guvohnomasi & Maxsus Bejigi</span>
          </h1>
          <p className={styles.mainSubtitle}>
            O'quv markazida o'qituvchilar va talabalar davomatini, dars vaqtlarini nazorat qilish vakolati
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${styles.toggleDutyBtn} ${!isOnDuty ? styles.dutyInactive : ''}`}
            onClick={handleToggleDuty}
            title={isOnDuty ? "Xizmatni yakunlash" : "Bejikni taqish va xizmatga kirish"}
          >
            <ShieldCheck size={18} />
            <span>{isOnDuty ? 'BEJIK TAQILGAN · XIZMATDA 🟢' : 'BEJIKNI TAQISH (XIZMATGA KIRISH)'}</span>
          </button>

          <button
            type="button"
            className={styles.printBtn}
            style={{ backgroundColor: '#107c41', color: '#ffffff', borderColor: '#0a522b' }}
            onClick={() => navigate('/teacher-attendance?export=true')}
            title="O'qituvchilar davomatini Excel (.xlsx) formatida filtrlar bilan yuklab olish"
          >
            <FileSpreadsheet size={18} />
            <span>Davomatni Excelda Yuklash</span>
          </button>

          <button
            type="button"
            className={styles.printBtn}
            onClick={handlePrint}
            title="Bejik kartasini printerdan chop etish"
          >
            <Printer size={18} />
            <span>Bejikni Chop Etish</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Card on the Left + Authority & Quick Tools on the Right */}
      <div className={styles.showcaseGrid}>
        {/* LANYARD & ID CARD SIMULATION */}
        <div className={styles.lanyardSection}>
          <div className={styles.lanyardStrap} />
          <div className={styles.lanyardClip} />

          <div className={styles.idCard}>
            <div className={styles.cardTopSlot} />

            {/* Header of ID Card */}
            <div className={styles.cardHeader}>
              <span className={styles.cardOrgName}>EDU CRM · NAZORAT</span>
              <span className={styles.cardDeptDept || styles.cardDeptBadge}>RASMIY GUVOHNOMA</span>
            </div>

            {/* Body */}
            <div className={styles.cardBody}>
              <div className={styles.avatarRingWrapper}>
                <div className={styles.cardAvatar}>
                  {initials}
                </div>
                <div className={styles.verifiedBadgeIcon}>
                  <ShieldCheck size={16} />
                </div>
              </div>

              <div className={styles.cardPersonInfo}>
                <span className={styles.cardPersonName}>{fullName}</span>
                <span className={styles.cardPersonTitle}>BOSH O'QUV NAZORATCHISI</span>
                <div>
                  <span
                    className={`${styles.cardStatusPill} ${
                      isOnDuty ? styles.statusOnDuty : styles.statusOffDuty
                    }`}
                  >
                    {isOnDuty ? '🟢 XIZMATDA / ON DUTY' : '⚪️ XIZMATDAN TASHQARI'}
                  </span>
                </div>
              </div>

              {/* Metadata details */}
              <div className={styles.cardMetaGrid}>
                <div className={styles.cardMetaItem}>
                  <span className={styles.cardMetaLabel}>Guvohnoma ID</span>
                  <span className={styles.cardMetaValue}>{badgeId}</span>
                </div>
                <div className={styles.cardMetaItem}>
                  <span className={styles.cardMetaLabel}>Berilgan sana</span>
                  <span className={styles.cardMetaValue}>2026-yil Oktyabr</span>
                </div>
                <div className={styles.cardMetaItem}>
                  <span className={styles.cardMetaLabel}>Filial</span>
                  <span className={styles.cardMetaValue}>{branchName}</span>
                </div>
                <div className={styles.cardMetaItem}>
                  <span className={styles.cardMetaLabel}>Amal qilish muddati</span>
                  <span className={styles.cardMetaValue}>2027-yilgacha</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={styles.cardFooter}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <QrCode size={18} color="#94a3b8" />
                <span className={styles.cardFooterText}>VERIFIED BY EDU CRM</span>
              </div>
              <span className={styles.securityChip}>HOLOGRAM SEAL</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Official Authority and Inspection Control Center */}
        <div className={styles.rightPanel}>
          {/* Official Authority Card */}
          <div className={styles.authorityCard}>
            <h3 className={styles.authorityTitle}>
              <ShieldCheck size={20} color="#2563eb" />
              <span>Nazoratchining Rasmiy Vakolatlari</span>
            </h3>

            <ul className={styles.authorityList}>
              <li className={styles.authorityItem}>
                <div className={styles.authIconWrapper}>
                  <CheckCircle2 size={16} />
                </div>
                <div>
                  <strong>O'qituvchilar davomati va intizomini nazorat qilish:</strong> Barcha ustozlarning darsga kelgan-kelmaganligini, 1 oylik to'liq davomat jurnali bo'yicha ko'rish va tasdiqlash.
                </div>
              </li>

              <li className={styles.authorityItem}>
                <div className={styles.authIconWrapper}>
                  <Clock size={16} />
                </div>
                <div>
                  <strong>Dars o'tish vaqtini qat'iy tekshirish:</strong> Darslar jadval bo'yicha o'z vaqtida boshlanishi, tanaffuslar va dars tugash vaqtlarini nazorat qilish huquqi.
                </div>
              </li>

              <li className={styles.authorityItem}>
                <div className={styles.authIconWrapper}>
                  <GraduationCap size={16} />
                </div>
                <div>
                  <strong>Talabalar davomati va xonalar monitoringi:</strong> Dars xonalariga to'sqinliksiz kirish, talabalarning darsda to'liq qatnashayotganini tekshirish.
                </div>
              </li>
            </ul>
          </div>

          {/* Quick Access Inspection Tools */}
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', margin: '0 0 14px 0' }}>
              Tezkor Nazorat Asboblari
            </h3>

            <div className={styles.quickToolsGrid}>
              {/* Tool 1: O'qituvchilar Davomati */}
              <div
                className={styles.quickToolCard}
                onClick={() => navigate('/teacher-attendance')}
              >
                <div className={styles.quickToolTop}>
                  <div className={`${styles.quickToolIconBox} ${styles.iconEmerald}`}>
                    <Users size={22} />
                  </div>
                  <div className={styles.quickToolDetails}>
                    <span className={styles.quickToolName}>O'qituvchilar Davomati</span>
                    <span className={styles.quickToolDesc}>
                      1 oylik to'liq davomat matritsasi orqali barcha ustozlarni tekshirish
                    </span>
                  </div>
                </div>
                <div className={styles.quickToolActionLink}>
                  <span>Davomatni tekshirish</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Tool 2: Dars O'tish Vaqti Nazorati */}
              <div
                className={styles.quickToolCard}
                onClick={() => navigate('/lessons')}
              >
                <div className={styles.quickToolTop}>
                  <div className={`${styles.quickToolIconBox} ${styles.iconAmber}`}>
                    <Clock size={22} />
                  </div>
                  <div className={styles.quickToolDetails}>
                    <span className={styles.quickToolName}>Dars Vaqti Nazorati</span>
                    <span className={styles.quickToolDesc}>
                      Bugungi dars jadvali, xonalar va darslarning boshlanish vaqtlarini kuzatish
                    </span>
                  </div>
                </div>
                <div className={styles.quickToolActionLink}>
                  <span>Dars vaqtlarini ko'rish</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Tool 3: Talabalar Davomati */}
              <div
                className={styles.quickToolCard}
                onClick={() => navigate('/attendance')}
              >
                <div className={styles.quickToolTop}>
                  <div className={`${styles.quickToolIconBox} ${styles.iconBlue}`}>
                    <ClipboardCheck size={22} />
                  </div>
                  <div className={styles.quickToolDetails}>
                    <span className={styles.quickToolName}>Talabalar Davomati</span>
                    <span className={styles.quickToolDesc}>
                      Guruhlar kesimida talabalar darsga kelgan-kelmaganligini nazorat qilish
                    </span>
                  </div>
                </div>
                <div className={styles.quickToolActionLink}>
                  <span>Talabalar davomatiga o'tish</span>
                  <ArrowRight size={14} />
                </div>
              </div>

              {/* Tool 4: O'qituvchilar Davomati Excel (.xlsx) */}
              <div
                className={styles.quickToolCard}
                onClick={() => navigate('/teacher-attendance?export=true')}
              >
                <div className={styles.quickToolTop}>
                  <div className={`${styles.quickToolIconBox}`} style={{ backgroundColor: '#ecfdf5', color: '#107c41' }}>
                    <FileSpreadsheet size={22} />
                  </div>
                  <div className={styles.quickToolDetails}>
                    <span className={styles.quickToolName}>Excelda Davomat Eksporti</span>
                    <span className={styles.quickToolDesc}>
                      Ustozlar davomatini Excel (.xlsx) formatida avto-filtrlar bilan yuklab olish
                    </span>
                  </div>
                </div>
                <div className={styles.quickToolActionLink} style={{ color: '#107c41' }}>
                  <span>Excel faylni yuklab olish</span>
                  <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectorBadge;
