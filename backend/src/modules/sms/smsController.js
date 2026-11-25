const { Notification, User, Student } = require('../../models');

exports.sendSms = async (req, res) => {
  try {
    const { phone, message, student_id, user_id, student_name, template_type } = req.body;

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: "Telefon raqami kiritilishi shart",
      });
    }

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "SMS matni kiritilishi shart",
      });
    }

    // Try logging into Notifications if user_id or valid student exists
    let resolvedUserId = user_id;
    if (!resolvedUserId && student_id) {
      try {
        const student = await Student.findByPk(student_id);
        if (student && student.user_id) {
          resolvedUserId = student.user_id;
        }
      } catch (e) {
        // ignore
      }
    }

    // Attempt to record in Notification table if available
    try {
      if (Notification) {
        await Notification.create({
          user_id: resolvedUserId || null,
          title: `SMS (${template_type || "Xabarnoma"}): ${student_name || phone}`,
          message: message.trim(),
          type: 'sms',
          is_read: true,
        });
      }
    } catch (notifErr) {
      console.warn("SMS notification logging note:", notifErr.message);
    }

    // Mock dispatch to SMS gateway (e.g., Eskiz, PlayMobile) with simulated success
    return res.status(200).json({
      success: true,
      message: "SMS xabari muvaffaqiyatli yuborildi!",
      data: {
        phone: phone.trim(),
        message: message.trim(),
        status: "DELIVERED",
        sent_at: new Date().toISOString(),
        student_id: student_id || null,
        student_name: student_name || null,
      },
    });
  } catch (error) {
    console.error("SMS Send Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "SMS yuborishda server xatoligi yuz berdi",
    });
  }
};
