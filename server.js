const nodemailer = require('nodemailer');
const cron = require('node-cron');

// 1. Cấu hình gửi mail (Sử dụng Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'truongquoctrong231194@gmail.com', // Email dùng để gửi (có thể là mail của bạn)
        pass: 'hinz pwdd qdur dxgc' // Mật khẩu ứng dụng (App Password) tạo từ Google Account
    }
});

// 2. Hàm xử lý logic nhắc nhở
const sendDailyReminder = async () => {
    try {
        const now = new Date();
        // Lấy tất cả task chưa hoàn thành từ Database
        const result = await pool.query(`
            SELECT title, due_date, start_date 
            FROM tasks 
            WHERE is_completed = false
        `);

        let overdue = [];
        let processing = [];

        result.rows.forEach(task => {
            const end = new Date(task.due_date);
            const start = new Date(task.start_date);
            if (now > end) overdue.push(task.title);
            else if (now >= start) processing.push(task.title);
        });

        // Chỉ gửi mail nếu có task cần nhắc
        if (overdue.length === 0 && processing.length === 0) return;

        await transporter.sendMail({
            from: '"Hệ thống Quản lý Công việc" <email_gui_tin_nhan@gmail.com>',
            to: 'truongquoctrong231194@gmail.com',
            subject: `🔔 Nhắc nhở công việc ngày ${now.toLocaleDateString('vi-VN')}`,
            html: `
                <h3>Danh sách công việc cần xử lý:</h3>
                <p style="color: #e74c3c;"><b>⚠️ Quá hạn:</b> ${overdue.length ? overdue.join(', ') : 'Không có'}</p>
                <p style="color: #2ecc71;"><b>⏳ Đang xử lý:</b> ${processing.length ? processing.join(', ') : 'Không có'}</p>
                <br>
                <p><i>Hệ thống tự động gửi lúc 08:00 sáng mỗi ngày.</i></p>
            `
        });
        console.log('Đã gửi email nhắc nhở thành công!');
    } catch (err) {
        console.error('Lỗi khi gửi email:', err);
    }
};

// 3. Lập lịch chạy tự động lúc 08:00 sáng mỗi ngày (Giờ Việt Nam)[cite: 31]
cron.schedule('0 8 * * *', () => {
    console.log('Bắt đầu gửi mail nhắc nhở định kỳ...');
    sendDailyReminder();
}, {
    timezone: "Asia/Ho_Chi_Minh"
});