const { User, Student, Group, Course, Teacher, Classroom, Lesson, Attendance, StudentGrade, GroupStudent, Branch } = require('../../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

// Helper to resolve student
const resolveTargetStudent = async (req, studentIdParam = null) => {
    const callerRole = (req.user?.role || '').toUpperCase();
    const callerId = req.user?.id;

    if (callerRole === 'PARENT') {
        const student = await Student.findOne({
            where: {
                [Op.or]: [
                    { parent_user_id: callerId },
                    { parent_phone: req.user?.phone || 'NONEXISTENT' },
                    { parent_phone: req.user?.email || 'NONEXISTENT' }
                ]
            },
            include: [
                { model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] },
                { model: Group, as: 'group', attributes: ['id', 'name', 'days', 'lesson_time', 'start_time', 'end_time', 'course_id', 'teacher_id'] },
                { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name', 'phone', 'address'] },
                { model: User, as: 'parent_user', attributes: ['id', 'full_name', 'phone', 'email', 'plain_password'] }
            ]
        });
        return student;
    }

    // Admin / Manager / Teacher
    const targetId = studentIdParam || req.params.studentId || req.query.student_id;
    if (!targetId) return null;

    const student = await Student.findByPk(targetId, {
        include: [
            { model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] },
            { model: Group, as: 'group', attributes: ['id', 'name', 'days', 'lesson_time', 'start_time', 'end_time', 'course_id', 'teacher_id'] },
            { model: Course, as: 'course', attributes: ['id', 'name', 'price'] },
            { model: Branch, as: 'branch', attributes: ['id', 'name', 'phone', 'address'] },
            { model: User, as: 'parent_user', attributes: ['id', 'full_name', 'phone', 'email', 'plain_password'] }
        ]
    });
    return student;
};

// 1. GET PARENT OVERVIEW (Baholar, Davomat, Dars kunlari)
exports.getParentOverview = async (req, res) => {
    try {
        const student = await resolveTargetStudent(req, req.params.studentId);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: "Talaba profili topilmadi!"
            });
        }

        // Studentning guruhlari (Asosiy + boshqa a'zo bo'lgan guruhlar)
        const enrolledGroupIds = new Set();
        if (student.group_id) enrolledGroupIds.add(Number(student.group_id));

        if (GroupStudent) {
            const gsList = await GroupStudent.findAll({
                where: { student_id: student.id, status: { [Op.ne]: 'left' } },
                attributes: ['group_id']
            });
            gsList.forEach((gs) => {
                if (gs.group_id) enrolledGroupIds.add(Number(gs.group_id));
            });
        }
        const enrolledGroupIdsArr = Array.from(enrolledGroupIds);

        // ====================================================
        // 1. DARS BAHOLARI (Umumiy ko'rinish)
        // ====================================================
        let gradesList = [];
        if (StudentGrade) {
            gradesList = await StudentGrade.findAll({
                where: { student_id: student.id },
                include: [
                    Group ? { model: Group, as: 'group', attributes: ['id', 'name'] } : null,
                    Teacher ? {
                        model: Teacher,
                        as: 'teacher',
                        include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] : []
                    } : null
                ].filter(Boolean),
                order: [['date', 'DESC'], ['id', 'DESC']]
            });
        }

        let totalScore = 0;
        let hwScores = [];
        let actScores = [];
        const formattedGrades = gradesList.map((g) => {
            const numScore = Number(g.score) || 0;
            totalScore += numScore;
            if (g.type === 'homework') hwScores.push(numScore);
            if (g.type === 'activity') actScores.push(numScore);

            return {
                id: g.id,
                date: g.date,
                type: g.type, // 'homework' | 'activity'
                typeName: g.type === 'homework' ? 'Uy vazifasi' : "Darsdagi mashg'ulot",
                score: numScore,
                max_score: 10,
                comment: g.comment || "Izoh qoldirilmagan",
                group_name: g.group?.name || student.group?.name || "Asosiy guruh",
                teacher_name: g.teacher?.user?.full_name || student.group?.teacher?.user?.full_name || "O'qituvchi"
            };
        });

        const totalGraded = formattedGrades.length;
        const avgScore = totalGraded > 0 ? (totalScore / totalGraded).toFixed(1) : 0;
        const hwAvg = hwScores.length > 0 ? (hwScores.reduce((a, b) => a + b, 0) / hwScores.length).toFixed(1) : 0;
        const actAvg = actScores.length > 0 ? (actScores.reduce((a, b) => a + b, 0) / actScores.length).toFixed(1) : 0;

        const gradesSummary = {
            average_score: Number(avgScore),
            total_graded: totalGraded,
            homework_avg: Number(hwAvg),
            homework_count: hwScores.length,
            activity_avg: Number(actAvg),
            activity_count: actScores.length,
            list: formattedGrades
        };

        // ====================================================
        // 2. DAVOMAT (Umumiy hisobot va sanama-sana)
        // ====================================================
        let attendancesList = [];
        if (Attendance) {
            attendancesList = await Attendance.findAll({
                where: { student_id: student.id },
                include: [
                    Lesson ? {
                        model: Lesson,
                        as: 'lesson',
                        attributes: ['id', 'lesson_date', 'start_time', 'end_time', 'topic', 'status'],
                        include: Group ? [{ model: Group, as: 'group', attributes: ['id', 'name'] }] : []
                    } : null
                ].filter(Boolean),
                order: [['created_at', 'DESC']]
            });
        }

        let presentCount = 0;
        let absentCount = 0;
        let lateCount = 0;

        const formattedAttendance = attendancesList.map((att) => {
            const st = (att.status || 'present').toLowerCase();
            if (st === 'present' || st === 'attended') presentCount++;
            else if (st === 'absent') absentCount++;
            else if (st === 'late') lateCount++;
            else presentCount++;

            return {
                id: att.id,
                date: att.lesson?.lesson_date || (att.marked_at ? new Date(att.marked_at).toISOString().split('T')[0] : '—'),
                start_time: att.lesson?.start_time || '—',
                end_time: att.lesson?.end_time || '—',
                topic: att.lesson?.topic || "Amaliy dars",
                group_name: att.lesson?.group?.name || student.group?.name || "Asosiy guruh",
                status: st, // 'present' | 'absent' | 'late'
                statusText: st === 'present' || st === 'attended' ? 'Qatnashdi' : st === 'late' ? 'Kechikdi' : 'Sababsiz qatnashmadi',
                note: att.note || '',
                marked_at: att.marked_at
            };
        });

        const totalLessons = formattedAttendance.length;
        const attendancePercentage = totalLessons > 0 ? Math.round(((presentCount + lateCount * 0.5) / totalLessons) * 100) : 100;

        const attendanceSummary = {
            total_lessons: totalLessons,
            present_count: presentCount,
            absent_count: absentCount,
            late_count: lateCount,
            attendance_percentage: attendancePercentage,
            list: formattedAttendance
        };

        // ====================================================
        // 3. DARS KUNLARI (Guruhlar, hafta kunlari, vaqtlari)
        // ====================================================
        let scheduleGroups = [];
        if (Group && enrolledGroupIdsArr.length > 0) {
            scheduleGroups = await Group.findAll({
                where: { id: { [Op.in]: enrolledGroupIdsArr } },
                include: [
                    Course ? { model: Course, as: 'course', attributes: ['id', 'name', 'price'] } : null,
                    Teacher ? {
                        model: Teacher,
                        as: 'teacher',
                        include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone'] }] : []
                    } : null,
                    Classroom ? { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'capacity'] } : null
                ].filter(Boolean)
            });
        }

        const scheduleList = scheduleGroups.map((grp) => {
            return {
                id: grp.id,
                group_name: grp.name,
                course_name: grp.course?.name || "O'quv kursi",
                days: grp.days || "Dushanba, Chorshanba, Juma",
                lesson_time: grp.lesson_time || (grp.start_time && grp.end_time ? `${grp.start_time.slice(0, 5)} - ${grp.end_time.slice(0, 5)}` : "10:00 - 12:00"),
                teacher_name: grp.teacher?.user?.full_name || "Biriktirilgan o'qituvchi",
                teacher_phone: grp.teacher?.user?.phone || '',
                classroom: grp.classroom?.name || "1-xona",
                status: grp.status || 'active'
            };
        });

        // Agar guruh topilmasa, talabaning asosiy guruhi ma'lumotlari
        if (scheduleList.length === 0 && student.group) {
            scheduleList.push({
                id: student.group.id,
                group_name: student.group.name,
                course_name: student.course?.name || "O'quv kursi",
                days: student.group.days || "Dushanba, Chorshanba, Juma",
                lesson_time: student.group.lesson_time || "10:00 - 12:00",
                teacher_name: "Biriktirilgan o'qituvchi",
                teacher_phone: '',
                classroom: "1-xona",
                status: 'active'
            });
        }

        // Parent User credentials (agar mavjud bo'lsa)
        let parentUserCredentials = null;
        if (student.parent_user) {
            parentUserCredentials = {
                id: student.parent_user.id,
                full_name: student.parent_user.full_name,
                login: student.parent_user.phone || student.parent_user.email,
                phone: student.parent_user.phone,
                email: student.parent_user.email,
                password: student.parent_user.plain_password || '123456'
            };
        } else if (student.parent_phone) {
            // Check if user exists by phone
            const existingUser = await User.findOne({
                where: { phone: student.parent_phone, role: 'PARENT' }
            });
            if (existingUser) {
                parentUserCredentials = {
                    id: existingUser.id,
                    full_name: existingUser.full_name,
                    login: existingUser.phone || existingUser.email,
                    phone: existingUser.phone,
                    email: existingUser.email,
                    password: existingUser.plain_password || '123456'
                };
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                student: {
                    id: student.id,
                    full_name: student.user?.full_name || "Talaba",
                    phone: student.user?.phone || '',
                    parent_name: student.parent_name || "Ota-ona",
                    parent_phone: student.parent_phone || '',
                    branch_name: student.branch?.name || "Yuksalish Ta'limi",
                    address: student.address || ''
                },
                parent_credentials: parentUserCredentials,
                grades: gradesSummary,
                attendance: attendanceSummary,
                schedule: scheduleList
            }
        });

    } catch (err) {
        console.error("getParentOverview error:", err);
        return res.status(500).json({
            success: false,
            message: "Ota-ona ma'lumotlarini olishda xatolik yuz berdi: " + err.message
        });
    }
};

// 2. GET OR CREATE PARENT CREDENTIALS (Admin side)
exports.getOrCreateParentCredentials = async (req, res) => {
    try {
        const { studentId } = req.params;
        const student = await Student.findByPk(studentId, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] },
                { model: User, as: 'parent_user', attributes: ['id', 'full_name', 'phone', 'email', 'plain_password'] }
            ]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: "Talaba topilmadi." });
        }

        let parentUser = student.parent_user;

        // Agar mavjud bo'lmasa, qidirish yoki yangi yaratish
        if (!parentUser) {
            const rawPhone = student.parent_phone || `+99890${String(student.id).padStart(7, '0')}`;
            const cleanPhone = rawPhone.replace(/\s+/g, '');
            const defaultPassword = '123456';
            const defaultEmail = `parent_${student.id}@yuksalish.uz`;

            // Avval telefon yoki email bo'yicha qidirish
            parentUser = await User.findOne({
                where: {
                    [Op.or]: [
                        { phone: cleanPhone },
                        { email: defaultEmail }
                    ]
                }
            });

            if (!parentUser) {
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                parentUser = await User.create({
                    full_name: student.parent_name || `${student.user?.full_name || 'Talaba'}ning ota-onasi`,
                    phone: cleanPhone,
                    email: defaultEmail,
                    hashed_password: hashedPassword,
                    plain_password: defaultPassword,
                    role: 'PARENT',
                    status: 'active',
                    branch_id: student.branch_id || null
                });
            } else {
                // Rolini PARENT ga o'zgartirish agar kerak bo'lsa
                if (parentUser.role !== 'PARENT') {
                    await parentUser.update({ role: 'PARENT' });
                }
            }

            // Studentga bog'lash
            await student.update({ parent_user_id: parentUser.id });
        }

        return res.status(200).json({
            success: true,
            data: {
                student_id: student.id,
                student_name: student.user?.full_name || 'Talaba',
                parent_user_id: parentUser.id,
                parent_name: parentUser.full_name,
                login: parentUser.phone || parentUser.email,
                phone: parentUser.phone,
                email: parentUser.email,
                password: parentUser.plain_password || '123456'
            }
        });
    } catch (err) {
        console.error("getOrCreateParentCredentials error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

// 3. UPDATE PARENT CREDENTIALS (Admin side)
exports.updateParentCredentials = async (req, res) => {
    try {
        const { studentId } = req.params;
        const { parent_name, parent_phone, password } = req.body;

        const student = await Student.findByPk(studentId, {
            include: [{ model: User, as: 'parent_user' }]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: "Talaba topilmadi." });
        }

        let parentUser = student.parent_user;
        const newPassword = password?.trim() || '123456';
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const newPhone = parent_phone?.trim() || student.parent_phone;
        const newName = parent_name?.trim() || student.parent_name || "Ota-ona";

        if (parentUser) {
            await parentUser.update({
                full_name: newName,
                phone: newPhone,
                hashed_password: hashedPassword,
                plain_password: newPassword,
                status: 'active'
            });
        } else {
            const defaultEmail = `parent_${student.id}@yuksalish.uz`;
            parentUser = await User.create({
                full_name: newName,
                phone: newPhone,
                email: defaultEmail,
                hashed_password: hashedPassword,
                plain_password: newPassword,
                role: 'PARENT',
                status: 'active',
                branch_id: student.branch_id || null
            });
            await student.update({ parent_user_id: parentUser.id });
        }

        // Student modelidagi parent_name va parent_phone ni ham yangilash
        await student.update({
            parent_name: newName,
            parent_phone: newPhone
        });

        return res.status(200).json({
            success: true,
            message: "Ota-ona kirish ma'lumotlari muvaffaqiyatli yangilandi!",
            data: {
                student_id: student.id,
                parent_user_id: parentUser.id,
                parent_name: parentUser.full_name,
                login: parentUser.phone || parentUser.email,
                phone: parentUser.phone,
                password: parentUser.plain_password
            }
        });
    } catch (err) {
        console.error("updateParentCredentials error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

