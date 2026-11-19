/* Offline .xlsx writer (OOXML via embedded JSZip). No CDN. Supports several sheets in one workbook. */
function xesc(s){return String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
function colL(i){var s='';i++;while(i>0){var m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s}
/* Cells that start with = + - @ tab CR would be evaluated as formulas by spreadsheet apps: prefix with ' */
function xsafe(v){var s=String(v);return /^[=+\-@\t\r]/.test(s)&&isNaN(Number(s))?"'"+s:s}
function xSheetXml(rows,widths){var sd='';
  rows.forEach(function(r,ri){var cs='';r.forEach(function(v,ci){if(v===''||v==null)return;var ref=colL(ci)+(ri+1);
    if(typeof v==='number'&&isFinite(v))cs+='<c r="'+ref+'"><v>'+v+'</v></c>';
    else cs+='<c r="'+ref+'" t="inlineStr"><is><t xml:space="preserve">'+xesc(xsafe(v))+'</t></is></c>'});
    sd+='<row r="'+(ri+1)+'">'+cs+'</row>'});
  var cols=(widths||[]).map(function(w,i){return '<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+Math.max(12,w*7)+'" customWidth="1"/>'}).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView '+(document.documentElement.dir==='rtl'?'rightToLeft="1" ':'')+'workbookViewId="0"/></sheetViews>'+(cols?'<cols>'+cols+'</cols>':'')+'<sheetData>'+sd+'</sheetData></worksheet>'}
/* sheets: [{name, rows, widths}] */
async function xlsxBook(sheets){
  var z=new JSZip(),used={},ov='',sh='',rel='';
  sheets.forEach(function(s,i){var n=i+1,nm=String(s.name||('Sheet'+n)).replace(/[\[\]:*?\/\\]/g,' ').trim().slice(0,31)||('Sheet'+n);while(used[nm])nm=nm.slice(0,28)+' '+n;used[nm]=1;
    ov+='<Override PartName="/xl/worksheets/sheet'+n+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    sh+='<sheet name="'+xesc(nm)+'" sheetId="'+n+'" r:id="rId'+n+'"/>';
    rel+='<Relationship Id="rId'+n+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+n+'.xml"/>';
    z.file('xl/worksheets/sheet'+n+'.xml',xSheetXml(s.rows,s.widths))});
  z.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'+ov+'</Types>');
  z.file('_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
  z.file('xl/workbook.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'+sh+'</sheets></workbook>');
  z.file('xl/_rels/workbook.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rel+'</Relationships>');
  return z.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
async function xlsxBlob(rows,widths){return xlsxBook([{name:'Report',rows:rows,widths:widths}])}
function xlsxRows(R){return [[R.title],[R.sub],[],R.cols].concat(R.rows.map(function(r){return r.x}),[[]],R.sum.map(function(s){return [s[0],s[2]]}))}
