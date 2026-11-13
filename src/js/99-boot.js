$('rate').value=S.rate;bootMigrate();setVals();calc();render();applyTheme();loadIdbState();

applyLang(S.lang||'he');
authInit();
applyFs();
initDb();

remCheck();
bgLoad();
preUpSnap().then(preUpUI);
try{applyHc()}catch(e){}