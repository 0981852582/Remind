const { Pool } = require('pg'); 
const { Resend } = require('resend'); // Thư viện mới
const cron = require('node-cron');

// Khởi tạo Resend bằng API Key lấy từ biến môi trường
const resend = new Resend(process.env.RESEND_API_KEY);

// 1. Cấu hình kết nối Database
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: {
        rejectUnauthorized: false
    }
});

// 2. Hàm xử lý logic nhắc nhở bằng Resend API
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

        if (overdue.length === 0 && processing.length === 0) {
            console.log('Không có task nào quá hạn hoặc đang xử lý. Kết thúc.');
            return;
        }

        // Gọi Resend qua HTTPS, vượt qua mọi rào cản firewall
        const { data, error } = await resend.emails.send({
            from: 'Hệ Thống Remind <onboarding@resend.dev>', // Bắt buộc dùng mail này để test
            to: 'truongquoctrong231194@gmail.com', // Mail bạn đăng ký với Resend
            subject: `🔔 Nhắc nhở công việc ngày ${now.toLocaleDateString('vi-VN')}`,
            html: `
                <h3>Danh sách công việc cần xử lý:</h3>
                <p style="color: #e74c3c;"><b>⚠️ Quá hạn:</b> ${overdue.length ? overdue.join(', ') : 'Không có'}</p>
                <p style="color: #2ecc71;"><b>⏳ Đang xử lý:</b> ${processing.length ? processing.join(', ') : 'Không có'}</p>
                <br>
                <p><i>Hệ thống tự động gửi định kỳ.</i></p>
            `
        });

        if (error) {
            console.error('Lỗi Resend trả về:', error);
        } else {
            console.log('Đã gửi email nhắc nhở thành công! ID:', data.id);
        }
        
    } catch (err) {
        console.error('Lỗi trong quá trình chạy hàm:', err);
    }
};

// === LỆNH TEST NGAY LẬP TỨC ===
console.log('Khởi động server: Chạy thử hàm gửi mail bằng Resend API...');
sendDailyReminder();

// 3. Lập lịch chạy định kỳ (Trở về lúc nửa đêm)
cron.schedule('00 00 * * *', async () => { 
    console.log('--- [00:00] Bắt đầu kích hoạt tiến trình gửi mail theo giờ ---');
    await sendDailyReminder();
}, {
    timezone: "Asia/Ho_Chi_Minh"
});