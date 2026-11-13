/* International phone: country list, E.164 normalisation, simple per-country length rules (NOT libphonenumber; it catches obvious mistakes only). */
var CC=[['IL','ישראל',972,8,9,1],['PS','הרשות הפלסטינית',970,8,9,1],['US','ארצות הברית',1,10,10],['CA','קנדה',1,10,10],['GB','בריטניה',44,9,10,1],['FR','צרפת',33,9,9,1],['DE','גרמניה',49,7,12,1],['ES','ספרד',34,9,9],['IT','איטליה',39,6,11],['PT','פורטוגל',351,9,9],['NL','הולנד',31,9,9],['BE','בלגיה',32,8,9,1],['CH','שווייץ',41,9,9,1],['AT','אוסטריה',43,4,13,1],['SE','שוודיה',46,7,9,1],['NO','נורווגיה',47,8,8],['DK','דנמרק',45,8,8],['FI','פינלנד',358,5,11,1],['IE','אירלנד',353,7,9,1],['PL','פולין',48,9,9],['CZ','צ׳כיה',420,9,9],['HU','הונגריה',36,8,9,1],['RO','רומניה',40,9,9,1],['BG','בולגריה',359,8,9,1],['GR','יוון',30,10,10],['CY','קפריסין',357,8,8],['TR','טורקיה',90,10,10,1],['RU','רוסיה',7,10,10,1],['UA','אוקראינה',380,9,9,1],['BY','בלארוס',375,9,9,1],['GE','גאורגיה',995,9,9],['AM','ארמניה',374,8,8,1],['AZ','אזרבייג׳ן',994,9,9,1],['KZ','קזחסטן',7,10,10,1],['EG','מצרים',20,9,10,1],['JO','ירדן',962,8,9,1],['LB','לבנון',961,7,8,1],['SA','ערב הסעודית',966,9,9,1],['AE','איחוד האמירויות',971,8,9,1],['MA','מרוקו',212,9,9,1],['DZ','אלג׳יריה',213,8,9,1],['TN','תוניסיה',216,8,8],['ET','אתיופיה',251,9,9,1],['ZA','דרום אפריקה',27,9,9,1],['NG','ניגריה',234,8,10,1],['KE','קניה',254,9,9,1],['IN','הודו',91,10,10],['CN','סין',86,11,11],['JP','יפן',81,9,10,1],['KR','דרום קוריאה',82,9,10,1],['TH','תאילנד',66,8,9,1],['PH','הפיליפינים',63,10,10,1],['VN','וייטנאם',84,9,10,1],['ID','אינדונזיה',62,8,12,1],['SG','סינגפור',65,8,8],['AU','אוסטרליה',61,9,9,1],['NZ','ניו זילנד',64,8,10,1],['BR','ברזיל',55,10,11],['AR','ארגנטינה',54,10,11],['MX','מקסיקו',52,10,10],['CL','צ׳ילה',56,9,9],['CO','קולומביה',57,10,10],['PE','פרו',51,9,9],['UY','אורוגוואי',598,8,9,1],['VE','ונצואלה',58,10,10,1]];
function ccByCode(k){return CC.find(function(c){return c[0]===k})}
/* normPhone(raw, defaultCountry) -> {ok, e164, cc, nat, err}. Accepts +CC..., 00CC..., national with leading 0, or an empty value (ok:true, e164:''). */
function normPhone(raw,dc){raw=String(raw||'').trim();if(!raw)return {ok:true,e164:''};
  if(/[^\d\s()+\-.]/.test(raw))return {ok:false,err:'הטלפון מכיל תווים לא חוקיים'};
  var d=raw.replace(/[^\d+]/g,''),plus=d.charAt(0)==='+';d=d.replace(/\+/g,'');if(!plus&&d.slice(0,2)==='00'){plus=true;d=d.slice(2)}
  var c;if(plus){c=null;for(var n=3;n>=1&&!c;n--){var p=+d.slice(0,n);c=CC.filter(function(x){return x[2]===p&&String(x[2]).length===n})[0]||null;}
    if(!c)return {ok:false,err:'קידומת מדינה לא מוכרת'};d=d.slice(String(c[2]).length)}
  else{c=ccByCode(dc||'IL')||CC[0]}
  var nat=d;if(c[5]&&nat.charAt(0)==='0')nat=nat.slice(1);else if(!plus&&nat.charAt(0)==='0')nat=nat.slice(1);
  if(nat.length<c[3]||nat.length>c[4])return {ok:false,err:'אורך המספר לא תקין עבור '+c[1]+' ('+(c[3]===c[4]?c[3]:c[3]+'–'+c[4])+' ספרות אחרי הקידומת)'};
  return {ok:true,e164:'+'+c[2]+nat,cc:c[0],nat:nat}}
function waNum(phone){var r=normPhone(phone,S.dcc);return r.ok&&r.e164?r.e164.slice(1):String(phone||'').replace(/\D/g,'')}
function ccOpts(sel){return CC.map(function(c){return '<option value="'+c[0]+'"'+(c[0]===sel?' selected':'')+'>'+c[1]+' (+'+c[2]+')</option>'}).join('')}
/* Clients: duplicate-name key + archive */
function nk(n){return String(n||'').normalize('NFKC').replace(/\s+/g,' ').trim().toLowerCase()}
function findClient(n,exceptId){var k=nk(n);return S.clients.find(function(c){return c.id!==exceptId&&nk(c.name)===k})}
