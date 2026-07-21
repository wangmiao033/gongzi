(() => {
  'use strict';

  let resendTimer = null;
  let resendSeconds = 0;

  function setMessage(messageElement, text, ok = false) {
    if (!messageElement) return;
    messageElement.textContent = text;
    messageElement.classList.toggle('ok', ok);
  }

  function startCountdown(button) {
    clearInterval(resendTimer);
    resendSeconds = 60;
    button.disabled = true;
    button.textContent = `${resendSeconds} 秒后重发`;
    resendTimer = setInterval(() => {
      resendSeconds -= 1;
      if (resendSeconds <= 0) {
        clearInterval(resendTimer);
        button.disabled = false;
        button.textContent = '获取验证码';
        return;
      }
      button.textContent = `${resendSeconds} 秒后重发`;
    }, 1000);
  }

  function install() {
    const overlay = document.querySelector('.cloud-auth-overlay');
    const card = overlay?.querySelector('.cloud-auth-card');
    const emailInput = overlay?.querySelector('#cloudEmail');
    const passwordInput = overlay?.querySelector('#cloudPassword');
    const passwordField = passwordInput?.closest('.cloud-auth-field');
    const passwordActions = overlay?.querySelector('.cloud-auth-actions');
    const authLinks = overlay?.querySelector('.cloud-auth-links');
    const resetButton = overlay?.querySelector('#cloudReset');
    const message = overlay?.querySelector('#cloudAuthMessage');
    const description = card?.querySelector('p');

    if (!card || !emailInput || !passwordField || !passwordActions || card.dataset.otpInstalled === '1') return false;
    card.dataset.otpInstalled = '1';

    const methodTabs = document.createElement('div');
    methodTabs.className = 'cloud-auth-methods';
    methodTabs.innerHTML = `
      <button type="button" class="cloud-auth-method active" id="cloudPasswordTab">密码登录</button>
      <button type="button" class="cloud-auth-method" id="cloudOtpTab">邮箱验证码</button>
    `;
    description?.insertAdjacentElement('afterend', methodTabs);

    const otpField = document.createElement('div');
    otpField.className = 'cloud-auth-field cloud-otp-field';
    otpField.hidden = true;
    otpField.innerHTML = `
      <label for="cloudOtpCode">邮件验证码</label>
      <div class="cloud-otp-row">
        <input id="cloudOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入 6 位验证码">
        <button type="button" class="cloud-auth-secondary cloud-send-otp" id="cloudSendOtp">获取验证码</button>
      </div>
      <div class="cloud-otp-tip">仅支持已注册邮箱。验证码发送后，请在邮箱中查看；如果邮件显示登录链接，也可直接点击链接登录。</div>
    `;
    passwordField.insertAdjacentElement('afterend', otpField);

    const otpActions = document.createElement('div');
    otpActions.className = 'cloud-auth-actions cloud-otp-actions';
    otpActions.hidden = true;
    otpActions.innerHTML = '<button type="button" class="cloud-auth-primary" id="cloudVerifyOtp">验证码登录并同步</button>';
    passwordActions.insertAdjacentElement('afterend', otpActions);

    const passwordTab = methodTabs.querySelector('#cloudPasswordTab');
    const otpTab = methodTabs.querySelector('#cloudOtpTab');
    const otpInput = otpField.querySelector('#cloudOtpCode');
    const sendOtpButton = otpField.querySelector('#cloudSendOtp');
    const verifyOtpButton = otpActions.querySelector('#cloudVerifyOtp');

    function setMode(mode) {
      const otpMode = mode === 'otp';
      passwordTab.classList.toggle('active', !otpMode);
      otpTab.classList.toggle('active', otpMode);
      passwordField.hidden = otpMode;
      passwordActions.hidden = otpMode;
      otpField.hidden = !otpMode;
      otpActions.hidden = !otpMode;
      if (resetButton) resetButton.hidden = otpMode;
      if (otpMode) {
        setMessage(message, '填写已注册邮箱，获取 6 位验证码。', true);
        emailInput.focus();
      } else {
        setMessage(message, '');
        passwordInput?.focus();
      }
    }

    passwordTab.addEventListener('click', () => setMode('password'));
    otpTab.addEventListener('click', () => setMode('otp'));

    sendOtpButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        setMessage(message, '请先填写登录邮箱。');
        emailInput.focus();
        return;
      }

      const client = window.PayrollCloud?.getClient?.();
      if (!client) {
        setMessage(message, '云端登录组件尚未就绪，请刷新页面后重试。');
        return;
      }

      sendOtpButton.disabled = true;
      setMessage(message, '正在发送验证码…', true);
      try {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: false,
            emailRedirectTo: location.origin
          }
        });
        if (error) throw error;
        setMessage(message, '邮件已发送。请输入邮件中的 6 位验证码；若收到登录链接，可直接点击。', true);
        startCountdown(sendOtpButton);
        otpInput.focus();
      } catch (error) {
        sendOtpButton.disabled = false;
        const raw = String(error?.message || error);
        const friendly = raw.includes('rate limit')
          ? '发送过于频繁，请稍后再试。'
          : raw.includes('not authorized')
            ? '该邮箱暂时无法接收系统邮件，请检查邮件服务配置。'
            : raw;
        setMessage(message, friendly);
      }
    });

    verifyOtpButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const token = otpInput.value.trim();
      if (!email) return setMessage(message, '请填写登录邮箱。');
      if (!/^\d{6}$/.test(token)) return setMessage(message, '请输入邮件中的 6 位数字验证码。');

      const client = window.PayrollCloud?.getClient?.();
      if (!client) return setMessage(message, '云端登录组件尚未就绪，请刷新页面后重试。');

      verifyOtpButton.disabled = true;
      setMessage(message, '正在验证并读取云端工资数据…', true);
      try {
        const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        if (!data?.session) throw new Error('验证码验证成功，但未建立登录会话，请重新获取验证码。');
        setMessage(message, '登录成功，正在打开云端工资账套…', true);
        location.reload();
      } catch (error) {
        const raw = String(error?.message || error);
        const friendly = raw.includes('expired') || raw.includes('invalid')
          ? '验证码错误或已过期，请重新获取。'
          : raw;
        setMessage(message, friendly);
      } finally {
        verifyOtpButton.disabled = false;
      }
    });

    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    });
    otpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') verifyOtpButton.click();
    });

    const style = document.createElement('style');
    style.id = 'payroll-email-otp-style';
    style.textContent = `
      .cloud-auth-methods{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:4px;margin:-4px 0 16px;background:#f1f5f9;border-radius:11px}
      .cloud-auth-method{height:36px;border:0;border-radius:8px;background:transparent;color:#64748b;font:inherit;font-size:14px;font-weight:600;cursor:pointer}
      .cloud-auth-method.active{background:#fff;color:#0f7c91;box-shadow:0 1px 4px rgba(15,23,42,.12)}
      .cloud-otp-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
      .cloud-otp-row input{min-width:0;letter-spacing:.24em;font-weight:700}
      .cloud-send-otp{height:44px;white-space:nowrap}
      .cloud-otp-tip{margin-top:7px;color:#64748b;font-size:12px;line-height:1.55}
    `;
    document.head.appendChild(style);

    if (authLinks) authLinks.style.alignItems = 'center';
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts > 80) clearInterval(timer);
  }, 100);
})();
