// Centralized Shared Homework Management Store for EDU CRM
// Persists assignments, group scoping, submissions, and grading

const STORAGE_KEY = 'edu_crm_group_homeworks_v10';
const SUBMISSIONS_KEY = 'edu_crm_student_hw_submissions_v4';
const GRADES_CACHE_KEY = 'edu_crm_student_saved_grades_v1';

// Dedicated Helper: Read student saved grades cache
export const getSavedStudentGradesMap = () => {
  try {
    const raw = localStorage.getItem(GRADES_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// Dedicated Helper: Save a student grade to cache
export const saveStudentGradeCache = (hwId, studentId, studentName, score, dueDate = null) => {
  try {
    const map = getSavedStudentGradesMap();
    const finalScore = Number(score) > 10
      ? Math.min(10, Math.max(1, Math.round(Number(score) / 10)))
      : Math.min(10, Math.max(1, Number(score) || 8));
    const todayFormatted = dueDate || new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const gradeObj = {
      score: finalScore,
      status: 'graded',
      dueDate: todayFormatted,
      gradedAt: new Date().toISOString(),
    };

    if (studentId) {
      map[`${hwId}_id_${studentId}`] = gradeObj;
    }
    if (studentName) {
      const cleanName = studentName.toLowerCase().trim();
      map[`${hwId}_name_${cleanName}`] = gradeObj;
    }
    localStorage.setItem(GRADES_CACHE_KEY, JSON.stringify(map));
    return gradeObj;
  } catch (e) {
    console.error('saveStudentGradeCache error:', e);
    return null;
  }
};

// Dedicated Helper: Lookup a saved grade by ID or Name
export const lookupSavedGrade = (hwId, studentId, studentName) => {
  try {
    const map = getSavedStudentGradesMap();
    if (studentId && map[`${hwId}_id_${studentId}`]) {
      return map[`${hwId}_id_${studentId}`];
    }
    if (studentName) {
      const cleanName = studentName.toLowerCase().trim();
      if (map[`${hwId}_name_${cleanName}`]) {
        return map[`${hwId}_name_${cleanName}`];
      }
      for (const k of Object.keys(map)) {
        if (k.startsWith(`${hwId}_name_`)) {
          const cachedName = k.replace(`${hwId}_name_`, '');
          if (cachedName === cleanName || cachedName.includes(cleanName) || cleanName.includes(cachedName)) {
            return map[k];
          }
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  }
};

// Real registered students for Web Dasturlash (Backend) group
export const BACKEND_STUDENTS_LIST = [
  {
    id: 1,
    name: "Abdunazarov Abdullo Axmadjon o'g'li",
    initials: 'AA',
    phone: '+998952020550',
    status: 'submitted',
    dueDate: 'Bugun, 18:20',
    score: 8,
  },
  {
    id: 2,
    name: "Abdulxamidov Abdurashid Mirzohid o'g'li",
    initials: 'AA',
    phone: '+998942014551',
    status: 'submitted',
    dueDate: 'Bugun, 18:20',
    score: 8,
  },
];

export const DEFAULT_STUDENTS_LIST = [
  {
    id: 17,
    name: 'Sayhodinov Elyorbek Ibrohimov',
    initials: 'SE',
    status: 'pending',
    dueDate: 'Ertaga, 23:59',
    score: 7,
  },
  {
    id: 18,
    name: 'Karimova Madina Akmalovna',
    initials: 'KM',
    status: 'submitted',
    dueDate: 'Bugun, 18:20',
    score: 7,
  },
  {
    id: 19,
    name: 'Toshpulatov Jasur Bahodirovich',
    initials: 'TJ',
    status: 'submitted',
    dueDate: 'Kecha, 20:05',
    score: 7,
  },
  {
    id: 20,
    name: 'Rahimova Zarina Oybekovna',
    initials: 'RZ',
    status: 'graded',
    dueDate: '05.11.2026',
    score: 10,
  },
  {
    id: 21,
    name: 'Abdullayev Sardor Hamidovich',
    initials: 'AS',
    status: 'graded',
    dueDate: '05.11.2026',
    score: 9,
  },
];

export const ensureHomeworkStudents = (hw) => {
  if (hw?.students && Array.isArray(hw.students) && hw.students.length > 0) {
    return hw.students.map((st) => ({
      ...st,
      score: st.score !== undefined && st.score !== null
        ? (st.score > 10 ? Math.min(10, Math.max(1, Math.round(st.score / 10))) : Math.min(10, Math.max(1, Math.round(st.score))))
        : 7,
    }));
  }
  const isBackend = (hw?.groupName || hw?.courseName || '').toLowerCase().includes('backend') || String(hw?.groupId) === '8' || String(hw?.groupId) === '6';
  if (isBackend) {
    return BACKEND_STUDENTS_LIST.map((st) => ({ ...st }));
  }
  return DEFAULT_STUDENTS_LIST.map((st) => ({ ...st }));
};

// Realistic initial homework assignments linked strictly to specific groups and courses
const SEED_HOMEWORKS = [
  // 1. IT KIDS GROUP HOMEWORKS
  {
    id: 'hw-it-kids-1',
    groupId: 12,
    groupName: 'IT kids',
    courseId: 3,
    courseName: 'IT kids',
    courseColor: '#ec4899',
    courseBg: '#fdf2f8',
    title: "Scratch Dasturlash: Interaktiv animatsiya va mini-o'yin yaratish",
    description: "Scratch bloklari yordamida o'z qahramoningizni klaviatura orqali harakatlantiring, ball to'plash va ovoz effektlari bilan qiziqarli mini-o'yin yarating.",
    teacher: 'Umarova Gulhayo Murodova',
    studentName: 'Sayhodinov Elyorbek Ibrohimov',
    assignedDate: '07.11.2026',
    dueDate: 'Ertaga, 23:59',
    isUrgent: true,
    status: 'pending',
    grade: null,
    bonusCoins: 10,
    maxScore: 10,
    files: [
      { name: 'Scratch_Oyini_Qollanmasi.pdf', type: 'pdf', size: '2.5 MB' },
      { name: 'Oyini_Baholash_Mezonlari.docx', type: 'docx', size: '340 KB' },
    ],
    students: [
      {
        id: 17,
        name: 'Sayhodinov Elyorbek Ibrohimov',
        initials: 'SE',
        status: 'pending',
        dueDate: 'Ertaga, 23:59',
        score: 7,
      },
      {
        id: 18,
        name: 'Karimova Madina Akmalovna',
        initials: 'KM',
        status: 'submitted',
        dueDate: 'Bugun, 18:20',
        score: 7,
      },
      {
        id: 19,
        name: 'Toshpulatov Jasur Bahodirovich',
        initials: 'TJ',
        status: 'submitted',
        dueDate: 'Kecha, 20:05',
        score: 7,
      },
      {
        id: 20,
        name: 'Rahimova Zarina Oybekovna',
        initials: 'RZ',
        status: 'graded',
        dueDate: '05.11.2026',
        score: 10,
      },
      {
        id: 21,
        name: 'Abdullayev Sardor Hamidovich',
        initials: 'AS',
        status: 'graded',
        dueDate: '05.11.2026',
        score: 9,
      },
    ],
  },
  {
    id: 'hw-it-kids-2',
    groupId: 12,
    groupName: 'IT kids',
    courseId: 3,
    courseName: 'IT kids',
    courseColor: '#ec4899',
    courseBg: '#fdf2f8',
    title: "Scratch: O'zgaruvchilar (Variables) va Ball hisoblash mexanikasi",
    description: "O'yinda yulduzchalarni terishda har safar 1 balldan qo'shilishi va vaqt tugaganda 'G'alaba' yoki 'Qayta urinish' oynasi chiqishini dasturlang.",
    teacher: 'Umarova Gulhayo Murodova',
    studentName: 'Sayhodinov Elyorbek Ibrohimov',
    assignedDate: '02.11.2026',
    dueDate: '06.11.2026',
    isUrgent: false,
    status: 'graded',
    submittedDate: '05.11.2026, 18:20',
    submissionLink: 'https://scratch.mit.edu/projects/variables-game-elyorbek',
    submittedFileName: 'Scratch_Variables_Elyorbek.sb3',
    submissionComment: "O'yin mexanikasi tayyor, yulduzcha terilganda ball hisoblanadi va vaqt cheklovi bor.",
    grade: 10,
    bonusCoins: 10,
    teacherFeedback: "Barakalla! O'yin mexanikasi juda qiziqarli chiqibdi, o'zgaruvchilar to'g'ri sozlangan.",
    maxScore: 10,
    files: [
      { name: 'Scratch_Variables_Guide.pdf', type: 'pdf', size: '1.4 MB' },
    ],
    students: [
      {
        id: 17,
        name: 'Sayhodinov Elyorbek Ibrohimov',
        initials: 'SE',
        status: 'graded',
        dueDate: '05.11.2026',
        score: 10,
      },
      {
        id: 18,
        name: 'Karimova Madina Akmalovna',
        initials: 'KM',
        status: 'graded',
        dueDate: '05.11.2026',
        score: 9,
      },
      {
        id: 19,
        name: 'Toshpulatov Jasur Bahodirovich',
        initials: 'TJ',
        status: 'graded',
        dueDate: '04.11.2026',
        score: 8,
      },
      {
        id: 20,
        name: 'Rahimova Zarina Oybekovna',
        initials: 'RZ',
        status: 'graded',
        dueDate: '05.11.2026',
        score: 10,
      },
      {
        id: 21,
        name: 'Abdullayev Sardor Hamidovich',
        initials: 'AS',
        status: 'graded',
        dueDate: '05.11.2026',
        score: 9,
      },
    ],
  },
  {
    id: 'hw-it-kids-3',
    groupId: 'it_kids_1',
    groupName: 'IT kids',
    courseId: 3,
    courseName: 'IT kids',
    courseColor: '#ec4899',
    courseBg: '#fdf2f8',
    title: "Scratch: Qahramonlar Animatsiyasi va Tovush Effektlari",
    description: "Multi-personajlar harakati, fon musiqa va to'siqlarga tegib ketganda ovoz chiqishi modulini yakunlang.",
    teacher: 'Umarova Gulhayo Murodova',
    studentName: 'Rustamov Diyorbek Jamshidovich',
    assignedDate: '05.11.2026',
    dueDate: 'Bugun, 22:00',
    isUrgent: true,
    status: 'submitted',
    submittedDate: '14.11.2026, 11:30',
    submissionLink: 'https://scratch.mit.edu/projects/animation-game-diyorbek',
    submittedFileName: 'Scratch_Animatsiya_Diyorbek.sb3',
    submissionComment: "Ustoz, qahramon harakatlari va sakrash animatsiyasi to'liq ishlayapti. Tekshirib bersangiz.",
    bonusCoins: 10,
    maxScore: 10,
    files: [
      { name: 'Scratch_Animatsiya_Qollanma.pdf', type: 'pdf', size: '1.2 MB' },
    ],
    students: DEFAULT_STUDENTS_LIST.map((st) => ({ ...st })),
  },

  // 2. WEB DASTURLASH (BACKEND) HOMEWORKS
  {
    id: 'hw-be-group-1',
    groupId: 8,
    groupName: 'Web Dasturlash (Backend) (10:00)',
    courseId: 1,
    courseName: 'Web Dasturlash (Backend)',
    courseColor: '#2563eb',
    courseBg: '#eff6ff',
    title: 'Node.js & Express: RESTful API arxitekturasi, Middleware va Marshrutlash',
    description: "Express.js frameworki yordamida CRUD operatsiyalarini bajaruvchi to'liq REST API yarating. So'rovlarni tekshiruvchi maxsus middleware va xatoliklarni global ushlovchi errorHandler yozing.",
    teacher: 'Asroqulov Abror Abrorov',
    studentName: "Abdunazarov Abdullo Axmadjon o'g'li",
    assignedDate: '07.11.2026',
    dueDate: 'Ertaga, 23:59',
    isUrgent: true,
    status: 'pending',
    grade: null,
    bonusCoins: 10,
    maxScore: 10,
    files: [
      { name: 'Express_RestAPI_Amaliy_Qollanma.pdf', type: 'pdf', size: '1.6 MB' },
      { name: 'Backend_API_Specification.docx', type: 'docx', size: '380 KB' },
    ],
    students: BACKEND_STUDENTS_LIST.map((st) => ({ ...st })),
  },
  {
    id: 'hw-be-group-2',
    groupId: 8,
    groupName: 'Web Dasturlash (Backend) (10:00)',
    courseId: 1,
    courseName: 'Web Dasturlash (Backend)',
    courseColor: '#2563eb',
    courseBg: '#eff6ff',
    title: 'PostgreSQL & Sequelize ORM: Modellar, Migratsiyalar va Relatsiyalar (1:N, N:M)',
    description: "PostgreSQL ma'lumotlar bazasida 1:N va N:M relatsiyalarni Sequelize ORM orqali sozlang. Migratsiya fayllari va seeder yozib, test ma'lumotlari bilan to'ldiring.",
    teacher: 'Asroqulov Abror Abrorov',
    studentName: "Abdulxamidov Abdurashid Mirzohid o'g'li",
    assignedDate: '04.11.2026',
    dueDate: '10-noyabr, 18:00',
    isUrgent: false,
    status: 'pending',
    grade: null,
    bonusCoins: 10,
    maxScore: 10,
    files: [
      { name: 'Sequelize_ORM_Database_Diagram.pdf', type: 'pdf', size: '2.1 MB' },
      { name: 'Sequelize_Models_Spec.docx', type: 'docx', size: '450 KB' },
    ],
    students: BACKEND_STUDENTS_LIST.map((st) => ({ ...st })),
  },
  {
    id: 'hw-be-group-3',
    groupId: 8,
    groupName: 'Web Dasturlash (Backend) (10:00)',
    courseId: 1,
    courseName: 'Web Dasturlash (Backend)',
    courseColor: '#2563eb',
    courseBg: '#eff6ff',
    title: 'JWT Authentication & Role-Based Access Control (RBAC) xavfsizlik tizimi',
    description: "JWT yordamida foydalanuvchini autentifikatsiya qilish, parollarni bcrypt bilan hash'lash hamda Admin, O'qituvchi va Talaba rollari bo'yicha himoyalangan yo'llarni (guard middleware) joriy etish.",
    teacher: 'Asroqulov Abror Abrorov',
    studentName: "Abdunazarov Abdullo Axmadjon o'g'li",
    assignedDate: '28.10.2026',
    dueDate: '02.11.2026',
    isUrgent: false,
    status: 'graded',
    submittedDate: '01.11.2026, 19:15',
    submissionLink: 'https://github.com/temur-saidov/jwt-rbac-system',
    submittedFileName: 'jwt_rbac_implementation.zip',
    submissionComment: "Bcrypt hash, access token va refresh token to'liq integratsiya qilindi.",
    grade: 10,
    bonusCoins: 10,
    teacherFeedback: "Ajoyib ish! Token va middleware to'g'ri sozlangan, xavfsizlik talablariga to'liq javob beradi. Refresh token mantig'i ham yaxshi bajarilgan.",
    maxScore: 10,
    files: [
      { name: 'JWT_Auth_Architecture_Guide.pdf', type: 'pdf', size: '1.4 MB' },
      { name: 'Security_Best_Practices.docx', type: 'docx', size: '320 KB' },
    ],
    students: BACKEND_STUDENTS_LIST.map((st) => ({ ...st, status: 'graded', score: 10 })),
  },
  {
    id: 'hw-be-group-4',
    groupId: 8,
    groupName: 'Web Dasturlash (Backend) (10:00)',
    courseId: 1,
    courseName: 'Web Dasturlash (Backend)',
    courseColor: '#2563eb',
    courseBg: '#eff6ff',
    title: "Node.js: Joi Kutubxonasi orqali So'rovlarni Validatsiya Qilish",
    description: "Backend API ga kelayotgan barcha ma'lumotlarni Joi sxemalari yordamida tekshiruvchi maxsus middleware yozing.",
    teacher: 'Asroqulov Abror Abrorov',
    studentName: "Abdulxamidov Abdurashid Mirzohid o'g'li",
    assignedDate: '06.11.2026',
    dueDate: 'Bugun, 23:59',
    isUrgent: true,
    status: 'submitted',
    submittedDate: '14.11.2026, 13:15',
    submissionLink: 'https://github.com/sardor-dev/express-joi-middleware',
    submittedFileName: 'express_joi_project.zip',
    submissionComment: "Joi sxemalari barcha POST/PUT so'rovlari uchun yozildi va test qilindi.",
    bonusCoins: 10,
    maxScore: 10,
    files: [
      { name: 'Joi_Validation_Guide.pdf', type: 'pdf', size: '1.3 MB' },
    ],
    students: BACKEND_STUDENTS_LIST.map((st) => ({ ...st })),
  },

  // 3. WEB DASTURLASH (FRONTEND) HOMEWORKS
  {
    id: 'hw-fe-group-1',
    groupId: 'fe_group_1',
    groupName: 'Web Dasturlash (Frontend)',
    courseId: 2,
    courseName: 'Web Dasturlash (Frontend)',
    courseColor: '#0ea5e9',
    courseBg: '#f0f9ff',
    title: 'React.js: Komponentlar, Props, State va Hooks (useState, useEffect) amaliyoti',
    description: "Berilgan vazifada funksional komponentlar yordamida interaktiv interfeys yarating. useState va useEffect hook'laridan foydalanib ma'lumotlar oqimini boshqaring va API bilan ishlashni sozlang.",
    teacher: 'Ergashev Farhod Rustamovich',
    studentName: 'Turg\'unov Bekzod Ravshanovich',
    assignedDate: '05.11.2026',
    dueDate: '12-noyabr, 20:00',
    isUrgent: true,
    status: 'pending',
    grade: null,
    bonusCoins: 10,
    maxScore: 10,
    files: [
      { name: 'React_Hooks_Topshiriq_Qollanma.pdf', type: 'pdf', size: '1.8 MB' },
      { name: 'React_Starter_Specification.docx', type: 'docx', size: '420 KB' },
    ],
    students: DEFAULT_STUDENTS_LIST.map((st) => ({ ...st })),
  },

  // 4. KAMPYUTER SAVODXONLIGI HOMEWORKS
  {
    id: 'hw-comp-group-1',
    groupId: 'comp_group_1',
    groupName: 'Kampyuter Savodxonligi',
    courseId: 4,
    courseName: 'Kampyuter Savodxonligi',
    courseColor: '#10b981',
    courseBg: '#ecfdf5',
    title: "MS Word: Rasmiy hujjatlar tayyorlash va jadvallar bilan ishlash",
    description: "Berilgan shablon asosida korxona arizasi va buyruq hujjatini Word dasturida sahifalab, tartibli formatlang.",
    teacher: 'Ibragimov Yusufbek Ikromovich',
    studentName: 'Nazarova Shaxnoza Ulug\'bekovna',
    assignedDate: '04.11.2026',
    dueDate: '11-noyabr, 17:00',
    isUrgent: false,
    status: 'pending',
    grade: null,
    bonusCoins: 8,
    maxScore: 10,
    files: [
      { name: 'MS_Word_Hujjat_Talablari.pdf', type: 'pdf', size: '1.1 MB' },
    ],
    students: DEFAULT_STUDENTS_LIST.map((st) => ({ ...st })),
  },
];

// Helper: load raw list from storage or seed
export const loadAllStoredHomeworks = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list = SEED_HOMEWORKS;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          list = parsed;
        }
      } catch (err) {}
    }
    return list.map((h) => ({
      ...h,
      students: ensureHomeworkStudents(h),
    }));
  } catch (e) {
    return SEED_HOMEWORKS.map((h) => ({
      ...h,
      students: ensureHomeworkStudents(h),
    }));
  }
};

// Helper: load student submissions map
export const loadStudentSubmissions = (userId) => {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed[userId || 'guest'] || {};
  } catch (e) {
    return {};
  }
};

// Save a student's submission
export const saveStudentSubmission = (userOrId, hwId, submissionData) => {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const userId = typeof userOrId === 'object' ? userOrId?.id : userOrId;
    const studentName = typeof userOrId === 'object' ? userOrId?.full_name : submissionData?.studentName;
    const uKey = userId || 'guest';
    if (!parsed[uKey]) parsed[uKey] = {};

    parsed[uKey][hwId] = {
      status: 'submitted',
      studentName: studentName || 'Talaba',
      studentId: userId || null,
      submittedDate: new Date().toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      submissionLink: submissionData.link || '',
      submissionComment: submissionData.comment || '',
      submittedFileName: submissionData.fileName || 'vazifa_yechimi.zip',
    };

    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(parsed));
    window.dispatchEvent(new Event('homeworks_updated'));
    return parsed[uKey][hwId];
  } catch (e) {
    console.error('saveStudentSubmission error:', e);
    return null;
  }
};

// Teacher grades a homework for a student
export const gradeStudentHomework = (userId, hwId, gradeData) => {
  try {
    const raw = localStorage.getItem(SUBMISSIONS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const uKey = userId || 'guest';
    if (!parsed[uKey]) parsed[uKey] = {};

    parsed[uKey][hwId] = {
      ...(parsed[uKey][hwId] || {}),
      status: 'graded',
      grade: Number(gradeData.grade) || 95,
      bonusCoins: Number(gradeData.coins) || 10,
      teacherFeedback: gradeData.feedback || "A'lo darajada bajarilgan!",
      gradedDate: new Date().toLocaleDateString('uz-UZ'),
    };

    localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(parsed));

    // Also update in all homeworks if globally marked
    const all = loadAllStoredHomeworks();
    const updated = all.map((h) => {
      if (h.id === hwId) {
        return {
          ...h,
          status: 'graded',
          grade: Number(gradeData.grade) || 95,
          bonusCoins: Number(gradeData.coins) || 10,
          teacherFeedback: gradeData.feedback || "A'lo darajada bajarilgan!",
        };
      }
      return h;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    window.dispatchEvent(new Event('homeworks_updated'));
    window.dispatchEvent(new Event('coins_updated'));
    return parsed[uKey][hwId];
  } catch (e) {
    console.error('gradeStudentHomework error:', e);
    return null;
  }
};

// Teacher adds a new homework for their group
export const createGroupHomework = (hwData, teacherUser) => {
  try {
    const all = loadAllStoredHomeworks();

    const newHw = {
      id: `hw-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      groupId: String(hwData.groupId || ''),
      groupName: hwData.groupName || 'Maxsus Guruh',
      courseId: hwData.courseId || null,
      courseName: hwData.courseName || hwData.groupName || 'Kurs',
      courseColor: hwData.courseColor || '#2563eb',
      courseBg: hwData.courseBg || '#eff6ff',
      title: hwData.title.trim(),
      description: hwData.description.trim(),
      teacher: teacherUser?.full_name || hwData.teacher || 'Ustoz',
      teacherId: teacherUser?.id || null,
      assignedDate: new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      dueDate: hwData.dueDate || '3 kun ichida',
      isUrgent: Boolean(hwData.isUrgent),
      status: 'pending',
      grade: null,
      bonusCoins: Number(hwData.bonusCoins) || 10,
      maxScore: Number(hwData.maxScore) || 100,
      files: hwData.files && hwData.files.length > 0 ? hwData.files : [
        {
          name: `${(hwData.title || 'Topshiriq').slice(0, 24).replace(/\s+/g, '_')}_Qollanma.pdf`,
          type: 'pdf',
          size: '1.4 MB',
        },
      ],
      createdAt: new Date().toISOString(),
    };

    const nextList = [newHw, ...all];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));

    window.dispatchEvent(new Event('homeworks_updated'));
    return newHw;
  } catch (e) {
    console.error('createGroupHomework error:', e);
    return null;
  }
};

// STRICT FILTERING FOR STUDENT:
// Student ONLY sees homeworks for groups or courses they are enrolled in!
// Extraneous homeworks are completely eliminated!
export const getStudentScopedHomeworks = (user, studentGroupIds = [], studentCourseIds = [], studentGroupNames = [], studentCourseNames = []) => {
  const all = loadAllStoredHomeworks();
  const submissions = loadStudentSubmissions(user?.id);

  const cleanGroupNames = (studentGroupNames || []).map((n) => (n || '').toLowerCase().trim()).filter(Boolean);
  const cleanCourseNames = (studentCourseNames || []).map((n) => (n || '').toLowerCase().trim()).filter(Boolean);
  const cleanGroupIds = (studentGroupIds || []).map(String);
  const cleanCourseIds = (studentCourseIds || []).map(String);

  return all
    .filter((hw) => {
      const hwGroupId = hw.groupId ? String(hw.groupId) : '';
      const hwCourseId = hw.courseId ? String(hw.courseId) : '';
      const hwGroupName = (hw.groupName || '').toLowerCase().trim();
      const hwCourseName = (hw.courseName || '').toLowerCase().trim();

      // 1. Direct group ID match
      if (hwGroupId && cleanGroupIds.includes(hwGroupId)) return true;

      // 2. Direct course ID match
      if (hwCourseId && cleanCourseIds.includes(hwCourseId)) return true;

      // 3. Group Name match
      if (hwGroupName && cleanGroupNames.some((gn) => hwGroupName.includes(gn) || gn.includes(hwGroupName))) return true;

      // 4. Course Name match
      if (hwCourseName && cleanCourseNames.some((cn) => hwCourseName.includes(cn) || cn.includes(hwCourseName))) return true;

      // If student has no detected groups yet, fallback to checking student name in title or group
      return false;
    })
    .map((hw) => {
      let merged = { ...hw };
      // Merge with student's individual submission state
      if (submissions[hw.id]) {
        merged = { ...merged, ...submissions[hw.id] };
      }

      // Check teacher's grade for this student
      const currentStudentId = user?.student?.id || user?.student_id || user?.id;
      const currentStudentName = user?.full_name || user?.name || '';
      const cachedGrade = lookupSavedGrade(hw.id, currentStudentId, currentStudentName);

      if (cachedGrade) {
        merged.status = 'graded';
        merged.grade = cachedGrade.score;
        merged.bonusCoins = cachedGrade.score;
        merged.dueDate = cachedGrade.dueDate || merged.dueDate;
        merged.gradedDate = cachedGrade.dueDate;
      } else if (Array.isArray(hw.students) && hw.students.length > 0) {
        const studentRecord = hw.students.find((st) => {
          const matchId = currentStudentId && (st.id === currentStudentId || String(st.id) === String(currentStudentId));
          const stNameLower = (st.name || '').toLowerCase().trim();
          const curNameLower = currentStudentName.toLowerCase().trim();
          const matchName = curNameLower && stNameLower && (
            stNameLower === curNameLower ||
            stNameLower.includes(curNameLower) ||
            curNameLower.includes(stNameLower)
          );
          return matchId || matchName;
        });

        if (studentRecord && studentRecord.status === 'graded') {
          merged.status = 'graded';
          merged.grade = studentRecord.score;
          merged.bonusCoins = studentRecord.score;
          merged.dueDate = studentRecord.dueDate || merged.dueDate;
          merged.gradedDate = studentRecord.dueDate;
        }
      }

      return merged;
    });
};

// Teacher ONLY sees homeworks created by or assigned to them!
export const getTeacherScopedHomeworks = (user, teacherGroups = [], teacherEntity = null) => {
  const all = loadAllStoredHomeworks();
  if (!user) return all;

  const currentTeacherId = teacherEntity?.id
    ? String(teacherEntity.id)
    : user?.teacher?.id
    ? String(user.teacher.id)
    : user?.teacher_id
    ? String(user.teacher_id)
    : null;
  const currentUserId = user?.id ? String(user.id) : null;
  const currentFullName = (user?.full_name || '').toLowerCase().trim();

  // Extract name parts (e.g. "asroqulov", "abror")
  const nameParts = currentFullName
    .split(/\s+/)
    .map((p) => p.replace(/[^a-zA-Zа-яА-ЯёЁo'g'shch]/gi, '').toLowerCase())
    .filter((p) => p.length >= 3);

  // Group IDs and Group Names taught by this teacher
  const teacherGroupIds = new Set();
  const teacherGroupNames = new Set();
  (teacherGroups || []).forEach((g) => {
    if (g.id) teacherGroupIds.add(String(g.id));
    if (g.name) teacherGroupNames.add(g.name.toLowerCase().trim());
  });

  return all.filter((hw) => {
    // 1. Direct teacherId match
    if (hw.teacherId) {
      const tId = String(hw.teacherId);
      if (currentTeacherId && tId === currentTeacherId) return true;
      if (currentUserId && tId === currentUserId) return true;
    }

    // 2. Direct teacher full name match or token match
    if (hw.teacher && currentFullName) {
      const hwTeacher = hw.teacher.toLowerCase().trim();
      if (hwTeacher === currentFullName) return true;
      if (hwTeacher.includes(currentFullName) || currentFullName.includes(hwTeacher)) return true;

      if (nameParts.length >= 2) {
        const matches = nameParts.filter((part) => hwTeacher.includes(part));
        if (matches.length >= 2) return true;
      } else if (nameParts.length === 1) {
        if (hwTeacher.includes(nameParts[0])) return true;
      }
    }

    // 3. Match by teacher's assigned groups
    if (hw.groupId && teacherGroupIds.has(String(hw.groupId))) return true;
    if (hw.groupName && teacherGroupNames.has(hw.groupName.toLowerCase().trim())) return true;

    return false;
  });
};

// Helper for student initials
const getStudentInitials = (name) => {
  if (!name) return 'T';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

// Update a specific student's grade and status inside a group homework
export const saveHomeworkStudentGrade = (hwId, studentOrId, newScore, studentName = '') => {
  try {
    const finalScore = Number(newScore) > 10
      ? Math.min(10, Math.max(1, Math.round(Number(newScore) / 10)))
      : Math.min(10, Math.max(1, Number(newScore) || 8));

    const targetId = typeof studentOrId === 'object' ? studentOrId?.id : studentOrId;
    const targetName = (
      typeof studentOrId === 'object'
        ? (studentOrId?.name || studentOrId?.full_name)
        : typeof studentOrId === 'string' && isNaN(Number(studentOrId))
        ? studentOrId
        : studentName
    ) || '';
    const targetNameLower = targetName.toLowerCase().trim();
    const todayFormatted = new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

    // 1. Immediately cache in dedicated fast-lookup store
    saveStudentGradeCache(hwId, targetId, targetName, finalScore, todayFormatted);

    // 2. Also persist in primary homeworks storage
    const all = loadAllStoredHomeworks();
    let updatedStudent = null;

    const updated = all.map((h) => {
      if (h.id === hwId || String(h.id) === String(hwId)) {
        const baseStudents = ensureHomeworkStudents(h);
        let foundInBase = false;

        const updatedStudents = baseStudents.map((st) => {
          const matchId = targetId && (st.id === targetId || String(st.id) === String(targetId));
          const stNameLower = (st.name || '').toLowerCase().trim();
          const matchName = targetNameLower && stNameLower && (
            stNameLower === targetNameLower ||
            stNameLower.includes(targetNameLower) ||
            targetNameLower.includes(stNameLower)
          );

          if (matchId || matchName) {
            foundInBase = true;
            updatedStudent = {
              ...st,
              id: targetId || st.id,
              name: targetName || st.name,
              score: finalScore,
              status: 'graded',
              dueDate: todayFormatted,
            };
            return updatedStudent;
          }
          return st;
        });

        // If the student wasn't in baseStudents, append them as graded!
        if (!foundInBase && (targetId || targetName)) {
          updatedStudent = {
            id: targetId || Date.now(),
            name: targetName || `Talaba #${targetId}`,
            initials: getStudentInitials(targetName),
            score: finalScore,
            status: 'graded',
            dueDate: todayFormatted,
          };
          updatedStudents.push(updatedStudent);
        }

        const allGraded = updatedStudents.length > 0 && updatedStudents.every((s) => s.status === 'graded');

        return {
          ...h,
          students: updatedStudents,
          ...(allGraded ? { status: 'graded' } : {}),
        };
      }
      return h;
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updatedStudent || true;
  } catch (e) {
    console.error('saveHomeworkStudentGrade error:', e);
    return false;
  }
};

export default {
  loadAllStoredHomeworks,
  loadStudentSubmissions,
  saveStudentSubmission,
  gradeStudentHomework,
  createGroupHomework,
  getStudentScopedHomeworks,
  saveHomeworkStudentGrade,
  lookupSavedGrade,
  saveStudentGradeCache,
  getSavedStudentGradesMap,
};

