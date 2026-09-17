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
| Student *(app)* | Apna record |
| Parent *(app)* | Apne bachcho ka record |

Naya permission add karna ho to [backend/src/config/permissions.js](backend/src/config/permissions.js)
me slug likhiye aur `npm run db:seed` chala dijiye — UI me apne aap module-wise
group ban jayega.

Guards dono taraf hain: menu item aur buttons permission ke bina dikhte hi nahi,
aur API bhi 403 deta hai.

## Mobile app (Expo)

```bash
cd mobile
npm start          # QR code aayega, phone par Expo Go se scan kijiye
npm run android    # Android emulator
```

API ka pata `mobile/.env` me set hota hai:

| Kahan chala rahe ho | `EXPO_PUBLIC_API_URL` |
| --- | --- |
| Android emulator | `http://10.0.2.2:5000/api` |
| iOS simulator | `http://localhost:5000/api` |
| Asli phone (Expo Go) | `http://<laptop-ka-LAN-IP>:5000/api` |

Tabs: **Home** (bachche ka card, stats, teachers), **Attendance** (percent donut +
day-wise history), **Fees** (paid/pending progress + head-wise breakup + receipts),
**Results** (exam chips, grade aur subject-wise marks) aur **More** (timetable,
homework, profile, subjects, school info, logout).
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

--- Portal (mobile app) ---
GET    /portal/me/students      GET /portal/school
GET    /portal/students/:id     /subjects    /teachers
GET    /portal/students/:id/attendance   /homework   /exams   /fees   /timetable
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

## Useful commands

| Command | Kaam |
| --- | --- |
| `npm run dev` | API + admin panel |
| `npm run dev:all` | API + admin panel + Expo app |
| `npm run db:seed` | Tables sync + permissions + super admin (demo data preserve) |
| `npm run db:reset` | Sab drop karke fresh demo data |
| `npm run build` | Admin panel production build (`frontend/dist`) |

## Abhi kya nahi bana

Phase 1 me sirf core hai. Ye modules abhi baaki hain — models aur permission
catalog aise banaye gaye hain ki ye seedha add ho jayenge:

- Notices / announcements
- Library, Transport, Inventory
- Homework submissions (abhi sirf assign hota hai, student upload nahi karta)

## Production notes

- `backend/.env` me `JWT_SECRET` zaroor badliye, `NODE_ENV=production` set kijiye.
- `CLIENT_URL` comma se alag karke kai origins le leta hai (web panel + Expo web dev).
- `frontend/dist` ko kisi bhi static host se serve kijiye, `VITE_API_URL` me API ka
  public URL daaliye. Dev me `/api` Vite proxy se jaata hai, isliye CORS nahi chahiye.
- Schema abhi `sequelize.sync()` se banta hai. Production par proper migrations
  (`sequelize-cli` ya `umzug`) par shift karna behtar rahega.
