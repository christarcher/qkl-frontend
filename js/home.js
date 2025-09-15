import {baseURL} from '../config.js';

const notyf = new Notyf();
////////用户信息相关////////
var id = '';
var username = '';

async function getUserInfo() {
    let timeoutId;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${baseURL}/api/users/getUserInfo`, {
            method: 'GET',
            signal: controller.signal
        });
        if (response.status === 200) {
            const result = await response.json();
            id = result.id;
            username = result.username;
            document.getElementById('username').textContent = username;
            document.getElementById('id').textContent = id;
            notyf.success('登录成功');
        } else if (response.status === 401) {
            notyf.error('你还没有登录, 即将跳回登录页面');
            setTimeout(() => window.location.href=`${baseURL}login.html`, 1000);
        } else {
            throw new Error(`未知API响应 ${response.status}`);
        }
    } catch (error) {
        notyf.error(`获取用户信息出错: ${error}`);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

////////用户课程相关////////
const initJsonObjectString = `
{
    "autoSign": false,
    "courses": [
        {
            "courseId": "123456789987654321",
            "courseName": "计算机网络原理 (测试课程)",
            "courseTime": "周八 1-16节",
            "checkInCount": 6,
            "enabled": true
        }
    ]
}`
var jsonData = JSON.parse(initJsonObjectString);
var hasUnsavedChanges = false;

// 从本地获取用户课程
async function getUserCourses() {
    let timeoutId;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${baseURL}/api/home/getUserCourses`, {
            method: 'GET',
            signal: controller.signal
        });
        if (response.status === 200) {
            jsonData = await response.json();
            console.log(`[getUserCourses]: 获取到的用户课程: ${JSON.stringify(jsonData.courses)}`);
            notyf.success('成功获取用户课程信息');
        } else {
            throw new Error(`请求失败 ${response.status}`);
        }
    } catch (error) {
        notyf.error(`获取用户课程信息出错: ${error}`);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
    renderCourses();
}

// 从教务处环境拉取最新的课程(在选课退课前后使用)
async function syncUserCourses() {
    let timeoutId;
    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch(`${baseURL}/api/home/syncUserCourses`, {
            method: 'GET',
            signal: controller.signal
        });
        if (response.status === 200) {
            const coursesArray = await response.json();
            console.log(`[syncUserCourses]: 获取到的用户课程: ${JSON.stringify(coursesArray)}`);
            jsonData = {
                autoSign: false,
                courses: coursesArray
            };
            notyf.success('成功从教务处获取最新课程');
        } else {
            throw new Error(`请求失败 ${response.status}`);
        }
    } catch (error) {
        notyf.error(`从教务处获取课程信息出错: ${error}`);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
    renderCourses();
}

// 保存用户课程信息
async function saveUserCourses() {
    if (!hasUnsavedChanges) {
        notyf.error('没有需要保存的更改');
        return;
    }
    if (jsonData === JSON.parse(initJsonObjectString) || !jsonData) {
        notyf.error('请先初始化课程数据');
        return;
    }

    const allDisabled = jsonData.courses.every(course => course.enabled === false);
    if (allDisabled) {
        console.log('所有课程都已经关闭,置autoSign为false');
        jsonData.autoSign = false;
    } else {
        console.log('有课程需要自动签到,置autoSign为true');
        jsonData.autoSign = true;
    }

    let timeoutId;
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
        const response = await fetch(`${baseURL}/api/home/saveUserCourses`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(jsonData),
            signal: controller.signal
        });
        
        if (response.status === 200) {
            hasUnsavedChanges = false;
            notyf.success('成功保存课程信息');
        } else {
            throw new Error(`服务器返回错误 ${response.status}`);
        }
    } catch (error) {
        notyf.error(`保存课程出错: ${error}`);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }
}

// 在前端渲染课程
function renderCourses() {
    try {
        const tbody = document.querySelector('#coursesTable tbody');
        if (!tbody) {
            throw new Error('页面错误: 找不到表格主体元素');
        }
        tbody.innerHTML = '';

        jsonData.courses.forEach(course => {
            const row = document.createElement('tr');
            
            // 课程ID列
            const idCell = document.createElement('td');
            idCell.textContent = course.courseId;
            row.appendChild(idCell);
            
            // 课程名称列
            const nameCell = document.createElement('td');
            nameCell.textContent = course.courseName;
            row.appendChild(nameCell);
            
            // 课程时间列
            const timeCell = document.createElement('td');
            timeCell.textContent = course.courseTime;
            row.appendChild(timeCell);
            
            // 签到次数列
            const checkInCell = document.createElement('td');
            checkInCell.textContent = course.checkInCount;
            row.appendChild(checkInCell);
            
            // 操作列 - 添加开关
            const actionCell = document.createElement('td');
            actionCell.className = 'action-cell';
            
            // 创建开关
            const switchLabel = document.createElement('label');
            switchLabel.className = 'switch';
            
            const switchInput = document.createElement('input');
            switchInput.type = 'checkbox';
            switchInput.checked = course.enabled;
            switchInput.dataset.courseId = course.courseId;
            switchInput.addEventListener('change', function() {
                // 找到对应的课程并更新enabled状态
                const courseId = this.dataset.courseId;
                const courseIndex = jsonData.courses.findIndex(c => c.courseId === courseId);
                if (courseIndex !== -1) {
                    jsonData.courses[courseIndex].enabled = this.checked;
                    hasUnsavedChanges = true;
                }
            });
            
            const slider = document.createElement('span');
            slider.className = 'slider round';
            
            switchLabel.appendChild(switchInput);
            switchLabel.appendChild(slider);
            actionCell.appendChild(switchLabel);
            
            row.appendChild(actionCell);
            tbody.appendChild(row);
        });
    } catch (error) {
        notyf.error(`渲染课程失败: ${error}`);
    }
}

////////页面加载完毕后执行////////
document.addEventListener('DOMContentLoaded', function() {
    renderCourses();
    getUserInfo();
    getUserCourses();
    fetchLog();
    
    // 全部启用按钮
    document.getElementById('enableAllBtn').addEventListener('click', function() {
        jsonData.courses.forEach(course => course.enabled = true);
        hasUnsavedChanges = true;
        renderCourses();
    });
    
    // 全部禁用按钮
    document.getElementById('disableAllBtn').addEventListener('click', function() {
        jsonData.courses.forEach(course => course.enabled = false);
        hasUnsavedChanges = true;
        renderCourses();
    });
    
    // 刷新课程按钮
    document.getElementById('fetchAllBtn').addEventListener('click', function() {
        getUserCourses();
    });

    // 从教务处同步按钮
    document.getElementById('updateAllBtn').addEventListener('click', function() {
        syncUserCourses();
    });
    
    // 保存课程设置按钮
    document.getElementById('saveAllBtn').addEventListener('click', function() {
        saveUserCourses();
    });
    // 注销按钮
    document.getElementById('logoutBtn').addEventListener('click', function() {
        logout();
    });
});
////////日志相关////////
document.getElementById('fetchLogBtn').addEventListener('click', function() {
    fetchLog();
});

function addLogMessage(level, message) {
    const logContainer = document.getElementById('logContainer');
    const logEntry = document.createElement('div');
    
    // 根据级别设置不同的类名
    let levelClass = 'log-info'; // 默认为info级别
    // 将数字级别转换为类名
    switch(level) {
        case 1:
            levelClass = 'log-info';
            break;
        case 2:
            levelClass = 'log-debug';
            break;
        case 3:
            levelClass = 'log-warn';
            break;
        case 4:
            levelClass = 'log-error';
            break;
        default:
            levelClass = 'log-info';
    }
    
    // 添加消息内容
    const messageSpan = document.createElement('span');
    messageSpan.className = levelClass;
    messageSpan.textContent = message.replace(/\t/g, ' ');
    
    logEntry.appendChild(messageSpan);
    logContainer.appendChild(logEntry);
    logContainer.scrollTop = logContainer.scrollHeight; // 自动滚动到底部
}

// 获取日志的函数
async function fetchLog() {
    let timeoutId;
    let logs = [];

    try {
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${baseURL}/api/home/getLog`, {
            method: 'GET',
            signal: controller.signal
        });
        
        if (response.ok) {
            logs = await response.json();
        } else {
            throw new Error(`获取日志失败: ${response.status}`);
        }
    } catch (error) {
        logs = [
            {level: 1, message: "测试消息"},
            {level: 4, message: `获取日志出错: ${error.message}`}
        ];
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
    }

    document.getElementById('logContainer').innerHTML = '';

    logs.forEach(log => {
        addLogMessage(log.level, log.message);
    });
}

// 注销
async function logout() {
  fetch(`${baseURL}/api/home/logout`, {
    method: 'GET',
    credentials: 'include'
  })
  .then(response => {
    notyf.success('注销成功, 3秒后跳回登录页');
    setTimeout(() => window.location.href = `${baseURL}login.html`, 3000);
  })
}