-- Easy Record: שלב 8 — הקשחת אבטחה (בלי שינוי בנתונים או בהתנהגות). הוחל על הפרויקט ב-17.11.2026.
alter function public.records_ver_guard() set search_path = '';
alter function public.records_ins_stamp() set search_path = '';
