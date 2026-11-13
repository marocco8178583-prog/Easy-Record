# מבנה נתונים (schema 3)
```
{
  app, version:3, schema:3, appVersion, exportedAt, device,
  settings:{rate, hrate, od, cap, capOn, fy, cb},
  clients:[{id, name, phone, email, address, rate, cr, up}],
  entries:[{id, cid, date:"YYYY-MM-DD", days, rate, amount, t1?, t2?, nh?, sid?, basis?, hr?, note?, receipt, legacy?, cr, up}],
  payments:[{id, cid, date, amount, method, note, alloc:[{eid, amt}], cr, up}],
  sessions:[{id, cid, t0, t1, tz, off0, st:'run|brk|done', br:[{a,b,manual?}], basis:'day|hour', rate, note, eid, hist:[{ts,from,to,why}], cr, up}],  // t0/t1 = epoch ms
  receipts:[{id, cid, eid, name, type, date, file, size}]   // רק ב-ZIP
  counts:{clients, entries, payments, receipts}
}
```
- סכומי כסף: מספרים עם עיגול ל-2 ספרות (`r2`). **אין עדיין** מטבע לכל רשומה.
- שדות נגזרים (לא נשמרים): `pa` (שולם), `bl` (יתרה), `paid`, `method`/`pdate` אחרונים.
- `payments.id` שלילי = תשלום שנוצר ממיגרציה (דטרמיניסטי: `-<id של הרישום הישן>`), כך שכמה מכשירים שממירים אותו מידע מקבלים אותם מזהים.
- שדות מטא מקומיים (`ver`, `bv`, `_h`) לא מיוצאים.
