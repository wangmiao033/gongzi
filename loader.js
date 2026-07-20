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
      location.replace(location.href);
      return;
    }
    await loadScript('./history-addon.js?v=20260716-8','历史工资模块');
    await loadScript('./company-history-addon.js?v=20260716-10','公司工资分类模块');
    await loadScript('./payroll-archive-addon.js?v=20260720-6','工资归档模块');
  }catch(error){
    document.body.innerHTML='<div style="padding:32px;font-family:system-ui"><h2>工资系统加载失败</h2><p>'+String(error&&error.message||error)+'</p></div>';
    console.error(error);
  }
})();
