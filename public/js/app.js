document.addEventListener('DOMContentLoaded', () => {
    // --- STATE: Nơi lưu trữ trạng thái của ứng dụng ---
    const state = {
        currentUser: null,
        courses: [],
        token: localStorage.getItem('token'), // Lấy token từ bộ nhớ trình duyệt
    };

    // --- DOM ELEMENTS: Lấy các phần tử HTML cần tương tác ---
    const loadingScreen = document.getElementById('loadingScreen');
    const navButtons = document.getElementById('navButtons');
    const heroSection = document.getElementById('heroSection');
    const statsSection = document.getElementById('statsSection');
    const addCourseSection = document.getElementById('addCourseSection');
    const coursesGrid = document.getElementById('coursesGrid');
    const totalCoursesEl = document.getElementById('totalCourses');
    const totalDownloadsEl = document.getElementById('totalDownloads');
    // const totalUsersEl = document.getElementById('totalUsers'); // Sẽ cần API để lấy số user

    const loginModal = document.getElementById('loginModal');
    const registerModal = document.getElementById('registerModal');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const addCourseForm = document.getElementById('addCourseForm');

    // --- API HELPER: Hàm chung để gọi API, tránh lặp code ---
    const apiRequest = async (endpoint, method = 'GET', body = null) => {
        const headers = { 'Content-Type': 'application/json' };
        if (state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }

        const options = { method, headers };
        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(`/api${endpoint}`, options);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) logout(); // Token hết hạn -> tự động đăng xuất
                const errorMsg = data.msg || (data.errors ? data.errors[0].msg : 'Có lỗi xảy ra, vui lòng thử lại.');
                throw new Error(errorMsg);
            }
            return data;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    };

    // --- UI FUNCTIONS ---
    const showNotification = (message, type = 'success') => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 3000);
    };

    const updateUI = () => {
        if (state.currentUser) {
            navButtons.innerHTML = `
                <span style="color: white; margin-right: 1rem; align-self: center;">
                    <i class="fas fa-user"></i> Chào, ${state.currentUser.name}
                    ${state.currentUser.role === 'admin' ? '<i class="fas fa-crown" style="color: gold; margin-left: 5px;"></i>' : ''}
                </span>
                <button class="btn btn-primary" onclick="toggleAddCourse()">
                    <i class="fas fa-plus"></i> Thêm khóa học
                </button>
                <button class="btn btn-danger" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Đăng xuất
                </button>
            `;
            heroSection.style.display = 'none';
            statsSection.style.display = 'grid';
        } else {
            navButtons.innerHTML = `
                <a href="#" class="btn btn-secondary" onclick="showLogin()">
                    <i class="fas fa-sign-in-alt"></i> Đăng nhập
                </a>
                <a href="#" class="btn btn-primary" onclick="showRegister()">
                    <i class="fas fa-user-plus"></i> Đăng ký
                </a>
            `;
            heroSection.style.display = 'block';
            statsSection.style.display = 'none';
            addCourseSection.style.display = 'none';
        }
    };

    const renderCourses = () => {
        if (state.courses.length === 0) {
            coursesGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: rgba(255,255,255,0.8); padding: 3rem;"><h3>Chưa có khóa học nào được chia sẻ.</h3></div>`;
            return;
        }
        coursesGrid.innerHTML = state.courses.map(course => {
            const canModify = state.currentUser && (state.currentUser.role === 'admin' || state.currentUser.id === course.author);
            return `
            <div class="course-card">
                <div class="course-title">${course.title}</div>
                <div class="course-description">${course.description || 'Không có mô tả'}</div>
                <div class="course-meta">
                    <span><i class="fas fa-user"></i> ${course.authorName}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(course.createdAt).toLocaleDateString('vi-VN')}</span>
                    <div class="download-count"><i class="fas fa-download"></i> ${course.downloads}</div>
                </div>
                <div class="course-actions">
                    <button class="btn btn-success btn-sm" onclick="downloadCourse('${course._id}', '${course.link}')">
                        <i class="fas fa-download"></i> Tải về
                    </button>
                    ${canModify ? `
                        <button class="btn btn-danger btn-sm" onclick="deleteCourse('${course._id}')">
                            <i class="fas fa-trash"></i> Xóa
                        </button>
                    ` : ''}
                </div>
            </div>`;
        }).join('');
    };

    const updateStats = () => {
        totalCoursesEl.textContent = state.courses.length;
        totalDownloadsEl.textContent = state.courses.reduce((sum, course) => sum + course.downloads, 0);
    };

    // --- MODAL FUNCTIONS (Global scope) ---
    window.showLogin = () => { closeAllModals(); loginModal.style.display = 'flex'; };
    window.showRegister = () => { closeAllModals(); registerModal.style.display = 'flex'; };
    window.closeAllModals = () => {
        [loginModal, registerModal].forEach(modal => modal.style.display = 'none');
    };
    window.toggleAddCourse = () => {
        const isHidden = addCourseSection.style.display === 'none' || !addCourseSection.style.display;
        addCourseSection.style.display = isHidden ? 'block' : 'none';
    };

    // --- CORE LOGIC FUNCTIONS ---
    const login = async (email, password) => {
        try {
            const data = await apiRequest('/auth/login', 'POST', { email, password });
            state.token = data.token;
            state.currentUser = data.user;
            localStorage.setItem('token', data.token);
            updateUI();
            closeAllModals();
            showNotification(`Chào mừng ${data.user.name}!`, 'success');
            renderCourses(); // Tải lại khóa học để hiển thị nút
        } catch (error) { /* showNotification đã xử lý lỗi */ }
    };

    const register = async (name, email, password) => {
        try {
            await apiRequest('/auth/register', 'POST', { name, email, password });
            showNotification('Đăng ký thành công! Vui lòng đăng nhập.', 'success');
            closeAllModals();
            showLogin();
        } catch (error) { /* showNotification đã xử lý lỗi */ }
    };

    window.logout = () => {
        localStorage.removeItem('token');
        state.token = null;
        state.currentUser = null;
        updateUI();
        renderCourses();
        showNotification('Đã đăng xuất!', 'success');
    };

    const loadCourses = async () => {
        try {
            state.courses = await apiRequest('/courses');
            renderCourses();
            updateStats();
        } catch (error) { /* showNotification đã xử lý lỗi */ }
    };

    const addCourse = async (title, description, link, category) => {
        try {
            const newCourse = await apiRequest('/courses', 'POST', { title, description, link, category });
            state.courses.unshift(newCourse);
            renderCourses();
            updateStats();
            addCourseForm.reset();
            addCourseSection.style.display = 'none';
            showNotification('Thêm khóa học thành công!', 'success');
        } catch (error) { /* showNotification đã xử lý lỗi */ }
    };
    
    window.deleteCourse = async (courseId) => {
        if (confirm('Bạn có chắc chắn muốn xóa khóa học này?')) {
            try {
                await apiRequest(`/courses/${courseId}`, 'DELETE');
                state.courses = state.courses.filter(c => c._id !== courseId);
                renderCourses();
                updateStats();
                showNotification('Đã xóa khóa học!', 'success');
            } catch (error) { /* showNotification đã xử lý lỗi */ }
        }
    };

    window.downloadCourse = async (courseId, link) => {
        try {
            apiRequest(`/courses/download/${courseId}`, 'PUT');
            const course = state.courses.find(c => c._id === courseId);
            if (course) course.downloads++;
            renderCourses();
            updateStats();
            window.open(link, '_blank');
        } catch(error) { /* showNotification đã xử lý lỗi */ }
    };


    // --- EVENT LISTENERS ---
    loginForm.addEventListener('submit', e => {
        e.preventDefault();
        const email = e.target.elements.loginEmail.value;
        const password = e.target.elements.loginPassword.value;
        login(email, password);
    });

    registerForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = e.target.elements.registerName.value;
        const email = e.target.elements.registerEmail.value;
        const password = e.target.elements.registerPassword.value;
        const confirmPassword = e.target.elements.confirmPassword.value;
        if (password !== confirmPassword) {
            return showNotification('Mật khẩu xác nhận không khớp!', 'error');
        }
        register(name, email, password);
    });

    addCourseForm.addEventListener('submit', e => {
        e.preventDefault();
        const title = e.target.elements.courseTitle.value;
        const description = e.target.elements.courseDescription.value;
        const link = e.target.elements.courseLink.value;
        const category = e.target.elements.courseCategory.value;
        addCourse(title, description, link, category);
    });

    // --- INITIALIZATION ---
    const init = async () => {
        loadingScreen.style.display = 'none'; // Tạm thời ẩn nhanh
        if (state.token) {
            try {
                const user = await apiRequest('/auth'); // Lấy thông tin user nếu có token
                state.currentUser = { id: user._id, name: user.name, role: user.role };
            } catch (error) {
                // Token cũ/hết hạn, không cần làm gì, logout đã xử lý
            }
        }
        updateUI();
        await loadCourses();
    };

    init();
});