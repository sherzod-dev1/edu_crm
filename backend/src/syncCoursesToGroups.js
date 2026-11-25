const db = require('./models');

const getWeekdaysFromDays = (daysStr) => {
  if (!daysStr) return [1, 3, 5];
  const dStr = String(daysStr).toLowerCase().trim();

  // Har kuni / Everyday
  if (dStr.includes('har kuni') || dStr.includes('everyday') || dStr.includes('daily') || dStr.includes('barcha')) {
    return [1, 2, 3, 4, 5, 6];
  }

  const days = [];
  // Dushanba (1)
  if (dStr.includes('du') || dStr.includes('mon')) days.push(1);
  // Seshanba (2)
  if (dStr.includes('se') || dStr.includes('tue')) days.push(2);
  // Chorshanba (3)
  if (dStr.includes('chor') || dStr.includes('wed')) days.push(3);
  // Payshanba (4)
  if (dStr.includes('pay') || dStr.includes('thu')) days.push(4);
  // Juma (5)
  if (
    dStr.includes('jum') ||
    dStr.includes('fri') ||
    dStr.includes('-ju') ||
    dStr.includes('ju-') ||
    dStr.endsWith('ju') ||
    (dStr.includes('ju') && !dStr.includes('juft'))
  ) {
    days.push(5);
  }
  // Shanba (6)
  if (dStr.includes('shan') || dStr.includes('sat')) days.push(6);

  if (days.length === 0) {
    if (dStr.includes('juft') || dStr.includes('even')) {
      return [2, 4, 6];
    }
    return [1, 3, 5];
  }

  return days;
};

const parseTimesFromGroup = (grp) => {
  let startTime = '14:00';
  let endTime = '16:00';

  if (grp.start_time) {
    startTime = String(grp.start_time).slice(0, 5);
    if (grp.end_time) {
      endTime = String(grp.end_time).slice(0, 5);
    } else {
      const h = parseInt(startTime.split(':')[0], 10);
      endTime = `${String((h + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
    }
  } else if (grp.lesson_time) {
    const cleanTime = String(grp.lesson_time).replace(/–|—/g, '-').trim();
    const matches = cleanTime.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g);
    if (matches && matches.length >= 2) {
      startTime = matches[0].replace('.', ':').padStart(5, '0');
      endTime = matches[1].replace('.', ':').padStart(5, '0');
    } else if (matches && matches.length === 1) {
      startTime = matches[0].replace('.', ':').padStart(5, '0');
      const h = parseInt(startTime.split(':')[0], 10);
      endTime = `${String((h + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
    }
  } else if (grp.days) {
    const match = String(grp.days).match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/);
    if (match) {
      startTime = match[0].replace('.', ':').padStart(5, '0');
      const h = parseInt(startTime.split(':')[0], 10);
      endTime = `${String((h + 2) % 24).padStart(2, '0')}:${startTime.split(':')[1] || '00'}`;
    }
  }

  return {
    startTime: `${startTime}:00`,
    endTime: `${endTime}:00`
  };
};

const syncGroupLessons = async (group) => {
  if (!group || !db.Lesson) return;
  try {
    const targetWeekdays = getWeekdaysFromDays(group.days);
    const { startTime, endTime } = parseTimesFromGroup(group);

    // Determine start date strictly based on opening_date or start_date
    const startStr = group.opening_date || group.start_date;
    const now = new Date();
    let startDate;
    if (startStr) {
      const [sy, sm, sd] = String(startStr).split('T')[0].split('-').map(Number);
      startDate = new Date(sy, sm - 1, sd);
    } else {
      startDate = group.createdAt ? new Date(group.createdAt) : new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const startIso = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-${String(startDate.getDate()).padStart(2, '0')}`;

    // 1. Delete any lessons created BEFORE the group opening/start date (if no attendance marked)
    if (startIso && db.Lesson) {
      const oldLessons = await db.Lesson.findAll({
        where: {
          group_id: group.id,
          lesson_date: { [db.Sequelize.Op.lt]: startIso }
        }
      });
      for (const oldLesson of oldLessons) {
        const hasAtt = db.Attendance ? await db.Attendance.count({ where: { lesson_id: oldLesson.id } }) : 0;
        if (hasAtt === 0) {
          await oldLesson.destroy();
        }
      }
    }

    // Determine total lessons needed: course duration_months * 12 lessons (haftada 3 kun = 12 ta dars/oy)
    let durationMonths = 2;
    if (group.course?.duration_months) {
      durationMonths = Number(group.course.duration_months);
    } else if (group.course_id && db.Course) {
      const c = await db.Course.findByPk(group.course_id);
      if (c?.duration_months) durationMonths = Number(c.duration_months);
    }
    const totalLessonsTarget = Math.max(12, Math.min(durationMonths * 12, 36));

    let createdOrExistingCount = 0;
    const curr = new Date(startDate);
    let loopGuard = 0;

    // Range: up to total lessons target or group.end_date
    const maxDate = group.end_date ? new Date(group.end_date) : new Date(startDate.getTime() + (durationMonths + 1) * 32 * 86400000);

    while (curr <= maxDate && createdOrExistingCount < totalLessonsTarget && loopGuard < 200) {
      loopGuard++;
      const dayOfWeek = curr.getDay();
      if (dayOfWeek !== 0 && targetWeekdays.includes(dayOfWeek)) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const existing = await db.Lesson.findOne({
          where: {
            group_id: group.id,
            lesson_date: dateStr
          }
        });

        if (!existing) {
          await db.Lesson.create({
            group_id: group.id,
            teacher_id: group.teacher_id,
            classroom_id: group.classroom_id,
            lesson_date: dateStr,
            start_time: startTime,
            end_time: endTime,
            title: `${group.name} darsi`,
            topic: `${group.name} rejali darsi`,
            status: 'scheduled'
          }).catch(() => {});
        } else {
          await existing.update({
            teacher_id: group.teacher_id || existing.teacher_id,
            classroom_id: group.classroom_id || existing.classroom_id,
            start_time: startTime,
            end_time: endTime
          }).catch(() => {});
        }
        createdOrExistingCount++;
      }
      curr.setDate(curr.getDate() + 1);
    }
  } catch (err) {
    console.warn(`Error syncing lessons for group ${group?.id}:`, err.message);
  }
};

const syncAllGroupsToLessons = async () => {
  try {
    const groups = await db.Group.findAll({ where: { status: 'active' } });
    for (const g of groups) {
      await syncGroupLessons(g);
    }
  } catch (err) {
    console.error('Error syncing all groups to lessons:', err);
  }
};

const syncCoursesToGroups = async () => {
  try {
    const courses = await db.Course.findAll();
    const branch = (await db.Branch.findOne({ where: { name: 'Yuksalish Talimi' } })) || (await db.Branch.findOne());
    const classrooms = await db.Classroom.findAll({
      where: branch ? { branch_id: branch.id } : {}
    });
    let roomIdx = 0;

    for (const c of courses) {
      if (!c.lesson_time && !c.days) continue;
      let grp = await db.Group.findOne({ where: { course_id: c.id } });
      const assignedRoom = classrooms[roomIdx % classrooms.length];
      roomIdx++;

      let sTime = c.start_time || '10:00';
      let eTime = '12:00';
      if (c.lesson_time) {
        const parts = String(c.lesson_time).replace(/–|—/g, '-').split(/[- ]+/).filter(Boolean);
        if (parts[0]) sTime = parts[0].trim();
        if (parts[1]) eTime = parts[1].trim();
      }
      const sPad = sTime.slice(0, 5);
      const ePad = eTime.slice(0, 5);
      const cleanLessonTime = sPad + ' - ' + ePad;

      if (!grp) {
        grp = await db.Group.create({
          name: c.name + ' (' + sPad + ')',
          course_id: c.id,
          teacher_id: c.teacher_id,
          branch_id: c.branch_id || (branch ? branch.id : null),
          classroom_id: assignedRoom ? assignedRoom.id : 1,
          days: c.days || 'Du-Chor-Ju',
          lesson_time: cleanLessonTime,
          start_time: sPad + ':00',
          end_time: ePad + ':00',
          status: 'active',
          capacity: 16
        });
        console.log('Created group for course', c.id, grp.name, 'Group ID:', grp.id);
      } else {
        await grp.update({
          teacher_id: c.teacher_id || grp.teacher_id,
          days: c.days || grp.days,
          lesson_time: cleanLessonTime,
          classroom_id: grp.classroom_id || (assignedRoom ? assignedRoom.id : 1)
        });
      }

      if (grp) {
        await syncGroupLessons(grp);
      }
    }

    // Also sync all groups
    await syncAllGroupsToLessons();
  } catch (err) {
    console.error('Error syncing courses to groups:', err);
  }
};

module.exports = {
  syncCoursesToGroups,
  syncGroupLessons,
  syncAllGroupsToLessons,
  getWeekdaysFromDays,
  parseTimesFromGroup
};

if (require.main === module) {
  syncCoursesToGroups().then(() => {
    console.log('Course and Group schedule sync finished.');
    process.exit(0);
  });
}

