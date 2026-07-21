(() => {
  'use strict';

  const SUPABASE_URL = 'https://bypekqxsnuvqbgvdosdl.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_TFfmF3_7t8ceSwP1B0iKxA_sfcb5kca';
  const STORAGE_KEY = 'payroll_attendance_system_v1';
  const META_KEY = 'payroll_cloud_sync_meta_v1';

  let client = null;
  let user = null;
  let syncing = false;
  let syncTimer = null;
  let indicator = null;
  let authOverlay = null;
  let interceptorInstalled = false;
  let suppressStorageHook = false;

  const nativeSetItem = Storage.prototype.setItem;

  function safeJson(raw, fallback = null) {
    try { return JSON.parse(raw); } catch (error) { return fallback; }
  }

  function readLocalState() {
    const state = safeJson(localStorage.getItem(STORAGE_KEY), null);
    return state && typeof state === 'object' && !Array.isArray(state) ? state : null;
  }

  function readMeta() {
    return safeJson(localStorage.getItem(META_KEY), {}) || {};
  }

  function writeMeta(patch) {
    const next = { ...readMeta(), ...patch };
    nativeSetItem.call(localStorage, META_KEY, JSON.stringify(next));
    return next;
  }

  function validPayrollState(state) {
    return Boolean(
      state &&
      typeof state === 'object' &&
      Array.isArray(state.employees) &&
      state.months &&
      typeof state.months === 'object'
    );
  }

  function setIndicator(mode, text) {
    if (!indicator) return;
    indicator.dataset.mode = mode;
    const dot = indicator.querySelector('.cloud-sync-dot');
    const label = indicator.querySelector('.cloud-sync-label');
    if (label) label.textContent = text;
    if (dot) dot.title = text;
  }

  function scheduleSave(delay = 650) {
    const changedAt = new Date().toISOString();
    writeMeta({
      userId: user?.id || readMeta().userId || null,
      localChangedAt: changedAt,
      pending: true
    });

    if (!user) {
      setIndicator('warning', '未登录，数据尚未保存到云端');
      return;
    }

    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => saveNow(), delay);
  }

  function installStorageInterceptor() {
    if (interceptorInstalled) return;
    interceptorInstalled = true;

    Storage.prototype.setItem = function patchedSetItem(key, value) {
      nativeSetItem.call(this, key, value);
      if (this === localStorage && key === STORAGE_KEY && !suppressStorageHook) {
        scheduleSave();
      }
    };

    window.addEventListener('storage', (event) => {
      if (event.storageArea === localStorage && event.key === STORAGE_KEY) scheduleSave(300);
    });

    window.addEventListener('online', () => {
      setIndicator(user ? 'syncing' : 'warning', user ? '网络已恢复，正在同步…' : '网络已恢复，请登录');
      if (user) saveNow({ force: true });
    });

    window.addEventListener('offline', () => {
      setIndicator('offline', '当前离线，修改会在联网后同步');
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && user && readMeta().pending) saveNow({ force: true });
    });

    setInterval(() => {
      if (user && readMeta().pending && navigator.onLine) saveNow({ force: true });
    }, 30000);
  }

  async function ensureClient() {
    if (client) return client;
    if (!window.supabase?.createClient) throw new Error('云端数据库组件未加载');
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  async function getRemoteState() {
    const { data, error } = await client
      .from('payroll_cloud_state')
      .select('data,revision,updated_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveNow(options = {}) {
    const force = Boolean(options.force);
    if (!user || syncing || !navigator.onLine) return false;

    const meta = readMeta();
    if (!force && !meta.pending) return true;

    const state = readLocalState();
    if (!validPayrollState(state)) return false;

    syncing = true;
    setIndicator('syncing', '正在保存到云端…');

    try {
      const revision = Math.max(Number(meta.revision) || 0, 0) + 1;
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('payroll_cloud_state')
        .upsert({
          user_id: user.id,
          data: state,
          revision,
          updated_at: now
        }, { onConflict: 'user_id' })
        .select('revision,updated_at')
        .single();

      if (error) throw error;

      writeMeta({
        userId: user.id,
        revision: Number(data.revision) || revision,
        remoteUpdatedAt: data.updated_at || now,
        lastSyncedAt: new Date().toISOString(),
        pending: false,
        lastError: null
      });
      setIndicator('saved', '已保存到云端');
      return true;
    } catch (error) {
      console.error('工资数据云端保存失败', error);
      writeMeta({ pending: true, lastError: String(error?.message || error) });
      setIndicator('error', '云端保存失败，点击重试');
      return false;
    } finally {
      syncing = false;
    }
  }

  async function pullOrSeedCloud() {
    if (!user) return;

    setIndicator('syncing', '正在读取云端工资数据…');
    const localState = readLocalState();
    const meta = readMeta();

    try {
      const remote = await getRemoteState();
      if (!remote) {
        if (validPayrollState(localState)) {
          writeMeta({ userId: user.id, revision: 0, pending: true });
          await saveNow({ force: true });
        } else {
          writeMeta({ userId: user.id, revision: 0, pending: false });
        }
        return;
      }

      const remoteTime = Date.parse(remote.updated_at || '') || 0;
      const localTime = Date.parse(meta.localChangedAt || '') || 0;
      const hasPendingNewerLocal =
        meta.userId === user.id &&
        meta.pending === true &&
        validPayrollState(localState) &&
        localTime > remoteTime;

      if (hasPendingNewerLocal) {
        writeMeta({ revision: Number(remote.revision) || 0 });
        await saveNow({ force: true });
        return;
      }

      if (validPayrollState(remote.data)) {
        suppressStorageHook = true;
        nativeSetItem.call(localStorage, STORAGE_KEY, JSON.stringify(remote.data));
        suppressStorageHook = false;
      }

      writeMeta({
        userId: user.id,
        revision: Number(remote.revision) || 1,
        remoteUpdatedAt: remote.updated_at,
        lastSyncedAt: new Date().toISOString(),
        pending: false,
        lastError: null
      });
      setIndicator('saved', '已加载云端数据');
    } catch (error) {
      console.error('工资数据云端读取失败', error);
      writeMeta({ lastError: String(error?.message || error) });
      setIndicator('offline', '云端暂不可用，当前使用本机缓存');
    }
  }

  function installStyles() {
    if (document.getElementById('payroll-cloud-style')) return;
    const style = document.createElement('style');
    style.id = 'payroll-cloud-style';
    style.textContent = `
      .cloud-sync-status{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;padding:6px 8px;border-radius:8px}
      .cloud-sync-status:hover{background:rgba(255,255,255,.12)}
      .cloud-sync-dot{width:9px;height:9px;border-radius:50%;background:#94a3b8;box-shadow:0 0 0 4px rgba(148,163,184,.14)}
      .cloud-sync-status[data-mode="saved"] .cloud-sync-dot{background:#5ee0a0;box-shadow:0 0 0 4px rgba(94,224,160,.16)}
      .cloud-sync-status[data-mode="syncing"] .cloud-sync-dot{background:#facc15;animation:cloudPulse 1s infinite}
      .cloud-sync-status[data-mode="warning"] .cloud-sync-dot,.cloud-sync-status[data-mode="offline"] .cloud-sync-dot{background:#fb923c}
      .cloud-sync-status[data-mode="error"] .cloud-sync-dot{background:#f87171}
      .cloud-sync-user{font-size:12px;opacity:.82;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .cloud-logout{border:1px solid rgba(255,255,255,.28);background:transparent;color:inherit;border-radius:7px;padding:5px 9px;cursor:pointer;font:inherit}
      .cloud-logout:hover{background:rgba(255,255,255,.12)}
      @keyframes cloudPulse{50%{opacity:.35;transform:scale(.82)}}
      .cloud-auth-overlay{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.55);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px}
      .cloud-auth-overlay[hidden]{display:none}
      .cloud-auth-card{width:min(430px,100%);background:#fff;border-radius:18px;box-shadow:0 28px 80px rgba(15,23,42,.32);padding:30px;color:#0f172a}
      .cloud-auth-logo{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;background:#0f7c91;color:#fff;font-size:24px;font-weight:700;margin-bottom:18px}
      .cloud-auth-card h2{margin:0 0 8px;font-size:24px}.cloud-auth-card p{margin:0 0 20px;color:#64748b;line-height:1.65}
      .cloud-auth-field{display:grid;gap:7px;margin-bottom:14px}.cloud-auth-field label{font-weight:600;font-size:14px}.cloud-auth-field input{height:44px;border:1px solid #cbd5e1;border-radius:10px;padding:0 12px;font:inherit;outline:none}.cloud-auth-field input:focus{border-color:#0f7c91;box-shadow:0 0 0 3px rgba(15,124,145,.12)}
      .cloud-auth-actions{display:flex;gap:10px;margin-top:18px}.cloud-auth-primary{flex:1;height:44px;border:0;border-radius:10px;background:#0f7c91;color:#fff;font:inherit;font-weight:700;cursor:pointer}.cloud-auth-secondary{height:44px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;color:#334155;padding:0 15px;font:inherit;cursor:pointer}
      .cloud-auth-links{display:flex;justify-content:space-between;gap:12px;margin-top:16px}.cloud-auth-link{border:0;background:transparent;color:#08758a;padding:0;cursor:pointer;font:inherit;font-size:13px}.cloud-auth-message{min-height:22px;margin-top:14px;font-size:13px;color:#dc2626}.cloud-auth-message.ok{color:#15803d}
      .cloud-auth-note{margin-top:18px;padding:12px 14px;border-radius:10px;background:#f0f9ff;color:#475569;font-size:13px;line-height:1.55}
    `;
    document.head.appendChild(style);
  }

  function locateOriginalStatus() {
    const candidates = Array.from(document.querySelectorAll('header *, .topbar *, .app-header *'));
    return candidates.find((node) => node.children.length === 0 && node.textContent.includes('数据仅保存在当前浏览器')) || null;
  }

  function buildIndicator() {
    installStyles();
    const old = locateOriginalStatus();
    const wrap = document.createElement('div');
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '6px';
    wrap.innerHTML = `
      <button type="button" class="cloud-sync-status" data-mode="warning" title="点击立即同步">
        <span class="cloud-sync-dot"></span>
        <span class="cloud-sync-label">云端状态检查中…</span>
        <span class="cloud-sync-user"></span>
      </button>
      <button type="button" class="cloud-logout" hidden>退出</button>
    `;

    if (old) old.replaceWith(wrap);
    else {
      wrap.style.position = 'fixed';
      wrap.style.right = '18px';
      wrap.style.top = '14px';
      wrap.style.zIndex = '9999';
      wrap.style.background = '#0f7c91';
      wrap.style.color = '#fff';
      wrap.style.padding = '3px 7px';
      wrap.style.borderRadius = '10px';
      document.body.appendChild(wrap);
    }

    indicator = wrap.querySelector('.cloud-sync-status');
    indicator.addEventListener('click', async () => {
      if (!user) {
        showAuthOverlay();
        return;
      }
      await saveNow({ force: true });
    });

    wrap.querySelector('.cloud-logout').addEventListener('click', async () => {
      if (!confirm('确定退出工资系统云端账号吗？\n\n本机缓存不会删除。')) return;
      await client.auth.signOut();
      user = null;
      updateLoggedInUi();
      showAuthOverlay();
    });
  }

  function buildAuthOverlay() {
    if (authOverlay) return authOverlay;
    authOverlay = document.createElement('div');
    authOverlay.className = 'cloud-auth-overlay';
    authOverlay.innerHTML = `
      <div class="cloud-auth-card" role="dialog" aria-modal="true" aria-labelledby="cloudAuthTitle">
        <div class="cloud-auth-logo">薪</div>
        <h2 id="cloudAuthTitle">登录工资管理系统</h2>
        <p>登录后，员工、工资、社保、个税、归档和更正记录都会保存到云端，并在不同电脑间同步。</p>
        <div class="cloud-auth-field"><label for="cloudEmail">邮箱</label><input id="cloudEmail" type="email" autocomplete="username" placeholder="请输入登录邮箱"></div>
        <div class="cloud-auth-field"><label for="cloudPassword">密码</label><input id="cloudPassword" type="password" autocomplete="current-password" placeholder="至少 8 位密码"></div>
        <div class="cloud-auth-actions">
          <button type="button" class="cloud-auth-primary" id="cloudLogin">登录并同步</button>
          <button type="button" class="cloud-auth-secondary" id="cloudRegister">注册</button>
        </div>
        <div class="cloud-auth-links">
          <button type="button" class="cloud-auth-link" id="cloudReset">忘记密码</button>
          <span style="font-size:12px;color:#94a3b8">工资数据受登录权限保护</span>
        </div>
        <div class="cloud-auth-message" id="cloudAuthMessage"></div>
        <div class="cloud-auth-note">首次登录时，如果云端没有工资数据，系统会自动上传当前浏览器里的现有账套，不会清空当前数据。</div>
      </div>
    `;
    document.body.appendChild(authOverlay);

    const emailInput = authOverlay.querySelector('#cloudEmail');
    const passwordInput = authOverlay.querySelector('#cloudPassword');
    const message = authOverlay.querySelector('#cloudAuthMessage');
    const loginButton = authOverlay.querySelector('#cloudLogin');
    const registerButton = authOverlay.querySelector('#cloudRegister');

    const showMessage = (text, ok = false) => {
      message.textContent = text;
      message.classList.toggle('ok', ok);
    };

    const credentials = () => ({
      email: emailInput.value.trim(),
      password: passwordInput.value
    });

    loginButton.addEventListener('click', async () => {
      const { email, password } = credentials();
      if (!email || !password) return showMessage('请输入邮箱和密码。');
      loginButton.disabled = true;
      showMessage('正在登录并读取云端数据…', true);
      try {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        user = data.user;
        await pullOrSeedCloud();
        showMessage('登录成功，正在打开云端工资账套…', true);
        location.reload();
      } catch (error) {
        showMessage(error?.message === 'Invalid login credentials' ? '邮箱或密码不正确。' : String(error?.message || error));
      } finally {
        loginButton.disabled = false;
      }
    });

    registerButton.addEventListener('click', async () => {
      const { email, password } = credentials();
      if (!email || password.length < 8) return showMessage('请输入有效邮箱，密码至少 8 位。');
      registerButton.disabled = true;
      showMessage('正在创建账号…', true);
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: location.origin }
        });
        if (error) throw error;
        if (data.session) {
          user = data.user;
          await pullOrSeedCloud();
          location.reload();
        } else {
          showMessage('注册成功。请到邮箱完成验证，然后回来登录。', true);
        }
      } catch (error) {
        showMessage(String(error?.message || error));
      } finally {
        registerButton.disabled = false;
      }
    });

    authOverlay.querySelector('#cloudReset').addEventListener('click', async () => {
      const email = emailInput.value.trim();
      if (!email) return showMessage('请先填写需要重置密码的邮箱。');
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
        if (error) throw error;
        showMessage('重置邮件已发送，请检查邮箱。', true);
      } catch (error) {
        showMessage(String(error?.message || error));
      }
    });

    passwordInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') loginButton.click();
    });

    return authOverlay;
  }

  function showAuthOverlay() {
    buildAuthOverlay().hidden = false;
  }

  function hideAuthOverlay() {
    if (authOverlay) authOverlay.hidden = true;
  }

  function updateLoggedInUi() {
    if (!indicator) return;
    const wrap = indicator.parentElement;
    const userLabel = indicator.querySelector('.cloud-sync-user');
    const logout = wrap?.querySelector('.cloud-logout');

    if (user) {
      if (userLabel) userLabel.textContent = user.email ? `· ${user.email}` : '';
      if (logout) logout.hidden = false;
      const meta = readMeta();
      setIndicator(meta.pending ? 'syncing' : 'saved', meta.pending ? '等待云端同步…' : '已保存到云端');
      hideAuthOverlay();
    } else {
      if (userLabel) userLabel.textContent = '';
      if (logout) logout.hidden = true;
      setIndicator('warning', '未登录，数据尚未保存到云端');
    }
  }

  async function initializeBeforeApp() {
    installStorageInterceptor();
    await ensureClient();

    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      user = data.session?.user || null;
      if (user) await pullOrSeedCloud();
    } catch (error) {
      console.error('云端登录状态读取失败', error);
    }

    client.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      if (indicator) updateLoggedInUi();
    });
  }

  async function mountAfterApp() {
    buildIndicator();
    buildAuthOverlay();
    updateLoggedInUi();
    if (!user) showAuthOverlay();
    else if (readMeta().pending) await saveNow({ force: true });
  }

  window.PayrollCloud = {
    initializeBeforeApp,
    mountAfterApp,
    saveNow,
    getClient: () => client,
    getUser: () => user
  };
})();