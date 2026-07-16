(async()=>{
  try{
    const decode=async(b64)=>{
      const bytes=Uint8Array.from(atob(b64.replace(/\s/g,'')),c=>c.charCodeAt(0));
      if(!('DecompressionStream' in window))throw new Error('浏览器版本过低，请使用最新版 Chrome 或 Edge');
      return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    };
    const get=async(path,label)=>fetch(path,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(label+'加载失败');return r.text()});
    document.body.innerHTML=await decode(await get('./body.gz.b64?v=20260716-7','界面'));
    const names=['00','01','02','03','04','05','06','07'];
    const parts=await Promise.all(names.map(n=>get('./app/'+n+'.b64?v=20260716-7','程序')));
    (0,eval)(await decode(parts.join('')));
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='./history-addon.js?v=20260716-8';
      script.onload=resolve;
      script.onerror=()=>reject(new Error('历史工资模块加载失败'));
      document.body.appendChild(script);
    });
  }catch(error){
    document.body.innerHTML='<div style="padding:32px;font-family:system-ui"><h2>工资系统加载失败</h2><p>'+String(error&&error.message||error)+'</p></div>';
    console.error(error);
  }
})();
