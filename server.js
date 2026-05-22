const express = require('express');
const { Pool } = require('pg'); 
const bodyParser = require('body-parser');
const path = require('path');
const { Resend } = require('resend'); 

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Khởi tạo Resend (Lấy từ biến môi trường của Vercel)
const resend = new Resend(process.env.RESEND_API_KEY);

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/tasks', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, description, is_completed,
            TO_CHAR(start_date, 'YYYY-MM-DD HH24:MI:SS') as start, 
            TO_CHAR(due_date, 'YYYY-MM-DD HH24:MI:SS') as "end"
            FROM tasks`);
        res.json(result.rows);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/add', async (req, res) => {
    try {
        const { title, description, start_date, due_date } = req.body;
        await pool.query(
            'INSERT INTO tasks (title, description, start_date, due_date, is_completed) VALUES ($1, $2, $3, $4, $5)',
            [title, description, start_date, due_date, false]
        );
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/update-task', async (req, res) => {
    try {
        const { id, title, description, start_date, due_date, is_completed } = req.body;
        await pool.query(
            'UPDATE tasks SET title = $1, description = $2, start_date = $3, due_date = $4, is_completed = $5 WHERE id = $6',
            [title, description, start_date, due_date, is_completed, id]
        );
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/delete-task/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/toggle-complete', async (req, res) => {
    try {
        const { id, is_completed } = req.body;
        await pool.query('UPDATE tasks SET is_completed = $1 WHERE id = $2', [is_completed, id]);
        res.sendStatus(200);
    } catch (err) { res.status(500).send(err.message); }
});

// === ĐƯỜNG DẪN BÍ MẬT ĐỂ GỬI MAIL (THAY THẾ CHO NODE-CRON) ===
app.get('/api/trigger-remind', async (req, res) => {
    try {
        const vnTimeStr = new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' });
        const now = new Date(vnTimeStr); 

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
            return res.status(200).send('Không có task nào quá hạn hoặc đang xử lý. Bỏ qua gửi mail.');
        }

        const todayStr = new Date().toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

        const formatList = (tasks) => {
            if (tasks.length === 0) return 'Không có';
            return '<ol style="margin-top: 5px; margin-bottom: 10px; padding-left: 20px;">' + 
                   tasks.map(t => `<li>${t.replace(/\n/g, '<br>')}</li>`).join('') + 
                   '</ol>';
        };

        const { data, error } = await resend.emails.send({
            from: 'Hệ Thống Remind <onboarding@resend.dev>', 
            to: 'truongquoctrong231194@gmail.com', 
            subject: `🔔 Nhắc nhở công việc ngày ${todayStr}`,
            html: `
                <h3>Danh sách công việc cần xử lý:</h3>
                <div style="color: #e74c3c;"><b>⚠️ Quá hạn:</b> ${formatList(overdue)}</div>
                <div style="color: #2ecc71;"><b>⏳ Đang xử lý:</b> ${formatList(processing)}</div>
                <br>
                <p><i>Hệ thống tự động gửi định kỳ.</i></p>
                <p>Link: <a href="https://shop-beta-nine-70.vercel.app/" target="_blank">https://shop-beta-nine-70.vercel.app/</a></p>
            `
        });

        if (error) throw error;
        res.status(200).send(`Gửi mail thành công! ID: ${data.id}`);
        
    } catch (err) {
        res.status(500).send(`Lỗi gửi mail: ${err.message}`);
    }
});

// Xuất app ra cho Vercel sử dụng
module.exports = app;