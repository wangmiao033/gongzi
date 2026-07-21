(() => {
  'use strict';

  let resendTimer = null;
  let resendSeconds = 0;

  function setMessage(element, text, ok = false) {
    if (!element) return;
    element.textContent = text;
    element.classList.toggle('ok', ok);
  }

  function friendlyError(error, context = '') {
    const raw = String(error?.message || error || '').trim();
    const text = raw.toLowerCase();
    console.error(`[工资系统${context ? `·${context}` : ''}]`, error);

    if (text.includes('email rate limit exceeded') || text.includes('rate limit')) {
      return '邮件发送次数已达上限，请等待一段时间后再试，或暂时使用密码登录。';
    }
    if (text.includes('invalid login credentials')) return '邮箱或密码不正确，请重新输入。';
    if (text.includes('email not confirmed')) return '邮箱尚未完成验证，请先打开验证邮件完成确认。';
    if (text.includes('user already registered') || text.includes('already been registered')) {
      return '该邮箱已经注册，请直接登录；忘记密码时可使用“忘记密码”。';
    }
    if (text.includes('signup is disabled') || text.includes('signups not allowed')) {
      return '当前暂未开放注册，请联系管理员。';
    }
    if (text.includes('password should be at least') || text.includes('weak password')) {
      return '密码强度不足，请设置至少 8 位并包含字母和数字的密码。';
    }
    if (text.includes('otp') && (text.includes('expired') || text.includes('invalid'))) {
      return '验证码错误或已过期，请重新获取。';
    }
    if (text.includes('token has expired') || text.includes('token is invalid')) {
      return '验证码错误或已过期，请重新获取。';
    }
    if (text.includes('email address not authorized') || text.includes('not authorized')) {
      return '该邮箱暂时无法接收系统邮件，请联系管理员检查邮件发送配置。';
    }
    if (text.includes('network') || text.includes('fetch failed') || text.includes('failed to fetch')) {
      return '网络连接失败，请检查网络后重试。';
    }
    if (text.includes('same password')) return '新密码不能与原密码相同。';
    return '操作失败，请稍后重试。';
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
    const loginButton = overlay?.querySelector('#cloudLogin');
    const baseRegisterButton = overlay?.querySelector('#cloudRegister');
    const authLinks = overlay?.querySelector('.cloud-auth-links');
    const resetButton = overlay?.querySelector('#cloudReset');
    const message = overlay?.querySelector('#cloudAuthMessage');
    const description = card?.querySelector('p');

    if (!card || !emailInput || !passwordField || !passwordActions || !loginButton || !baseRegisterButton || card.dataset.otpInstalled === '1') return false;
    card.dataset.otpInstalled = '1';

    const methodTabs = document.createElement('div');
    methodTabs.className = 'cloud-auth-methods';
    methodTabs.innerHTML = `
      <button type="button" class="cloud-auth-method active" id="cloudPasswordTab">密码登录</button>
      <button type="button" class="cloud-auth-method" id="cloudOtpTab">邮箱验证码</button>
      <button type="button" class="cloud-auth-method" id="cloudSignupTab">注册账号</button>
    `;
    description?.insertAdjacentElement('afterend', methodTabs);

    const otpField = document.createElement('div');
    otpField.className = 'cloud-auth-field cloud-otp-field';
    otpField.hidden = true;
    otpField.innerHTML = `
      <label for="cloudOtpCode">邮箱验证码</label>
      <div class="cloud-otp-row">
        <input id="cloudOtpCode" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="请输入 6 位验证码">
        <button type="button" class="cloud-auth-secondary cloud-send-otp" id="cloudSendOtp">获取验证码</button>
      </div>
      <div class="cloud-otp-tip">验证码仅发送给已注册邮箱。60 秒内请勿重复获取。</div>
    `;
    passwordField.insertAdjacentElement('afterend', otpField);

    const confirmField = document.createElement('div');
    confirmField.className = 'cloud-auth-field cloud-signup-field';
    confirmField.hidden = true;
    confirmField.innerHTML = `
      <label for="cloudPasswordConfirm">确认密码</label>
      <input id="cloudPasswordConfirm" type="password" autocomplete="new-password" placeholder="请再次输入密码">
      <div class="cloud-otp-tip">注册后请到邮箱完成验证，再返回登录。</div>
    `;
    otpField.insertAdjacentElement('afterend', confirmField);

    const otpActions = document.createElement('div');
    otpActions.className = 'cloud-auth-actions cloud-otp-actions';
    otpActions.hidden = true;
    otpActions.innerHTML = '<button type="button" class="cloud-auth-primary" id="cloudVerifyOtp">使用验证码登录</button>';
    passwordActions.insertAdjacentElement('afterend', otpActions);

    const signupActions = document.createElement('div');
    signupActions.className = 'cloud-auth-actions cloud-signup-actions';
    signupActions.hidden = true;
    signupActions.innerHTML = '<button type="button" class="cloud-auth-primary" id="cloudSignupSubmit">注册并发送验证邮件</button>';
    otpActions.insertAdjacentElement('afterend', signupActions);

    baseRegisterButton.hidden = true;

    const passwordTab = methodTabs.querySelector('#cloudPasswordTab');
    const otpTab = methodTabs.querySelector('#cloudOtpTab');
    const signupTab = methodTabs.querySelector('#cloudSignupTab');
    const otpInput = otpField.querySelector('#cloudOtpCode');
    const sendOtpButton = otpField.querySelector('#cloudSendOtp');
    const verifyOtpButton = otpActions.querySelector('#cloudVerifyOtp');
    const confirmInput = confirmField.querySelector('#cloudPasswordConfirm');
    const signupButton = signupActions.querySelector('#cloudSignupSubmit');

    function setMode(mode) {
      const passwordMode = mode === 'password';
      const otpMode = mode === 'otp';
      const signupMode = mode === 'signup';

      passwordTab.classList.toggle('active', passwordMode);
      otpTab.classList.toggle('active', otpMode);
      signupTab.classList.toggle('active', signupMode);

      passwordField.hidden = otpMode;
      passwordActions.hidden = !passwordMode;
      otpField.hidden = !otpMode;
      otpActions.hidden = !otpMode;
      confirmField.hidden = !signupMode;
      signupActions.hidden = !signupMode;
      loginButton.hidden = !passwordMode;
      baseRegisterButton.hidden = true;
      if (resetButton) resetButton.hidden = !passwordMode;

      passwordInput.autocomplete = signupMode ? 'new-password' : 'current-password';
      passwordInput.placeholder = signupMode ? '设置至少 8 位密码' : '请输入登录密码';
      setMessage(message, '');

      if (otpMode) {
        setMessage(message, '填写已注册邮箱，获取验证码后登录。', true);
        emailInput.focus();
      } else if (signupMode) {
        setMessage(message, '填写邮箱并设置密码，注册后需要完成邮箱验证。', true);
        emailInput.focus();
      } else {
        passwordInput.focus();
      }
    }

    passwordTab.addEventListener('click', () => setMode('password'));
    otpTab.addEventListener('click', () => setMode('otp'));
    signupTab.addEventListener('click', () => setMode('signup'));

    loginButton.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) return setMessage(message, '请输入邮箱和密码。');

      const client = window.PayrollCloud?.getClient?.();
      if (!client) return setMessage(message, '登录组件尚未就绪，请刷新页面后重试。');

      loginButton.disabled = true;
      setMessage(message, '正在登录并读取云端工资数据…', true);
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage(message, '登录成功，正在打开工资账套…', true);
        location.reload();
      } catch (error) {
        setMessage(message, friendlyError(error, '密码登录'));
      } finally {
        loginButton.disabled = false;
      }
    }, true);

    sendOtpButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) {
        setMessage(message, '请先填写登录邮箱。');
        emailInput.focus();
        return;
      }

      const client = window.PayrollCloud?.getClient?.();
      if (!client) return setMessage(message, '登录组件尚未就绪，请刷新页面后重试。');

      sendOtpButton.disabled = true;
      setMessage(message, '正在发送验证码…', true);
      try {
        const { error } = await client.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: location.origin }
        });
        if (error) throw error;
        setMessage(message, '验证码已发送，请检查收件箱和垃圾邮件。', true);
        startCountdown(sendOtpButton);
        otpInput.focus();
      } catch (error) {
        sendOtpButton.disabled = false;
        setMessage(message, friendlyError(error, '发送验证码'));
      }
    });

    verifyOtpButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const token = otpInput.value.trim();
      if (!email) return setMessage(message, '请填写登录邮箱。');
      if (!/^\d{6}$/.test(token)) return setMessage(message, '请输入邮件中的 6 位数字验证码。');

      const client = window.PayrollCloud?.getClient?.();
      if (!client) return setMessage(message, '登录组件尚未就绪，请刷新页面后重试。');

      verifyOtpButton.disabled = true;
      setMessage(message, '正在验证并读取云端工资数据…', true);
      try {
        const { data, error } = await client.auth.verifyOtp({ email, token, type: 'email' });
        if (error) throw error;
        if (!data?.session) throw new Error('invalid otp session');
        setMessage(message, '登录成功，正在打开工资账套…', true);
        location.reload();
      } catch (error) {
        setMessage(message, friendlyError(error, '验证码登录'));
      } finally {
        verifyOtpButton.disabled = false;
      }
    });

    signupButton.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passwordInput.value;
      const confirmation = confirmInput.value;
      if (!email) return setMessage(message, '请输入注册邮箱。');
      if (password.length < 8) return setMessage(message, '密码至少需要 8 位。');
      if (password !== confirmation) return setMessage(message, '两次输入的密码不一致。');

      const client = window.PayrollCloud?.getClient?.();
      if (!client) return setMessage(message, '注册组件尚未就绪，请刷新页面后重试。');

      signupButton.disabled = true;
      setMessage(message, '正在创建账号并发送验证邮件…', true);
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin }
        });
        if (error) throw error;
        if (data?.session) {
          setMessage(message, '注册成功，正在打开工资系统…', true);
          location.reload();
          return;
        }
        setMessage(message, '注册成功，验证邮件已发送。请完成邮箱验证后再登录。', true);
        passwordInput.value = '';
        confirmInput.value = '';
      } catch (error) {
        setMessage(message, friendlyError(error, '注册账号'));
      } finally {
        signupButton.disabled = false;
      }
    });

    otpInput.addEventListener('input', () => {
      otpInput.value = otpInput.value.replace(/\D/g, '').slice(0, 6);
    });
    otpInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') verifyOtpButton.click();
    });
    confirmInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') signupButton.click();
    });

    const style = document.createElement('style');
    style.id = 'payroll-email-otp-style';
    style.textContent = `
      .cloud-auth-card [hidden]{display:none!important}
      .cloud-auth-methods{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;padding:4px;margin:-4px 0 16px;background:#f1f5f9;border-radius:11px}
      .cloud-auth-method{height:36px;border:0;border-radius:8px;background:transparent;color:#64748b;font:inherit;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
      .cloud-auth-method.active{background:#fff;color:#0f7c91;box-shadow:0 1px 4px rgba(15,23,42,.12)}
      .cloud-otp-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px}
      .cloud-otp-row input{min-width:0;letter-spacing:.22em;font-weight:700}
      .cloud-send-otp{height:44px;white-space:nowrap}
      .cloud-otp-tip{margin-top:7px;color:#64748b;font-size:12px;line-height:1.55}
      .cloud-auth-message{line-height:1.55;word-break:break-word}
      .cloud-auth-primary:disabled,.cloud-auth-secondary:disabled{opacity:.58;cursor:not-allowed}
    `;
    document.head.appendChild(style);

    if (authLinks) authLinks.style.alignItems = 'center';
    setMode('password');
    return true;
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (install() || attempts > 100) clearInterval(timer);
  }, 100);
})();