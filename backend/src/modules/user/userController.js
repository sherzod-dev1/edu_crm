const { User, Branch, Teacher, Student, Employee } = require("../../models");
const { validateUser } = require("./userValidation");

const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { createTokens, hashToken } = require("../../utils/auth");


exports.createUser = async (req, res) => {
    const { error } = validateUser(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const { email, role, branch_id } = req.body;
        if (email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: "Ushbu email allaqachon ro'yxatdan o'tgan. Iltimos, boshqa email kiriting." });
            }
        }

        if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') {
            const superAdminExists = await User.findOne({
                where: { role: { [Op.in]: ['SUPER_ADMIN', 'SUPERADMIN'] } }
            });
            if (superAdminExists) {
                return res.status(403).json({
                    message: "Tizimda faqat 1 ta Super Admin (Sayt yaratuvchisi) bo'lishi mumkin!"
                });
            }
        }

        // Har 1 ta filialda faqat 1 ta ADMIN bo'lishini ta'minlash
        if (role === 'ADMIN' && branch_id) {
            const existingBranchAdmin = await User.findOne({
                where: {
                    branch_id: branch_id,
                    role: 'ADMIN'
                }
            });
            if (existingBranchAdmin) {
                return res.status(400).json({
                    message: `Ushbu filialda allaqachon administrator (${existingBranchAdmin.full_name}) mavjud! Har bir filialda faqat 1 ta admin bo'lishi mumkin.`
                });
            }
        }

        const rawPassword = req.body.password || req.body.hashed_password || req.body.plain_password || 'admin123';
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const user = await User.create({
            ...req.body,
            hashed_password: hashedPassword,
            plain_password: rawPassword,
        });

        if (req.body.branch_id && Branch) {
            const branch = await Branch.findByPk(req.body.branch_id);
            if (branch) {
                const branchUpdate = {};
                if (req.body.plan) branchUpdate.plan = req.body.plan;
                if (req.body.max_students) branchUpdate.max_students = Number(req.body.max_students);
                if (req.body.center_name) branchUpdate.name = req.body.center_name;
                if (Object.keys(branchUpdate).length > 0) {
                    await branch.update(branchUpdate);
                }
            }
        }

        // Agar yangi ADMIN yaratilsa, avtomatik Super Admin bilan shartnoma shakllantirish
        if (role === 'ADMIN') {
            try {
                const { Contract } = require("../../models");
                if (Contract) {
                    const today = new Date().toISOString().split('T')[0];
                    const nextMonth = new Date();
                    nextMonth.setMonth(nextMonth.getMonth() + 1);
                    const endDate = nextMonth.toISOString().split('T')[0];

                    let adminPlan = 'Standart';
                    if ((req.body.plan || '').toLowerCase() === 'starter') adminPlan = 'Starter';
                    if ((req.bodyт.plan || '').toLowerCase() === 'premium') adminPlan = 'Premium';
                    const monthlyAmount = adminPlan === 'Starter' ? 800000.00 : adminPlan === 'Premium' ? 1800000.00 : 1200000.00;

                    const superAdmin = await User.findOne({
                        where: { role: { [Op.in]: ['SUPER_ADMIN', 'SUPERADMIN'] } }
                    });

                    await Contract.create({
                        contract_number: `EDU-SH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
                        admin_id: user.id,
                        super_admin_id: superAdmin?.id || null,
                        branch_id: user.branch_id || null,
                        center_name: req.body.center_name || user.full_name,
                        plan: adminPlan,
                        monthly_amount: monthlyAmount,
                        start_date: today,
                        end_date: endDate,
                        billing_cycle: "Oylik to'lov",
                        status: 'active',
                        payment_status: 'paid',
                        auto_renew: true,
                        terms: "EDU CRM tizimidan oylik foydalanish shartnomasi",
                    });
                }
            } catch (contractErr) {
                console.warn("Auto contract creation warning:", contractErr.message);
            }
        }

        res.status(201).send(user);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: "Ushbu email allaqachon mavjud! Boshqa email kiriting." });
        }
        res.status(500).send(err.message || err);
    }
};


exports.getUser = async (req, res) => {
    try {
        const users = await User.findAll({
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address", "plan", "max_students", "payment_type"] } : null,
                Teacher ? { model: Teacher, as: "teacher_profile", attributes: ["id", "specialization", "status"] } : null,
                Employee ? { model: Employee, as: "employee_profile", attributes: ["id", "position", "salary", "status"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(users);
    } catch (err) {
        res.status(500).send(err.message);
    }
};
exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: [
                Branch ? { model: Branch, as: "branch", attributes: ["id", "name", "phone", "address", "plan", "max_students", "payment_type"] } : null,
                Teacher ? { model: Teacher, as: "teacher_profile", attributes: ["id", "specialization", "status"] } : null,
                Employee ? { model: Employee, as: "employee_profile", attributes: ["id", "position", "salary", "status"] } : null
            ].filter(Boolean)
        });
        if (!user) return res.status(404).send("user not found");
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.updateUser = async (req, res) => {
    const { error } = validateUser(req.body, true);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).send("User not found");

        if (user.role === 'SUPER_ADMIN' && req.body.role && req.body.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                message: "Asosiy Super Admin (Sayt yaratuvchisi) rolini o'zgartirish taqiqlanadi!"
            });
        }
        if (req.body.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({
                message: "Boshqa foydalanuvchini Super Admin qilib bo'lmaydi! Tizimda faqat 1 ta Super Admin bo'lishi mumkin."
            });
        }

        // Har bir filialda faqat 1 ta ADMIN bo'lishini tekshirish
        const targetRole = req.body.role || user.role;
        const targetBranchId = req.body.branch_id !== undefined ? req.body.branch_id : user.branch_id;

        if (targetRole === 'ADMIN' && targetBranchId) {
            const existingBranchAdmin = await User.findOne({
                where: {
                    branch_id: targetBranchId,
                    role: 'ADMIN',
                    id: { [Op.ne]: user.id }
                }
            });
            if (existingBranchAdmin) {
                return res.status(400).json({
                    message: `Ushbu filialda allaqachon administrator (${existingBranchAdmin.full_name}) mavjud! Har bir filialda faqat 1 ta admin bo'lishi mumkin.`
                });
            }
        }

        if (req.body.email && req.body.email !== user.email) {
            const emailTaken = await User.findOne({ where: { email: req.body.email } });
            if (emailTaken) {
                return res.status(400).json({ message: "Ushbu email boshqa foydalanuvchida mavjud!" });
            }
        }

        const updateData = { ...req.body };
        const rawPassword = updateData.password || updateData.plain_password || updateData.hashed_password;
        if (rawPassword) {
            updateData.hashed_password = await bcrypt.hash(rawPassword, 10);
            updateData.plain_password = rawPassword;
            delete updateData.password;
        }

        if (updateData.email === '' || updateData.email === undefined) {
            delete updateData.email;
        }

        if (updateData.branch_id) {
            updateData.branch_id = Number(updateData.branch_id);
        }

        await user.update(updateData);

        // Shartnomani yangilash (agar plan yoki center_name o'zgargan bo'lsa)
        if (updateData.plan || updateData.center_name) {
            try {
                const { Contract } = require("../../models");
                if (Contract) {
                    const contract = await Contract.findOne({
                        where: { admin_id: user.id },
                        order: [['created_at', 'DESC']]
                    });
                    if (contract) {
                        const contractUpdate = {};
                        if (updateData.plan) {
                            contractUpdate.plan = updateData.plan;
                            const p = updateData.plan.toLowerCase();
                            contractUpdate.monthly_amount = p === 'starter' ? 800000.00 : p === 'premium' ? 1800000.00 : 1200000.00;
                        }
                        if (updateData.center_name) {
                            contractUpdate.center_name = updateData.center_name;
                        }
                        await contract.update(contractUpdate);
                    }
                }
            } catch (contractErr) {
                console.warn("Contract sync on update error:", contractErr.message);
            }
        }

        const refreshedUser = await User.findByPk(user.id, {
            include: [
                Branch ? { model: Branch, as: "branch" } : null,
                Teacher ? { model: Teacher, as: "teacher_profile" } : null
            ].filter(Boolean)
        });

        res.status(200).send(refreshedUser || user);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: "Ushbu email allaqachon mavjud! Boshqa email kiriting." });
        }
        res.status(500).send(err.message || err);
    }
};


exports.deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: "Foydalanuvchi topilmadi" });

        if (user.role === 'SUPER_ADMIN' || user.role === 'SUPERADMIN') {
            return res.status(403).json({
                message: "Asosiy Super Admin (Sayt yaratuvchisi) profilini o'chirish taqiqlanadi!"
            });
        }

        const data = user.toJSON();

        // 1. Agar talaba profili bo'lsa
        const { Student, Teacher, Employee, Notification, Activity, Attendance, GroupStudent, Payment, Invoice, Certificate, ExamResult, TrialLesson, Lesson, Group } = require("../../models");

        if (Student) {
            const student = await Student.findOne({ where: { user_id: id } });
            if (student) {
                if (Attendance) await Attendance.destroy({ where: { student_id: student.id } });
                if (GroupStudent) await GroupStudent.destroy({ where: { student_id: student.id } });
                if (Payment) await Payment.destroy({ where: { student_id: student.id } });
                if (Invoice) await Invoice.destroy({ where: { student_id: student.id } });
                if (Certificate) await Certificate.destroy({ where: { student_id: student.id } });
                if (ExamResult) await ExamResult.destroy({ where: { student_id: student.id } });
                await student.destroy();
            }
        }

        // 2. Agar o'qituvchi profili bo'lsa
        if (Teacher) {
            const teacher = await Teacher.findOne({ where: { user_id: id } });
            if (teacher) {
                if (TrialLesson) await TrialLesson.update({ teacher_id: null }, { where: { teacher_id: teacher.id } });
                if (Lesson) await Lesson.update({ teacher_id: null }, { where: { teacher_id: teacher.id } });
                if (Group) await Group.update({ teacher_id: null }, { where: { teacher_id: teacher.id } });
                await teacher.destroy();
            }
        }

        // 3. Agar xodim profili bo'lsa
        if (Employee) {
            await Employee.destroy({ where: { user_id: id } });
        }

        // 4. Boshqa bog'liq yozuvlar
        if (Notification) await Notification.destroy({ where: { user_id: id } });
        if (Activity) await Activity.destroy({ where: { user_id: id } });
        if (Attendance) await Attendance.update({ marked_by: null }, { where: { marked_by: id } });

        // 5. Asosiy foydalanuvchini o'chirish
        await user.destroy();
        res.status(200).json({ success: true, message: "Foydalanuvchi muvaffaqiyatli o'chirildi", data });
    } catch (err) {
        console.error("Delete user error:", err);
        res.status(400).json({ message: "O'chirishda xatolik yuz berdi: " + (err.message || err) });
    }
};

exports.searchUser = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const user = await User.findAll({
            where: {
                [Op.or]: [
                    { full_name: { [Op.iLike]: `%${query}%` } },
                    { phone: { [Op.iLike]: `%${query}%` } },
                    { email: { [Op.iLike]: `%${query}%` } }
                ]
            }
        });
        res.status(200).send(user);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

exports.loginUser = async (req, res) => {
    try {
        // 1. Request body dan email / phone va passwordni olish
        const { email, phone, password } = req.body;
        const rawIdentifier = (email || phone || '').trim();

        // 2. Login va password borligini tekshirish
        if (!rawIdentifier || !password) {
            return res.status(400).send({
                message: "Telefon raqam / Email va parol kiritilishi shart"
            });
        }

        // 3. Telefon raqam variantlarini shakllantirish (+998..., 998..., 9...)
        const cleanDigits = rawIdentifier.replace(/\D/g, '');
        const phoneVariants = [rawIdentifier];
        if (cleanDigits) {
            phoneVariants.push(`+${cleanDigits}`);
            phoneVariants.push(cleanDigits);
            if (cleanDigits.length === 9) {
                phoneVariants.push(`+998${cleanDigits}`);
                phoneVariants.push(`998${cleanDigits}`);
            } else if (cleanDigits.length === 12 && cleanDigits.startsWith('998')) {
                phoneVariants.push(cleanDigits.slice(3));
            }
        }

        // 4. Bazadan userni qidirish (email yoki telefon raqami bo'yicha)
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: rawIdentifier },
                    { phone: { [Op.in]: phoneVariants } }
                ]
            }
        });

        // 4. User topilmasa
        if (!user) {
            return res.status(401).send({
                message: "Email yoki parol noto'g'ri"
            });
        }

        // 4.1. Foydalanuvchi hisobi faolligini tekshirish
        if (user.status && user.status.toLowerCase() !== 'active') {
            return res.status(403).send({
                message: "Sizning hisobingiz nofaol yoki administrator tomonidan bloklangan!"
            });
        }

        // 5. Passwordni tekshirish
        let isPasswordValid = await bcrypt.compare(
            password,
            user.hashed_password
        );

        // Fallback: Agar plain_password mos kelsa, qabul qilish va yangi hash bilan sinxronlash
        if (!isPasswordValid && user.plain_password && password === user.plain_password) {
            isPasswordValid = true;
            try {
                user.hashed_password = await bcrypt.hash(password, 10);
                await user.save();
            } catch (syncErr) {
                console.warn("Password re-hash sync error:", syncErr.message);
            }
        }

        // 6. Password noto'g'ri bo'lsa
        if (!isPasswordValid) {
            return res.status(401).send({
                message: "Email yoki parol noto'g'ri"
            });
        }

        const userRole = (user.role || '').toUpperCase();

        // 6.1. O'QITUVCHI: Teacher profili mavjudligi va faolligini qat'iy tekshirish
        let teacherData = null;
        if (userRole === 'TEACHER') {
            if (Teacher) {
                teacherData = await Teacher.findOne({ where: { user_id: user.id } });
            }
            if (!teacherData) {
                return res.status(403).send({
                    message: "O'qituvchi profili mavjud emas yoki o'chirilgan! Tizimga kirish taqiqlangan."
                });
            }
            if (teacherData.status && teacherData.status.toLowerCase() !== 'active') {
                return res.status(403).send({
                    message: "O'qituvchi profili faol emas yoki admin tomonidan bloklangan!"
                });
            }
        }

        // 6.2. TALABA: Student profili mavjudligi va faolligini qat'iy tekshirish
        let studentData = null;
        if (userRole === 'STUDENT') {
            if (Student) {
                studentData = await Student.findOne({ where: { user_id: user.id } });
            }
            if (!studentData) {
                return res.status(403).send({
                    message: "Talaba profili mavjud emas yoki o'chirilgan! Tizimga kirish taqiqlangan."
                });
            }
            if (studentData.status && studentData.status.toLowerCase() !== 'active') {
                return res.status(403).send({
                    message: "Talaba profili faol emas yoki admin tomonidan bloklangan!"
                });
            }
        }

        // 6.2.1. OTA-ONA (PARENT): Farzandi (Student) mavjudligini aniqlash
        if (userRole === 'PARENT') {
            if (Student) {
                studentData = await Student.findOne({
                    where: {
                        [Op.or]: [
                            { parent_user_id: user.id },
                            { parent_phone: user.phone },
                            { parent_phone: user.email }
                        ]
                    },
                    include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] }] : []
                });

                if (!studentData && user.phone) {
                    const cleanPhone = user.phone.replace(/[^0-9]/g, '').slice(-9);
                    if (cleanPhone) {
                        studentData = await Student.findOne({
                            where: {
                                parent_phone: { [Op.like]: `%${cleanPhone}%` }
                            },
                            include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'email'] }] : []
                        });
                    }
                }
            }
        }

        // 6.3. XODIM (STAFF): Employee profili mavjudligi va faolligini qat'iy tekshirish
        let employeeData = null;
        if (userRole === 'STAFF' || userRole === 'EMPLOYEE') {
            if (Employee) {
                employeeData = await Employee.findOne({ where: { user_id: user.id } });
            }
            if (!employeeData) {
                return res.status(403).send({
                    message: "Xodim profili mavjud emas yoki o'chirilgan! Tizimga kirish taqiqlangan."
                });
            }
            if (employeeData.status && employeeData.status.toLowerCase() !== 'active') {
                return res.status(403).send({
                    message: "Xodim profili faol emas yoki admin tomonidan bloklangan!"
                });
            }
        }

        // 6.3.1. TOZALIK XODIMI (va farrosh/cleaner): Tizimga kirishi qat'iyan taqiqlanadi (ro'yxatda turaveradi)
        if (Employee) {
            const empCheck = await Employee.findOne({ where: { user_id: user.id } });
            if (empCheck && empCheck.position) {
                const pos = empCheck.position.toLowerCase();
                if (pos.includes('tozalik') || pos.includes('farrosh') || pos.includes('cleaner') || pos.includes('ubor')) {
                    return res.status(403).send({
                        message: "Tozalik xodimi uchun CRM tizimiga kirish ruxsati mavjud emas! (Ushbu xodim faqat ro'yxatda hisob yuritish uchun saqlanadi)"
                    });
                }
            }
        }

        // 6.4. Filial holatini tekshirish (agar biriktirilgan bo'lsa)
        let branchData = null;
        if (user.branch_id && Branch) {
            branchData = await Branch.findByPk(user.branch_id);
            if (branchData && branchData.status && branchData.status.toLowerCase() !== 'active') {
                return res.status(403).send({
                    message: `Siz biriktirilgan filial (${branchData.name}) faol emas yoki bloklangan!`
                });
            }
        } else if (userRole === 'ADMIN' && Branch) {
            branchData = await Branch.findOne({ where: { name: user.full_name } });
            if (branchData) {
                if (branchData.status && branchData.status.toLowerCase() !== 'active') {
                    return res.status(403).send({
                        message: `Sizning markazingiz (${branchData.name}) faol emas yoki bloklangan!`
                    });
                }
                await user.update({ branch_id: branchData.id });
            }
        }

        // 7. Access va Refresh token yaratish
        const tokens = createTokens({
            id: user.id,
            role: user.role
        });

        // 8. Refresh tokenni hash qilish
        const hashedRefreshToken = await hashToken(
            tokens.refreshToken
        );

        // 9. User ma'lumotlarini yangilash
        await user.update({
            hashed_refresh_token: hashedRefreshToken,
            last_login_at: new Date()
        });

        // 10. Muvaffaqiyatli login
        return res.status(200).send({
            message: "User successfully logged in",

            accessToken: tokens.accessToken,

            refreshToken: tokens.refreshToken,

            user: {
                id: user.id,
                full_name: user.full_name,
                email: user.role === 'PARENT' ? null : user.email,
                phone: user.phone,
                plain_password: user.plain_password || null,
                role: user.role,
                status: user.status,
                avatar: user.avatar,
                branch_id: user.branch_id || branchData?.id || null,
                branch: branchData ? { id: branchData.id, name: branchData.name, plan: branchData.plan, address: branchData.address, phone: branchData.phone } : (user.role === 'PARENT' ? { id: 1, name: "Yuksalish Ta'limi" } : null),
                teacher_id: teacherData ? teacherData.id : null,
                teacher: teacherData ? { id: teacherData.id, specialization: teacherData.specialization, branch_id: teacherData.branch_id } : null,
                student_id: studentData ? studentData.id : null,
                student: studentData ? {
                    id: studentData.id,
                    full_name: studentData.user?.full_name || studentData.full_name || 'Farzand',
                    user: studentData.user ? { id: studentData.user.id, full_name: studentData.user.full_name, phone: studentData.user.phone } : null,
                    coins: studentData.coins || 0,
                    branch_id: studentData.branch_id,
                    birth_date: studentData.birth_date,
                    parent_name: studentData.parent_name,
                    parent_phone: studentData.parent_phone,
                    address: studentData.address,
                    group_id: studentData.group_id,
                    course_id: studentData.course_id
                } : null,
                coins: studentData ? (studentData.coins || 0) : 0,
                employee_id: employeeData ? employeeData.id : null,
                position: employeeData?.position || null,
                employee: employeeData ? { id: employeeData.id, position: employeeData.position, salary: employeeData.salary, branch_id: employeeData.branch_id } : null
            }
        });

    } catch (error) {
        console.log("Login error:", error);

        return res.status(500).send({
            message: error.message
        });
    }
};
