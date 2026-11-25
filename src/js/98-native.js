/* Native layer (Capacitor). Inert in a normal browser: everything is guarded by isNative().
   - Android back button: closes an open sheet, then returns to "היום שלי", then exits.
   - Local notifications: task reminders are scheduled with the OS, so they fire even when the app is closed (this is the native equivalent of push for on-device reminders).
   - Sign-in links (email confirmation / password reset / Google / Apple) return to the app through the custom scheme com.easyrecord.app://auth.
   - Status bar colour, haptic tick on clock actions. */
function isNative(){try{return !!(window.Capacitor&&Capacitor.isNativePlatform&&Capacitor.isNativePlatform())}catch(e){return false}}
function natPlug(n){try{return window.Capacitor&&Capacitor.Plugins&&Capacitor.Plugins[n]}catch(e){return null}}
var NAT_SCHEME='com.easyrecord.app://auth';
function natRedirect(){return isNative()?NAT_SCHEME:location.origin+location.pathname}
async function natSchedule(){var LN=natPlug('LocalNotifications');if(!isNative()||!LN)return 0;try{var p=await LN.checkPermissions();if(p.display!=='granted'){p=await LN.requestPermissions();if(p.display!=='granted')return 0}
    var pend=await LN.getPending();if(pend&&pend.notifications&&pend.notifications.length)await LN.cancel({notifications:pend.notifications.map(function(n){return {id:n.id}})});
    var now=Date.now(),list=(S.tasks||[]).filter(function(t){return !t.done&&t.due&&t.time}).map(function(t){var a=t.due.split('-'),h=t.time.split(':');return {t:t,at:new Date(+a[0],+a[1]-1,+a[2],+h[0],+h[1]).getTime()}}).filter(function(x){return x.at>now}).slice(0,60);
    var ns=list.map(function(x){return {id:(x.t.id%2147480000)||1,title:'Easy Record',body:x.t.title,schedule:{at:new Date(x.at),allowWhileIdle:true}}}).concat(typeof ddNat==='function'?ddNat():[]);
    if(!ns.length)return 0;await LN.schedule({notifications:ns});return ns.length}catch(e){return 0}}
function natHaptic(){var H=natPlug('Haptics');if(isNative()&&H)try{H.impact({style:'LIGHT'})}catch(e){}}
(function(){if(!isNative())return;document.documentElement.setAttribute('data-native','1');
  var SB=natPlug('StatusBar');if(SB)try{SB.setBackgroundColor({color:'#12302d'});SB.setStyle({style:'DARK'})}catch(e){}
  var A=natPlug('App');if(A){try{A.addListener('backButton',function(){if(!$('sheet').hidden){closeS();return}if(!$('gate').hidden)return;if(tab!=='clock'){tab='clock';CID=null;render();return}A.exitApp()})}catch(e){}
    try{A.addListener('appUrlOpen',function(ev){var u=String(ev&&ev.url||'');if(u.indexOf(NAT_SCHEME)!==0)return;var i=u.indexOf('#');if(i<0)return;history.replaceState(null,'',location.pathname+u.slice(i));authInit()})}catch(e){}
    try{A.addListener('resume',function(){try{clkTick();alertTick();render()}catch(e){}})}catch(e){}}
  ['startWork','finishWork','startBreak','endBreak'].forEach(function(n){var f=window[n];if(typeof f==='function')window[n]=function(){var r=f.apply(this,arguments);natHaptic();return r}});
  var sv=window.save;if(typeof sv==='function'){var nt=null;window.save=function(){var r=sv.apply(this,arguments);clearTimeout(nt);nt=setTimeout(natSchedule,1500);return r}}
  setTimeout(natSchedule,2000)})();
