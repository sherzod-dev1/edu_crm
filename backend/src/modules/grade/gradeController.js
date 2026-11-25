const db = require('../../models');
const { StudentGrade, Student, Teacher, Group, Lesson, User, Notification, Course } = db;
const { Op } = require('sequelize');

const gradeController = {
    // 0. Get current authenticated student's coins
    async getMyCoins(req, res) {
        try {
            const userId = req.user?.id || req.query.user_id;
            if (!userId) {
                return res.status(400).json({ success: false, message: "Foydalanuvchi aniqlanmadi." });
            }

            const student = await Student.findOne({
                where: { user_id: userId },
                attributes: ['id', 'user_id', 'coins', 'status']
            });

            if (!student) {
                return res.status(404).json({ success: false, message: "Talaba profili topilmadi." });
            }

            return res.json({
                success: true,
                data: {
                    student_id: student.id,
                    coins: student.coins || 0
                }
            });
        } catch (error) {
            console.error('getMyCoins error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 1. Get grades for a specific group (with optional date)
    async getGroupGrades(req, res) {
        try {
            const { group_id, date } = req.query;
            if (!group_id) {
                return res.status(400).json({ success: false, message: "Guruh ID ko'rsatilishi shart." });
            }

            const where = { group_id };
            if (date) {
                where.date = date;
            }

            // Find all students in this group (from GroupStudent where status != 'left' OR Student where group_id = :group_id)
            let gsStudentIds = [];
            if (db.GroupStudent) {
                const gsRecords = await db.GroupStudent.findAll({
                    where: { group_id, status: { [Op.ne]: 'left' } },
                    attributes: ['student_id']
                }).catch(() => []);
                gsStudentIds = gsRecords.map(r => r.student_id);
            }

            const studentWhere = {
                [Op.or]: [
                    { group_id },
                    gsStudentIds.length > 0 ? { id: { [Op.in]: gsStudentIds } } : null
                ].filter(Boolean),
                status: { [Op.ne]: 'left' }
            };

            const students = await Student.findAll({
                where: studentWhere,
                include: [
                    { model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] }
                ],
                order: [['id', 'ASC']]
            });

            // Find all grades for this group
            const grades = await StudentGrade.findAll({
                where,
                include: [
                    { model: Student, as: 'student', include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] },
                    { model: Teacher, as: 'teacher', include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] }
                ],
                order: [['date', 'DESC'], ['id', 'ASC']]
            });

            return res.json({
                success: true,
                data: {
                    students,
                    grades
                }
            });
        } catch (error) {
            console.error('getGroupGrades error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 2. Save single grade (or update)
    async saveGrade(req, res) {
        const t = await db.sequelize.transaction();
        try {
            const { student_id, student_name, group_id, teacher_id, date, type, score, coins, comment, lesson_id } = req.body;

            if ((!student_id && !student_name) || !group_id || !type || score === undefined) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Barcha majburiy maydonlarni to'ldiring." });
            }

            const effectiveDate = date || new Date().toISOString().slice(0, 10);
            const numScore = Math.min(100, Math.max(0, parseInt(score, 10) || 0));
            // 100 balli tizimda monetlar: agar alohida coins berilsa shu olinadi, aks holda har 10 ballga 1 monet (yoki 10 gacha ball bo'lsa to'liq ball)
            const coinsEarned = coins !== undefined ? parseInt(coins, 10) : (numScore <= 10 ? numScore : Math.round(numScore / 10));

            // Permission check: Talabalar baho qo'ya olmaydi! O'qituvchilar va ma'muriyat baholay oladi.
            const callerRole = (req.user?.role || '').toUpperCase();
            if (callerRole === 'STUDENT' || callerRole === 'TALABA') {
                await t.rollback();
                return res.status(403).json({
                    success: false,
                    message: "Talabalar baholash huquqiga ega emas."
                });
            }

            // Resolve Group
            let grp = null;
            const numericGroupId = parseInt(group_id, 10);
            if (!isNaN(numericGroupId)) {
                grp = await Group.findByPk(numericGroupId, {
                    include: [{ model: Teacher, as: 'teacher' }],
                    transaction: t
                });
            }
            if (!grp && typeof group_id === 'string') {
                grp = await Group.findOne({
                    where: { name: { [Op.iLike]: `%${group_id.replace(/[-_]/g, ' ').trim()}%` } },
                    include: [{ model: Teacher, as: 'teacher' }],
                    transaction: t
                });
            }
            if (!grp) {
                grp = await Group.findOne({ transaction: t });
            }
            const actualGroupId = grp ? grp.id : (numericGroupId || 12);

            // Resolve Teacher
            const teacherRecord = await Teacher.findOne({ where: { user_id: req.user?.id }, transaction: t });
            let validTeacherId = teacher_id || (teacherRecord ? teacherRecord.id : (grp ? grp.teacher_id : null));

            // Resolve valid created_by
            let validCreatedBy = null;
            if (req.user?.id) {
                const uExists = await User.findByPk(req.user.id, { transaction: t });
                if (uExists) validCreatedBy = uExists.id;
            }

            // Resolve Student
            let student = null;
            const numericStudentId = parseInt(student_id, 10);
            if (!isNaN(numericStudentId)) {
                student = await Student.findByPk(numericStudentId, {
                    include: [{ model: User, as: 'user' }],
                    transaction: t
                });
            }
            if (!student && student_name) {
                const cleanName = student_name.trim();
                const u = await User.findOne({
                    where: {
                        [Op.or]: [
                            { full_name: { [Op.iLike]: `%${cleanName}%` } },
                            { full_name: { [Op.iLike]: `%${cleanName.split(' ')[0]}%` } }
                        ]
                    },
                    transaction: t
                });
                if (u) {
                    student = await Student.findOne({
                        where: { user_id: u.id },
                        include: [{ model: User, as: 'user' }],
                        transaction: t
                    });
                }
            }
            if (!student) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Talaba profili topilmadi." });
            }

            // Talabaning haqiqatan ham ushbu guruhga a'zo ekanligini qat'iy tekshirish
            let isMemberOfGroup = (student.group_id && String(student.group_id) === String(actualGroupId));
            if (!isMemberOfGroup && db.GroupStudent) {
                const gsCheck = await db.GroupStudent.findOne({
                    where: { group_id: actualGroupId, student_id: student.id, status: { [Op.ne]: 'left' } },
                    transaction: t
                });
                if (gsCheck) isMemberOfGroup = true;
            }
            if (!isMemberOfGroup) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Talaba ushbu guruhga a'zo emas." });
            }

            // Check if grade already exists for this student on this date and type
            let existing = await StudentGrade.findOne({
                where: {
                    student_id: student.id,
                    group_id: actualGroupId,
                    date: effectiveDate,
                    type
                },
                transaction: t
            });

            let diff = coinsEarned;
            if (existing) {
                diff = coinsEarned - existing.coins;
                existing.score = numScore;
                existing.coins = coinsEarned;
                existing.comment = comment || existing.comment;
                if (validTeacherId) existing.teacher_id = validTeacherId;
                if (lesson_id) existing.lesson_id = lesson_id;
                existing.created_by = validCreatedBy || existing.created_by;
                await existing.save({ transaction: t });
            } else {
                existing = await StudentGrade.create({
                    student_id: student.id,
                    group_id: actualGroupId,
                    teacher_id: validTeacherId || null,
                    lesson_id: lesson_id || null,
                    date: effectiveDate,
                    type,
                    score: numScore,
                    coins: coinsEarned,
                    comment: comment || null,
                    created_by: validCreatedBy || null,
                }, { transaction: t });
            }

            // Update student coins in database
            const newTotalCoins = Math.max(0, (student.coins || 0) + diff);
            student.coins = newTotalCoins;
            await student.save({ transaction: t });

            // Send notification to student if coins were awarded
            if (diff > 0 && student.user_id && Notification) {
                const typeText = type === 'homework' ? 'Uy vazifasi' : "Darsdagi mashg'ulot";
                await Notification.create({
                    user_id: student.user_id,
                    title: `🪙 +${coinsEarned} Monet qo'shildi!`,
                    message: `Sizga ${typeText} uchun ${numScore} ball qo'yildi va hisobingizga +${coinsEarned} monet qo'shildi! Joriy balansingiz: ${newTotalCoins} monet.`,
                    type: 'success',
                    is_read: false
                }, { transaction: t }).catch(() => {});
            }

            await t.commit();

            return res.json({
                success: true,
                message: "Baho va monetlar ma'lumotlar bazasida muvaffaqiyatli saqlandi.",
                data: {
                    grade: existing,
                    student_id: student.id,
                    student_name: student.user?.full_name || student_name,
                    student_coins: newTotalCoins,
                    score: numScore,
                    coins: coinsEarned
                }
            });
        } catch (error) {
            await t.rollback();
            console.error('saveGrade error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 3. Bulk save grades for the whole group on a given date
    async bulkSaveGrades(req, res) {
        const t = await db.sequelize.transaction();
        try {
            const { group_id, teacher_id, date, grades } = req.body;

            if (!group_id || !date || !Array.isArray(grades)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Guruh, sana va baholar ro'yxati talab qilinadi." });
            }

            // Permission check: Talabalar baho qo'ya olmaydi! O'qituvchilar va ma'muriyat baholay oladi.
            const callerRole = (req.user?.role || '').toUpperCase();
            if (callerRole === 'STUDENT' || callerRole === 'TALABA') {
                await t.rollback();
                return res.status(403).json({
                    success: false,
                    message: "Talabalar baholash huquqiga ega emas."
                });
            }

            // Resolve Group
            let grp = null;
            const numericGroupId = parseInt(group_id, 10);
            if (!isNaN(numericGroupId)) {
                grp = await Group.findByPk(numericGroupId, {
                    include: [{ model: Teacher, as: 'teacher' }],
                    transaction: t
                });
            }
            if (!grp && typeof group_id === 'string') {
                grp = await Group.findOne({
                    where: { name: { [Op.iLike]: `%${group_id.replace(/[-_]/g, ' ').trim()}%` } },
                    include: [{ model: Teacher, as: 'teacher' }],
                    transaction: t
                });
            }
            if (!grp) {
                grp = await Group.findOne({ transaction: t });
            }
            const actualGroupId = grp ? grp.id : (numericGroupId || 12);

            const teacherRecord = await Teacher.findOne({ where: { user_id: req.user?.id }, transaction: t });
            let validTeacherId = teacher_id || (teacherRecord ? teacherRecord.id : (grp ? grp.teacher_id : null));

            // Resolve valid created_by
            let validCreatedBy = null;
            if (req.user?.id) {
                const uExists = await User.findByPk(req.user.id, { transaction: t });
                if (uExists) validCreatedBy = uExists.id;
            }

            const results = [];

            for (const item of grades) {
                const { student_id, student_name, homework_score, activity_score, homework_comment, activity_comment } = item;
                if (!student_id && !student_name) continue;

                let student = null;
                const numericStudentId = parseInt(student_id, 10);
                if (!isNaN(numericStudentId)) {
                    student = await Student.findByPk(numericStudentId, {
                        include: [{ model: User, as: 'user' }],
                        transaction: t
                    });
                }
                if (!student && student_name) {
                    const cleanName = student_name.trim();
                    const u = await User.findOne({
                        where: {
                            [Op.or]: [
                                { full_name: { [Op.iLike]: `%${cleanName}%` } },
                                { full_name: { [Op.iLike]: `%${cleanName.split(' ')[0]}%` } }
                            ]
                        },
                        transaction: t
                    });
                    if (u) {
                        student = await Student.findOne({
                            where: { user_id: u.id },
                            include: [{ model: User, as: 'user' }],
                            transaction: t
                        });
                    }
                }
                if (!student) continue;

                // Talaba haqiqatan ham ushbu guruhga a'zo ekanligini tekshirish
                let isMemberOfGroup = (student.group_id && String(student.group_id) === String(actualGroupId));
                if (!isMemberOfGroup && db.GroupStudent) {
                    const gsCheck = await db.GroupStudent.findOne({
                        where: { group_id: actualGroupId, student_id: student.id, status: { [Op.ne]: 'left' } },
                        transaction: t
                    });
                    if (gsCheck) isMemberOfGroup = true;
                }
                if (!isMemberOfGroup) continue;

                let studentCoinChange = 0;

                // Process homework grade if provided
                if (homework_score !== undefined && homework_score !== null && homework_score !== '') {
                    const hwScore = Math.min(100, Math.max(0, parseInt(homework_score, 10) || 0));
                    const hwCoins = hwScore <= 10 ? hwScore : Math.round(hwScore / 10);

                    const existingHw = await StudentGrade.findOne({
                        where: { student_id: student.id, group_id: actualGroupId, date, type: 'homework' },
                        transaction: t
                    });

                    if (existingHw) {
                        studentCoinChange += (hwCoins - existingHw.coins);
                        existingHw.score = hwScore;
                        existingHw.coins = hwCoins;
                        existingHw.comment = homework_comment || existingHw.comment;
                        if (validTeacherId) existingHw.teacher_id = validTeacherId;
                        existingHw.created_by = validCreatedBy || existingHw.created_by;
                        await existingHw.save({ transaction: t });
                        results.push(existingHw);
                    } else {
                        studentCoinChange += hwCoins;
                        const createdHw = await StudentGrade.create({
                            student_id: student.id,
                            group_id: actualGroupId,
                            teacher_id: validTeacherId || null,
                            date,
                            type: 'homework',
                            score: hwScore,
                            coins: hwCoins,
                            comment: homework_comment || null,
                            created_by: validCreatedBy || null
                        }, { transaction: t });
                        results.push(createdHw);
                    }
                }

                // Process activity grade if provided
                if (activity_score !== undefined && activity_score !== null && activity_score !== '') {
                    const actScore = Math.min(100, Math.max(0, parseInt(activity_score, 10) || 0));
                    const actCoins = actScore <= 10 ? actScore : Math.round(actScore / 10);

                    const existingAct = await StudentGrade.findOne({
                        where: { student_id: student.id, group_id: actualGroupId, date, type: 'activity' },
                        transaction: t
                    });

                    if (existingAct) {
                        studentCoinChange += (actCoins - existingAct.coins);
                        existingAct.score = actScore;
                        existingAct.coins = actCoins;
                        existingAct.comment = activity_comment || existingAct.comment;
                        if (validTeacherId) existingAct.teacher_id = validTeacherId;
                        existingAct.created_by = validCreatedBy || existingAct.created_by;
                        await existingAct.save({ transaction: t });
                        results.push(existingAct);
                    } else {
                        studentCoinChange += actCoins;
                        const createdAct = await StudentGrade.create({
                            student_id: student.id,
                            group_id: actualGroupId,
                            teacher_id: validTeacherId || null,
                            date,
                            type: 'activity',
                            score: actScore,
                            coins: actCoins,
                            comment: activity_comment || null,
                            created_by: validCreatedBy || null
                        }, { transaction: t });
                        results.push(createdAct);
                    }
                }

                // Apply coin change to student
                if (studentCoinChange !== 0) {
                    const updatedCoins = Math.max(0, (student.coins || 0) + studentCoinChange);
                    student.coins = updatedCoins;
                    await student.save({ transaction: t });

                    if (studentCoinChange > 0 && student.user_id && Notification) {
                        await Notification.create({
                            user_id: student.user_id,
                            title: `🪙 +${studentCoinChange} Yangi Monetlar!`,
                            message: `${date} kungi dars va vazifalar uchun baholandingiz: hisobingizga +${studentCoinChange} monet qo'shildi! Jami balansingiz: ${updatedCoins} monet.`,
                            type: 'success',
                            is_read: false
                        }, { transaction: t }).catch(() => {});
                    }
                }
            }

            await t.commit();

            return res.json({
                success: true,
                message: "Barcha talabalar baholari va monetlari muvaffaqiyatli saqlandi.",
                data: results
            });
        } catch (error) {
            await t.rollback();
            console.error('bulkSaveGrades error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 4. Get all grades for Admin with full details and filters
    async getAllGradesForAdmin(req, res) {
        try {
            const { group_id, teacher_id, type, date, search, limit = 100, page = 1 } = req.query;

            const where = {};
            if (group_id) where.group_id = group_id;
            if (teacher_id) where.teacher_id = teacher_id;
            if (type) where.type = type;
            if (date) where.date = date;

            const offset = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);

            const { rows: grades, count } = await StudentGrade.findAndCountAll({
                where,
                include: [
                    {
                        model: Student,
                        as: 'student',
                        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone'] }]
                    },
                    {
                        model: Teacher,
                        as: 'teacher',
                        include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }]
                    },
                    {
                        model: Group,
                        as: 'group',
                        attributes: ['id', 'name', 'course_id']
                    }
                ],
                order: [['date', 'DESC'], ['id', 'DESC']],
                limit: parseInt(limit, 10),
                offset
            });

            return res.json({
                success: true,
                data: grades,
                total: count,
                page: parseInt(page, 10),
                limit: parseInt(limit, 10)
            });
        } catch (error) {
            console.error('getAllGradesForAdmin error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 5. Get student grades history (for student view or profile)
    async getStudentGrades(req, res) {
        try {
            const { student_id } = req.params;
            let targetStudentId = student_id || req.query.student_id;

            const callerRole = (req.user?.role || '').toUpperCase();
            const callerUserId = req.user?.id;

            // Agar so'rov yuborgan foydalanuvchi TALABA bo'lsa:
            // Talaba faqat va faqat o'zining baholarini ko'ra oladi!
            if (callerRole === 'STUDENT' || callerRole === 'TALABA' || !targetStudentId) {
                const selfStudent = await Student.findOne({ where: { user_id: callerUserId } });
                if (!selfStudent) {
                    return res.status(404).json({ success: false, message: "Talaba profili topilmadi." });
                }
                targetStudentId = selfStudent.id;
            }

            const student = await Student.findByPk(targetStudentId, {
                include: [
                    { model: User, as: 'user', attributes: ['id', 'full_name', 'email', 'phone'] },
                    { model: Group, as: 'group', attributes: ['id', 'name'] }
                ]
            });

            if (!student) {
                return res.status(404).json({ success: false, message: "Talaba topilmadi." });
            }

            // Studentning haqiqiy a'zo bo'lgan guruhlari
            const enrolledGroupIds = new Set();
            if (student.group_id) {
                enrolledGroupIds.add(student.group_id);
            }
            if (db.GroupStudent) {
                const gsList = await db.GroupStudent.findAll({
                    where: { student_id: targetStudentId, status: { [Op.ne]: 'left' } },
                    attributes: ['group_id']
                });
                gsList.forEach((gs) => {
                    if (gs.group_id) enrolledGroupIds.add(gs.group_id);
                });
            }

            const enrolledGroupIdsArr = Array.from(enrolledGroupIds);

            // Agar talaba hech qanday guruhga a'zo bo'lmasa, begona baholar chiqmasin
            if (enrolledGroupIdsArr.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        student: {
                            id: student.id,
                            full_name: student.user?.full_name,
                            coins: student.coins || 0,
                            group_name: student.group?.name || 'IT kids',
                            total_earned: 0,
                            total_grades: 0,
                            avg_score: "0.0"
                        },
                        grades: []
                    }
                });
            }

            const { course_id } = req.query;
            const groupWhere = {
                id: { [Op.in]: enrolledGroupIdsArr }
            };
            if (course_id) {
                groupWhere.course_id = course_id;
            }

            const grades = await StudentGrade.findAll({
                where: {
                    student_id: targetStudentId,
                    group_id: { [Op.in]: enrolledGroupIdsArr }
                },
                include: [
                    {
                        model: Group,
                        as: 'group',
                        attributes: ['id', 'name', 'course_id'],
                        where: groupWhere,
                        required: true,
                        include: Course ? [{ model: Course, as: 'course', attributes: ['id', 'name'] }] : []
                    },
                    { model: Teacher, as: 'teacher', include: [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] }
                ],
                order: [['date', 'DESC'], ['id', 'DESC']]
            });

            const totalCoinsEarned = grades.reduce((acc, g) => acc + (g.coins || 0), 0);
            const totalScore = grades.reduce((acc, g) => acc + (Number(g.score) || 0), 0);
            const avgScore = grades.length > 0 ? (totalScore / grades.length).toFixed(1) : "0.0";

            return res.json({
                success: true,
                data: {
                    student: {
                        id: student.id,
                        full_name: student.user?.full_name,
                        coins: student.coins || 0,
                        group_name: student.group?.name || 'IT kids',
                        total_earned: totalCoinsEarned,
                        total_grades: grades.length,
                        avg_score: avgScore
                    },
                    grades
                }
            });
        } catch (error) {
            console.error('getStudentGrades error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    },

    // 6. Leaderboard (Top students by coins) - Faqat o'qituvchilar va ma'muriyat uchun
    async getLeaderboard(req, res) {
        try {
            const callerRole = (req.user?.role || '').toUpperCase();
            if (callerRole === 'STUDENT') {
                return res.status(403).json({ success: false, message: "Talaba profilida boshqalarning ma'lumotlari ko'rinmaydi." });
            }

            const students = await Student.findAll({
                include: [
                    { model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] },
                    { model: Group, as: 'group', attributes: ['id', 'name'] }
                ],
                order: [['coins', 'DESC']],
                limit: 30
            });

            return res.json({
                success: true,
                data: students.map((s, idx) => ({
                    rank: idx + 1,
                    student_id: s.id,
                    user_id: s.user?.id,
                    full_name: s.user?.full_name || `Talaba #${s.id}`,
                    group_name: s.group?.name || 'Guruhsiz',
                    coins: s.coins || 0
                }))
            });
        } catch (error) {
            console.error('getLeaderboard error:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};

module.exports = gradeController;

