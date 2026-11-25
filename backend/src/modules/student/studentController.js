const { Student, User, Branch, Group, Course, GroupStudent } = require("../../models");
const { validateStudent } = require("./studentValidation");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");

const ensureParentAccount = async (student, parentName, parentPhone, parentPassword) => {
    if (!parentPhone && !student.parent_phone) return;
    try {
        const rawPhone = parentPhone || student.parent_phone;
        const cleanPhone = rawPhone ? rawPhone.replace(/\s+/g, '') : '';
        const defaultPassword = parentPassword?.trim() || '123456';
        const defaultEmail = `parent_${student.id}@yuksalish.uz`;

        let parentUser = null;
        if (student.parent_user_id) {
            parentUser = await User.findByPk(student.parent_user_id);
        }
        if (!parentUser && cleanPhone) {
            parentUser = await User.findOne({
                where: {
                    [Op.or]: [{ phone: cleanPhone }, { email: defaultEmail }]
                }
            });
        }

        const nameToUse = parentName || student.parent_name || 'Ota-ona';

        if (parentUser) {
            const updates = {};
            if (nameToUse && parentUser.full_name !== nameToUse) updates.full_name = nameToUse;
            if (cleanPhone && parentUser.phone !== cleanPhone) updates.phone = cleanPhone;
            if (parentPassword) {
                updates.hashed_password = await bcrypt.hash(parentPassword.trim(), 10);
                updates.plain_password = parentPassword.trim();
            }
            if (parentUser.role !== 'PARENT') updates.role = 'PARENT';
            if (Object.keys(updates).length > 0) {
                await parentUser.update(updates);
            }
        } else if (cleanPhone) {
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);
            parentUser = await User.create({
                full_name: nameToUse,
                phone: cleanPhone,
                email: defaultEmail,
                hashed_password: hashedPassword,
                plain_password: defaultPassword,
                role: 'PARENT',
                status: 'active',
                branch_id: student.branch_id || null
            });
        }

        if (parentUser && student.parent_user_id !== parentUser.id) {
            await student.update({ parent_user_id: parentUser.id });
        }
    } catch (e) {
        console.warn('ensureParentAccount warning:', e.message);
    }
};

const formatStudentData = (s) => {
    if (!s) return s;
    const data = s.toJSON ? s.toJSON() : { ...s };
    const primaryGS = data.group_students && data.group_students[0];
    if (!data.group_id && primaryGS?.group_id) {
        data.group_id = primaryGS.group_id;
    }
    if (!data.group && primaryGS?.group) {
        data.group = primaryGS.group;
    }
    if (!data.course_id && (primaryGS?.group?.course_id || data.group?.course_id)) {
        data.course_id = primaryGS?.group?.course_id || data.group?.course_id;
    }
    if (!data.course && (primaryGS?.group?.course || data.group?.course)) {
        data.course = primaryGS?.group?.course || data.group?.course;
    }
    return data;
};

const getStudentIncludes = () => [
    User ? { model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role", "avatar", "plain_password"] } : null,
    User ? { model: User, as: "parent_user", attributes: ["id", "full_name", "phone", "email", "plain_password"] } : null,
    Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address"] } : null,
    Group ? { model: Group, as: "group", attributes: ["id", "name", "days", "lesson_time", "course_id"] } : null,
    Course ? { model: Course, as: "course", attributes: ["id", "name", "price"] } : null,
    GroupStudent ? {
        model: GroupStudent,
        as: "group_students",
        include: Group ? [{
            model: Group,
            as: "group",
            attributes: ["id", "name", "days", "lesson_time", "course_id"],
            include: Course ? [{ model: Course, as: "course", attributes: ["id", "name"] }] : []
        }] : []
    } : null
].filter(Boolean);

// 1. Yangi o'quvchi qo'shish (Create)
exports.createStudent = async (req, res) => {
    const { error } = validateStudent(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const studentData = { ...req.body };

        // user_id mavjudligini tekshirish (404)
        const user = await User.findByPk(studentData.user_id);
        if (!user) {
            return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
        }

        // branch_id berilgan bo'lsa, mavjudligini tekshirish (404)
        if (studentData.branch_id) {
            const branch = await Branch.findByPk(studentData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        } else {
            studentData.branch_id = null;
        }

        // group_id yoki course_id bo'yicha mos guruhni topish
        let targetGroupId = studentData.group_id ? Number(studentData.group_id) : null;
        let targetCourseId = studentData.course_id ? Number(studentData.course_id) : null;

        if (!targetGroupId && targetCourseId && Group) {
            const matchedGroup = await Group.findOne({ where: { course_id: targetCourseId } });
            if (matchedGroup) {
                targetGroupId = matchedGroup.id;
            }
        } else if (targetGroupId && !targetCourseId && Group) {
            const grp = await Group.findByPk(targetGroupId);
            if (grp) {
                targetCourseId = grp.course_id;
            }
        }

        studentData.group_id = targetGroupId || null;
        studentData.course_id = targetCourseId || null;

        const student = await Student.create(studentData);

        // GroupStudent yaratish
        if (targetGroupId && GroupStudent) {
            await GroupStudent.create({
                group_id: targetGroupId,
                student_id: student.id,
                joined_at: student.joined_at || new Date(),
                status: student.status || 'active'
            }).catch((err) => console.warn('GroupStudent create warning:', err.message));
        }

        // Ota-ona uchun maxsus login/parol hisobini yaratish / bog'lash
        if (studentData.parent_phone) {
            await ensureParentAccount(student, studentData.parent_name, studentData.parent_phone, studentData.parent_password);
        }

        const fullStudent = await Student.findByPk(student.id, {
            include: getStudentIncludes()
        });

        res.status(201).send(formatStudentData(fullStudent || student));
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha o'quvchilarni olish (Read All)
exports.getStudent = async (req, res) => {
    try {
        const students = await Student.findAll({
            include: getStudentIncludes(),
            order: [['created_at', 'DESC']]
        });
        const formatted = students.map((s) => formatStudentData(s));
        res.status(200).send(formatted);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha o'quvchini olish (Read One)
exports.getStudentById = async (req, res) => {
    try {
        const student = await Student.findByPk(req.params.id, {
            include: getStudentIncludes()
        });
        if (!student) return res.status(404).send("Student not found");
        res.status(200).send(formatStudentData(student));
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. O'quvchi ma'lumotlarini yangilash (Update)
exports.updateStudent = async (req, res) => {
    const { error } = validateStudent(req.body, true);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const student = await Student.findByPk(req.params.id);
        if (!student) return res.status(404).send("Student not found");

        const updateData = { ...req.body };

        // user_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.user_id) {
            const user = await User.findByPk(updateData.user_id);
            if (!user) {
                return res.status(404).send("Belgilangan user_id ga ega foydalanuvchi topilmadi");
            }
        }

        // branch_id o'zgargan bo'lsa, tekshirish (404)
        if (updateData.branch_id) {
            const branch = await Branch.findByPk(updateData.branch_id);
            if (!branch) {
                return res.status(404).send("Belgilangan branch_id ga ega filial topilmadi");
            }
        }

        // Guruh va kursni hal qilish
        const { group_id, course_id } = updateData;
        let targetGroupId = group_id !== undefined ? (group_id ? Number(group_id) : null) : undefined;
        let targetCourseId = course_id !== undefined ? (course_id ? Number(course_id) : null) : undefined;

        if (targetCourseId && targetGroupId === undefined && Group) {
            const matchedGroup = await Group.findOne({ where: { course_id: targetCourseId } });
            if (matchedGroup) targetGroupId = matchedGroup.id;
        } else if (targetGroupId && targetCourseId === undefined && Group) {
            const grp = await Group.findByPk(targetGroupId);
            if (grp) targetCourseId = grp.course_id;
        }

        if (targetGroupId !== undefined) updateData.group_id = targetGroupId;
        if (targetCourseId !== undefined) updateData.course_id = targetCourseId;

        await student.update(updateData);

        // Agar status yoki branch_id o'zgargan bo'lsa, bog'liq User hisobini ham sinxronlash
        if (student.user_id && User) {
            const userSync = {};
            if (updateData.status) userSync.status = updateData.status;
            if (updateData.branch_id !== undefined) userSync.branch_id = updateData.branch_id;
            if (Object.keys(userSync).length > 0) {
                await User.update(userSync, { where: { id: student.user_id } }).catch(() => {});
            }
        }

        // GroupStudent ni sinxronlash
        const finalGroupId = targetGroupId !== undefined ? targetGroupId : student.group_id;
        if (finalGroupId && GroupStudent) {
            const existingEnrollment = await GroupStudent.findOne({ where: { student_id: student.id } });
            if (existingEnrollment) {
                await existingEnrollment.update({ group_id: finalGroupId, status: student.status || 'active' });
            } else {
                await GroupStudent.create({
                    group_id: finalGroupId,
                    student_id: student.id,
                    joined_at: student.joined_at || new Date(),
                    status: student.status || 'active'
                });
            }
        } else if (targetGroupId === null && GroupStudent) {
            await GroupStudent.destroy({ where: { student_id: student.id } });
        }

        // Ota-ona hisobini yangilash / sinxronlash
        if (updateData.parent_phone || updateData.parent_name || updateData.parent_password) {
            await ensureParentAccount(student, updateData.parent_name, updateData.parent_phone, updateData.parent_password);
        }

        const fullStudent = await Student.findByPk(student.id, {
            include: getStudentIncludes()
        });

        res.status(200).send(formatStudentData(fullStudent || student));
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. O'quvchini o'chirish (Delete)
exports.deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByPk(req.params.id);
        if (!student) return res.status(404).send("Student not found");

        const data = formatStudentData(student);
        const userId = student.user_id;

        // Bog'liq ma'lumotlarni tozalash
        const { Attendance: Att, Payment: Pmt, Invoice: Inv, Certificate: Cert, ExamResult: ER } = require("../../models");
        if (Att) await Att.destroy({ where: { student_id: student.id } }).catch(() => {});
        if (Pmt) await Pmt.destroy({ where: { student_id: student.id } }).catch(() => {});
        if (Inv) await Inv.destroy({ where: { student_id: student.id } }).catch(() => {});
        if (Cert) await Cert.destroy({ where: { student_id: student.id } }).catch(() => {});
        if (ER) await ER.destroy({ where: { student_id: student.id } }).catch(() => {});
        if (GroupStudent) {
            await GroupStudent.destroy({ where: { student_id: student.id } }).catch(() => {});
        }

        // Student profilini o'chirish
        await student.destroy();

        // O'quvchining asosiy User hisobini ham butunlay o'chirish (umuman login qila olmasligi uchun)
        if (userId && User) {
            await User.destroy({ where: { id: userId } }).catch(async () => {
                await User.update({ status: 'inactive' }, { where: { id: userId } }).catch(() => {});
            });
        }

        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. O'quvchilarni qidirish (Search)
exports.searchStudent = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const students = await Student.findAll({
            where: {
                [Op.or]: [
                    { parent_name: { [Op.iLike]: `%${query}%` } },
                    { parent_phone: { [Op.iLike]: `%${query}%` } },
                    { address: { [Op.iLike]: `%${query}%` } },
                    { education: { [Op.iLike]: `%${query}%` } },
                    { status: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: getStudentIncludes()
        });
        const formatted = students.map((s) => formatStudentData(s));
        res.status(200).send(formatted);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
