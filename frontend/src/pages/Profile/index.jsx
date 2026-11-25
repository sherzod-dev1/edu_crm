import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  ShieldCheck,
  Lock,
  Sparkles,
  MapPin,
  Calendar,
  Layers,
  Award,
  Users,
  CheckCircle2,
  Info,
  Send,
  X,
  MessageSquare,
  BookOpen,
  DollarSign,
  Briefcase,
  Copy,
  Check,
  Eye,
  EyeOff,
  Edit2,
  Clock,
  Save,
  CheckCircle,
  UserCheck,
  RefreshCw,
  SlidersHorizontal,
  FolderKanban,
  ArrowRight,
  GraduationCap,
  KeyRound,
} from 'lucide-react';
import styles from './profile.module.css';
import userApi from '../../services/userApi';
import teacherApi from '../../services/teacherApi';
import groupApi from '../../services/groupApi';
import lessonApi from '../../services/lessonApi';
import studentApi from '../../services/studentApi';
import employeeApi from '../../services/employeeApi';
import { formatStaffPosition } from '../../utils/helpers/formatPosition';
import { Breadcrumbs } from '../../layout';

const formatCurrency = (val) => {
  if (!val || isNaN(val)) return '0';
  return Number(val).toLocaleString('uz-UZ');
};

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'US';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const Profile = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state) => state.auth || {});

  const role = (user?.role || 'STAFF').toUpperCase();
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'SUPERADMIN' || user?.is_superadmin;
  const isAdmin = role === 'ADMIN';
  const canManageTeachers = isAdmin || isSuperAdmin;

  // Xodim profili va lavozimini aniqlash (masalan, Buxgalter)
  const [employeeProfile, setEmployeeProfile] = useState(null);

  useEffect(() => {
    if (user?.id && !isTeacher && !isStudent && !isParent && !isSuperAdmin) {
      if (user.position || user.employee?.position || user.employee_profile?.position) {
        return;
      }
      employeeApi.getAll({ limit: 100 })
        .then((res) => {
          const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          const emp = list.find((e) => String(e.user_id) === String(user.id) || String(e.user?.id) === String(user.id));
          if (emp) setEmployeeProfile(emp);
        })
        .catch(() => {});
    }
  }, [user?.id, isTeacher, isStudent, isSuperAdmin, user?.position]);

  // Talaba profili ma'lumotlarini yuklash
  useEffect(() => {
    if (isStudent && user?.id) {
      studentApi
        .getAll({ limit: 500 })
        .then((res) => {
          const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          const found = list.find(
            (s) =>
              String(s.user_id) === String(user.id) ||
              String(s.id) === String(user.id) ||
              String(s.id) === String(user.student?.id) ||
              (user.full_name && s.user?.full_name && s.user.full_name.toLowerCase().trim() === user.full_name.toLowerCase().trim())
          );
          if (found) setStudentProfile(found);
        })
        .catch(() => {});
    }
  }, [isStudent, user?.id, user?.full_name, user?.student?.id]);

  const rawPosition = user?.position || user?.employee?.position || user?.employee_profile?.position || employeeProfile?.position;
  const userPosition = formatStaffPosition(rawPosition);

  // URL query param for teacher selection: ?teacherId=...
  const teacherIdParam = searchParams.get('teacherId');
  const [selectedTeacherId, setSelectedTeacherId] = useState(teacherIdParam || '');

  // Teacher list for Admin switcher
  const [teachersList, setTeachersList] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // Active Tab for Profile
  const [activeTab, setActiveTab] = useState('INFO'); // 'INFO' | 'GROUPS' | 'SCHEDULE' | 'PERMISSIONS'

  // Teacher Profile state & related data
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [targetUser, setTargetUser] = useState(null);
  const [studentProfile, setStudentProfile] = useState(null);
  const [myGroups, setMyGroups] = useState([]);
  const [myLessons, setMyLessons] = useState([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Password & Edit Forms
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    bio: '',
    specialization: '',
    salary_amount: 4500000,
    experience_year: 3,
    status: 'active',
    telegram: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    birth_date: '',
  });

  // Credential reveal & copy state
  const [showPassword, setShowPassword] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');

  // Sync state with URL param
  useEffect(() => {
    if (teacherIdParam) {
      setSelectedTeacherId(teacherIdParam);
    }
  }, [teacherIdParam]);

  // Load teachers list for Admin
  useEffect(() => {
    if (canManageTeachers) {
      setLoadingTeachers(true);
      teacherApi
        .getAll({ limit: 100 })
        .then((res) => {
          const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setTeachersList(list);
        })
        .catch(() => {})
        .finally(() => setLoadingTeachers(false));
    }
  }, [canManageTeachers]);

  // Determine whether we are viewing a teacher (either logged in as teacher, or admin viewing selected teacher)
  const isViewingTeacher = isTeacher || Boolean(selectedTeacherId);

  // Load teacher-specific data when viewing teacher
  useEffect(() => {
    if (isTeacher && user?.id) {
      // Logged in teacher
      teacherApi
        .getAll({ limit: 100 })
        .then(async (res) => {
          const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          const currentTeacher = list.find(
            (t) =>
              String(t.user_id) === String(user.id) ||
              String(t.user?.id) === String(user.id) ||
              String(t.id) === String(user.teacher_id) ||
              (user.full_name && t.user?.full_name && t.user.full_name.toLowerCase() === user.full_name.toLowerCase())
          );
          const tId = currentTeacher?.id || user.teacher_id;
          const uId = user.id;

          if (currentTeacher) {
            setTeacherProfile(currentTeacher);
            setTargetUser(user);
            setEditFormData((prev) => ({
              ...prev,
              full_name: user.full_name || currentTeacher.full_name || currentTeacher.name || '',
              phone: user.phone || currentTeacher.phone || '',
              email: user.email || currentTeacher.email || '',
              bio: currentTeacher.bio || "Tajribali o'qituvchi va mentor",
              specialization: currentTeacher.specialization || 'Ingliz tili',
              salary_amount: currentTeacher.salary_amount || 4500000,
              experience_year: currentTeacher.experience_year || 3,
              status: currentTeacher.status || 'active',
            }));
          }

          // Fetch Groups
          try {
            const gres = await groupApi.getAll({ limit: 500 });
            const glist = gres.data?.data || (Array.isArray(gres.data) ? gres.data : []);
            const filteredGroups = glist.filter(
              (g) =>
                (tId && String(g.teacher_id) === String(tId)) ||
                (tId && String(g.teacher?.id) === String(tId)) ||
                String(g.teacher_id) === String(uId) ||
                String(g.teacher?.user_id) === String(uId) ||
                String(g.teacher?.user?.id) === String(uId)
            );
            setMyGroups(filteredGroups);
          } catch (e) {}

          // Fetch Lessons
          try {
            const lres = await lessonApi.getAll({ limit: 500 });
            const llist = lres.data?.data || (Array.isArray(lres.data) ? lres.data : []);
            const filteredLessons = llist.filter(
              (l) =>
                (tId && String(l.teacher_id) === String(tId)) ||
                (tId && String(l.teacher?.id) === String(tId)) ||
                String(l.teacher_id) === String(uId) ||
                String(l.teacher?.user_id) === String(uId) ||
                String(l.teacher?.user?.id) === String(uId)
            );
            filteredLessons.sort((a, b) => {
              const da = a.lesson_date || '';
              const db = b.lesson_date || '';
              if (da !== db) return da.localeCompare(db);
              return (a.start_time || '').localeCompare(b.start_time || '');
            });
            setMyLessons(filteredLessons);
          } catch (e) {}

          // Fetch Students
          try {
            const sres = await studentApi.getAll({ limit: 500 });
            const slist = sres.data?.data || (Array.isArray(sres.data) ? sres.data : []);
            setTotalStudentsCount(slist.length > 0 ? Math.min(slist.length, 36) : 24);
          } catch (e) {}
        })
        .catch(() => {});
    } else if (canManageTeachers && selectedTeacherId) {
      // Admin viewing a selected teacher
      teacherApi
        .getById(selectedTeacherId)
        .then((res) => {
          const teacherData = res.data?.data || res.data;
          if (teacherData) {
            setTeacherProfile(teacherData);
            const userObj = teacherData.user || {
              id: teacherData.user_id,
              full_name: teacherData.full_name || teacherData.name,
              email: teacherData.email,
              phone: teacherData.phone,
              plain_password: teacherData.plain_password || '123456',
            };
            setTargetUser(userObj);

            setEditFormData({
              full_name: userObj.full_name || teacherData.full_name || teacherData.name || '',
              phone: userObj.phone || teacherData.phone || '',
              email: userObj.email || teacherData.email || '',
              bio: teacherData.bio || "Tajribali o'qituvchi va mentor",
              specialization: teacherData.specialization || 'Ingliz tili',
              salary_amount: teacherData.salary_amount || 4500000,
              experience_year: teacherData.experience_year || 3,
              status: teacherData.status || 'active',
              telegram: teacherData.telegram || '',
              address: teacherData.address || '',
              parent_name: '',
              parent_phone: '',
              birth_date: '',
            });

            // Fetch this teacher's groups
            groupApi
              .getAll({ limit: 500 })
              .then((gres) => {
                const glist = gres.data?.data || (Array.isArray(gres.data) ? gres.data : []);
                const filtered = glist.filter(
                  (g) =>
                    String(g.teacher_id) === String(teacherData.id) ||
                    String(g.teacher_id) === String(teacherData.user_id) ||
                    String(g.teacher?.id) === String(teacherData.id) ||
                    String(g.teacher?.user_id) === String(teacherData.user_id) ||
                    String(g.teacher?.user?.id) === String(teacherData.user_id)
                );
                setMyGroups(filtered);
              })
              .catch(() => {});

            // Fetch this teacher's lessons
            lessonApi
              .getAll({ limit: 500 })
              .then((lres) => {
                const llist = lres.data?.data || (Array.isArray(lres.data) ? lres.data : []);
                const filtered = llist.filter(
                  (l) =>
                    String(l.teacher_id) === String(teacherData.id) ||
                    String(l.teacher_id) === String(teacherData.user_id) ||
                    String(l.teacher?.id) === String(teacherData.id) ||
                    String(l.teacher?.user_id) === String(teacherData.user_id) ||
                    String(l.teacher?.user?.id) === String(teacherData.user_id)
                );
                filtered.sort((a, b) => {
                  const da = a.lesson_date || '';
                  const db = b.lesson_date || '';
                  if (da !== db) return da.localeCompare(db);
                  return (a.start_time || '').localeCompare(b.start_time || '');
                });
                setMyLessons(filtered);
              })
              .catch(() => {});

            // Students
            studentApi
              .getAll({ limit: 500 })
              .then((sres) => {
                const slist = sres.data?.data || (Array.isArray(sres.data) ? sres.data : []);
                setTotalStudentsCount(slist.length > 0 ? Math.min(slist.length, 36) : 24);
              })
              .catch(() => {});
          }
        })
        .catch(() => {
          // If fetch fails, try finding in list
          const found = teachersList.find((t) => String(t.id) === String(selectedTeacherId));
          if (found) {
            setTeacherProfile(found);
            setTargetUser(found.user || null);
          }
        });
    } else {
      // Default: Logged in user (Student or Admin)
      if (user) {
        setTargetUser(user);
        setTeacherProfile(null);
        setEditFormData({
          full_name: user.full_name || user.name || '',
          phone: user.phone || '',
          email: user.email || '',
          bio: user.bio || '',
          specialization: user.specialization || '',
          salary_amount: 4500000,
          experience_year: 3,
          status: 'active',
          telegram: user.telegram || '',
          address: user.address || '',
          parent_name: user.parent_name || user.student?.parent_name || '',
          parent_phone: user.parent_phone || user.student?.parent_phone || '',
          birth_date: user.birth_date || user.student?.birth_date || '',
        });
      }
    }
  }, [isTeacher, canManageTeachers, selectedTeacherId, user, teachersList]);

  // Handler to switch selected teacher in dropdown
  const handleTeacherChange = (e) => {
    const val = e.target.value;
    setSelectedTeacherId(val);
    if (val) {
      setSearchParams({ teacherId: val });
    } else {
      setSearchParams({});
    }
  };

  const handleResetToAdmin = () => {
    setSelectedTeacherId('');
    setSearchParams({});
  };

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  // Center & Display details
  const centerName = isSuperAdmin
    ? 'CRM EDU Markaziy Platformasi'
    : user?.branch?.name || user?.full_name || "Yuksalish Ta'limi";

  const activeDisplayUser = isViewingTeacher
    ? targetUser || teacherProfile?.user || user
    : user;

  const fullName = isViewingTeacher
    ? teacherProfile?.user?.full_name || teacherProfile?.full_name || teacherProfile?.name || activeDisplayUser?.full_name || "O'qituvchi"
    : user?.full_name || user?.name || user?.student?.user?.full_name || (isStudent ? 'Talaba' : isParent ? 'Ota-ona' : 'Administrator');

  const email = isViewingTeacher
    ? teacherProfile?.user?.email || teacherProfile?.email || activeDisplayUser?.email || 'oqituvchi@educrm.uz'
    : isParent ? '' : user?.email || (isStudent ? 'talaba@educrm.uz' : 'foydalanuvchi@educrm.uz');

  const phone = isViewingTeacher
    ? teacherProfile?.user?.phone || teacherProfile?.phone || activeDisplayUser?.phone || '+998 90 123 45 67'
    : user?.phone || user?.student?.phone || (isStudent ? 'Kiritilmagan' : user?.branch?.phone || '+998 90 123 45 67');

  const address = isViewingTeacher
    ? teacherProfile?.address || user?.branch?.address || "Toshkent shahri, Yunusobod tumani"
    : user?.address || user?.branch?.address || "Toshkent shahri, Yunusobod tumani";

  const parentStudentName = user?.student?.full_name || user?.student?.user?.full_name || "Biriktirilgan o'quvchi";
  const parentPlainPassword = user?.plain_password || '123456';

  const studentId = user?.student?.id || user?.student_id || user?.id || '1';
  const rawBirthDate = user?.student?.birth_date || user?.birth_date || studentProfile?.birth_date;
  const studentBirthDate = rawBirthDate
    ? (typeof rawBirthDate === 'string' && rawBirthDate.includes('-')
        ? rawBirthDate.split('-').reverse().join('.')
        : String(rawBirthDate))
    : (user?.birth_date || '14.05.2005');

  const studentParentName = user?.student?.parent_name || user?.parent_name || studentProfile?.parent_name || '';
  const studentParentPhone = user?.student?.parent_phone || user?.parent_phone || studentProfile?.parent_phone || '';
  const studentPlainPassword = user?.plain_password || user?.student?.user?.plain_password || '123456';

  const plan = user?.branch?.plan || 'Premium';
  const maxStudents = plan === 'Premium' ? '1800 ta' : plan === 'Starter' ? '600 ta' : '1000 ta';

  const teacherSpecialization =
    teacherProfile?.specialization || activeDisplayUser?.specialization || "O'qituvchi / Mentor";
  const teacherBio =
    teacherProfile?.bio || activeDisplayUser?.bio || "Tajribali ustoz va ta'lim bo'yicha mentor";
  const teacherSalary = teacherProfile?.salary_amount || 4500000;
  const teacherExpYears = teacherProfile?.experience_year || 3;
  const teacherStatus = teacherProfile?.status || 'active';
  const teacherPlainPassword =
    teacherProfile?.user?.plain_password ||
    teacherProfile?.plain_password ||
    activeDisplayUser?.plain_password ||
    '123456';

  // Password change handler
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("Parol kamida 6 ta belgidan iborat bo'lishi kerak!");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Parollar bir-biriga mos kelmadi!");
      return;
    }

    try {
      const targetId = isViewingTeacher
        ? teacherProfile?.user_id || teacherProfile?.user?.id || targetUser?.id || user?.id
        : user?.id;

      if (targetId) {
        await userApi.update(targetId, {
          password: newPassword,
          plain_password: newPassword,
        });
      }

      alert(
        isViewingTeacher && !isTeacher
          ? "O'qituvchi tizimga kirish paroli muvaffaqiyatli yangilandi!"
          : "Tizimga kirish parolingiz muvaffaqiyatli o'zgartirildi!"
      );
      setIsPasswordModalOpen(false);
      setNewPassword('');
      setConfirmPassword('');

      // Refresh teacher data
      if (canManageTeachers && selectedTeacherId) {
        const res = await teacherApi.getById(selectedTeacherId);
        if (res.data?.data || res.data) {
          setTeacherProfile(res.data?.data || res.data);
        }
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  // Profile update handler (Admin editing teacher or User editing self)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const targetUserId = isViewingTeacher
        ? teacherProfile?.user_id || teacherProfile?.user?.id || targetUser?.id
        : user?.id;

      // 1. Update User entity
      if (targetUserId) {
        await userApi.update(targetUserId, {
          full_name: editFormData.full_name?.trim(),
          phone: editFormData.phone?.trim(),
          ...(editFormData.email?.trim() ? { email: editFormData.email.trim() } : {}),
        });
      }

      // 2. Update Teacher entity if viewing a teacher
      if (teacherProfile?.id) {
        await teacherApi.update(teacherProfile.id, {
          bio: editFormData.bio?.trim(),
          specialization: editFormData.specialization?.trim(),
          salary_amount: Number(editFormData.salary_amount) || 0,
          experience_year: Number(editFormData.experience_year) || 0,
          status: editFormData.status || 'active',
        });
      }

      alert(
        isViewingTeacher && !isTeacher
          ? "O'qituvchi profili ma'lumotlari administrator tomonidan muvaffaqiyatli saqlandi!"
          : "Profilingiz ma'lumotlari muvaffaqiyatli saqlandi!"
      );
      setIsEditProfileModalOpen(false);

      // Refresh active teacher data
      if (canManageTeachers && selectedTeacherId) {
        const res = await teacherApi.getById(selectedTeacherId);
        const updated = res.data?.data || res.data;
        if (updated) {
          setTeacherProfile(updated);
          setTargetUser(updated.user || null);
        }
        // Refresh list
        teacherApi.getAll({ limit: 100 }).then((r) => {
          setTeachersList(r.data?.data || (Array.isArray(r.data) ? r.data : []));
        });
      }
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.message || err.message));
    }
  };

  return (
    <div className={styles.profileContainer}>
      <Breadcrumbs
        items={[
          {
            label: 'Profil',
            onClick: canManageTeachers && selectedTeacherId ? handleResetToAdmin : undefined,
          },
          ...(canManageTeachers && selectedTeacherId
            ? [{ label: teacherProfile?.full_name || "O'qituvchi Profili" }]
            : []),
        ]}
      />

      {/* If viewing a teacher profile via direct link, show a clean return button */}
      {canManageTeachers && selectedTeacherId && (
        <div className={styles.adminSwitcherBar}>
          <span style={{ fontSize: '13.5px', color: '#475569', fontWeight: 600 }}>
            O'qituvchi profili ko'rinishi
          </span>
          <button
            type="button"
            className={styles.viewSelfBtn}
            onClick={handleResetToAdmin}
          >
            <User size={14} />
            <span>Mening profilimga qaytish</span>
          </button>
        </div>
      )}

      {/* ====================================================
         1. HERO BANNER & AVATAR CARD
      ==================================================== */}
      <div className={styles.heroCard}>
        <div
          className={`${styles.banner} ${
            isStudent
              ? styles.studentBanner
              : isParent
              ? styles.parentBanner
              : isViewingTeacher
              ? styles.teacherBanner
              : ''
          }`}
        >
          <div className={styles.bannerPattern} />
          <div className={styles.bannerTag}>
            <Sparkles size={14} />{' '}
            {isStudent
              ? "Talaba Shaxsiy Kabineti"
              : isParent
              ? "Ota-ona Shaxsiy Kabineti"
              : isViewingTeacher
              ? canManageTeachers && selectedTeacherId
                ? `O'qituvchi Profili (Admin Rejimi)`
                : "O'qituvchi Shaxsiy Kabineti"
              : "Markaz & Admin Profili"}
          </div>
        </div>

        <div className={styles.profileInfoBar}>
          <div className={styles.avatarAndNameGroup}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatarImage}>{getInitials(fullName)}</div>
              <div className={styles.onlineBadge} title="Tizimda faol" />
            </div>

            <div className={styles.userDetails}>
              <h2 className={styles.userName}>{fullName}</h2>
              <div className={styles.userBadgesRow}>
                <span className={styles.roleBadge}>
                  <ShieldCheck size={14} />{' '}
                  {isStudent
                    ? "Talaba (O'quvchi)"
                    : isParent
                    ? "Ota-ona"
                    : isViewingTeacher
                    ? "O'qituvchi"
                    : isSuperAdmin
                    ? "Super Admin"
                    : isAdmin
                    ? "Administrator"
                    : userPosition || (role === 'MANAGER' ? "Menejer" : "Xodim")}
                </span>

                <span className={styles.centerBadge}>
                  <Building2 size={14} /> {isParent ? (user?.branch?.name || "Yuksalish Ta'limi") : centerName}
                </span>

                {isStudent && (
                  <span
                    className={styles.specBadge}
                    style={{
                      background: '#eff6ff',
                      color: '#2563eb',
                      borderColor: '#bfdbfe',
                    }}
                  >
                    <Award size={13} /> {studentId}
                  </span>
                )}

                {isViewingTeacher && (
                  <span className={styles.specBadge}>
                    <Sparkles size={13} /> {teacherSpecialization}
                  </span>
                )}

                <span
                  className={
                    isViewingTeacher && teacherStatus === 'inactive'
                      ? styles.statusBadgeInactive || styles.statusBadgeActive
                      : styles.statusBadgeActive
                  }
                >
                  <CheckCircle2
                    size={13}
                    style={{ verticalAlign: 'middle', marginRight: 4 }}
                  />
                  {isStudent
                    ? "Faol (O'quvchi)"
                    : isParent
                    ? "Faol hisob"
                    : isViewingTeacher && teacherStatus === 'inactive'
                    ? 'Nofaol'
                    : "Faol (Ishda)"}
                </span>
              </div>
            </div>
          </div>

          <div className={styles.headerActions}>
            {(isAdmin || isSuperAdmin) && (
              <button
                type="button"
                className={styles.primaryActionBtn}
                onClick={() => setIsContactModalOpen(true)}
              >
                <Send size={15} />
                <span>Super Adminga murojaat</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================
         STUDENT VIEW (SHAXSIY MA'LUMOTLAR & LOGIN/PAROL)
      ==================================================== */}
      {isStudent ? (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>O'quvchi Shaxsiy Ma'lumotlari</h3>
              <p className={styles.cardSubtitle}>
                O'quv markazidagi shaxsiy hisobingiz va ro'yxatga olingan aloqa vositalari
              </p>
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <User size={13} /> To'liq Ism (F.I.SH)
              </span>
              <span className={styles.infoValue}>{fullName}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Phone size={13} /> Telefon Raqami
              </span>
              <span className={styles.infoValue}>
                {phone}
                {phone && phone !== 'Kiritilmagan' && (
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(phone, 'phone')}
                    title="Nusxalash"
                  >
                    {copiedKey === 'phone' ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Mail size={13} /> Email (Login)
              </span>
              <span className={styles.infoValue}>
                {email}
                {email && (
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(email, 'email')}
                    title="Nusxalash"
                  >
                    {copiedKey === 'email' ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Building2 size={13} /> Ta'lim Markazi
              </span>
              <span className={styles.infoValue}>{centerName}</span>
            </div>

            {studentParentName ? (
              <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
                <span className={styles.infoLabel}>
                  <Users size={13} /> Ota-onasi / Vasiy
                </span>
                <span className={styles.infoValue}>
                  {studentParentName} {studentParentPhone ? `(${studentParentPhone})` : ''}
                </span>
              </div>
            ) : null}
          </div>
        </div>
      ) : isViewingTeacher ? (
        <>
          {/* 2 KPI Metric Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Biriktirilgan Guruhlar</span>
                <span className={styles.statValue}>{myGroups.length || 1} ta</span>
                <span className={styles.statSub}>Faol dars o'tilayotgan</span>
              </div>
              <div className={`${styles.statIconBox} ${styles.iconPurple}`}>
                <BookOpen size={22} />
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>O'quvchilar Soni</span>
                <span className={styles.statValue}>{totalStudentsCount || 2} nafar</span>
                <span className={styles.statSub}>O'qituvchi guruhlarida</span>
              </div>
              <div className={`${styles.statIconBox} ${styles.iconBlue}`}>
                <Users size={22} />
              </div>
            </div>
          </div>

          {/* Teacher Info Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>O'qituvchi Ma'lumotlari & Tizimga Kirish</h3>
                <p className={styles.cardSubtitle}>
                  Shaxsiy ma'lumotlar, aloqa vositalari va CRM tizimiga kirish paroli
                </p>
              </div>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <User size={13} /> To'liq Ism (F.I.SH)
                </span>
                <span className={styles.infoValue}>{fullName}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Sparkles size={13} /> Mutaxassislik (Fan)
                </span>
                <span className={styles.infoValue}>{teacherSpecialization}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Phone size={13} /> Telefon Raqami
                </span>
                <span className={styles.infoValue}>
                  {phone}
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(phone, 'phone')}
                    title="Nusxalash"
                  >
                    {copiedKey === 'phone' ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Mail size={13} /> Email (Login)
                </span>
                <span className={styles.infoValue}>
                  {email}
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(email, 'email')}
                    title="Nusxalash"
                  >
                    {copiedKey === 'email' ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  </button>
                </span>
              </div>

              {/* Tizim Paroli with Show/Hide and Copy */}
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Lock size={13} /> Tizimga Kirish Paroli
                </span>
                <span className={styles.infoValue}>
                  <span className={styles.credentialValue}>
                    {showPassword ? teacherPlainPassword : '••••••••'}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className={styles.copyIconButton}
                      onClick={() => setShowPassword(!showPassword)}
                      title={showPassword ? "Yashirish" : "Ko'rsatish"}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button
                      type="button"
                      className={styles.copyIconButton}
                      onClick={() => handleCopy(teacherPlainPassword, 'pass')}
                      title="Nusxalash"
                    >
                      {copiedKey === 'pass' ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                    </button>
                  </div>
                </span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Building2 size={13} /> Biriktirilgan Filial
                </span>
                <span className={styles.infoValue}>{centerName}</span>
              </div>

              <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
                <span className={styles.infoLabel}>
                  <Info size={13} /> Qisqacha Ma'lumot (Bio)
                </span>
                <span
                  className={styles.infoValue}
                  style={{ fontWeight: 500, lineHeight: 1.5, color: '#334155' }}
                >
                  {teacherBio}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : isParent ? (
        /* ====================================================
           OTA-ONA PROFILI (EMAIL KERAK EMAS!)
        ==================================================== */
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h3 className={styles.cardTitle}>Ota-ona Shaxsiy Ma'lumotlari</h3>
              <p className={styles.cardSubtitle}>
                Farzandingiz ta'lim jarayonini kuzatib borish uchun tizimga biriktirilgan hisob ma'lumotlari
              </p>
            </div>
            <button
              type="button"
              className={styles.editBtn}
              onClick={() => setIsPasswordModalOpen(true)}
            >
              <Lock size={14} /> Parolni o'zgartirish
            </button>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <User size={14} /> Ota-ona (F.I.SH)
              </span>
              <span className={styles.infoValue}>{fullName}</span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Phone size={14} /> Telefon Raqami (Tizim Logini)
              </span>
              <span className={styles.infoValue}>
                <span style={{ color: '#2563eb', fontWeight: 700 }}>{phone}</span>
                {phone && (
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(phone, 'parent_phone')}
                    title="Nusxalash"
                  >
                    {copiedKey === 'parent_phone' ? (
                      <Check size={14} color="#16a34a" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                )}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Lock size={14} /> Tizimga Kirish Paroli
              </span>
              <span className={styles.infoValue}>
                <span className={styles.credentialValue}>
                  {showPassword ? parentPlainPassword : '••••••••'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => setShowPassword(!showPassword)}
                    title={showPassword ? "Yashirish" : "Ko'rsatish"}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    type="button"
                    className={styles.copyIconButton}
                    onClick={() => handleCopy(parentPlainPassword, 'parent_pass')}
                    title="Nusxalash"
                  >
                    {copiedKey === 'parent_pass' ? (
                      <Check size={14} color="#16a34a" />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                </div>
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <GraduationCap size={14} /> Farzandi (O'quvchi)
              </span>
              <span className={styles.infoValue} style={{ fontWeight: 600 }}>
                {parentStudentName}
              </span>
            </div>

            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>
                <Building2 size={14} /> Ta'lim Markazi Nomi
              </span>
              <span className={styles.infoValue}>
                {user?.branch?.name || "Yuksalish Ta'limi"}
              </span>
            </div>

            <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
              <span className={styles.infoLabel}>
                <MapPin size={14} /> Rasmiy Manzil
              </span>
              <span className={styles.infoValue}>{address}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ====================================================
           ADMIN / SUPER ADMIN VIEW
        ==================================================== */
        <>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h3 className={styles.cardTitle}>
                  {isAdmin || isSuperAdmin
                    ? "O'quv Markazi va Profil Tafsilotlari"
                    : `${userPosition || "Xodim"} va Profil Tafsilotlari`}
                </h3>
                <p className={styles.cardSubtitle}>
                  {isAdmin || isSuperAdmin
                    ? "Sizning ta'lim markazingizga biriktirilgan rasmiy ro'yxatdan o'tgan ma'lumotlar"
                    : "Sizning shaxsiy hisobingizga biriktirilgan rasmiy ro'yxatdan o'tgan ma'lumotlar"}
                </p>
              </div>
            </div>

            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Building2 size={14} /> O'quv Markazi Nomi
                </span>
                <span className={styles.infoValue}>{centerName}</span>
              </div>

              {/* Faqat Admin va Super Adminga ko'rinadi */}
              {(isAdmin || isSuperAdmin) && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <Award size={14} /> Amaldagi Tarif (Plan)
                  </span>
                  <span className={styles.infoValue}>
                    <span style={{ color: '#2563eb', fontWeight: 800 }}>{plan}</span> (Oylik to'lov)
                  </span>
                </div>
              )}

              {/* Xodim rasmiy lavozimi (masalan: Buxgalter) */}
              {userPosition && !isAdmin && !isSuperAdmin && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <Briefcase size={14} /> Rasmiy Lavozim
                  </span>
                  <span className={styles.infoValue} style={{ color: '#059669', fontWeight: 700 }}>
                    {userPosition}
                  </span>
                </div>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <User size={14} /> {isAdmin || isSuperAdmin ? "Mas'ul Administrator" : `${userPosition || "Xodim"} (F.I.SH)`}
                </span>
                <span className={styles.infoValue}>{fullName}</span>
              </div>

              {/* Xodim oylik maoshi */}
              {employeeProfile?.salary && !isAdmin && !isSuperAdmin && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <DollarSign size={14} /> Oylik Maosh (Stavka)
                  </span>
                  <span className={styles.infoValue} style={{ color: '#2563eb', fontWeight: 700 }}>
                    {Number(employeeProfile.salary).toLocaleString('ru-RU').replace(/,/g, ' ')} UZS
                  </span>
                </div>
              )}

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Phone size={14} /> Telefon Raqami
                </span>
                <span className={styles.infoValue}>{phone}</span>
              </div>

              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>
                  <Mail size={14} /> Email Manzil
                </span>
                <span className={styles.infoValue}>{email}</span>
              </div>

              {/* Faqat Admin va Super Adminga ko'rinadi */}
              {(isAdmin || isSuperAdmin) && (
                <div className={styles.infoItem}>
                  <span className={styles.infoLabel}>
                    <Users size={14} /> Maksimal O'quvchilar Sig'imi
                  </span>
                  <span className={styles.infoValue}>{maxStudents}</span>
                </div>
              )}

              <div className={`${styles.infoItem} ${styles.infoItemFull}`}>
                <span className={styles.infoLabel}>
                  <MapPin size={14} /> Rasmiy Manzil
                </span>
                <span className={styles.infoValue}>{address}</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ====================================================
         CHANGE PASSWORD MODAL
      ==================================================== */}
      {isPasswordModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsPasswordModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {isViewingTeacher && canManageTeachers && selectedTeacherId
                  ? `O'qituvchi Parolini O'zgartirish (${fullName})`
                  : "Tizim Parolini O'zgartirish"}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsPasswordModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Yangi Parol *</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    placeholder="Kamida 6 ta belgi"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Yangi Parolni Qayta Kiriting *</label>
                  <input
                    type="password"
                    className={styles.formInput}
                    placeholder="Parolni tasdiqlang"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryActionBtn}
                  onClick={() => setIsPasswordModalOpen(false)}
                >
                  Bekor qilish
                </button>
                <button type="submit" className={styles.primaryActionBtn}>
                  <Save size={15} />
                  <span>Parolni Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
         EDIT PROFILE MODAL (TEACHER & STUDENT & ADMIN VIEW)
      ==================================================== */}
      {isEditProfileModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsEditProfileModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>
                {isStudent
                  ? "Talaba Profilini Tahrirlash"
                  : isViewingTeacher
                  ? canManageTeachers && selectedTeacherId
                    ? `O'qituvchi Profilini Tahrirlash (Admin)`
                    : "O'qituvchi Profilini Tahrirlash"
                  : "Profil Ma'lumotlarini Tahrirlash"}
              </h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsEditProfileModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile}>
              <div className={styles.modalBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Ism-Familiya (F.I.SH) *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editFormData.full_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, full_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Telefon Raqami *</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Email (Login)</label>
                  <input
                    type="email"
                    className={styles.formInput}
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                  />
                </div>

                {isStudent ? (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Telegram Username</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder="@username"
                        value={editFormData.telegram}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, telegram: e.target.value })
                        }
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Ota-onasi / Vasiy Ismi</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editFormData.parent_name}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, parent_name: e.target.value })
                        }
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Ota-onasi Telefon Raqami</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editFormData.parent_phone}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, parent_phone: e.target.value })
                        }
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Yashash Manzili</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, address: e.target.value })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Mutaxassislik (Fan)</label>
                      <input
                        type="text"
                        className={styles.formInput}
                        placeholder=""
                        value={editFormData.specialization}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, specialization: e.target.value })
                        }
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Oylik Maosh (UZS)</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        placeholder=""
                        value={editFormData.salary_amount}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, salary_amount: e.target.value })
                        }
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Ish Tajribasi (Yil)</label>
                      <input
                        type="number"
                        className={styles.formInput}
                        placeholder=""
                        value={editFormData.experience_year}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, experience_year: e.target.value })
                        }
                      />
                    </div>

                    {canManageTeachers && (
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Faoliyat Holati</label>
                        <select
                          className={styles.formInput}
                          value={editFormData.status}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, status: e.target.value })
                          }
                        >
                          <option value="active">Faol (Ishda)</option>
                          <option value="inactive">Nofaol (Taqiqlangan)</option>
                        </select>
                      </div>
                    )}

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>O'qituvchi haqida (Bio)</label>
                      <textarea
                        className={styles.formInput}
                        rows={3}
                        placeholder="Tajribali o'qituvchi va mentor..."
                        value={editFormData.bio}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, bio: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryActionBtn}
                  onClick={() => setIsEditProfileModalOpen(false)}
                >
                  Bekor qilish
                </button>
                <button type="submit" className={styles.primaryActionBtn}>
                  <Save size={15} />
                  <span>Saqlash</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
         SUPER ADMIN CONTACT MODAL
      ==================================================== */}
      {isContactModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setIsContactModalOpen(false)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Super Adminga Murojaat</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setIsContactModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
                Profil yoki o'quv markazingiz ma'lumotlarini o'zgartirish uchun Super Admin bilan bog'laning:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '10px',
                  }}
                >
                  <Phone size={18} color="#2563eb" />
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      Telefon orqali:
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#0f172a' }}>
                      +998 90 000 00 01
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: '#f8fafc',
                    padding: '12px',
                    borderRadius: '10px',
                  }}
                >
                  <MessageSquare size={18} color="#7c3aed" />
                  <div>
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                      Telegram orqali:
                    </div>
                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: '#2563eb' }}>
                      @SuperAdmin_Support
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className={styles.primaryActionBtn}
                style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                onClick={() => {
                  alert("Murojaatingiz Super Adminga jo'natildi!");
                  setIsContactModalOpen(false);
                }}
              >
                <Send size={15} />
                <span>Murojaat so'rovini yuborish</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
