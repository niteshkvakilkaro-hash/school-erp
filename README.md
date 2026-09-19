# ERPSC — Multi-tenant School Management SaaS

Ek platform, kai schools. Node.js + Express + MySQL backend, React admin panel,
aur React Native (Expo) app parents aur students ke liye.

Theme tokens `ngoking/ngo-latest` se liye gaye hain — emerald brand, deep-green
sidebar, light + dark mode. Wahi values mobile app me bhi hain (`mobile/src/lib/theme.js`).

```
erpsc/
├── backend/    Node + Express + Sequelize   -> API (web + app dono ke liye)
├── frontend/   React + Vite + Tailwind v4   -> Super Admin + School admin panel
└── mobile/     React Native (Expo)          -> Parent + Student app
```

## Database kahan banta hai

| | |
| --- | --- |
| Server | XAMPP ka MySQL / MariaDB, `127.0.0.1:3306` |
| Database | `erpsc_saas` (ek hi DB, har row par `school_id`) |
| Files on disk | `C:\xampp\mysql\data\erpsc_saas\` |
| Dekhne ke liye | phpMyAdmin -> http://localhost/phpmyadmin |
| Config | [backend/.env](backend/.env) ka `DB_NAME` |

Database khud ban jata hai — `ensureDatabaseExists()` `CREATE DATABASE IF NOT EXISTS`
chalata hai, isliye phpMyAdmin me pehle se banane ki zaroorat nahi.

### Tables

| Table | Kya rakhta hai |
| --- | --- |
| `schools` | Har tenant — name, code, city, status (active/trial/suspended) |
| `plans` | SaaS pricing — price, max students, max teachers |
| `subscriptions` | Kaunsa school kis plan par, kab tak |
| `permissions` | Poora permission catalog (`students.create` jaise slugs) |
| `roles` | `school_id` null = platform role, warna us school ka role |
| `role_permissions` | Role se permission ka mapping |
| `users` | Sab logins. Email **per-school** unique hai |
| `teachers` / `students` | Profile + `school_id` |
| `student_guardians` | Parent login se bachche ka link (many-to-many) |
| `classes` / `sections` / `subjects` | Academics, sab `school_id` ke saath |
| `attendance` | Roz ki attendance - ek student ka ek din me ek record |
| `homework` | Class/section wise assignments, due date ke saath |
| `exams` / `exam_subjects` | Exam aur uski datesheet (kaunsa paper kab) |
| `marks` | Har student ke har paper ke marks |
| `fee_heads` | Fee categories - Tuition, Transport waghairah |
| `student_fees` | Kis student par kaunsi fee, kitni paid, kitni baaki |
| `fee_payments` | Har receipt - amount, mode, kisne li |
| `periods` | School ka bell schedule - Period 1, lunch waghairah |
| `timetable_slots` | Section x day x period par kaunsa subject aur teacher |
| `notices` | Announcements - audience, category, publish/expiry dates |
| `books` | Library catalogue - title, code, copies, shelf |
| `book_issues` | Kaunsi book kise, kab tak, kab wapas aur kitna fine |
| `vehicles` | School bus/van - reg no, seats, driver, helper, insurance |
| `transport_routes` | Route - code, fare, kaunsa vehicle chalta hai |
| `route_stops` | Route ke stops - pickup aur drop time |
| `student_transport` | Kaunsa student kis route aur stop se (ek student = ek row) |
| `admissions` | Enquiry / application - bachcha, parents, class, source, stage, follow-up, interview |
| `admission_logs` | Har application ki timeline - stage badla ya note, kisne aur kab |
| `school_sites` | School ki public website - theme, hero, about, principal, highlights, facilities, videos, reviews, FAQ, socials, publish |
| `hr_settings` | School ki HR policy - GPS point, radius, timing, late ki chhoot, half-day, weekly off, selfie/location rules |
| `staff_attendance` | Staff ki roz ki attendance - check-in/out ka server time, GPS, school se doori, bahar/mock flag, selfie (private) |
| `leave_requests` | Staff ki leave - type, dates, din, reason, approve/reject |
| `site_media` | Website ki photos - slider, gallery (albums), logo, principal photo. File `backend/uploads/schools/<id>/` me |

## Setup

```bash
npm run setup     # deps + database + demo data (2 schools ke saath)
npm run dev       # API :5000 + admin panel :5173
npm run dev:app   # Expo app (alag terminal me), ya sab ek saath: npm run dev:all
```

### Demo logins

| Kaun | Email | Password |
| --- | --- | --- |
| **Super Admin** (platform) | admin@school.com | admin123 |
| School Admin — Sunrise | admin@sunrise.com | admin123 |
| Teacher — Sunrise | anita.sharma@sunrise.com | teacher123 |
| **Parent** (app) | parent@sunrise.com | parent123 |
| **Student** (app) | student@sunrise.com | student123 |
| School Admin — Green Valley | admin@greenvalley.com | admin123 |

## Multi-tenancy kaise kaam karta hai

Shared database + `school_id` har tenant table par.

- Login par JWT me `schoolId` jaata hai. Us token se banne wali har query
  [`scopedWhere(req)`](backend/src/utils/tenant.js) se guzarti hai, jo `school_id`
  chipka deta hai. Controllers khud kabhi bina scope ke `where` nahi banate.
- Kisi doosre school ka id URL me daalne par **404** milta hai (403 nahi — taki
  id exist karti hai ya nahi ye leak na ho).
- Foreign keys bhi check hote hain: doosre school ka `classId`/`teacherId`/`roleId`
  apne record par nahi laga sakte (`assertSameTenant`).
- **Super Admin** ka `school_id` null hota hai. Wo `X-School-Id` header bhej kar
  kisi bhi school ke andar ja sakta hai — UI me Schools page se "enter" karke.
  Andar rehte hue peela banner dikhta hai taki galti se kaam na ho jaye.
- Ek hi email do schools me ho sakta hai. Login par dono match hue to API
  `needsSchoolChoice` bhejta hai aur UI school picker dikhata hai.

## Roles & Permissions

Roles database me hain, code me nahi. Har naye school me ye default roles
automatically ban jaate hain, aur School Admin inke permissions checkbox se
badal sakta hai — ya apna naya role bana sakta hai.

| Role | Default access |
| --- | --- |
| Super Admin *(platform)* | Schools, plans, subscriptions, kisi bhi school me enter |
| School Admin | Apne school ka sab kuch |
| Principal | Sab view + students edit + results publish + fee reports |
| Teacher | Students view/add/edit, attendance mark, homework, marks entry, apna timetable |
| Accountant | Fees - heads, assign, collection aur reports |
| Librarian | Library - books, issue, return aur fines |
| Transport Manager | Vehicles, routes, stops aur students ko bus assign karna |
| Front Office | Admission enquiries, follow-up, interview (admit nahi kar sakte) |

Har staff role (teacher, accountant, librarian, transport, front office, principal) ke paas `hr.self` hai - app se apni attendance aur leave. Live panel / register / leave approve: school admin aur principal (`hr.view`, `hr.manage`).
| Student *(app)* | Apna record |
| Parent *(app)* | Apne bachcho ka record |

Naya permission add karna ho to [backend/src/config/permissions.js](backend/src/config/permissions.js)
me slug likhiye aur `npm run db:seed` chala dijiye — UI me apne aap module-wise
group ban jayega.

Guards dono taraf hain: menu item aur buttons permission ke bina dikhte hi nahi,
aur API bhi 403 deta hai.

## School website (public)

Har school ki apni website: `/site/<school-slug>` - e.g.
[localhost:5173/site/sunrise-public-school](http://localhost:5173/site/sunrise-public-school).
Admin panel me **Settings → Website** se:

- 4 themes: **Emerald Fresh**, **Midnight Neon** (dark, purple-pink-orange gradient), **Royal Classic**, **Sunrise Warm**.
  Kisi bhi theme ko `?theme=midnight` laga kar bina save kiye dekh sakte hain.
- **Hero slider** - school ki apni photos (max 8), har slide par title/caption, auto-play, arrows, swipe. Photos na hon to theme wala illustration.
- **Photo gallery** - albums (Campus, Sports, Events, ya koi naya), full-screen lightbox (keyboard + swipe). Max 80 photos.
- **Videos** - YouTube / Vimeo link; click karne par hi video load hota hai (page tez rehta hai).
- **Logo** (website + ERP), **principal ki photo**, parents ke reviews, FAQ, Google map.
- Hero, about, principal ka message, "why choose us", facilities, social links, admission note.
- Upload: JPG/PNG/WebP, 8 MB tak. Server par photo WebP me chhoti hoti hai (slide 2000px, gallery 1600px + thumbnail),
  EXIF/GPS hat jata hai, aur jo file asli image nahi hai (SVG, script) wo reject hoti hai.
- Publish on/off. Band website sirf usi school ke logged-in user ko "Preview" banner ke saath dikhti hai.
- Admission enquiry form (page par aur "Request a callback" popup) - seedha **Admissions** me "Website"
  source ke saath, kal ka follow-up laga ke. IP par 15 min me 5 requests ki limit + hidden spam field.
  Desktop par page chhodte waqt ek baar "Before you go" popup.
- News & events: sirf wo notices jin par "School website par bhi dikhaiye" tick hai.
- Students / teachers / classes ke numbers live ginti se.

Website ka code alag chunk me load hota hai - visitor ko admin ERP ka code download nahi karna padta.

## Staff attendance & HR

**Staff app** (wahi Expo app - teacher/staff login par staff screens khulti hain):
- **Check-in / check-out** - front camera se selfie + GPS. Time **server** ka lagta hai (phone ki ghadi se farak nahi), school ke point se doori naapi jaati hai, campus ke bahar aur Android ki *mock location* flag hoti hai. HR settings me "bahar se rok do" chalu ho to wahin mana.
- Late (school time + chhoot ke baad), kam ghante par half-day - apne aap.
- **Class attendance** - class teacher apne section ki hazri (P/A/L/H) app se.
- **Leave** apply / cancel, apni mahine ki attendance, apna timetable.

**Admin panel → HR:**
- **Staff attendance → Live** - aaj kaun aaya, kab, kitni door se, selfie; har 30 sec refresh; filters (late, nahi aaye, flags); detail me dono selfie + map; haath se status badalna (note zaroori, register me nishan).
- **Monthly register** - staff x din grid (P/L/H/A/LV), totals, CSV (Excel) download.
- **HR settings** - "Meri location use kariye" se school ka GPS point, radius, timing, weekly off, rules.
- **Leaves** - pending pehle, approve / reject (reject ke liye reason); apni leave khud approve nahi.

Selfie `backend/private/` me rehti hai - static serve **nahi** hoti; sirf HR dekhne wala ya wahi staff API se dekh sakta hai.

> Face *matching* (selfie asli usi insaan ki hai ya nahi) abhi nahi hai - admin selfie dekh kar verify karta hai.
> Iske liye AWS Rekognition / Azure Face jaisi service jodni padegi.

## Backup

Roz raat (`BACKUP_TIME`, default 02:00 school time) apne aap: **database (mysqldump) + `uploads/` + `private/`** → `.tar.gz` → **AES-256-GCM encrypt** (`BACKUP_PASSWORD`) → khol kar jaanch → `backend/backups/` → cloud (agar set) → purane hatao → report email. Server raat ko band tha to chalu hote hi le leta hai; fail ho to din me 3 baar tak dobara.

- **Super Admin → Backups**: aakhri backup, setup ki kami (password / cloud / email), "Abhi backup lijiye", har backup ka download.
- **Cloud**: koi bhi S3-compatible - Cloudflare R2 (10 GB free), Backblaze B2, AWS S3, Wasabi. `.env` me `BACKUP_S3_*` (dekhiye `.env.example`). Cloud fail ho to bhi server wala backup rehta hai aur report me chetavni aati hai.
- **Kitne din**: server par `BACKUP_KEEP_DAYS` (14), cloud par `BACKUP_S3_KEEP_DAYS` (30); sabse naye 3 hamesha.
- **Report**: `BACKUP_REPORT_EMAIL` par roz OK / FAIL (file email me nahi jaati). SMTP (`SMTP_*`, Gmail ke liye App password) set na ho to mail `backups/outbox.log` me.
- Terminal: `npm run backup:now`

**Wapas laana** (server par, API band karke):

```bash
npm run backup:restore -- backups/<file>.erpscbk --verify            # sirf jaanch
npm run backup:restore -- backups/<file>.erpscbk --db erpsc_check    # alag DB me dekhiye
npm run backup:restore -- backups/<file>.erpscbk --yes --files       # LIVE DB + photos/selfies
```

> `BACKUP_PASSWORD` zaroor set kijiye aur server ke bahar bhi likh kar rakhiye - iske bina backup nahi khulta. Khaali ho to JWT_SECRET se banta hai (tab wahi `.env` chahiye).

## Naya session / promotion

Academics → **Naya session** (`sessions.manage` - School Admin, Principal).

1. Session: `2026-27` → `2027-28` (agla hi, beech ka saal chhod nahi sakte).
2. Har class kahan jayegi - default level ke hisaab se agli class, sabse upar wali **Pass out (Alumni)**. Section: same naam wala, ya target me ek hi section ho to wahi, ya haath se chuniye.
3. Kisi bachche ko **Roko** (usi class me), **Chhod diya** (inactive) ya **Pass out** - har bachche ke saath baaki fees bhi dikhti hai.
4. Pakka karne ke liye session ka naam likhna padta hai. Optional: roll number khaali.

Ek transaction me sab. Attendance, marks, fees, homework ki purani entries waisi hi rehti hain (wo tareekh / class ke saath save hain) - sirf student ki class / section / status badalta hai. Har student ka snapshot `student_enrollments` me (kis session me kis class me tha, kya hua) - `GET /api/sessions/students/:id/history`.

**Undo**: sirf aakhri promotion, 30 din tak. Jin bachchon ki class promotion ke baad haath se badli gayi unhe nahi chhedta (list wapas milti hai). Ek saath do promotion nahi chal sakte (school row lock).

## Excel se students (bulk import)

Students → **Excel import**. `.xlsx` ya `.csv`, ek baar me 2000 tak (5 MB).

1. **Template** download (school ki classes/sections ke saath, Gender/Class dropdown, Example + Help sheet). Apni purani Excel bhi chalti hai - column naam milte-julte hon to (Name, Std, Div, Mobile, Father Name, DOB...). Upar title rows ho to bhi header dhoondh leta hai.
2. **Preview** - kuch save nahi hota. Har row ki jaanch: class/section (`5`, `5th`, `Class 5`, `V` sab), ek hi section ho to apne aap, DD-MM-YYYY / Excel date, 10 digit mobile, email, admission no file me ya school me pehle se, gender. Chetavni: mobile nahi, umar ajeeb, roll no dohraya, bachcha shayad pehle se hai.
3. **Import** - ek transaction me sab ya kuch nahi. Galti ho to rukta hai, ya "sirf sahi rows" chuniye. Plan ki student limit poori file par. Admission no khaali = `ADM<saal>-NNNN`.

**Parent login** (optional): ek mobile = ek parent (bhai-behen ek hi login me). Mobile/email wala parent pehle se ho to usi se jud jata hai. Email na ho to `<mobile>@<schoolcode>.erpsc`. Password list sirf import ke baad ek baar dikhti hai (CSV download); parent OTP se khud bhi bana sakte hain.

## Password bhool gaye (OTP)

Admin panel aur app dono ke login par **"Password bhool gaye?"** → email → registered mobile par 6 digit OTP → naya password.

- OTP user ke `phone` par jaata hai; student ka apna number na ho to guardian ke number par. School ka SMS / WhatsApp provider use hota hai (MSG91 me `otp` template: `##var1##` school, `##var2##` OTP).
- OTP 10 minute valid, sirf hash save hota hai, message log me `******`. 5 galat try ke baad band, ek baar use ke baad khatam, naya OTP maangte hi purana bekaar.
- Limit: ek user ko 15 minute me 3 OTP; ek IP se 15 minute me 10 request.
- Ek email do schools me ho to school chunwaya jata hai.
- Password badalte hi (reset, "Change password", ya admin ne badla) **baaki saare devices se logout** - token me `tokenVersion` jaata hai.
- Demo provider par OTP screen par hi dikhta hai (production `NODE_ENV=production` me kabhi nahi). Provider "Band" ho ya number na ho to saaf message: school office se reset karwaiye.
- Super Admin ka password SMS se reset nahi hota.

## Online fee payment

- Parent app → **Fees** → fee chuniye → **Pay online** → `/pay/<token>` wala payment page (UPI, card, netbanking). App me koi native payment library nahi.
- Rakam **server** tay karta hai (baaki fees se), client nahi. Receipt apne aap banti hai, mode `online`.
- Admin → Fees → **Online payments**: provider *Band / Demo / Razorpay*, keys, webhook URL, aaj ke online payments.
- Razorpay: checkout signature + webhook (HMAC) dono verify; ek hi payment do baar record nahi hota; secret encrypted (`SECRETS_KEY` env).
- Demo seed me provider `demo` hai - asli paisa nahi katta.

## SMS / WhatsApp alerts

Admin → **SMS / WhatsApp** (Communication). Provider: *Band / Demo / SMS (MSG91) / WhatsApp (Meta Cloud API)*.

| Event | Kisko | Kab |
|---|---|---|
| Bachcha absent | Parent (`guardianPhone`) | Aaj ki attendance me absent - din me ek hi baar, purani date sudharne par nahi |
| Fees receipt | Parent | Counter payment ya online payment ke baad |
| Fees reminder | Parent | Fees page → **Reminder bhejiye** (class filter ke saath) - ek student ko din me ek |
| Leave approve/reject | Staff (`phone`) | Leave review hote hi |

- Har event on/off; har event ke liye provider ka approved template (MSG91 DLT template id / WhatsApp template name). Variables ka kram page par likha hai (`##var1##` = school ...).
- Message background me jaata hai - SMS fail ho to attendance/payment nahi rukta. Sab kuch **log** me (sent / failed / skipped + error).
- Number `91XXXXXXXXXX` me badla jata hai; galat number = `skipped`.
- Key encrypted rehti hai, GET me sirf aakhri 4 akshar.
- Test me mock server: `MSG91_API_BASE`, `WHATSAPP_API_BASE` (aur `RAZORPAY_API_BASE`) env.

## Mobile app (Expo)

```bash
cd mobile
npm start          # QR code aayega, phone par Expo Go se scan kijiye
npm run android    # Android emulator
```

Development me API ka address khud nikalta hai - jis laptop se Expo chal raha hai usi ka IP
(port 5000). Emulator par `10.0.2.2`. APK / production build ke liye `EXPO_PUBLIC_API_URL`
dena zaroori hai (`mobile/eas.json` me profile ke hisaab se).

### Bina hosting ke public link (demo)

Laptop hi server banta hai aur Cloudflare ka free tunnel ek **HTTPS link** deta hai - kisi bhi phone/computer
se khulta hai, aur HTTPS hone se phone ke browser me camera + GPS bhi chalte hain.

```bash
npm run demo:build    # admin + website + mobile app (web) build - code badalne par dobara
npm run demo:start    # port 5000 par sab: /  (admin), /site/<slug> (website), /app (mobile app), /api
npm run demo:tunnel   # doosre terminal me - "https://....trycloudflare.com" link print hoga
```

- Link tabhi tak chalta hai jab tak laptop, XAMPP MySQL aur ye dono commands chalu hain. Har baar naya link milta hai.
- Demo data aur demo passwords (admin123...) public ho jaate hain - test ke baad tunnel band kar dijiye.
- App me login screen par **Server: ... Badliye** se naya link daal sakte hain (APK ko dobara banane ki zaroorat nahi).

### APK banana (Expo cloud, free account)

```bash
cd mobile
npx eas-cli login
npx eas-cli build -p android --profile preview    # ~15-20 min, APK ka download link + QR milta hai
```

`preview` profile ka default server `mobile/eas.json` me hai; app ke andar login screen se kabhi bhi badal sakte hain.


1. Laptop aur phone ek hi WiFi par hon.
2. Root folder me: `npm run dev:phone` (API + admin panel + app, sab LAN par).
3. Phone ke browser me: `http://<laptop-IP>:8081` - app (parent/student/teacher login). Selfie/GPS ke liye upar wala HTTPS demo link behtar hai.
   Browser me camera aur GPS sirf HTTPS par chalte hain - selfie check-in test karne ke liye Expo Go / APK use kijiye,
   ya Android Chrome me `chrome://flags/#unsafely-treat-insecure-origin-as-secure` me `http://<laptop-IP>:8081` jod dijiye.
   Website: `http://<laptop-IP>:5173/site/sunrise-public-school`.
4. Windows pehli baar "Allow access" pooche to **Private network** allow kijiye. Na pooche aur phone
   se na khule to Admin PowerShell me:
   `netsh advfirewall firewall add rule name="ERPSC dev" dir=in action=allow protocol=TCP localport=5000,5173,8081 profile=private`

**Asli app (APK)** - is laptop par Android SDK/Java nahi hai, isliye APK Expo ke cloud par banta hai:

```bash
cd mobile
npx eas-cli login                                  # free Expo account
npx eas-cli build -p android --profile preview     # ~15 min, APK ka download link milega
```

`preview` profile ka API address `mobile/eas.json` me hai (abhi LAN IP) - server online karne
ke baad use apne domain par badal dijiye.

Tabs: **Home** (bachche ka card, stats, teachers), **Attendance** (percent donut +
day-wise history), **Fees** (paid/pending progress + head-wise breakup + receipts),
**Notices** (category chips, tap karke poora padhiye) aur **More** (results,
timetable, homework, library, transport (bus, stop timing, driver ko call), profile, subjects, school info, logout).
Parent ke ek se zyada bachche hon to upar chips se child switch hota hai.

App sirf parent/student roles ke liye khulta hai — staff login karega to login
screen par hi saaf message milta hai ki web panel use kijiye.

## API

Base `/api`. Protected routes ko `Authorization: Bearer <token>` chahiye.

```
POST   /auth/login              GET  /auth/me            POST /auth/change-password
GET    /auth/schools            (public - login screen ke liye)

--- Platform (sirf Super Admin) ---
GET    /platform/stats
GET    /platform/schools        POST /platform/schools    PUT/DELETE /platform/schools/:id
GET    /platform/plans          POST /platform/plans      PUT/DELETE /platform/plans/:id
POST   /platform/subscriptions

--- School (super admin bhi, X-School-Id header ke saath) ---
GET    /dashboard/stats         GET/PUT /school
GET    /roles  /roles/permissions  /roles/options    POST/PUT/DELETE /roles/:id
GET    /users                   POST/PUT/DELETE /users/:id
GET    /students                POST/PUT/DELETE /students/:id
GET    /students/next-admission-no
GET    /teachers  /teachers/options                 POST/PUT/DELETE /teachers/:id
GET    /classes   /classes/options                  POST/PUT/DELETE /classes/:id
GET    /sections                POST/PUT/DELETE /sections/:id
GET    /subjects                POST/PUT/DELETE /subjects/:id

GET    /attendance/roster       POST /attendance/bulk
GET    /attendance/report       GET  /attendance/student/:studentId

GET    /homework                POST/PUT/DELETE /homework/:id

GET    /exams                   POST/PUT/DELETE /exams/:id
GET    /exams/:id/result        POST /exams/:id/publish
GET    /exams/:id/report-card/:studentId
POST   /exams/:id/schedule      DELETE /exams/schedule/:scheduleId
GET    /exams/schedule/:scheduleId/marks   POST (same path to save)

GET    /fees/summary            GET  /fees/heads    POST/PUT/DELETE /fees/heads/:id
GET    /fees/students           GET  /fees/students/:studentId
POST   /fees/assign             GET  /fees/payments
POST   /fees/payments           DELETE /fees/payments/:id

GET    /timetable               GET  /timetable/today   GET /timetable/teacher
GET    /timetable/periods       POST/PUT/DELETE /timetable/periods/:id
POST   /timetable/slots         DELETE /timetable/slots/:id

GET    /notices/feed            (apni audience ke hisaab se)
GET    /notices                 POST/PUT/DELETE /notices/:id

GET    /library/summary         GET  /library/categories
GET    /library/books           POST/PUT/DELETE /library/books/:id
GET    /library/issues          POST /library/issues
POST   /library/issues/:id/return    POST /library/issues/:id/fine-paid

GET    /admissions/summary      GET /admissions/seats/:classId
GET    /admissions              POST /admissions   GET/PUT/DELETE /admissions/:id
POST   /admissions/:id/status   POST /admissions/:id/notes   POST /admissions/:id/admit

GET    /website                 PUT /website            (school admin)
GET    /public/sites/:slug      POST /public/sites/:slug/enquiry   (bina login)

GET    /transport/summary
GET    /transport/vehicles      POST/PUT/DELETE /transport/vehicles/:id
GET    /transport/routes        POST/PUT/DELETE /transport/routes/:id
POST   /transport/routes/:id/stops   PUT/DELETE /transport/stops/:stopId
GET    /transport/riders        POST /transport/riders   DELETE /transport/riders/:studentId

--- Portal (mobile app) ---
GET    /portal/me/students      GET /portal/school
GET    /portal/students/:id     /subjects    /teachers
GET    /portal/students/:id/attendance   /homework   /exams   /fees
GET    /portal/students/:id/timetable    /notices   /library   /transport
GET    /portal/students/:id/exams/:examId/result
```

Response shape hamesha ek jaisa:

```jsonc
{ "success": true, "data": { "items": [], "meta": { "total": 48, "page": 1, "limit": 10, "totalPages": 5 } } }

// error - errors[] ko UI inline field errors me map karta hai
{ "success": false, "message": "Validation failed", "errors": [{ "field": "firstName", "message": "First name required" }] }
```

## Data integrity rules

Ye sab backend me enforce hote hain, sirf UI me nahi:

- Students wali class ya section delete nahi hoti.
- Section hamesha usi class ka hona chahiye jo student par set hai.
- Teacher delete par uske subjects, sections aur class-teacher assignment auto-unassign.
- Student/teacher delete par unka login bhi usi transaction me hatta hai.
- Default (system) role delete nahi hota; jis role par users hain wo bhi nahi.
- Platform permissions kisi school role par assign nahi ho sakti.
- Apna khud ka role ya status koi nahi badal sakta (lock-out se bachne ke liye).
- School delete karne ke liye `?confirm=<SCHOOL_CODE>` bhejna padta hai — poora
  tenant data cascade me hat jata hai.
- Pass marks max marks se zyada nahi ho sakte.
- Aane wali date ki attendance mark nahi hoti; dobara mark karne par record update hota hai (duplicate nahi banta).
- Homework ki due date assigned date se pehle nahi ho sakti; exam ki end date start se pehle nahi.
- Paper ke max marks se zyada marks reject hote hain; absent student ke marks null rehte hain.
- Jis exam/paper ke marks bhare ja chuke hain wo delete nahi hota.
- Exam shuru hone se pehle result publish nahi hota, aur parents ko sirf published result dikhta hai.
- Payment pending se zyada nahi liya ja sakta, aur poori tarah paid fee par dobara payment nahi hota.
- Payment lena aur cancel karna ek transaction me hota hai - receipt, fee line ka paid amount aur status teeno saath badalte hain.
- Jo fee head students par laga hua hai wo delete nahi hota (inactive kar sakte hain).
- Ek student par ek fee head sirf ek baar lagta hai - dobara assign karne par duplicate nahi banta.
- Ek teacher ek waqt me do jagah nahi ho sakta - timetable slot save karte waqt clash check hota hai aur batata hai wo kahan busy hain.
- Break period me class assign nahi hoti, aur jis period me classes lagi hain wo period delete/break nahi ban sakta.
- Ek section ke ek period par ek hi subject rehta hai - dobara set karne par replace hota hai.
- Notice sirf apni audience ko dikhti hai: staff ko staff wali, students/parents ko apni, aur class wali sirf us class (ya section) ko.
- Draft, aane wali (scheduled) aur expire ho chuki notices kisi ke feed me nahi aatin - sirf admin list me dikhti hain.
- Class audience chunne par class dena zaroori hai, warna notice kisi tak pahunchti hi nahi.
- Library: available copies store nahi hoti, issues se ginti hoti hain. Issue book row lock ke saath hota hai - do log ek saath aakhri copy nahi le sakte.
- Ek student ke paas max 3 books, same book do baar nahi; total copies issued copies se kam nahi ki ja sakti.
- Fine (Rs 2/din) due date ke baad chalta rehta hai aur return ke din freeze ho jata hai.
- Admission stages: enquiry → applied → interview → approved → admitted. Stage skip nahi hota; reject/withdraw ke liye reason zaroori, aur band application reopen ho sakti hai.
- Sirf approved application admit hoti hai. Admit par application, section aur school row lock hote hain - ek application se ek hi student banta hai, section ki capacity aur plan ki student limit par race nahi hoti.
- Admitted application edit/delete nahi hoti. Same bachche (naam + phone + class) ki doosri khuli enquiry nahi banti.
- Plan ki `maxStudents` limit ab student create, inactive → active aur admission teeno par lagti hai (0 = unlimited).
- Transport: ek vehicle ek hi active route par; route ke students vehicle ki seats se zyada nahi ho sakte. Assign route row lock ke saath hota hai - aakhri seat par do log ek saath nahi aa sakte.
- Stop usi route ka hona chahiye; student dusre route par assign karne se purana assignment shift ho jata hai (ek student = ek route).
- Jis vehicle/route/stop par students hain wo delete nahi hota, aur vehicle ki capacity riders se kam nahi ki ja sakti.
- Maintenance/inactive gaadi kisi active route par nahi lagti, aur jis route ki gaadi maintenance me ho us par naye students assign nahi hote (pehle doosri gaadi lagaiye).
- Student inactive ya alumni hote hi uski bus seat apne aap khali ho jati hai. Wapas active karne par transport dobara assign karna padta hai.

## Useful commands

| Command | Kaam |
| --- | --- |
| `npm run dev` | API + admin panel |
| `npm run dev:all` | API + admin panel + Expo app |
| `npm run dev:phone` | Same, par LAN par - phone se test karne ke liye |
| `npm run db:seed` | Tables sync + permissions + super admin (demo data preserve) |
| `npm run db:reset` | Sab drop karke fresh demo data |
| `npm run build` | Admin panel production build (`frontend/dist`) |

## Abhi kya nahi bana

Phase 1 me sirf core hai. Ye modules abhi baaki hain — models aur permission
catalog aise banaye gaye hain ki ye seedha add ho jayenge:

- Inventory
- Website par video file upload (abhi YouTube/Vimeo link)
- Custom domain (abhi `/site/<slug>`)
- Transport fee ko Fees module ke student fees me apne aap jodna
- Homework submissions (abhi sirf assign hota hai, student upload nahi karta)

## Production notes

- `backend/uploads/` (website photos) aur `backend/private/` (attendance selfies) git me nahi jaate - server par dono ko persistent disk / backup me rakhiye.
- School ka timezone `SCHOOL_TZ` env se (default `Asia/Kolkata`) - attendance ki date aur late isi se.

- `backend/.env` me `JWT_SECRET` zaroor badliye, `NODE_ENV=production` set kijiye.
- `CLIENT_URL` comma se alag karke kai origins le leta hai (web panel + Expo web dev).
- `frontend/dist` ko kisi bhi static host se serve kijiye, `VITE_API_URL` me API ka
  public URL daaliye. Dev me `/api` Vite proxy se jaata hai, isliye CORS nahi chahiye.
- Schema abhi `sequelize.sync()` se banta hai. Production par proper migrations
  (`sequelize-cli` ya `umzug`) par shift karna behtar rahega.
