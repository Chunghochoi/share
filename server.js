// Nạp các biến môi trường từ file .env
require('dotenv').config();

// Import các thư viện cần thiết
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();

// --- CÁC MIDDLEWARE BẢO MẬT ---

// 1. Helmet: Tự động thiết lập các HTTP headers bảo mật
app.use(helmet());

// 2. CORS: Cho phép các request từ nguồn gốc khác (nếu cần)
app.use(cors());

// 3. Body Parser: Middleware để đọc req.body dưới dạng JSON
app.use(express.json());

// 4. Trust Proxy: Quan trọng khi deploy sau một proxy (như trên Render, Heroku)
// Giúp rate limiter và logging hoạt động với IP thật của người dùng
app.set('trust proxy', 1); 

// 5. Rate Limiter: Chống tấn công brute-force và DoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 150, // Giới hạn mỗi IP 150 requests trong 15 phút
    standardHeaders: true,
    legacyHeaders: false,
    message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút."
});
// Áp dụng limiter cho tất cả các đường dẫn bắt đầu bằng /api/
app.use('/api/', limiter);

// --- KẾT NỐI CƠ SỞ DỮ LIỆU MONGODB ---
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('✅ Kết nối MongoDB thành công!'))
.catch(err => {
    console.error('❌ Lỗi kết nối MongoDB:', err);
    process.exit(1); // Thoát ứng dụng nếu không kết nối được CSDL
});


// --- ĐỊNH NGHĨA CÁC API ROUTES ---
// Tất cả các request tới /api/auth sẽ được xử lý bởi file ./routes/auth.js
app.use('/api/auth', require('./routes/auth'));
// Tất cả các request tới /api/courses sẽ được xử lý bởi file ./routes/courses.js
app.use('/api/courses', require('./routes/courses'));


// --- PHỤC VỤ CÁC FILE STATIC CỦA FRONTEND ---
// Trỏ Express đến thư mục 'public' để phục vụ HTML, CSS, JS
app.use(express.static(path.join(__dirname, 'public')));

// Nếu request không khớp với bất kỳ API hay file tĩnh nào, trả về file index.html
// Điều này quan trọng cho các ứng dụng trang đơn (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- KHỞI ĐỘNG SERVER ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
});