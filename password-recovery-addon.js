(() => {
  'use strict';

  let recoveryRequested = false;
  let recoveryError = '';
  let mounted = false;

  const query = () => new URLSearchParams(location.search);
  const hash = () => new URLSearchParams(location.hash.replace(/^#/, ''));

  function friendlyError(error) {
    const raw = String(error?.message || error || '').trim();
    const text = raw.toLowerCase();
    console.error('[工资系统·密码重置]', error);
    if (text.includes('email rate limit exceeded') || text.includes('rate limit')) {
      return '重置邮件发送次数已达上限，请等待一段时间后再试。';
    }
    if (text.includes('expired') || text.includes('invalid') || text.includes('session')) {
      return '重置链接无效或已过期，请返回登录页重新申请。';
    }
    if (text.includes('same password')) return '新密码不能与原密码相同。';
    if (text.includes('password should be at least') || text.includes('weak password')) {
      return '密码强度不足，请设置至少 8 位并包含字母和数字的密码。';
    }
    if (text.includes('network') || text.includes('fetch failed') || text.includes('failed to fetch')) {
      return '网络连接失败，请检查网络后重试。';
    }
    return '操作失败，请稍后重试。';
  }

  function detectRecoveryRequest() {
    const q = query();
    const h = hash();
    recoveryRequested = q.get('mode') === 'recovery' || h.get('type') === 'recovery';
    const errorCode = h.get('error_code') || q.get('error_code');
    const errorDescription = h.get('error_description') || q.get('error_description');
    if (errorCode || errorDescription) {
      recoveryRequested = true;
      recoveryError = decodeURIComponent((errorDescription || errorCode || '').replace(/\+/g, ' '));
    }
  }

  function cleanRecoveryUrl(extra = '') {
    const url = new URL(location.origin + location.pathname);
    if (extra) url.search = extra;
    history.replaceState({}, document.title, url.toString());
  }

  function installStyles() {
    if (document.getElementById('payroll-password-recovery-style')) return;
    const style = document.createElement('style');
    style.id = 'payroll-password-recovery-style';
    style.textContent = `
      .payroll-recovery-overlay{position:fixed;inset:0;z-index:100001;background:rgba(15,23,42,.62);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}
      .payroll-recovery-card{width:min(430px,100%);background:#fff;border-radius:18px;box-shadow:0 28px 80px rgba(15,23,42,.34);padding:30px;color:#0f172a}
      .payroll-recovery-logo{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#0f7c91;color:#fff;font-size:24px;font-weight:700;margin-bottom:18px}
      .payroll-recovery-card h2{margin:0 0 8px;font-size:24px}.payroll-recovery-card p{margin:0 0 20px;color:#64748b;line-height:1.65}
      .payroll-recovery-field{display:grid;gap:7px;margin-bottom:14px}.payroll-recovery-field label{font-weight:600;font-size:14px}.payroll-recovery-field input{height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font:inherit;outline:none}.payroll-recovery-field input:focus{border-color:#0f7c91;box-shadow:0 0 0 3px rgba(15,124,145,.12)}
      .payroll-recovery-actions{display:flex;gap:10px;margin-top:18px}.payroll-recovery-primary{flex:1;height:44px;border:0;border-radius:10px;background:#0f7c91;color:#fff;font:inherit;font-weight:700;cursor:pointer}.payroll-recovery-secondary{height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;padding:0 15px;font:inherit;cursor:pointer}
      .payroll-recovery-message{min-height:22px;margin-top:14px;font-size:13px;color:#dc2626;line-height:1.55}.payroll-recovery-message.ok{color:#15803d}
      .payroll-recovery-note{margin-top:18px;padding:12px 14px;border-radius:10px;background:#f0f9ff;color:#475569;font-size:13px;line-height:1.55}
      .payroll-recovery-primary:disabled{opacity:.58;cursor:not-allowed}
    `;
    document.head.appendChild(style);
  }

  function showLoginMessage(text, ok = true) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      const message = document.querySelector('#cloudAuthMessage');
      if (message) {
        clearInterval(timer);
        message.textContent = text;
        message.classList.toggle('ok', ok);
      } else if (attempts > 100) clearInterval(timer);
    }, 100);
  }

  function showRecoveryOverlay(client) {
    installStyles();
    document.querySelector('.payroll-recovery-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.className = 'payroll-recovery-overlay';
    overlay.innerHTML = `
      <div class="payroll-recovery-card" role="dialog" aria-modal="true" aria-labelledby="payrollRecoveryTitle">
        <div class="payroll-recovery-logo">薪</div>
        <h2 id="payrollRecoveryTitle">设置新密码</h2>
        <p>请输入新的登录密码。修改完成后，原密码会立即失效。</p>
        <div class="payroll-recovery-field"><label for="payrollNewPassword">新密码</label><input id="payrollNewPassword" type="password" autocomplete="new-password" placeholder="至少 8 位，建议包含字母和数字"></div>
        <div class="payroll-recovery-field"><label for="payrollNewPasswordConfirm">确认新密码</label><input id="payrollNewPasswordConfirm" type="password" autocomplete="new-password" placeholder="请再次输入新密码"></div>
        <div class="payroll-recovery-actions">
          <button type="button" class="payroll-recovery-primary" id="payrollUpdatePassword">确认修改密码</button>
          <button type="button" class="payroll-recovery-secondary" id="payrollCancelRecovery">返回登录</button>
        </div>
        <div class="payroll-recovery-message" id="payrollRecoveryMessage"></div>
        <div class="payroll-recovery-note">为了工资数据安全，请勿将重置邮件或链接转发给他人。</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const password = overlay.querySelector('#payrollNewPassword');
    const confirmation = overlay.querySelector('#payrollNewPasswordConfirm');
    const submit = overlay.querySelector('#payrollUpdatePassword');
    const cancel = overlay.querySelector('#payrollCancelRecovery');
    const message = overlay.querySelector('#payrollRecoveryMessage');
    const setMessage = (text, ok = false) => {
      message.textContent = text;
      message.classList.toggle('ok', ok);
    };

    if (recoveryError) {
      setMessage('重置链接无效或已过期，请返回登录页重新申请。');
      password.disabled = true;
      confirmation.disabled = true;
      submit.disabled = true;
    }

    submit.addEventListener('click', async () => {
      const nextPassword = password.value;
      if (nextPassword.length < 8) return setMessage('新密码至少需要 8 位。');
      if (nextPassword !== confirmation.value) return setMessage('两次输入的新密码不一致。');

      submit.disabled = true;
      setMessage('正在修改密码…', true);
      try {
        const { error } = await client.auth.updateUser({ password: nextPassword });
        if (error) throw error;
        setMessage('密码修改成功，正在返回登录页…', true);
        await client.auth.signOut();
        setTimeout(() => location.replace(`${location.origin}/?password-reset=success`), 700);
      } catch (error) {
        submit.disabled = false;
        setMessage(friendlyError(error));
      }
    });

    cancel.addEventListener('click', async () => {
      await client.auth.signOut();
      cleanRecoveryUrl();
      location.replace(location.origin + '/');
    });

    confirmation.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submit.click();
    });
    password.focus();
  }

  function installResetRequestHandler(client) {
    document.addEventListener('click', async (event) => {
      const button = event.target.closest?.('#cloudReset');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();

      const email = document.querySelector('#cloudEmail')?.value.trim();
      const message = document.querySelector('#cloudAuthMessage');
      if (!email) {
        if (message) message.textContent = '请先填写需要重置密码的邮箱。';
        document.querySelector('#cloudEmail')?.focus();
        return;
      }

      button.disabled = true;
      if (message) {
        message.textContent = '正在发送密码重置邮件…';
        message.classList.add('ok');
      }
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/?mode=recovery`
        });
        if (error) throw error;
        if (message) {
          message.textContent = '重置邮件已发送，请打开邮件并点击“重置密码”链接。';
          message.classList.add('ok');
        }
      } catch (error) {
        if (message) {
          message.textContent = friendlyError(error);
          message.classList.remove('ok');
        }
      } finally {
        button.disabled = false;
      }
    }, true);
  }

  async function prepareBeforeApp() {
    detectRecoveryRequest();
  }

  async function mountAfterApp() {
    if (mounted) return;
    mounted = true;
    const client = window.PayrollCloud?.getClient?.();
    if (!client) return;

    installResetRequestHandler(client);

    if (query().get('password-reset') === 'success') {
      cleanRecoveryUrl();
      showLoginMessage('密码已重置成功，请使用新密码登录。', true);
      return;
    }

    if (recoveryRequested) showRecoveryOverlay(client);
  }

  window.PayrollPasswordRecovery = { prepareBeforeApp, mountAfterApp };
})();