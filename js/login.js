import { baseURL, enableRecaptcha } from '../config.js';
let recaptchaWidgetId = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded');
    checkIfLogin();
    handleLogin();
});

async function checkIfLogin() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const errorElement = document.getElementById('loginErrorMessage');
    
    try {
        const response = await fetch(`${baseURL}/api/users/getUserInfo`, {
            method: 'GET',
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.status === 200) {
            errorElement.textContent = '✓ 您已经登录，正在跳转...';
            errorElement.style.color = '#4CAF50';
            errorElement.classList.add('show');
            setTimeout(() => window.location.href = `${baseURL}home.html`, 1000);
            return true;
        } else {
            return false;
        }
    } catch (error) {
        clearTimeout(timeoutId);
        console.error("请求失败或超时:", error); // 可供调试
        return false;
    }
}

async function doLogin(id, password) {
    // 获取登录表单的输入值
    const recaptchaResult = grecaptcha.getResponse();
    const errorElement = document.getElementById('loginErrorMessage');
    const idRegex = /^\d{8}$/;

    errorElement.classList.remove('show');

    // 验证输入
    if (enableRecaptcha && recaptchaResult.length === 0) {
        errorElement.textContent = '⚠ 未通过人机验证';
        errorElement.classList.add('show');
        return;
    }
    if (!id || !password) {
        errorElement.textContent = '⚠ 请输入学号和密码';
        errorElement.classList.add('show');
        return;
    }
    if (!idRegex.test(id)) {
        errorElement.textContent = '⚠ 学号格式错误，请重新输入';
        errorElement.classList.add('show');
        return;
    }

    document.getElementById('loginBtn').disabled = true;

    try {
        // 发送登录请求
        const loginData = {};
        loginData.id = id;
        loginData.password = password;
        if (enableRecaptcha) {
            loginData.recaptcha = recaptchaResult;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${baseURL}/api/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData),
            signal: controller.signal
        });

        if (response.status === 200) {
            errorElement.textContent = '✓ 登录成功，正在跳转...';
            errorElement.style.color = '#4CAF50';
            errorElement.classList.add('show');
            setTimeout(() => {
                window.location.href = `${baseURL}home.html`;
            }, 1000);
        } else if (response.status === 401) {
            errorElement.textContent = `⚠ 用户名或密码错误`;
            errorElement.classList.add('show');
            if (enableRecaptcha && window.recaptchaWidgetId !== null) {
                grecaptcha.reset(window.recaptchaWidgetId);
            }
        } else {
            errorElement.textContent = `⚠ 登录失败: ${await response.text()}`;
            errorElement.classList.add('show');
        }
    } catch (error) {
        errorElement.textContent = `⚠ 登录出错: ${error}`;
        errorElement.classList.add('show');
    }
    document.getElementById('loginBtn').disabled = false;
}

function handleLogin() {
    const loginForm = document.getElementById('loginForm');
    const idInput = document.getElementById('id');
    const passwordInput = document.getElementById('password');
    const rememberCheckbox = document.getElementById('remember');
    const loginBtn = document.getElementById('loginBtn');

    loadSavedCredentials();

    loginBtn.addEventListener('click', function(event) {
        event.preventDefault();
        
        const id = idInput.value;
        const password = passwordInput.value;
        const remember = rememberCheckbox.checked;
        if (remember) {
            saveCredentials(id, password);
        } else {
            clearSavedCredentials();
        }
        
        doLogin(id, password);
    });
    
    rememberCheckbox.addEventListener('change', function() {
        if (!this.checked) {
            clearSavedCredentials(); // 如果用户取消勾选，立即清除存储的凭据
        }
    });
    
    function saveCredentials(id, password) {
        if (id.length === 0 || password.length === 0) {
            return;
        }
        const credentials = {
            id: id,
            password: btoa(password),
            timestamp: new Date().getTime()
        };
        localStorage.setItem('userCredentials', JSON.stringify(credentials));
    }
    
    function loadSavedCredentials() {
        const savedCredentials = localStorage.getItem('userCredentials');
        if (savedCredentials) {
            try {
                const credentials = JSON.parse(savedCredentials);
                const now = new Date().getTime();
                const expire = 7 * 24 * 60 * 60 * 1000; // 检查凭据是否过期
                
                if (now - credentials.timestamp < expire) {
                    idInput.value = credentials.id;
                    passwordInput.value = atob(credentials.password);
                    rememberCheckbox.checked = true;
                } else {
                    clearSavedCredentials();
                }
            } catch (e) {
                console.error('加载保存的凭据时出错:', e);
                clearSavedCredentials();
            }
        }
    }

    function clearSavedCredentials() {
        localStorage.removeItem('userCredentials');
    }
};