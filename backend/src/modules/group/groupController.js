const { Group, Course, Teacher, Branch, Classroom, User, Lesson, Attendance, GroupStudent, Student, Invoice, Exam } = require("../../models");
const { validateGroup } = require("./groupValidation");
const { Op } = require("sequelize");
const { syncGroupLessons } = require("../../syncCoursesToGroups");

// Dars vaqtini tahlil qiluvchi yordamchi funksiya
const parseLessonTime = (str) => {
    if (!str || typeof str !== 'string') return { startTime: null, endTime: null, formatted: null };
    const matches = str.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g);
    if (matches && matches.length >= 2) {
        const start = matches[0].replace('.', ':');
        const end = matches[1].replace('.', ':');
        const startPad = start.length === 4 ? `0${start}` : start;
        const endPad = end.length === 4 ? `0${end}` : end;
        return {
            startTime: `${startPad}:00`,
            endTime: `${endPad}:00`,
            formatted: `${startPad} - ${endPad}`
        };
    } else if (matches && matches.length === 1) {
        const start = matches[0].replace('.', ':');
        const startPad = start.length === 4 ? `0${start}` : start;
        const [h, m] = startPad.split(':').map(Number);
        const endH = String((h + 2) % 24).padStart(2, '0');
        const endM = String(m || 0).padStart(2, '0');
        return {
            startTime: `${startPad}:00`,
            endTime: `${endH}:${endM}:00`,
            formatted: `${startPad} - ${endH}:${endM}`
        };
    }
    return { startTime: null, endTime: null, formatted: str.trim() };
};

const getDayCategory = (daysStr) => {
    if (!daysStr) return 'unknown';
    const s = String(daysStr).toLowerCase();
    if (s.includes('har kuni') || s.includes('everyday') || s.includes('daily') || s.includes('barcha')) return 'everyday';
    if (s.includes('even') || s.includes('juft') || s.includes('se') || s.includes('pay') || s.includes('shan')) return 'even';
    if (s.includes('odd') || s.includes('toq') || s.includes('du') || s.includes('chor') || s.includes('jum')) return 'odd';
    return 'unknown';
};

const doDaysOverlap = (daysA, daysB) => {
    const catA = getDayCategory(daysA);
    const catB = getDayCategory(daysB);
    if (catA === 'everyday' || catB === 'everyday') return true;
    if (catA === 'odd' && catB === 'odd') return true;
    if (catA === 'even' && catB === 'even') return true;
    return false;
};

// 1. Yangi guruh yaratish (Create)
exports.createGroup = async (req, res) => {
    const { error } = validateGroup(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const groupData = { ...req.body };

        // course_id mavjudligini tekshirish (404)
        const course = await Course.findByPk(groupData.course_id);
        if (!course) {
            return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
        }

        if (!groupData.name || !groupData.name.trim()) {
            groupData.name = course ? course.name : 'Yangi Guruh';
        }

        // teacher_id berilgan bo'lsa tekshirish (404)
        if (groupData.teacher_id) {
            const teacher = await Teacher.findByPk(groupData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        } else {
            groupData.teacher_id = null;
        }

        // branch_id berilgan bo'lsa tekshirish (404)
        if (groupData.branch_id) {
            const branch = await Branch.findByPk(groupData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            groupData.branch_id = null;
        }

        if (groupData.lesson_time) {
            const { startTime, endTime, formatted } = parseLessonTime(groupData.lesson_time);
            if (startTime && !groupData.start_time) groupData.start_time = startTime;
            if (endTime && !groupData.end_time) groupData.end_time = endTime;
            if (formatted) groupData.lesson_time = formatted;
        } else if (groupData.start_time && groupData.end_time) {
            groupData.lesson_time = `${String(groupData.start_time).slice(0, 5)} - ${String(groupData.end_time).slice(0, 5)}`;
        } else if (!groupData.start_time && groupData.days) {
            const parsed = parseLessonTime(groupData.days);
            if (parsed.startTime) {
                groupData.start_time = parsed.startTime;
                if (!groupData.end_time && parsed.endTime) groupData.end_time = parsed.endTime;
                if (!groupData.lesson_time && parsed.formatted) groupData.lesson_time = parsed.formatted;
            }
        }

        if (!groupData.opening_date) {
            groupData.opening_date = new Date().toISOString().split('T')[0];
        }
        if (!groupData.start_date) {
            groupData.start_date = groupData.opening_date;
        }

        // O'qituvchining boshqa guruhlari bilan to'qnashuvni tekshirish
        if (groupData.teacher_id && groupData.days && groupData.start_time && groupData.end_time) {
            const otherGroups = await Group.findAll({
                where: {
                    teacher_id: groupData.teacher_id,
                    status: { [Op.ne]: 'archived' }
                }
            });

            for (const og of otherGroups) {
                if (og.days && og.start_time && og.end_time) {
                    if (doDaysOverlap(groupData.days, og.days)) {
                        if (groupData.start_time < og.end_time && groupData.end_time > og.start_time) {
                            const sB = String(og.start_time).slice(0, 5);
                            const eB = String(og.end_time).slice(0, 5);
                            return res.status(400).send(
                                `O'qituvchining bu kunlarda soat ${sB} - ${eB} da boshqa guruhi mavjud (${og.name})! Iltimos, o'qituvchi bo'sh bo'lgan boshqa vaqtni tanlang.`
                            );
                        }
                    }
                }
            }
        }

        const group = await Group.create(groupData);
        // Dars jadvalini avtomatik shakllantirish
        syncGroupLessons(group).catch(() => {});
        res.status(201).send(group);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha guruhlarni olish (Read All)
exports.getGroup = async (req, res) => {
    try {
        const groups = await Group.findAll({
            include: [
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "user_id", "specialization", "salary_type"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "capacity", "floor"] } : null,
                GroupStudent ? {
                    model: GroupStudent,
                    as: "group_students",
                    include: Student ? [{
                        model: Student,
                        as: "student",
                        attributes: ["id", "parent_name", "parent_phone", "status"],
                        include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                    }] : []
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        const formattedGroups = groups.map((g) => {
            const data = g.toJSON();
            if (!data.lesson_time && data.start_time) {
                const s = String(data.start_time).slice(0, 5);
                const e = data.end_time ? String(data.end_time).slice(0, 5) : '';
                data.lesson_time = e ? `${s} - ${e}` : s;
            }
            data.students_count = Array.isArray(data.group_students) ? data.group_students.length : 0;
            return data;
        });
        res.status(200).send(formattedGroups);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta guruhni olish (Read One)
exports.getGroupById = async (req, res) => {
    try {
        const group = await Group.findByPk(req.params.id, {
            include: [
                Course ? { model: Course, as: "course", attributes: ["id", "name", "slug", "price"] } : null,
                Teacher ? { 
                    model: Teacher, 
                    as: "teacher", 
                    attributes: ["id", "user_id", "specialization", "salary_type"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
                Classroom ? { model: Classroom, as: "classroom", attributes: ["id", "name", "capacity", "floor"] } : null,
                GroupStudent ? {
                    model: GroupStudent,
                    as: "group_students",
                    include: Student ? [{
                        model: Student,
                        as: "student",
                        attributes: ["id", "parent_name", "parent_phone", "status"],
                        include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                    }] : []
                } : null
            ].filter(Boolean)
        });
        if (!group) return res.status(404).send("Group not found");
        const data = group.toJSON();
        if (!data.lesson_time && data.start_time) {
            const s = String(data.start_time).slice(0, 5);
            const e = data.end_time ? String(data.end_time).slice(0, 5) : '';
            data.lesson_time = e ? `${s} - ${e}` : s;
        }
        data.students_count = Array.isArray(data.group_students) ? data.group_students.length : 0;
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Guruh ma'lumotlarini yangilash (Update)
exports.updateGroup = async (req, res) => {
    const { error } = validateGroup(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const group = await Group.findByPk(req.params.id);
        if (!group) return res.status(404).send("Group not found");

        const updateData = { ...req.body };

        // course_id o'zgargan bo'lsa tekshirish
        if (updateData.course_id) {
            const course = await Course.findByPk(updateData.course_id);
            if (!course) {
                return res.status(404).send("Belgilangan course_id ga ega kurs topilmadi");
            }
        }

        // teacher_id o'zgargan bo'lsa tekshirish
        if (updateData.teacher_id) {
            const teacher = await Teacher.findByPk(updateData.teacher_id);
            if (!teacher) {
                return res.status(404).send("Belgilangan teacher_id ga ega o'qituvchi topilmadi");
            }
        }

        // branch_id o'zgargan bo'lsa tekshirish
        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        if (updateData.lesson_time) {
            const { startTime, endTime, formatted } = parseLessonTime(updateData.lesson_time);
            if (startTime) updateData.start_time = startTime;
            if (endTime) updateData.end_time = endTime;
            if (formatted) updateData.lesson_time = formatted;
        } else if (updateData.start_time && updateData.end_time) {
            updateData.lesson_time = `${String(updateData.start_time).slice(0, 5)} - ${String(updateData.end_time).slice(0, 5)}`;
        } else if (!updateData.start_time && updateData.days) {
            const parsed = parseLessonTime(updateData.days);
            if (parsed.startTime) {
                updateData.start_time = parsed.startTime;
                if (!updateData.end_time && parsed.endTime) updateData.end_time = parsed.endTime;
                if (!updateData.lesson_time && parsed.formatted) updateData.lesson_time = parsed.formatted;
            }
        }

        const finalTeacherId = updateData.teacher_id !== undefined ? updateData.teacher_id : group.teacher_id;
        const finalDays = updateData.days !== undefined ? updateData.days : group.days;
        const finalStart = updateData.start_time !== undefined ? updateData.start_time : group.start_time;
        const finalEnd = updateData.end_time !== undefined ? updateData.end_time : group.end_time;

        if (finalTeacherId && finalDays && finalStart && finalEnd) {
            const otherGroups = await Group.findAll({
                where: {
                    id: { [Op.ne]: group.id },
                    teacher_id: finalTeacherId,
                    status: { [Op.ne]: 'archived' }
                }
            });

            for (const og of otherGroups) {
                if (og.days && og.start_time && og.end_time) {
                    if (doDaysOverlap(finalDays, og.days)) {
                        if (finalStart < og.end_time && finalEnd > og.start_time) {
                            const sB = String(og.start_time).slice(0, 5);
                            const eB = String(og.end_time).slice(0, 5);
                            return res.status(400).send(
                                `O'qituvchining bu kunlarda soat ${sB} - ${eB} da boshqa guruhi mavjud (${og.name})! Iltimos, o'qituvchi bo'sh bo'lgan boshqa vaqtni tanlang.`
                            );
                        }
                    }
                }
            }
        }

        await group.update(updateData);
        // Dars jadvalini avtomatik yangilash
        syncGroupLessons(group).catch(() => {});
        res.status(200).send(group);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Guruhni o'chirish (Delete)
exports.deleteGroup = async (req, res) => {
    const t = await Group.sequelize.transaction();
    try {
        const group = await Group.findByPk(req.params.id, { transaction: t });
        if (!group) {
            await t.rollback();
            return res.status(404).json({ message: "Guruh topilmadi" });
        }

        const groupId = group.id;

        // 1. Darslar va ularning davomatlarini tozalash
        if (Lesson) {
            const lessons = await Lesson.findAll({
                where: { group_id: groupId },
                attributes: ['id'],
                transaction: t
            });
            const lessonIds = lessons.map(l => l.id);

            // Darslar davomatini o'chirish
            if (Attendance && lessonIds.length > 0) {
                await Attendance.destroy({
                    where: { lesson_id: lessonIds },
                    transaction: t
                });
            }

            // Darslarni o'chirish
            await Lesson.destroy({
                where: { group_id: groupId },
                transaction: t
            });
        }

        // 2. Guruhdagi talabalarni chiqarish (group_students)
        if (GroupStudent) {
            await GroupStudent.destroy({
                where: { group_id: groupId },
                transaction: t
            });
        }

        // 3. Invoyslardagi group_id ni null qilish
        if (Invoice) {
            await Invoice.update(
                { group_id: null },
                { where: { group_id: groupId }, transaction: t }
            );
        }

        // 4. Imtihonlardagi group_id ni null qilish
        if (Exam) {
            await Exam.update(
                { group_id: null },
                { where: { group_id: groupId }, transaction: t }
            );
        }

        // 5. Guruhni o'chirish
        const data = group.toJSON();
        await group.destroy({ transaction: t });

        await t.commit();
        res.status(200).json(data);
    } catch (err) {
        await t.rollback();
        console.error("deleteGroup error:", err);
        res.status(500).json({ message: err.message || "Guruhni o'chirishda xatolik yuz berdi" });
    }
};

// 6. Guruhlarni qidirish (Search)
exports.searchGroup = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const groups = await Group.findAll({
            where: {
                [Op.or]: [
                    { name: { [Op.iLike]: `%${query}%` } },
                    { days: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Course ? { model: Course, as: "course", attributes: ["id", "name"] } : null,
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(groups);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
