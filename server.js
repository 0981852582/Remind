const { Pool } = require('pg'); 
const nodemailer = require('nodemailer');
const cron = require('node-cron');

// 1. Cấu hình kết nối Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false
    }
});

// 2. Cấu hình gửi mail
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

        // Chỉ gửi mail nếu có task cần nhắc[cite: 6]
        if (overdue.length === 0 && processing.length === 0) {
            console.log('Không có task nào quá hạn hoặc đang xử lý. Kết thúc.');
            return;
        }

        await transporter.sendMail({
            from: '"Hệ thống Quản lý Công việc" <truongquoctrong231194@gmail.com>',
            to: 'truongquoctrong231194@gmail.com',
            subject: `🔔 Nhắc nhở công việc ngày ${now.toLocaleDateString('vi-VN')}`,
            html: `
                <h3>Danh sách công việc cần xử lý:</h3>
                <p style="color: #e74c3c;"><b>⚠️ Quá hạn:</b> ${overdue.length ? overdue.join(', ') : 'Không có'}</p>
                <p style="color: #2ecc71;"><b>⏳ Đang xử lý:</b> ${processing.length ? processing.join(', ') : 'Không có'}</p>
                <br>
                <p><i>Hệ thống tự động gửi định kỳ.</i></p>
            `
        });
        console.log('Đã gửi email nhắc nhở thành công!');
    } catch (err) {
        console.error('Lỗi khi gửi email:', err);
    }
};

// 4. Lập lịch chạy (Đã sửa lỗi cú pháp ngoặc và đặt 17:30 để test)
cron.schedule('28 16 * * *', async () => { 
    console.log('--- [17:30] Bắt đầu kích hoạt tiến trình gửi mail ---');
    await sendDailyReminder();
}, {
    timezone: "Asia/Ho_Chi_Minh"
});