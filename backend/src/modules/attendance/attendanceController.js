const { Attendance, Lesson, Student, User, Group, Course, Classroom, Teacher } = require("../../models");
const { validateAttendance } = require("./attendanceValidation");
const { Op } = require("sequelize");
const { verifyToken } = require("../../utils/auth");

// 1. Yangi davomat yozuvi yaratish (Create)
exports.createAttendance = async (req, res) => {
    const { error } = validateAttendance(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const attendanceData = { ...req.body };

        // lesson_id mavjudligini tekshirish (404)
        const lesson = await Lesson.findByPk(attendanceData.lesson_id);
        if (!lesson) {
            return res.status(404).send("Belgilangan lesson_id ga ega dars topilmadi");
        }

        // Qoidaga ko'ra: Faqat bugungi dars davomatini belgilash yoki o'zgartirish mumkin!
        const todayStr = new Date().toLocaleDateString('en-CA');
        if (lesson.lesson_date && lesson.lesson_date !== todayStr) {
            return res.status(400).send("Faqat bugungi dars davomatini belgilash mumkin. O'tib ketgan yoki bo'lajak darslar davomatini o'zgartirib bo'lmaydi.");
        }

        // student_id mavjudligini tekshirish (404)
        const student = await Student.findByPk(attendanceData.student_id);
        if (!student) {
            return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
        }

        // marked_by berilgan bo'lsa tekshirish (404)
        if (attendanceData.marked_by) {
            const user = await User.findByPk(attendanceData.marked_by);
            if (!user) {
                return res.status(404).send("Belgilangan marked_by ga ega foydalanuvchi topilmadi");
            }
        } else {
            attendanceData.marked_by = null;
        }

        // Agar mavjud bo'lsa yangilash (upsert)
        const existing = await Attendance.findOne({
            where: {
                lesson_id: attendanceData.lesson_id,
                student_id: attendanceData.student_id
            }
        });
        if (existing) {
            await existing.update(attendanceData);
            return res.status(200).send(existing);
        }

        const attendance = await Attendance.create(attendanceData);
        res.status(201).send(attendance);
    } catch (err) {
        res.status(500).send(err.message || err);
    }
};

// 2. Barcha davomatlarni olish (Read All)
exports.getAttendance = async (req, res) => {
    try {
        const attendances = await Attendance.findAll({
            include: [
                Lesson ? { 
                    model: Lesson, 
                    as: "lesson", 
                    attributes: ["id", "lesson_date", "start_time", "end_time", "topic", "status"],
                    include: Group ? [{ model: Group, as: "group", attributes: ["id", "name"] }] : []
                } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                User ? { model: User, as: "marker", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(attendances);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 3. ID bo'yicha bitta davomat yozuvini olish (Read One)
exports.getAttendanceById = async (req, res) => {
    try {
        const attendance = await Attendance.findByPk(req.params.id, {
            include: [
                Lesson ? { 
                    model: Lesson, 
                    as: "lesson", 
                    attributes: ["id", "lesson_date", "start_time", "end_time", "topic", "status"],
                    include: Group ? [{ model: Group, as: "group", attributes: ["id", "name"] }] : []
                } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id", "parent_name", "parent_phone", "status"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name", "phone", "email", "role"] }] : []
                } : null,
                User ? { model: User, as: "marker", attributes: ["id", "full_name", "role"] } : null
            ].filter(Boolean)
        });
        if (!attendance) return res.status(404).send("Attendance not found");
        res.status(200).send(attendance);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 4. Davomat ma'lumotlarini yangilash (Update)
exports.updateAttendance = async (req, res) => {
    const { error } = validateAttendance(req.body);
    if (error) return res.status(400).send(error.details[0].message);

    try {
        const attendance = await Attendance.findByPk(req.params.id);
        if (!attendance) return res.status(404).send("Attendance not found");

        const lessonId = updateData.lesson_id || attendance.lesson_id;
        const lesson = await Lesson.findByPk(lessonId);
        if (!lesson) {
            return res.status(404).send("Belgilangan lesson_id ga ega dars topilmadi");
        }

        const todayStr = new Date().toLocaleDateString('en-CA');
        if (lesson.lesson_date && lesson.lesson_date !== todayStr) {
            return res.status(400).send("Faqat bugungi dars davomatini o'zgartirish mumkin. O'tib ketgan darslar davomati yopilgan.");
        }

        if (updateData.student_id) {
            const student = await Student.findByPk(updateData.student_id);
            if (!student) {
                return res.status(404).send("Belgilangan student_id ga ega talaba topilmadi");
            }
        }

        if (updateData.marked_by) {
            const user = await User.findByPk(updateData.marked_by);
            if (!user) {
                return res.status(404).send("Belgilangan marked_by ga ega foydalanuvchi topilmadi");
            }
        }

        await attendance.update(updateData);
        res.status(200).send(attendance);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 5. Davomatni o'chirish (Delete)
exports.deleteAttendance = async (req, res) => {
    try {
        const attendance = await Attendance.findByPk(req.params.id);
        if (!attendance) return res.status(404).send("Attendance not found");

        if (attendance.lesson_id) {
            const lesson = await Lesson.findByPk(attendance.lesson_id);
            const todayStr = new Date().toLocaleDateString('en-CA');
            if (lesson && lesson.lesson_date && lesson.lesson_date !== todayStr) {
                return res.status(400).send("O'tib ketgan darslar davomatini o'chirib bo'lmaydi.");
            }
        }

        const data = attendance.toJSON();
        await attendance.destroy();
        res.status(200).send(data);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 6. Davomatlarni qidirish (Search)
exports.searchAttendance = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.status(400).send("Search query is required");
        }

        const attendances = await Attendance.findAll({
            where: {
                [Op.or]: [
                    { status: { [Op.iLike]: `%${query}%` } },
                    { note: { [Op.iLike]: `%${query}%` } }
                ]
            },
            include: [
                Lesson ? { model: Lesson, as: "lesson", attributes: ["id", "lesson_date", "topic"] } : null,
                Student ? { 
                    model: Student, 
                    as: "student", 
                    attributes: ["id"],
                    include: User ? [{ model: User, as: "user", attributes: ["id", "full_name"] }] : []
                } : null
            ].filter(Boolean),
            order: [['created_at', 'DESC']]
        });
        res.status(200).send(attendances);
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// 7. Nazoratchi uchun xonalar kesimida jonli monitoring va 10-daqiqa davomat ogohlantirishi (Live Monitoring)
exports.getLiveMonitor = async (req, res) => {
    try {
        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            try {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = verifyToken(token);
                if (decoded && decoded.id) {
                    const caller = await User.findByPk(decoded.id);
                    const callerRole = (caller?.role || '').toUpperCase();
                    if (callerRole === 'TEACHER' || callerRole === 'STUDENT') {
                        return res.status(403).json({ success: false, message: "Dars vaqti nazorati faqat nazoratchi va rahbarlar uchun mo'ljallangan." });
                    }
                }
            } catch (e) {
                // ignore
            }
        }

        const todayObj = new Date();
        const year = todayObj.getFullYear();
        const month = String(todayObj.getMonth() + 1).padStart(2, '0');
        const day = String(todayObj.getDate()).padStart(2, '0');
        const defaultDate = `${year}-${month}-${day}`;

        const targetDate = req.query.date || defaultDate;
        const now = new Date();
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        // 1. Faol xonalar ro'yxati
        const classrooms = await Classroom.findAll({
            where: { status: 'active' },
            order: [['floor', 'ASC'], ['name', 'ASC']]
        });

        // 2. Ushbu kundagi mavjud darslar
        const lessons = await Lesson.findAll({
            where: { lesson_date: targetDate },
            include: [
                Group ? {
                    model: Group,
                    as: 'group',
                    include: Course ? [{ model: Course, as: 'course', attributes: ['id', 'name'] }] : []
                } : null,
                Classroom ? { model: Classroom, as: 'classroom' } : null,
                Teacher ? {
                    model: Teacher,
                    as: 'teacher',
                    include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'avatar'] }] : []
                } : null,
                Attendance ? {
                    model: Attendance,
                    as: 'attendances',
                    include: Student ? [{
                        model: Student,
                        as: 'student',
                        include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name'] }] : []
                    }] : []
                } : null
            ].filter(Boolean),
            order: [['start_time', 'ASC']]
        });

        const timeToMinutes = (tStr) => {
            if (!tStr) return null;
            const match = String(tStr).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
            if (!match) return null;
            return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        };

        const scheduledGroupIds = new Set(lessons.map(l => String(l.group_id)));

        // 3. Faol guruhlar jadvali (agar guruhning darsi bazada alohida satr bo'lmasa)
        const groups = await Group.findAll({
            where: { status: 'active' },
            include: [
                Course ? { model: Course, as: 'course', attributes: ['id', 'name'] } : null,
                Classroom ? { model: Classroom, as: 'classroom' } : null,
                Teacher ? {
                    model: Teacher,
                    as: 'teacher',
                    include: User ? [{ model: User, as: 'user', attributes: ['id', 'full_name', 'phone', 'avatar'] }] : []
                } : null
            ].filter(Boolean)
        });

        const targetDayOfWeek = new Date(targetDate).getDay(); // 0 = Yakshanba
        const combinedLessons = [...lessons];

        groups.forEach((g) => {
            if (scheduledGroupIds.has(String(g.id))) return;
            const dStr = String(g.days || '').toLowerCase();
            let isScheduledToday = false;

            if (dStr.includes('har') || dStr.includes('daily') || dStr.includes('barcha')) {
                isScheduledToday = targetDayOfWeek !== 0;
            } else if (targetDayOfWeek === 1 && (dStr.includes('du') || dStr.includes('mon') || dStr === 'odd' || dStr.includes('toq'))) {
                isScheduledToday = true;
            } else if (targetDayOfWeek === 2 && (dStr.includes('se') || dStr.includes('tue') || dStr === 'even' || dStr.includes('juft'))) {
                isScheduledToday = true;
            } else if (targetDayOfWeek === 3 && (dStr.includes('chor') || dStr.includes('wed') || dStr === 'odd' || dStr.includes('toq'))) {
                isScheduledToday = true;
            } else if (targetDayOfWeek === 4 && (dStr.includes('pay') || dStr.includes('thu') || dStr === 'even' || dStr.includes('juft'))) {
                isScheduledToday = true;
            } else if (targetDayOfWeek === 5 && (dStr.includes('jum') || dStr.includes('fri') || dStr === 'odd' || dStr.includes('toq'))) {
                isScheduledToday = true;
            } else if (targetDayOfWeek === 6 && (dStr.includes('shan') || dStr.includes('sat') || dStr === 'even' || dStr.includes('juft'))) {
                isScheduledToday = true;
            }

            if (isScheduledToday) {
                let sTime = '10:00:00';
                let eTime = '12:00:00';
                if (g.lesson_time) {
                    const parts = g.lesson_time.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g);
                    if (parts && parts.length >= 2) {
                        sTime = parts[0].replace('.', ':') + ':00';
                        eTime = parts[1].replace('.', ':') + ':00';
                    }
                } else if (g.start_time) {
                    sTime = String(g.start_time);
                    if (g.end_time) eTime = String(g.end_time);
                }

                combinedLessons.push({
                    id: `GRP-${g.id}`,
                    group_id: g.id,
                    group: g,
                    classroom_id: g.classroom_id,
                    classroom: g.classroom,
                    teacher_id: g.teacher_id,
                    teacher: g.teacher,
                    start_time: sTime,
                    end_time: eTime,
                    lesson_date: targetDate,
                    topic: `${g.name} darsi`,
                    attendances: [],
                    isAutoSchedule: true
                });
            }
        });

        const processedLessons = combinedLessons.map((lesson) => {
            const sMin = timeToMinutes(lesson.start_time) ?? 600;
            const eMin = timeToMinutes(lesson.end_time) ?? 720;
            const attList = lesson.attendances || [];
            const hasAttendance = attList.length > 0;

            let liveStatus = 'UPCOMING';
            let elapsedMinutes = 0;
            let isAlert = false;
            let alertMessage = '';
            let overdueMinutes = 0;
            let remainingMinutes = 0;

            if (nowMinutes >= sMin && nowMinutes <= eMin) {
                liveStatus = 'IN_PROGRESS';
                elapsedMinutes = nowMinutes - sMin;

                if (!hasAttendance) {
                    if (elapsedMinutes > 10) {
                        isAlert = true;
                        overdueMinutes = elapsedMinutes - 10;
                        alertMessage = `DIQQAT: Dars boshlanganiga ${elapsedMinutes} daqiqa bo'ldi (10 daqiqalik me'yordan ${overdueMinutes} daqiqa oshdi). Talabalar davomati olinmagan!`;
                    } else {
                        remainingMinutes = 10 - elapsedMinutes;
                        alertMessage = `Dars boshlandi (${elapsedMinutes} daqiqa o'tdi). Davomat kutilmoqda (${remainingMinutes} daqiqa qoldi).`;
                    }
                } else {
                    alertMessage = `Davomat olingan (${attList.length} ta talaba qayd etildi).`;
                }
            } else if (nowMinutes > eMin) {
                liveStatus = 'COMPLETED';
                elapsedMinutes = nowMinutes - sMin;
                if (!hasAttendance) {
                    isAlert = true;
                    overdueMinutes = eMin - sMin - 10;
                    alertMessage = `Dars yakunlangan, lekin o'qituvchi tomonidan talabalar davomati olinmagan!`;
                } else {
                    alertMessage = `Dars yakunlandi. Davomat olingan.`;
                }
            } else {
                liveStatus = 'UPCOMING';
                remainingMinutes = sMin - nowMinutes;
                alertMessage = `Dars boshlanishi kutilmoqda (${remainingMinutes} daqiqa qoldi).`;
            }

            const presentCount = attList.filter(a => a.status === 'present').length;
            const absentCount = attList.filter(a => a.status === 'absent').length;
            const lateCount = attList.filter(a => a.status === 'late' || a.status === 'excused').length;

            return {
                id: lesson.id,
                lesson_id: lesson.id,
                group_id: lesson.group_id,
                group_name: lesson.group?.name || 'Guruh',
                course_name: lesson.group?.course?.name || '',
                teacher_id: lesson.teacher_id,
                teacher_name: lesson.teacher?.user?.full_name || lesson.teacher?.name || 'Biriktirilmagan',
                teacher_phone: lesson.teacher?.user?.phone || '',
                classroom_id: lesson.classroom_id,
                classroom_name: lesson.classroom?.name || 'Xona',
                start_time: lesson.start_time ? String(lesson.start_time).slice(0, 5) : '10:00',
                end_time: lesson.end_time ? String(lesson.end_time).slice(0, 5) : '12:00',
                live_status: liveStatus,
                elapsed_minutes: elapsedMinutes,
                overdue_minutes: overdueMinutes,
                remaining_minutes: remainingMinutes,
                attendance_taken: hasAttendance,
                attendance_count: attList.length,
                present_count: presentCount,
                absent_count: absentCount,
                late_count: lateCount,
                is_alert: isAlert,
                alert_message: alertMessage,
                is_auto_schedule: Boolean(lesson.isAutoSchedule)
            };
        }).sort((a, b) => (timeToMinutes(a.start_time) ?? 0) - (timeToMinutes(b.start_time) ?? 0));

        // 4. Xonalar kesimida doska (Room Board)
        const roomBoard = classrooms.map((room) => {
            const roomLessons = processedLessons.filter(l => String(l.classroom_id) === String(room.id));
            const inProgressLesson = roomLessons.find(l => l.live_status === 'IN_PROGRESS');
            const upcomingLesson = roomLessons.find(l => l.live_status === 'UPCOMING');
            const activeLesson = inProgressLesson || upcomingLesson || roomLessons[0] || null;

            return {
                room_id: room.id,
                room_name: room.name,
                floor: room.floor,
                capacity: room.capacity,
                room_type: room.room_type,
                has_active_lesson: Boolean(inProgressLesson),
                current_lesson: activeLesson,
                today_lessons_count: roomLessons.length,
                all_today_lessons: roomLessons,
                is_alert: Boolean(activeLesson && activeLesson.is_alert),
                alert_message: activeLesson?.alert_message || ''
            };
        });

        const alertLessons = processedLessons.filter(l => l.is_alert);

        res.status(200).json({
            date: targetDate,
            currentTime: now.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }),
            stats: {
                totalRooms: classrooms.length,
                activeLessons: processedLessons.filter(l => l.live_status === 'IN_PROGRESS').length,
                alertCount: alertLessons.length,
                completedLessons: processedLessons.filter(l => l.live_status === 'COMPLETED').length,
                upcomingLessons: processedLessons.filter(l => l.live_status === 'UPCOMING').length,
                attendanceTakenCount: processedLessons.filter(l => l.attendance_taken).length,
            },
            alerts: alertLessons,
            roomBoard,
            lessons: processedLessons
        });
    } catch (err) {
        console.error("Live monitor error:", err);
        res.status(500).json({ message: err.message });
    }
};

