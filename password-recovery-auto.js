(async()=>{
  try{
    const load=(src)=>new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=src;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('密码重置组件加载失败'));
      document.head.appendChild(script);
    });

    await load('./password-recovery-addon.js?v=20260721-4');
    await window.PayrollPasswordRecovery.prepareBeforeApp();

    let attempts=0;
    const timer=setInterval(async()=>{
      attempts+=1;
      const ready=window.PayrollCloud?.getClient?.()&&document.querySelector('.cloud-auth-overlay');
      if(ready){
        clearInterval(timer);
        await window.PayrollPasswordRecovery.mountAfterApp();
      }else if(attempts>120){
        clearInterval(timer);
      }
    },100);
  }catch(error){
    console.error(error);
  }
})();