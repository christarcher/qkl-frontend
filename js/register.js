const { baseURL, enableRecaptcha } = await import(`../config.js?t=${Date.now()}`);
let recaptchaWidgetId = null;

document.getElementById('registerBtn').addEventListener('click', function(event) {
    event.preventDefault();
    handleRegister();
});

async function handleRegister() {
    // 获取登录表单的输入值
    const idInput = document.getElementById('id');
    const passwordInput = document.getElementById('password');
    const tokenInput = document.getElementById('token');
    const acceptCheckbox = document.getElementById('accept');
    const registerBtn = document.getElementById('registerBtn');

    const id = idInput.value;
    const password = passwordInput.value;
    const token = tokenInput.value;
    const accept = acceptCheckbox.checked;

    const recaptchaResult = grecaptcha.getResponse();

    const errorElement = document.getElementById('registerErrorMessage');
    const idRegex = /^\d{8}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    errorElement.classList.remove('show');

    // 验证输入
    if (enableRecaptcha && recaptchaResult.length === 0) {
        errorElement.textContent = '⚠ 未通过人机验证';
        errorElement.classList.add('show');
        return;
    }
    if (!id || !password || !token) {
        errorElement.textContent = '⚠ 请输入学号,密码和验证码';
        errorElement.classList.add('show');
        return;
    }
    if (!idRegex.test(id)) {
        errorElement.textContent = '⚠ 学号格式错误，请重新输入';
        errorElement.classList.add('show');
        return;
    }
    if (!passwordRegex.test(password)) {
        errorElement.textContent = '⚠ 请使用带有数字,大小写和符号的强密码!';
        errorElement.classList.add('show');
        return;
    }
    if (!uuidRegex.test(token)) {
        errorElement.textContent = '⚠ 邀请码格式错误,不知道请找管理员获取';
        errorElement.classList.add('show');
        return;
    }
    if (!acceptCheckbox.checked) {
        errorElement.textContent = '⚠ 请查看并同意用户条款';
        errorElement.classList.add('show');
        return;
    }

    document.getElementById('registerBtn').disabled = true;

    try {
        // 发送登录请求
        const registerData = {};
        registerData.id = id;
        registerData.password = password;
        registerData.token = token;
        if (enableRecaptcha) {
            registerData.recaptcha = recaptchaResult;
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${baseURL}/api/users/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData),
            signal: controller.signal
        });

        if (response.status === 200) {
            errorElement.textContent = '✓ 注册成功，请登录';
            errorElement.style.color = '#4CAF50';
            errorElement.classList.add('show');
            setTimeout(() => {
                window.location.href = `login.html`;
            }, 3000);
        } else if (response.status === 409) {
            errorElement.textContent = `⚠ 该用户已经注册过了`;
            errorElement.classList.add('show');
        } else if (response.status  === 401) {
            errorElement.textContent = `⚠ Token错误`;
            errorElement.classList.add('show');
            if (enableRecaptcha && window.recaptchaWidgetId !== null) {
                grecaptcha.reset(window.recaptchaWidgetId);
            }
        } else {
            errorElement.textContent = `⚠ 注册失败: ${await response.text()}`;
            errorElement.classList.add('show');
        }
    } catch (error) {
        errorElement.textContent = `⚠ 注册出错: ${error}`;
        errorElement.classList.add('show');
    }
    document.getElementById('registerBtn').disabled = false;
}