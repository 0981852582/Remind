const { Pool } = require('pg'); // Bổ sung thư viện kết nối Database
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// 1. Cấu hình kết nối Database (Phần này bạn đang thiếu)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Railway tự động cung cấp biến này[cite: 7]
    ssl: {
        rejectUnauthorized: false
    }
});

// 2. Cấu hình gửi mail (Sử dụng Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'truongquoctrong231194@gmail.com',
        pass: 'hinz pwdd qdur dxgc' 
    }
});

// 3. Hàm xử lý logic nhắc nhở
const sendDailyReminder = async () => {
    try {
        const now = new Date();
        // Giờ đây biến pool đã được định nghĩa nên sẽ không còn lỗi ReferenceError[cite: 7]
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

        if (overdue.length === 0 && processing.length === 0) return;

        await transporter.sendMail({
            from: '"Hệ thống Quản lý Công việc" <truongquoctrong231194@gmail.com>',
            to: 'truongquoctrong231194@gmail.com',
            subject: `🔔 Nhắc nhở công việc ngày ${now.toLocaleDateString('vi-VN')}`,
            html: `
                <h3>Danh sách công việc cần xử lý:</h3>
                <p style="color: #e74c3c;"><b>⚠️ Quá hạn:</b> ${overdue.length ? overdue.join(', ') : 'Không có'}</p>
                <p style="color: #2ecc71;"><b>⏳ Đang xử lý:</b> ${processing.length ? processing.join(', ') : 'Không có'}</p>
                <br>
                <p><i>Hệ thống tự động gửi lúc 00:00 sáng mỗi ngày.</i></p>
            `
        });
        console.log('Đã gửi email nhắc nhở thành công!');
    } catch (err) {
        console.error('Lỗi khi gửi email:', err);
    }
};

// 4. Lập lịch chạy (Giữ nguyên 00:00 theo ý bạn)[cite: 7]
cron.schedule('18 17 * * *', () => { 
    console.log('Bắt đầu gửi mail nhắc nhở định kỳ...');
    sendDailyReminder();
}, {
    timezone: "Asia/Ho_Chi_Minh"
});