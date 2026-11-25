import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { parentApi } from '../../services/parentApi';
import styles from './parentPortal.module.css';
import {
  Award,
  ClipboardCheck,
  Calendar,
  Clock,
  DoorOpen,
  User,
  Phone,
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileText,
  Star
} from 'lucide-react';

const ParentPortal = ({ studentId = null, isModal = false }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'grades');
  const [gradeFilter, setGradeFilter] = useState('all'); // 'all' | 'homework' | 'activity'

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (urlTab && (urlTab === 'grades' || urlTab === 'attendance' || urlTab === 'schedule')) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    const handleTabEvent = (e) => {
      if (e.detail && (e.detail === 'grades' || e.detail === 'attendance' || e.detail === 'schedule')) {
        setActiveTab(e.detail);
      }
    };
    window.addEventListener('parent_tab_switch', handleTabEvent);
    return () => window.removeEventListener('parent_tab_switch', handleTabEvent);
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (!isModal) {
      setSearchParams({ tab });
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = studentId
        ? await parentApi.getStudentOverview(studentId)
        : await parentApi.getOverview();

      if (res.data?.success) {
        setData(res.data.data);
      } else {
        setError(res.data?.message || "Ma'lumotlarni yuklab bo'lmadi");
      }
    } catch (err) {
      console.error('ParentPortal load error:', err);
      setError(err.response?.data?.message || err.message || "Tizim xatoligi yuz berdi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  if (loading) {
    return (
      <div className={styles.loadingBox}>
        <span>Ma'lumotlar yuklanmoqda...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={styles.container} style={isModal ? { padding: '8px 0' } : {}}>
        <div className={styles.emptyState}>
          <AlertCircle size={28} color="#94a3b8" />
          <h4 style={{ margin: '8px 0', color: '#1e293b', fontSize: '15px' }}>Ma'lumot topilmadi</h4>
          <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
            {error ? "O'quvchi ma'lumotlarini yuklashda xatolik yuz berdi." : "O'quvchi ma'lumotlari mavjud emas."}
          </p>
        </div>
      </div>
    );
  }

  const { student, grades, attendance, schedule } = data;

  const filteredGrades = (grades?.list || []).filter((g) => {
    if (gradeFilter === 'all') return true;
    return g.type === gradeFilter;
  });

  return (
    <div className={styles.container} style={isModal ? { padding: '4px 0' } : {}}>
      {/* 1. Header Info Banner (Only rendered on standalone portal page, hidden in modal) */}
      {!isModal && (
        <div className={styles.bannerCard}>
          <div className={styles.bannerLeft}>
            <div className={styles.childAvatar}>
              {student?.full_name?.[0]?.toUpperCase() || 'T'}
            </div>
            <div className={styles.bannerInfo}>
              <span className={styles.portalBadge}>
                Ota-ona kabineti
              </span>
              <h2 className={styles.childName}>{student?.full_name}</h2>
              <div className={styles.parentMeta}>
                <span>Ota-onasi: <strong>{student?.parent_name || 'Kiritilmagan'}</strong></span>
                {student?.branch_name && <span className={styles.branchTag}>{student.branch_name}</span>}
              </div>
            </div>
          </div>

          <div className={styles.bannerRight}>
            <div className={styles.quickStatBox}>
              <span className={styles.quickStatVal}>{grades?.average_score || 0}</span>
              <span className={styles.quickStatLbl}>O'rtacha baho</span>
            </div>
            <div className={styles.quickStatBox}>
              <span className={styles.quickStatVal}>{attendance?.attendance_percentage || 100}%</span>
              <span className={styles.quickStatLbl}>Davomat</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. Main Navigation Tabs (Desktopda yuqorida, mobilda esa pastda MobileBottomNav orqali) */}
      <div className={`${styles.tabsContainer} ${!isModal ? styles.desktopTabsOnly : ''}`}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'grades' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabChange('grades')}
        >
          <Award size={15} />
          <span>Baholar</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'attendance' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabChange('attendance')}
        >
          <ClipboardCheck size={15} />
          <span>Davomat</span>
        </button>

        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'schedule' ? styles.tabBtnActive : ''}`}
          onClick={() => handleTabChange('schedule')}
        >
          <Calendar size={15} />
          <span>Dars kunlari</span>
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: DARS BAHOLARI (UMUMIY KO'RINSIN)                    */}
      {/* ========================================================= */}
      {activeTab === 'grades' && (
        <>
          {/* Metrics summary */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#fefce8', color: '#ca8a04' }}>
                <Star size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{grades?.average_score || 0} / 10</span>
                <span className={styles.metricLabel}>Umumiy O'rtacha Baho</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <BookOpen size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{grades?.total_graded || 0} ta</span>
                <span className={styles.metricLabel}>Jami Baholangan Darslar</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
                <FileText size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{grades?.homework_avg || 0} ball</span>
                <span className={styles.metricLabel}>Uy Vazifasi O'rtachasi ({grades?.homework_count || 0})</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#faf5ff', color: '#9333ea' }}>
                <TrendingUp size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{grades?.activity_avg || 0} ball</span>
                <span className={styles.metricLabel}>Dars Faolligi O'rtachasi ({grades?.activity_count || 0})</span>
              </div>
            </div>
          </div>

          {/* Detailed Grades Table */}
          <div className={styles.contentCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <Award size={17} color="#2563eb" />
                Baholar tarixi va izohlar
              </h3>

              <div className={styles.subfilterGroup}>
                <button
                  type="button"
                  className={`${styles.subfilterBtn} ${gradeFilter === 'all' ? styles.subfilterBtnActive : ''}`}
                  onClick={() => setGradeFilter('all')}
                >
                  Barchasi ({grades?.list?.length || 0})
                </button>
                <button
                  type="button"
                  className={`${styles.subfilterBtn} ${gradeFilter === 'homework' ? styles.subfilterBtnActive : ''}`}
                  onClick={() => setGradeFilter('homework')}
                >
                  Uy vazifasi ({grades?.homework_count || 0})
                </button>
                <button
                  type="button"
                  className={`${styles.subfilterBtn} ${gradeFilter === 'activity' ? styles.subfilterBtnActive : ''}`}
                  onClick={() => setGradeFilter('activity')}
                >
                  Mashg'ulot ({grades?.activity_count || 0})
                </button>
              </div>
            </div>

            {filteredGrades.length === 0 ? (
              <div className={styles.emptyState}>
                <Award size={32} color="#cbd5e1" />
                <h4 style={{ margin: '6px 0', color: '#475569', fontSize: '14px' }}>Hozircha baholar mavjud emas</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>O'qituvchi dars va uy vazifalarini baholashi bilan bu yerda ko'rinadi.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Sana</th>
                        <th>Mashg'ulot Turi</th>
                        <th>Guruh</th>
                        <th>O'qituvchi</th>
                        <th>Qo'yilgan Baho</th>
                        <th>Ustoz Izohi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGrades.map((g, idx) => (
                        <tr key={g.id || idx}>
                          <td><b>#{idx + 1}</b></td>
                          <td style={{ fontWeight: 600 }}>{g.date}</td>
                          <td>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: g.type === 'homework' ? '#eff6ff' : '#faf5ff',
                              color: g.type === 'homework' ? '#2563eb' : '#9333ea',
                              border: `1px solid ${g.type === 'homework' ? '#bfdbfe' : '#e9d5ff'}`
                            }}>
                              {g.type === 'homework' ? 'Uy vazifasi' : "Dars mashg'uloti"}
                            </span>
                          </td>
                          <td>{g.group_name}</td>
                          <td>{g.teacher_name}</td>
                          <td>
                            <span className={`${styles.scorePill} ${g.score >= 8 ? styles.scoreHigh : ''}`}>
                              {g.score} / {g.max_score} ball
                            </span>
                          </td>
                          <td style={{ fontStyle: g.comment ? 'normal' : 'italic', color: g.comment ? '#334155' : '#94a3b8' }}>
                            {g.comment}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Cards View (O'zgacha zamonaviy uslubda) */}
                <div className={styles.mobileCardsList}>
                  {filteredGrades.map((g, idx) => (
                    <div key={g.id || idx} className={styles.gradeMobileCard}>
                      <div className={styles.gradeMobileHeader}>
                        <div className={styles.gradeMobileTypeBox}>
                          <span className={g.type === 'homework' ? styles.tagHomework : styles.tagActivity}>
                            {g.type === 'homework' ? 'Uy vazifasi' : "Dars mashg'uloti"}
                          </span>
                          <span className={styles.gradeMobileDate}>
                            <Calendar size={11} />
                            {g.date}
                          </span>
                        </div>
                        <div className={`${styles.gradeMobileScore} ${g.score >= 8 ? styles.scoreHigh : ''}`}>
                          <Star size={13} fill={g.score >= 8 ? "#16a34a" : "#ca8a04"} color={g.score >= 8 ? "#16a34a" : "#ca8a04"} />
                          <span>{g.score} / {g.max_score} ball</span>
                        </div>
                      </div>

                      <div className={styles.gradeMobileBody}>
                        <div className={styles.gradeMobileRow}>
                          <span className={styles.gradeLabel}>Guruh:</span>
                          <span className={styles.gradeVal}>{g.group_name}</span>
                        </div>
                        <div className={styles.gradeMobileRow}>
                          <span className={styles.gradeLabel}>O'qituvchi:</span>
                          <span className={styles.gradeVal}>{g.teacher_name}</span>
                        </div>
                      </div>

                      {g.comment && (
                        <div className={styles.gradeMobileComment}>
                          <span className={styles.commentQuoteIcon}>💬</span>
                          <p className={styles.commentContent}>"{g.comment}"</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: DAVOMAT                                            */}
      {/* ========================================================= */}
      {activeTab === 'attendance' && (
        <>
          {/* Attendance metrics */}
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
                <ClipboardCheck size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{attendance?.attendance_percentage || 100}%</span>
                <span className={styles.metricLabel}>Umumiy Davomat Ko'rsatkichi</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                <CheckCircle2 size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{attendance?.present_count || 0} ta</span>
                <span className={styles.metricLabel}>Darsga Qatnashdi (Bor)</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#fef2f2', color: '#dc2626' }}>
                <XCircle size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{attendance?.absent_count || 0} ta</span>
                <span className={styles.metricLabel}>Qatnashmadi (Yo'q)</span>
              </div>
            </div>

            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#fffbeb', color: '#d97706' }}>
                <Clock size={22} />
              </div>
              <div className={styles.metricContent}>
                <span className={styles.metricValue}>{attendance?.late_count || 0} ta</span>
                <span className={styles.metricLabel}>Kechikib Kelgan Darslar</span>
              </div>
            </div>
          </div>

          {/* Attendance Table */}
          <div className={styles.contentCard}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>
                <ClipboardCheck size={17} color="#059669" />
                Davomat jurnali
              </h3>
            </div>

            {!attendance?.list || attendance.list.length === 0 ? (
              <div className={styles.emptyState}>
                <ClipboardCheck size={32} color="#cbd5e1" />
                <h4 style={{ margin: '6px 0', color: '#475569', fontSize: '14px' }}>Hozircha davomat yozuvlari mavjud emas</h4>
                <p style={{ margin: 0, fontSize: '13px' }}>O'qituvchi darsda davomat olganida bu yerda darhol aks etadi.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Sana</th>
                        <th>Vaqti</th>
                        <th>Guruh</th>
                        <th>Dars Mavzusi</th>
                        <th>Davomat Holati</th>
                        <th>Sabab / Izoh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.list.map((att, idx) => (
                        <tr key={att.id || idx}>
                          <td><b>#{idx + 1}</b></td>
                          <td style={{ fontWeight: 600 }}>{att.date}</td>
                          <td style={{ color: '#64748b' }}>
                            {att.start_time !== '—' ? `${att.start_time.slice(0, 5)} - ${att.end_time?.slice(0, 5) || ''}` : 'Dars vaqtida'}
                          </td>
                          <td>{att.group_name}</td>
                          <td style={{ fontWeight: 600, color: '#0f172a' }}>{att.topic}</td>
                          <td>
                            {att.status === 'present' ? (
                              <span className={styles.badgePresent}>
                                <CheckCircle2 size={13} /> Qatnashdi
                              </span>
                            ) : att.status === 'absent' ? (
                              <span className={styles.badgeAbsent}>
                                <XCircle size={13} /> Qatnashmadi
                              </span>
                            ) : (
                              <span className={styles.badgeLate}>
                                <Clock size={13} /> Kechikdi
                              </span>
                            )}
                          </td>
                          <td style={{ color: '#64748b' }}>{att.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Responsive Attendance Cards (O'zgacha zamonaviy uslubda) */}
                <div className={styles.mobileCardsList}>
                  {attendance.list.map((att, idx) => (
                    <div key={att.id || idx} className={styles.attMobileCard}>
                      <div className={styles.attMobileHeader}>
                        <span className={styles.attMobileDate}>
                          <Calendar size={12} />
                          {att.date}
                        </span>
                        {att.status === 'present' ? (
                          <span className={styles.badgePresent}>
                            <CheckCircle2 size={13} /> Qatnashdi
                          </span>
                        ) : att.status === 'absent' ? (
                          <span className={styles.badgeAbsent}>
                            <XCircle size={13} /> Qatnashmadi
                          </span>
                        ) : (
                          <span className={styles.badgeLate}>
                            <Clock size={13} /> Kechikdi
                          </span>
                        )}
                      </div>

                      <div className={styles.attMobileTopic}>{att.topic}</div>

                      <div className={styles.attMobileBody}>
                        <div className={styles.attMobileRow}>
                          <span className={styles.gradeLabel}>Guruh:</span>
                          <span className={styles.gradeVal}>{att.group_name}</span>
                        </div>
                        <div className={styles.attMobileRow}>
                          <span className={styles.gradeLabel}>Vaqti:</span>
                          <span className={styles.gradeVal}>
                            {att.start_time !== '—' ? `${att.start_time.slice(0, 5)} - ${att.end_time?.slice(0, 5) || ''}` : "Dars vaqtida"}
                          </span>
                        </div>
                      </div>

                      {att.note && att.note !== '—' && (
                        <div className={styles.attMobileNote}>
                          <span className={styles.gradeLabel}>Sabab / Izoh:</span>
                          <span className={styles.attNoteText}>{att.note}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DARS KUNLARI (JADVAL & XONA)                       */}
      {/* ========================================================= */}
      {activeTab === 'schedule' && (
        <div className={styles.contentCard}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>
              <Calendar size={17} color="#2563eb" />
              Dars kunlari va mashg'ulotlar jadvali
            </h3>
          </div>

          {!schedule || schedule.length === 0 ? (
            <div className={styles.emptyState}>
              <Calendar size={32} color="#cbd5e1" />
              <h4 style={{ margin: '6px 0', color: '#475569', fontSize: '14px' }}>Dars jadvali mavjud emas</h4>
              <p style={{ margin: 0, fontSize: '13px' }}>Farzandingiz biriktirilgan guruhlar jadvali tez orada joylashtiriladi.</p>
            </div>
          ) : (
            <div className={styles.scheduleGrid}>
              {schedule.map((item, idx) => (
                <div key={item.id || idx} className={styles.scheduleCard}>
                  <div className={styles.scheduleTop}>
                    <span className={styles.groupBadge}>
                      {item.course_name}
                    </span>
                    <span style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      color: item.status === 'active' ? '#16a34a' : '#64748b',
                      background: item.status === 'active' ? '#f0fdf4' : '#f8fafc',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: `1px solid ${item.status === 'active' ? '#bbf7d0' : '#e2e8f0'}`
                    }}>
                      {item.status === 'active' ? 'Faol' : 'Rejalashtirilgan'}
                    </span>
                  </div>

                  <h4 className={styles.scheduleTitle}>{item.group_name}</h4>

                  <div className={styles.scheduleInfoRow}>
                    <div className={styles.scheduleItem}>
                      <Calendar size={15} color="#2563eb" />
                      <span>Dars kunlari: <strong style={{ color: '#0f172a' }}>{item.days}</strong></span>
                    </div>

                    <div className={styles.scheduleItem}>
                      <Clock size={15} color="#ea580c" />
                      <span>Dars vaqti: <strong style={{ color: '#0f172a' }}>{item.lesson_time}</strong></span>
                    </div>

                    <div className={styles.scheduleItem}>
                      <DoorOpen size={15} color="#6366f1" />
                      <span>O'quv xonasi: <strong style={{ color: '#0f172a' }}>{item.classroom}</strong></span>
                    </div>
                  </div>

                  <div className={styles.scheduleTeacherBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <User size={14} color="#64748b" />
                      <span>Ustoz: <strong style={{ color: '#1e293b' }}>{item.teacher_name}</strong></span>
                    </div>
                    {item.teacher_phone && (
                      <a
                        href={`tel:${item.teacher_phone.replace(/[^0-9+]/g, '')}`}
                        className={styles.teacherPhoneLink}
                        title="Ustozga qo'ng'iroq qilish"
                      >
                        <Phone size={12} />
                        <span>{item.teacher_phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ParentPortal;

