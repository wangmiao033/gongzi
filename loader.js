(async()=>{
  try{
    const decode=async(b64)=>{
      const bytes=Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0));
      if(!('DecompressionStream' in window))throw new Error('浏览器版本过低，请使用最新版 Chrome 或 Edge');
      return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    };
    const get=async(path,label)=>fetch(path,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(label+'加载失败');return r.text()});
    const loadScript=(src,label)=>new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error(label+'加载失败'));
      document.head.appendChild(script);
    });
    const showSecureShell=()=>{
      document.documentElement.removeAttribute('data-payroll-app-loaded');
      document.body.innerHTML=`
        <main style="min-height:100vh;display:grid;place-items:center;background:linear-gradient(145deg,#eef6f8,#f8fafc);font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#334155">
          <div style="text-align:center;padding:32px">
            <div style="width:54px;height:54px;margin:0 auto 16px;border-radius:16px;display:grid;place-items:center;background:#0f879c;color:#fff;font-size:25px;font-weight:700;box-shadow:0 14px 34px rgba(15,135,156,.2)">薪</div>
            <div style="font-size:18px;font-weight:700;color:#0f172a">工资数据受登录保护</div>
            <div style="margin-top:8px;font-size:13px;color:#64748b">正在验证登录状态…</div>
          </div>
        </main>`;
    };

    const query=new URLSearchParams(location.search);
    const hash=new URLSearchParams(location.hash.replace(/^#/,''));
    const recoveryMode=query.get('mode')==='recovery'||hash.get('type')==='recovery';
    showSecureShell();

    await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js','云端数据库组件');
    await loadScript('./cloud-sync.js?v=20260721-1','云端同步组件');
    await window.PayrollCloud.initializeBeforeApp();

    const authClient=window.PayrollCloud.getClient?.();
    authClient?.auth.onAuthStateChange((event,session)=>{
      const appVisible=document.documentElement.getAttribute('data-payroll-app-loaded')==='1';
      if(appVisible&&(event==='SIGNED_OUT'||!session)){
        showSecureShell();
        setTimeout(()=>location.replace(location.origin+'/'),0);
      }
    });

    const currentUser=window.PayrollCloud.getUser?.();
    if(!currentUser||recoveryMode){
      showSecureShell();
      await window.PayrollCloud.mountAfterApp();
      await loadScript('./email-otp-addon.js?v=20260721-5','中文登录注册模块');
      return;
    }

    await loadScript('./workspace-team.js?v=20260721-8','共享账套与成员权限');
    await window.PayrollWorkspace.initializeBeforeApp();

    const storageKey='payroll_attendance_system_v1';
    let initialState={};
    try{initialState=JSON.parse(localStorage.getItem(storageKey)||'{}')}catch(error){}
    const requiredEmployees=['e_lhj','e_wwb','e_gh','e_mcm'];
    const needsBootstrap=!Array.isArray(initialState.employees)||!initialState.months||!requiredEmployees.every(id=>initialState.employees.some(e=>e.id===id));
    const preservedArchives=initialState.payrollArchives;
    const preservedCorrections=initialState.payrollCorrections;
    if(needsBootstrap)localStorage.removeItem(storageKey);
    if(!needsBootstrap){
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
      }catch(error){}
      await window.PayrollCloud.saveNow({force:true});
      await window.PayrollWorkspace.saveNow({force:true});
      location.replace(location.href);
      return;
    }

    await loadScript('./history-addon.js?v=20260716-8','历史工资模块');
    await loadScript('./company-history-addon.js?v=20260716-10','公司工资分类模块');
    await loadScript('./payroll-archive-addon.js?v=20260720-6','工资归档模块');
    await loadScript('./current-company-filter.js?v=20260721-9','当前工资公司筛选模块');
    await window.PayrollCloud.mountAfterApp();
    await window.PayrollWorkspace.mountAfterApp();
    await loadScript('./email-otp-addon.js?v=20260721-5','中文登录注册模块');
  }catch(error){
    document.documentElement.removeAttribute('data-payroll-app-loaded');
    document.body.innerHTML='<div style="padding:32px;font-family:system-ui"><h2>工资系统加载失败</h2><p>'+String(error&&error.message||error)+'</p></div>';
    console.error(error);
  }
})();