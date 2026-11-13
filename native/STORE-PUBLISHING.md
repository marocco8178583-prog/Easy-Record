# Easy Record — אפליקציה ל-iOS ול-Android (Capacitor)

## מצב בפועל
- **הוכן:** הגדרות Capacitor (`capacitor.config.json`, `package.json`), סקריפט שמעתיק את האתר הבנוי ל-`www/`, תמונות מקור לאייקון ולמסך פתיחה (`resources/`), שכבה native בקוד האפליקציה (`src/js/98-native.js`), טקסטים לחנויות (`store/`).
- **לא נבנה:** תיקיות `android/` ו-`ios/`, קובץ AAB ו-IPA. בסביבה שבה הוכן הפרויקט אין גישה ל-npm, אין Android SDK ואין Mac, ולכן אי אפשר היה להריץ `npx cap add`. שום דבר כאן לא נחתם ולא הועלה לחנות.
- **נבדק:** השכבה ה-native נבדקה רק מול סביבת Capacitor מדומה בדפדפן (`tests/native-tests.js`, 8 בדיקות), לא במכשיר.

## למה Capacitor
אותו קוד ואותו Supabase כמו באתר, עם תוספים native אמיתיים: התראות מקומיות שעובדות כשהאפליקציה סגורה, כפתור חזרה של אנדרואיד, קישורי אימות שחוזרים לאפליקציה, שורת מצב, רטט, מסך פתיחה ומקלדת. האפליקציה לא תלויה ברשת כדי להיפתח (הקבצים בתוך החבילה). חלופה כמו React Native הייתה מחייבת לכתוב את האפליקציה מחדש.

## מה צריך
- **Android:** מחשב עם Node 20+, Android Studio (כולל SDK), חשבון Google Play Console (25$ חד-פעמי).
- **iOS:** Mac עם Xcode עדכני, חשבון Apple Developer (99$ לשנה).
- מזהה אפליקציה: בקובץ `capacitor.config.json` מופיע `com.easyrecord.app`. מומלץ להחליף לדומיין שבבעלותך (למשל `il.co.שלך.easyrecord`) **לפני** הבנייה הראשונה. אם משנים, יש לשנות גם את `NAT_SCHEME` ב-`src/js/98-native.js`.

## צעדים
1. בתיקיית הפרויקט: `node build.js` (בונה את `deploy/`).
2. `cd native && npm install`
3. `npx cap add android` ו/או `npx cap add ios` (ב-Mac).
4. `npm run assets` (מייצר אייקונים ומסכי פתיחה לכל הגדלים מ-`resources/`).
5. `npm run sync` (מעתיק את האתר ל-`www/` ומסנכרן).
6. **Supabase ← Authentication ← URL Configuration ← Redirect URLs:** להוסיף `com.easyrecord.app://auth` (או הסכמה שבחרת).
7. **קישור חזרה (deep link):**
   - Android: ב-`android/app/src/main/AndroidManifest.xml`, בתוך ה-activity הראשית, להוסיף intent-filter עם `<data android:scheme="com.easyrecord.app" android:host="auth"/>` ו-`BROWSABLE`/`DEFAULT`.
   - iOS: ב-Xcode ← Target ← Info ← URL Types: להוסיף URL Scheme `com.easyrecord.app`.
8. **הרשאות:**
   - iOS (`ios/App/App/Info.plist`): `NSMicrophoneUsageDescription` = "המיקרופון משמש לפקודות קוליות ולהערות קוליות, רק אחרי לחיצה." · `NSLocationWhenInUseUsageDescription` = "המיקום נשמר ליום עבודה רק כשאתה מבקש." · `NSSpeechRecognitionUsageDescription` (אם יתווסף זיהוי דיבור native).
   - Android: `RECORD_AUDIO`, `ACCESS_COARSE_LOCATION`, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM` (לתזכורות בזמן מדויק).
9. **Android:** `npm run android` ← ב-Android Studio: Build ← Generate Signed App Bundle ← ליצור keystore (לשמור אותו ואת הסיסמה במקום בטוח; בלעדיו אי אפשר לעדכן את האפליקציה) ← `app-release.aab` ← Play Console ← Internal testing.
10. **iOS:** `npm run ios` ← ב-Xcode: Signing & Capabilities ← לבחור Team ← Product ← Archive ← Distribute App ← App Store Connect ← TestFlight.

## דרישות חנויות שכבר מכוסות באפליקציה
- מחיקת חשבון ונתונים מתוך האפליקציה (הגדרות ← החשבון שלי ← מחיקת החשבון). חובה בשתי החנויות.
- כניסה עם Apple: אם מציעים כניסה עם Google באפליקציית iOS, Apple דורשת גם אפשרות כניסה שווה ערך (Sign in with Apple קיים, דורש הגדרה ב-Supabase).
- מדיניות פרטיות: `privacy.html` (טיוטה; חובה להשלים ולפרסם בכתובת קבועה לפני ההגשה).
- אין רכישות בתוך האפליקציה ואין העברת כספים.

## מה עוד צריך להכין לפני הגשה
- צילומי מסך: iPhone 6.9" ו-6.5", iPad (אם נתמך), טלפון ו-tablet לאנדרואיד. לצלם ממכשיר או מסימולטור.
- טופס Data safety (Google) ו-App Privacy (Apple): לפי `store/data-safety-he.md`.
- כתובת תמיכה ואימייל.
- בדיקה במכשירים אמיתיים: התחברות, סנכרון, קבלות, הקלטה, מיקום, התראות כשהאפליקציה סגורה.
