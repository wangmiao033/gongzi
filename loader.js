(async()=>{
  try{
    const decode=async(b64)=>{
      const bytes=Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0));
      if(!('DecompressionStream' in window))throw new Error('浏览器版本过低，请使用最新版 Chrome 或 Edge');
      return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    };
    const get=async(path,label)=>fetch(path,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(label+'加载失败');return r.text()});
    const loadScript=(src,label)=>new Promise((resolve,reject)=>{
      if(document.querySelector(`script[src="${src}"]`))return resolve();
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(label+'加载失败'));
      document.head.appendChild(script);
    });
    const showSecureShell=(message='正在验证登录状态…')=>{
      document.documentElement.removeAttribute('data-payroll-app-loaded');
      document.body.innerHTML=`
        <main class="secure-shell">
          <div class="secure-shell-card">
            <div class="secure-shell-mark">薪</div>
            <div class="secure-shell-title">工资数据受登录保护</div>
            <div class="secure-shell-copy">${message}</div>
          </div>
        </main>`;
    };
    const storageKey='payroll_attendance_system_v1';
    const bootstrapKey='payroll_bootstrap_reload_guard_v1';
    const query=new URLSearchParams(location.search);
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const recoveryMode=query.get('mode')==='recovery'||hash.get('type')==='recovery';
    showSecureShell();

    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js','云端数据库组件');
    await loadScript('./cloud-sync.js?v=20260721-1','云端同步组件');
    await window.PayrollCloud.initializeBeforeApp();

    const authClient=window.PayrollCloud.getClient?.();
    authClient?.auth.onAuthStateChange((event)=>{
      if(event!=='SIGNED_OUT')return;
      const appVisible=document.documentElement.getAttribute('data-payroll-app-loaded')==='1';
      if(!appVisible)return;
      showSecureShell('账号已退出，正在返回登录页…');
      if(sessionStorage.getItem('payroll_signout_reload_guard')==='1')return;
      sessionStorage.setItem('payroll_signout_reload_guard','1');
      setTimeout(()=>location.reload(),80);
    });

    const currentUser=window.PayrollCloud.getUser?.();
    if(!currentUser||recoveryMode){
      sessionStorage.removeItem('payroll_signout_reload_guard');
      showSecureShell();
      await window.PayrollCloud.mountAfterApp();
      await loadScript('./email-otp-addon.js?v=20260721-5','中文登录注册模块');
      return;
    }

    sessionStorage.removeItem('payroll_signout_reload_guard');
    await loadScript('./workspace-team.js?v=20260721-8','共享账套与成员权限');
    await window.PayrollWorkspace.initializeBeforeApp();
    await loadScript('./roster-migration-20260721.js?v=20260721-15','熊动员工及7月工资数据修复');

    let initialState={};
    try{initialState=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch(error){}
    const requiredEmployees=['e_lhj','e_wwb','e_gh','e_mcm'];
    const validBootstrapState=state=>Array.isArray(state?.employees)&&state?.months&&requiredEmployees.every(id=>state.employees.some(e=>e.id===id));
    let needsBootstrap=!validBootstrapState(initialState);
    const preservedArchives=initialState.payrollArchives;
    const preservedCorrections=initialState.payrollCorrections;

    if(needsBootstrap){
      localStorage.removeItem(storageKey);
    }else{
      sessionStorage.removeItem(bootstrapKey);
      await loadScript('./wangmiao-june-2026.js?v=20260716-10','王淼历史工资');
      await loadScript('./finance-june-2026-correction.js?v=20260716-10','财务最终工资数据');
    }

    document.body.innerHTML=await decode(await get('./body.gz.b64?v=20260716-7','界面'));
    document.documentElement.setAttribute('data-payroll-app-loaded','1');
    const names=['00','01','02','03','04','05','06','07'];
    const parts=await Promise.all(names.map(n=>get('./app/'+n+'.b64?v=20260716-7','程序')));
    let core=await decode(parts.join(''));
    core=core.replace('let state = loadState();','let state;');
    core=core.replace("const round2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;", "const round2 = v => Math.round((num(v) + Number.EPSILON) * 100) / 100;\n  state = loadState();");
    core=core.replace('if (!raw) return clone(seedData);',"if (!raw) { localStorage.setItem(STORAGE_KEY, JSON.stringify(seedData)); return clone(seedData); }");
    (0,eval)(core);

    if(needsBootstrap){
      await loadScript('./wangmiao-june-2026.js?v=20260716-10','王淼历史工资');
      await loadScript('./finance-june-2026-correction.js?v=20260716-10','财务最终工资数据');
      try{
        const restored=JSON.parse(localStorage.getItem(storageKey)||'{}');
        if(preservedArchives)restored.payrollArchives=preservedArchives;
        if(Array.isArray(preservedCorrections))restored.payrollCorrections=preservedCorrections;
        localStorage.setItem(storageKey,JSON.stringify(restored));
        needsBootstrap=!validBootstrapState(restored);
      }catch(error){needsBootstrap=true}

      if(needsBootstrap){
        sessionStorage.removeItem(bootstrapKey);
        throw new Error('工资基础数据恢复失败，请退出账号后重新登录；系统已停止自动刷新以避免循环跳转。');
      }

      await window.PayrollWorkspace.saveNow({force:true});
      const attempts=Number(sessionStorage.getItem(bootstrapKey)||0);
      if(attempts<1){
        sessionStorage.setItem(bootstrapKey,String(attempts+1));
        setTimeout(()=>location.reload(),120);
        return;
      }
      sessionStorage.removeItem(bootstrapKey);
    }

    await loadScript('./history-addon.js?v=20260716-8','历史工资模块');
    await loadScript('./company-history-addon.js?v=20260721-13','熊动历史工资视图');
    await loadScript('./payroll-archive-addon.js?v=20260720-6','工资归档模块');
    await loadScript('./current-company-filter.js?v=20260721-9','当前工资公司筛选模块');
    await loadScript('./new-payroll-month.js?v=20260721-14','新建工资月份与完整性校验模块');
    await loadScript('./wecom-attendance-import.js?v=20260722-1','企业微信考勤表解析模块');
    await loadScript('./wecom-attendance-addon.js?v=20260722-3','企业微信考勤同步模块');
    await window.PayrollCloud.mountAfterApp();
    await window.PayrollWorkspace.mountAfterApp();
    await loadScript('./email-otp-addon.js?v=20260721-5','中文登录注册模块');
  }catch(error){
    document.documentElement.removeAttribute('data-payroll-app-loaded');
    document.body.innerHTML='<main class="secure-shell"><div class="secure-shell-card secure-shell-error"><div class="secure-shell-mark">薪</div><h2>工资系统加载失败</h2><p>'+String(error&&error.message||error)+'</p><button class="btn primary" onclick="sessionStorage.clear();location.replace(location.origin+\'/?repair=1\')">修复并重新进入</button></div></main>';
    console.error(error);
  }
})();
