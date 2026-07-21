(() => {
  'use strict';

  const PAYROLL_RECOVERY_URL = 'https://gz.hnchpower.cn/?mode=recovery';

  function setMessage(text, ok = false) {
    const message = document.querySelector('#cloudAuthMessage');
    if (!message) return;
    message.textContent = text;
    message.classList.toggle('ok', ok);
  }

  function friendlyError(error) {
    const text = String(error?.message || error || '').toLowerCase();
    console.error('[工资系统·固定重置回调]', error);
    if (text.includes('rate limit')) return '重置邮件发送次数已达上限，请稍后再试。';
    if (text.includes('network') || text.includes('fetch')) return '网络连接失败，请检查网络后重试。';
    return '重置邮件发送失败，请稍后重试。';
  }

  document.addEventListener('click', async (event) => {
    const button = event.target.closest?.('#cloudReset');
    if (!button) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const emailInput = document.querySelector('#cloudEmail');
    const email = emailInput?.value.trim();
    if (!email) {
      setMessage('请先填写需要重置密码的邮箱。');
      emailInput?.focus();
      return;
    }

    const client = window.PayrollCloud?.getClient?.();
    if (!client) {
      setMessage('密码重置组件尚未就绪，请刷新页面后重试。');
      return;
    }

    button.disabled = true;
    setMessage('正在发送密码重置邮件…', true);
    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: PAYROLL_RECOVERY_URL
      });
      if (error) throw error;
      setMessage('重置邮件已发送。请使用最新邮件中的“重置密码”链接。', true);
    } catch (error) {
      setMessage(friendlyError(error));
    } finally {
      button.disabled = false;
    }
  }, true);
})();