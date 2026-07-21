(() => {
  'use strict';

  const STORAGE_KEY = 'payroll_attendance_system_v1';
  const TEAM_META_KEY = 'payroll_workspace_sync_v1';

  let client = null;
  let user = null;
  let workspace = null;
  let member = null;
  let saveTimer = null;
  let syncing = false;
  let storagePatched = false;
  let suppressStorage = false;
  let nativeSetItem = null;
  let modal = null;

  const safeJson = (raw, fallback = null) => {
    try { return JSON.parse(raw); } catch (error) { return fallback; }
  };

  const validState = (state) => Boolean(
    state && typeof state === 'object' && !Array.isArray(state) &&
    Array.isArray(state.employees) && state.months && typeof state.months === 'object'
  );

  const readLocalState = () => safeJson(localStorage.getItem(STORAGE_KEY), null);
  const readMeta = () => safeJson(localStorage.getItem(TEAM_META_KEY), {}) || {};
  const writeMeta = (patch) => {
    const next = { ...readMeta(), ...patch };
    (nativeSetItem || Storage.prototype.setItem).call(localStorage, TEAM_META_KEY, JSON.stringify(next));
    return next;
  };

  function friendlyError(error) {
    const raw = String(error?.message || error || '');
    const text = raw.toLowerCase();
    console.error('[工资账套权限]', error);
    if (text.includes('member already exists')) return '该邮箱已经是当前账套成员。';
    if (text.includes('invalid email')) return '请输入正确的邮箱地址。';
    if (text.includes('only owner')) return '只有总账号可以执行此操作。';
    if (text.includes('network') || text.includes('fetch')) return '网络连接失败，请稍后重试。';
    return '操作失败，请稍后重试。';
  }

  function setIndicator(mode, text) {
    const indicator = document.querySelector('.cloud-sync-status');
    if (!indicator) return;
    indicator.dataset.mode = mode;
    const label = indicator.querySelector('.cloud-sync-label');
    if (label) label.textContent = text;
  }

  function setAccountLabel() {
    const label = document.querySelector('.cloud-sync-user');
    if (!label || !user || !member) return;
    label.textContent = `· ${member.display_name} · ${user.email || ''}`;
  }

  async function bootstrapWorkspace() {
    const { data, error } = await client.rpc('payroll_bootstrap_workspace');
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (!row?.workspace_id) throw new Error('workspace bootstrap failed');
    workspace = {
      id: row.workspace_id,
      name: row.workspace_name,
      ownerUserId: row.owner_user_id
    };
    member = {
      role: row.member_role,
      display_name: row.member_display_name
    };
  }

  async function getRemoteState() {
    const { data, error } = await client
      .from('payroll_workspace_state')
      .select('data,revision,updated_at,updated_by')
      .eq('workspace_id', workspace.id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async function saveNow(options = {}) {
    const force = Boolean(options.force);
    if (!client || !user || !workspace || syncing || !navigator.onLine) return false;
    const meta = readMeta();
    if (!force && !meta.pending) return true;
    const state = readLocalState();
    if (!validState(state)) return false;

    syncing = true;
    setIndicator('syncing', '正在保存至共享工资账套…');
    try {
      const revision = Math.max(Number(meta.revision) || 0, 0) + 1;
      const now = new Date().toISOString();
      const { data, error } = await client
        .from('payroll_workspace_state')
        .upsert({
          workspace_id: workspace.id,
          data: state,
          revision,
          updated_at: now,
          updated_by: user.id
        }, { onConflict: 'workspace_id' })
        .select('revision,updated_at')
        .single();
      if (error) throw error;
      writeMeta({
        workspaceId: workspace.id,
        revision: Number(data.revision) || revision,
        remoteUpdatedAt: data.updated_at || now,
        lastSyncedAt: new Date().toISOString(),
        pending: false,
        lastError: null
      });
      setIndicator('saved', '已保存至共享工资账套');
      return true;
    } catch (error) {
      writeMeta({ pending: true, lastError: String(error?.message || error) });
      setIndicator('error', '共享账套保存失败，点击重试');
      console.error('共享工资账套保存失败', error);
      return false;
    } finally {
      syncing = false;
    }
  }

  function scheduleSave(delay = 850) {
    if (!workspace || !user) return;
    writeMeta({
      workspaceId: workspace.id,
      localChangedAt: new Date().toISOString(),
      pending: true
    });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveNow(), delay);
  }

  function installStoragePatch() {
    if (storagePatched) return;
    storagePatched = true;
    nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function workspaceSetItem(key, value) {
      nativeSetItem.call(this, key, value);
      if (this === localStorage && key === STORAGE_KEY && !suppressStorage) scheduleSave();
    };
    window.addEventListener('online', () => saveNow({ force: true }));
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && readMeta().pending) saveNow({ force: true });
    });
  }

  async function pullOrSeed() {
    setIndicator('syncing', '正在读取共享工资账套…');
    const localState = readLocalState();
    const meta = readMeta();
    try {
      const remote = await getRemoteState();
      if (!remote) {
        writeMeta({ workspaceId: workspace.id, revision: 0, pending: validState(localState) });
        if (validState(localState)) await saveNow({ force: true });
        return;
      }

      const remoteTime = Date.parse(remote.updated_at || '') || 0;
      const localTime = Date.parse(meta.localChangedAt || '') || 0;
      const pendingNewerLocal = meta.workspaceId === workspace.id && meta.pending === true && validState(localState) && localTime > remoteTime;
      if (pendingNewerLocal) {
        writeMeta({ revision: Number(remote.revision) || 0 });
        await saveNow({ force: true });
        return;
      }

      if (validState(remote.data)) {
        suppressStorage = true;
        (nativeSetItem || Storage.prototype.setItem).call(localStorage, STORAGE_KEY, JSON.stringify(remote.data));
        suppressStorage = false;
      }
      writeMeta({
        workspaceId: workspace.id,
        revision: Number(remote.revision) || 1,
        remoteUpdatedAt: remote.updated_at,
        lastSyncedAt: new Date().toISOString(),
        pending: false,
        lastError: null
      });
      setIndicator('saved', '已加载共享工资账套');
    } catch (error) {
      console.error('共享工资账套读取失败', error);
      setIndicator('offline', '共享账套暂不可用，当前使用本机缓存');
    }
  }

  function installStyles() {
    if (document.getElementById('payroll-workspace-team-style')) return;
    const style = document.createElement('style');
    style.id = 'payroll-workspace-team-style';
    style.textContent = `
      .cloud-team-button{border:1px solid rgba(255,255,255,.28);background:transparent;color:inherit;border-radius:7px;padding:5px 9px;cursor:pointer;font:inherit;white-space:nowrap}.cloud-team-button:hover{background:rgba(255,255,255,.12)}
      .payroll-team-overlay{position:fixed;inset:0;z-index:100100;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;padding:20px}.payroll-team-card{width:min(720px,100%);max-height:88vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 28px 80px rgba(15,23,42,.34);padding:28px;color:#0f172a}.payroll-team-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:20px}.payroll-team-head h2{margin:0 0 6px;font-size:22px}.payroll-team-head p{margin:0;color:#64748b}.payroll-team-close{border:0;background:#f1f5f9;border-radius:9px;width:36px;height:36px;cursor:pointer;font-size:20px}.payroll-team-section{border:1px solid #e2e8f0;border-radius:14px;padding:16px;margin-top:14px}.payroll-team-section h3{margin:0 0 12px;font-size:16px}.payroll-team-member{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px 0;border-top:1px solid #eef2f7}.payroll-team-member:first-of-type{border-top:0}.payroll-team-name{font-weight:700}.payroll-team-email{font-size:13px;color:#64748b;margin-top:3px}.payroll-team-badge{display:inline-flex;margin-left:7px;padding:2px 7px;border-radius:999px;background:#e6f7f1;color:#087f5b;font-size:12px}.payroll-team-remove,.payroll-team-revoke{border:1px solid #fecaca;background:#fff;color:#dc2626;border-radius:8px;padding:7px 10px;cursor:pointer}.payroll-team-form{display:grid;grid-template-columns:minmax(0,1fr) 150px auto;gap:9px}.payroll-team-form input{height:42px;border:1px solid #cbd5e1;border-radius:9px;padding:0 11px;font:inherit}.payroll-team-primary{height:42px;border:0;border-radius:9px;background:#0f879c;color:#fff;padding:0 16px;font:inherit;font-weight:700;cursor:pointer}.payroll-team-message{min-height:20px;margin-top:9px;font-size:13px;color:#dc2626}.payroll-team-message.ok{color:#15803d}.payroll-team-note{margin-top:10px;color:#64748b;font-size:12px;line-height:1.6}@media(max-width:620px){.payroll-team-form{grid-template-columns:1fr}.payroll-team-card{padding:20px}}
    `;
    document.head.appendChild(style);
  }

  async function loadTeam() {
    const membersQuery = client
      .from('payroll_workspace_members')
      .select('user_id,email,role,display_name,status,created_at')
      .eq('workspace_id', workspace.id)
      .order('created_at');
    const [membersResult, invitesResult] = await Promise.all([
      membersQuery,
      member.role === 'owner'
        ? client.from('payroll_workspace_invites').select('id,email,display_name,expires_at,accepted_at').eq('workspace_id', workspace.id).is('accepted_at', null).order('created_at')
        : Promise.resolve({ data: [], error: null })
    ]);
    if (membersResult.error) throw membersResult.error;
    if (invitesResult.error) throw invitesResult.error;
    return { members: membersResult.data || [], invites: invitesResult.data || [] };
  }

  function renderTeamLists(container, data) {
    const membersBox = container.querySelector('[data-team-members]');
    const invitesBox = container.querySelector('[data-team-invites]');
    membersBox.innerHTML = data.members.map((item) => `
      <div class="payroll-team-member">
        <div><div class="payroll-team-name">${escapeHtml(item.display_name)}<span class="payroll-team-badge">${item.role === 'owner' ? '总账号' : '财务人员'}</span></div><div class="payroll-team-email">${escapeHtml(item.email)}</div></div>
        ${member.role === 'owner' && item.role !== 'owner' && item.status === 'active' ? `<button class="payroll-team-remove" data-remove-member="${item.user_id}">停用</button>` : ''}
      </div>`).join('');

    if (invitesBox) {
      invitesBox.innerHTML = data.invites.length ? data.invites.map((item) => `
        <div class="payroll-team-member">
          <div><div class="payroll-team-name">${escapeHtml(item.display_name)}<span class="payroll-team-badge">等待加入</span></div><div class="payroll-team-email">${escapeHtml(item.email)}</div></div>
          <button class="payroll-team-revoke" data-revoke-invite="${item.id}">撤销</button>
        </div>`).join('') : '<div class="payroll-team-note">暂无等待加入的账号。</div>';
    }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  }

  async function refreshModal() {
    if (!modal) return;
    try {
      const data = await loadTeam();
      renderTeamLists(modal, data);
    } catch (error) {
      const message = modal.querySelector('.payroll-team-message');
      if (message) message.textContent = friendlyError(error);
    }
  }

  function showTeamModal() {
    installStyles();
    modal?.remove();
    modal = document.createElement('div');
    modal.className = 'payroll-team-overlay';
    modal.innerHTML = `
      <div class="payroll-team-card" role="dialog" aria-modal="true">
        <div class="payroll-team-head"><div><h2>账号与权限</h2><p>${escapeHtml(workspace.name)} · 当前身份：${escapeHtml(member.display_name)}</p></div><button class="payroll-team-close">×</button></div>
        ${member.role === 'owner' ? `<div class="payroll-team-section"><h3>邀请财务人员</h3><div class="payroll-team-form"><input type="email" data-invite-email placeholder="财务人员邮箱"><input type="text" data-invite-name value="财务人员2" placeholder="显示名称"><button class="payroll-team-primary" data-create-invite>创建邀请</button></div><div class="payroll-team-message"></div><div class="payroll-team-note">邀请建立后，对方使用该邮箱注册或登录工资系统，会自动加入当前账套。无需共用总账号密码。</div></div>` : '<div class="payroll-team-section"><div class="payroll-team-note">财务人员可以录入和核算工资，但只有总账号可以管理成员。</div></div>'}
        <div class="payroll-team-section"><h3>账套成员</h3><div data-team-members>正在读取…</div></div>
        ${member.role === 'owner' ? '<div class="payroll-team-section"><h3>等待加入</h3><div data-team-invites>正在读取…</div></div>' : ''}
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.payroll-team-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', async (event) => {
      if (event.target === modal) return modal.remove();
      const create = event.target.closest('[data-create-invite]');
      const remove = event.target.closest('[data-remove-member]');
      const revoke = event.target.closest('[data-revoke-invite]');
      const message = modal.querySelector('.payroll-team-message');
      if (create) {
        const email = modal.querySelector('[data-invite-email]').value.trim();
        const displayName = modal.querySelector('[data-invite-name]').value.trim();
        if (!email || !displayName) { message.textContent = '请填写财务人员邮箱和名称。'; return; }
        create.disabled = true;
        message.textContent = '正在创建邀请…';
        message.classList.add('ok');
        const { error } = await client.rpc('payroll_create_invite', { p_email: email, p_display_name: displayName });
        create.disabled = false;
        if (error) { message.classList.remove('ok'); message.textContent = friendlyError(error); return; }
        message.classList.add('ok');
        message.textContent = `邀请已建立：${displayName}。请让对方使用 ${email} 注册或登录。`;
        modal.querySelector('[data-invite-email]').value = '';
        await refreshModal();
      }
      if (remove) {
        if (!confirm('确定停用该财务账号吗？停用后将无法访问工资账套。')) return;
        const { error } = await client.rpc('payroll_remove_member', { p_user_id: remove.dataset.removeMember });
        if (error) { if (message) message.textContent = friendlyError(error); return; }
        await refreshModal();
      }
      if (revoke) {
        const { error } = await client.rpc('payroll_revoke_invite', { p_invite_id: revoke.dataset.revokeInvite });
        if (error) { if (message) message.textContent = friendlyError(error); return; }
        await refreshModal();
      }
    });
    refreshModal();
  }

  function mountTeamUi() {
    setAccountLabel();
    setIndicator(readMeta().pending ? 'syncing' : 'saved', readMeta().pending ? '等待共享账套同步…' : '已保存至共享工资账套');
    const indicator = document.querySelector('.cloud-sync-status');
    const wrap = indicator?.parentElement;
    if (!wrap || wrap.querySelector('.cloud-team-button')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cloud-team-button';
    button.textContent = member.role === 'owner' ? '账号与权限' : member.display_name;
    button.addEventListener('click', showTeamModal);
    const logout = wrap.querySelector('.cloud-logout');
    wrap.insertBefore(button, logout || null);
    indicator.addEventListener('click', () => saveNow({ force: true }));
  }

  async function initializeBeforeApp() {
    client = window.PayrollCloud?.getClient?.();
    user = window.PayrollCloud?.getUser?.();
    if (!client || !user) return;
    await bootstrapWorkspace();
    installStoragePatch();
    await pullOrSeed();
  }

  async function mountAfterApp() {
    if (!client || !user || !workspace || !member) return;
    installStyles();
    mountTeamUi();
    if (readMeta().pending) await saveNow({ force: true });
  }

  window.PayrollWorkspace = {
    initializeBeforeApp,
    mountAfterApp,
    saveNow,
    getWorkspace: () => workspace,
    getMember: () => member,
    isOwner: () => member?.role === 'owner'
  };
})();