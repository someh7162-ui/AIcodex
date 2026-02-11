// 课程数据存储
let courses = JSON.parse(localStorage.getItem('courses')) || [];
let semesterStart = localStorage.getItem('semesterStart') || null;
let currentEditingCourse = null;

// 时间段配置
const timeSlots = [
    { id: 1, name: '第1-2节', time: '08:00-09:40' },
    { id: 2, name: '第3-4节', time: '10:00-11:40' },
    { id: 3, name: '第5-6节', time: '14:00-15:40' },
    { id: 4, name: '第7-8节', time: '16:00-17:40' },
    { id: 5, name: '第9-10节', time: '19:00-20:40' }
];

const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

// DOM元素
const modal = document.getElementById('courseModal');
const detailModal = document.getElementById('courseDetailModal');
const addCourseBtn = document.getElementById('addCourseBtn');
const courseForm = document.getElementById('courseForm');
const cancelBtn = document.getElementById('cancelBtn');
const closeBtn = document.querySelector('.close');
const closeDetailBtn = document.querySelector('.close-detail');
const scheduleBody = document.getElementById('scheduleBody');

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    loadSemesterSettings();
    renderSchedule();
    attachEventListeners();
});

// 加载学期设置
function loadSemesterSettings() {
    if (semesterStart) {
        document.getElementById('semesterStart').value = semesterStart;
    }
}

// 渲染课表
function renderSchedule() {
    scheduleBody.innerHTML = '';
    
    timeSlots.forEach(slot => {
        const row = document.createElement('tr');
        
        // 时间列
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.innerHTML = `<div><strong>${slot.name}</strong><br>${slot.time}</div>`;
        row.appendChild(timeCell);
        
        // 每天的课程
        for (let day = 1; day <= 7; day++) {
            const cell = document.createElement('td');
            cell.dataset.day = day;
            cell.dataset.slot = slot.id;
            
            // 查找该时间段的课程
            const coursesInSlot = courses.filter(c => 
                c.dayOfWeek === day && c.timeSlot === slot.id
            );
            
            coursesInSlot.forEach((course, index) => {
                const courseCard = createCourseCard(course, index);
                cell.appendChild(courseCard);
            });
            
            row.appendChild(cell);
        }
        
        scheduleBody.appendChild(row);
    });
}

// 创建课程卡片
function createCourseCard(course, index) {
    const card = document.createElement('div');
    card.className = `course-card color-${(index % 5) + 1}`;
    card.innerHTML = `
        <div class="course-name">${course.courseName}</div>
        <div class="course-info">👨‍🏫 ${course.teacher}</div>
        <div class="course-info">📍 ${course.location}</div>
        <div class="course-info">📅 ${course.startWeek}-${course.endWeek}周</div>
    `;
    
    card.addEventListener('click', () => showCourseDetail(course));
    
    return card;
}

// 显示课程详情
function showCourseDetail(course) {
    document.getElementById('detailCourseName').textContent = course.courseName;
    document.getElementById('detailTeacher').textContent = course.teacher;
    document.getElementById('detailLocation').textContent = course.location;
    
    const timeSlot = timeSlots.find(t => t.id === course.timeSlot);
    const dayName = weekDays[course.dayOfWeek - 1];
    document.getElementById('detailTime').textContent = 
        `${dayName} ${timeSlot.name} (${timeSlot.time})`;
    
    let weeksText = `第${course.startWeek}-${course.endWeek}周`;
    if (course.weeks) {
        weeksText += ` (${course.weeks})`;
    }
    document.getElementById('detailWeeks').textContent = weeksText;
    
    // 编辑按钮
    document.getElementById('editCourseBtn').onclick = () => {
        detailModal.style.display = 'none';
        editCourse(course);
    };
    
    // 删除按钮
    document.getElementById('deleteCourseBtn').onclick = () => {
        if (confirm('确定要删除这门课程吗？')) {
            deleteCourse(course);
            detailModal.style.display = 'none';
        }
    };
    
    detailModal.style.display = 'block';
}

// 添加课程
function addCourse() {
    currentEditingCourse = null;
    courseForm.reset();
    modal.style.display = 'block';
}

// 编辑课程
function editCourse(course) {
    currentEditingCourse = course;
    
    document.getElementById('courseName').value = course.courseName;
    document.getElementById('teacher').value = course.teacher;
    document.getElementById('location').value = course.location;
    document.getElementById('dayOfWeek').value = course.dayOfWeek;
    document.getElementById('timeSlot').value = course.timeSlot;
    document.getElementById('startWeek').value = course.startWeek;
    document.getElementById('endWeek').value = course.endWeek;
    document.getElementById('weeks').value = course.weeks || '';
    
    modal.style.display = 'block';
}

// 删除课程
function deleteCourse(course) {
    courses = courses.filter(c => c !== course);
    saveCourses();
    renderSchedule();
}

// 保存课程
function saveCourse(e) {
    e.preventDefault();
    
    const courseData = {
        courseName: document.getElementById('courseName').value.trim(),
        teacher: document.getElementById('teacher').value.trim(),
        location: document.getElementById('location').value.trim(),
        dayOfWeek: parseInt(document.getElementById('dayOfWeek').value),
        timeSlot: parseInt(document.getElementById('timeSlot').value),
        startWeek: parseInt(document.getElementById('startWeek').value),
        endWeek: parseInt(document.getElementById('endWeek').value),
        weeks: document.getElementById('weeks').value.trim()
    };
    
    if (currentEditingCourse) {
        // 编辑现有课程
        Object.assign(currentEditingCourse, courseData);
    } else {
        // 添加新课程
        courses.push(courseData);
    }
    
    saveCourses();
    renderSchedule();
    modal.style.display = 'none';
    courseForm.reset();
}

// 保存到本地存储
function saveCourses() {
    localStorage.setItem('courses', JSON.stringify(courses));
}

// 导出为Excel (CSV格式)
function exportToExcel() {
    if (courses.length === 0) {
        alert('课表为空，无法导出！');
        return;
    }
    
    let csv = '\uFEFF课程名称,任课教师,上课地点,星期,节次,时间,开始周,结束周,周次说明\n';
    
    courses.forEach(course => {
        const dayName = weekDays[course.dayOfWeek - 1];
        const timeSlot = timeSlots.find(t => t.id === course.timeSlot);
        
        csv += `"${course.courseName}","${course.teacher}","${course.location}",`;
        csv += `"${dayName}","${timeSlot.name}","${timeSlot.time}",`;
        csv += `${course.startWeek},${course.endWeek},"${course.weeks || '每周'}"\n`;
    });
    
    downloadFile(csv, 'my-schedule.csv', 'text/csv;charset=utf-8;');
}

// 导出为iCalendar
function exportToICS() {
    if (courses.length === 0) {
        alert('课表为空，无法导出！');
        return;
    }
    
    if (!semesterStart) {
        alert('请先设置学期开始日期！');
        return;
    }
    
    let ics = 'BEGIN:VCALENDAR\n';
    ics += 'VERSION:2.0\n';
    ics += 'PRODID:-//我的课表//CN\n';
    ics += 'CALSCALE:GREGORIAN\n';
    ics += 'METHOD:PUBLISH\n';
    ics += 'X-WR-CALNAME:我的课表\n';
    ics += 'X-WR-TIMEZONE:Asia/Shanghai\n';
    
    const startDate = new Date(semesterStart);
    
    courses.forEach((course, index) => {
        const timeSlot = timeSlots.find(t => t.id === course.timeSlot);
        const [startTime, endTime] = timeSlot.time.split('-');
        
        // 计算每周的日期
        for (let week = course.startWeek; week <= course.endWeek; week++) {
            // 如果有周次限制，检查是否符合
            if (course.weeks && !checkWeekMatch(week, course.weeks)) {
                continue;
            }
            
            const eventDate = new Date(startDate);
            eventDate.setDate(eventDate.getDate() + (week - 1) * 7 + (course.dayOfWeek - 1));
            
            const startDateTime = new Date(eventDate);
            const [startHour, startMin] = startTime.split(':');
            startDateTime.setHours(parseInt(startHour), parseInt(startMin), 0);
            
            const endDateTime = new Date(eventDate);
            const [endHour, endMin] = endTime.split(':');
            endDateTime.setHours(parseInt(endHour), parseInt(endMin), 0);
            
            ics += 'BEGIN:VEVENT\n';
            ics += `UID:${index}-${week}@my-schedule\n`;
            ics += `DTSTAMP:${formatICSDate(new Date())}\n`;
            ics += `DTSTART:${formatICSDate(startDateTime)}\n`;
            ics += `DTEND:${formatICSDate(endDateTime)}\n`;
            ics += `SUMMARY:${course.courseName}\n`;
            ics += `LOCATION:${course.location}\n`;
            ics += `DESCRIPTION:任课教师: ${course.teacher}\\n第${week}周\n`;
            ics += 'END:VEVENT\n';
        }
    });
    
    ics += 'END:VCALENDAR';
    
    downloadFile(ics, 'my-schedule.ics', 'text/calendar;charset=utf-8;');
}

// 检查周次是否匹配
function checkWeekMatch(week, weeksStr) {
    if (!weeksStr) return true;
    
    if (weeksStr === '单周') return week % 2 === 1;
    if (weeksStr === '双周') return week % 2 === 0;
    
    const parts = weeksStr.split(',');
    for (let part of parts) {
        part = part.trim();
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim()));
            if (week >= start && week <= end) return true;
        } else {
            if (week === parseInt(part)) return true;
        }
    }
    return false;
}

// 格式化ICS日期
function formatICSDate(date) {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// 下载文件
function downloadFile(content, filename, type) {
    const blob = new Blob([content], { type: type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// 打印课表
function printSchedule() {
    window.print();
}

// 清空课表
function clearAll() {
    if (confirm('确定要清空所有课程吗？此操作不可恢复！')) {
        courses = [];
        saveCourses();
        renderSchedule();
    }
}

// 保存学期设置
function saveSemesterSettings() {
    const date = document.getElementById('semesterStart').value;
    if (date) {
        semesterStart = date;
        localStorage.setItem('semesterStart', date);
        alert('学期开始日期已保存！');
    } else {
        alert('请选择学期开始日期！');
    }
}

// 绑定事件监听器
function attachEventListeners() {
    addCourseBtn.addEventListener('click', addCourse);
    courseForm.addEventListener('submit', saveCourse);
    cancelBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        courseForm.reset();
    });
    
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });
    
    closeDetailBtn.addEventListener('click', () => {
        detailModal.style.display = 'none';
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        if (e.target === detailModal) {
            detailModal.style.display = 'none';
        }
    });
    
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    document.getElementById('exportIcsBtn').addEventListener('click', exportToICS);
    document.getElementById('printBtn').addEventListener('click', printSchedule);
    document.getElementById('clearAllBtn').addEventListener('click', clearAll);
    document.getElementById('saveSemesterBtn').addEventListener('click', saveSemesterSettings);
}

// 键盘快捷键
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: 新建课程
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        addCourse();
    }
    
    // ESC: 关闭弹窗
    if (e.key === 'Escape') {
        modal.style.display = 'none';
        detailModal.style.display = 'none';
    }
});
