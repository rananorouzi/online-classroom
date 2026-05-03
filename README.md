# Music Academy Pro

> A production-grade, mobile-first Learning Management System built for music education — with studio-quality video/audio tools, drip-content scheduling, assignment workflows, and teacher feedback powered by waveform audio.

---

## Table of Contents


1. [Features Overview](#features-overview)
2. [User Roles](#user-roles)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Pages & Routes](#pages--routes)
6. [API Reference](#api-reference)
7. [Database Schema](#database-schema)
8. [Media System](#media-system)
9. [Authentication & Security](#authentication--security)
10. [PWA & Mobile](#pwa--mobile)
11. [Getting Started](#getting-started)
12. [Environment Variables](#environment-variables)
13. [Icon Generation](#icon-generation)

---

## Features Overview

| Category | Highlights |
|---|---|
| **Roles** | Student · Teacher · Admin — full RBAC |
| **Drip Content** | Lessons locked until `releaseAt` date |
| **Video** | HLS adaptive streaming, speed control, signed URLs |
| **Audio Recording** | Real-time waveform visualisation, record → preview → submit |
| **Video Recording** | In-browser camera + mic capture |
| **File Upload** | XHR with progress, up to 500 MB (audio · video · image · PDF) |
| **Timestamp Comments** | Students/teachers leave comments pinned to exact video seconds |
| **Submission Workflow** | PENDING → REVISION → COMPLETED with audio feedback + waveform |
| **Teacher Review** | Audio recordings + waveform JSON stored per submission |
| **Student Management** | Add, edit, archive/restore, enrol in courses, password reset |
| **Teacher Management** | Admin can add, edit, archive/restore teachers |
| **Session Security** | Max 2 concurrent sessions per user, 30-min activity timeout |
| **Password Reset** | SMTP email with 1-hour-expiry token |
| **PWA** | Installable on iOS & Android, service-worker caching, gold music-note icon |
| **Mobile UI** | Responsive sidebar drawer, fixed header with academy name |
| **Breadcrumbs** | Every dashboard page has full navigation trail |

---

## User Roles

### Student
- Browse enrolled courses; locked weeks show release dates
- Watch lessons with playback speed control (0.5×–1.5×)
- Leave timestamped comments on videos; delete own comments
- Submit work (file upload · audio recording · video recording)
- Delete own submission while status is **PENDING**
- View waveform audio feedback and text comments from teachers
- Update password; cannot change their own name

### Teacher
- **Course management** — create/edit/delete courses, weeks, sessions, checklist items
- **Media** — upload lesson videos and attachments (delete individual attachments)
- **Students** — add, edit, archive/restore, reset passwords, enrol/unenrol
- **Submissions** — approve, request revision, or approve with audio feedback + waveform
- **Comments** — view and delete any comment on their course videos
- Can self-assign to courses

### Admin (Manager)
- All Teacher permissions
- Add, edit, archive/restore **teachers**
- View active vs. archived teacher counts on the admin dashboard
- Cannot delete a teacher assigned to active courses without unassigning first

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2 (App Router, Turbopack) |
| **Language** | TypeScript 5 |
| **UI** | React 19, Tailwind CSS 4, Framer Motion 12 |
| **Auth** | NextAuth 5 (JWT, credentials) |
| **Database** | PostgreSQL via Prisma 7 + `@prisma/adapter-pg` |
| **Storage** | Vercel Blob 1.1.1 |
| **Video** | Video.js 8 + `@videojs/http-streaming` (HLS) |
| **Audio** | wavesurfer.js 7 (waveform) |
| **Email** | nodemailer 7 (SMTP) |
| **Icons** | sharp 0.34.5 (build-time PNG generation) |
| **Security** | bcryptjs, jsonwebtoken |

---

## Architecture

```
src/
├── app/
│   ├── actions/          # Server Actions (RPC — no REST boilerplate)
│   │   ├── comments.ts   # Timestamp comments CRUD
│   │   ├── manager.ts    # Admin teacher management
│   │   ├── sessions.ts   # Course/week/session reads
│   │   ├── settings.ts   # Profile & password
│   │   ├── submissions.ts# Student submit, teacher review
│   │   └── teacher.ts    # Course, week, session, student, enrolment mgmt
│   ├── api/
│   │   ├── auth/         # NextAuth + forgot/reset-password endpoints
│   │   └── media/        # signed-url · upload-url · view · download
│   ├── auth/             # Login, forgot-password, reset-password pages
│   └── dashboard/        # All authenticated pages
├── components/
│   ├── layout/           # Sidebar, breadcrumb, quick-actions
│   ├── media/            # HlsPlayer, AudioRecorder, VideoRecorder, WaveformPlayer…
│   ├── pages/            # SessionPageClient (main lesson view)
│   └── ui/               # Checklist, TimestampComments, TeacherReviewPanel…
├── lib/
│   ├── auth.ts           # NextAuth config + session logic
│   ├── client-upload.ts  # Browser XHR upload helper
│   ├── db.ts             # Prisma singleton
│   ├── email.ts          # nodemailer helpers
│   ├── media-access.ts   # Role-based media key validation
│   ├── s3.ts             # Vercel Blob helpers (put, head, del)
│   └── security.ts       # Device fingerprint, session limit enforcement
└── types/
    └── next-auth.d.ts    # Session type augmentation
```

---

## Pages & Routes

### Public
| Route | Description |
|---|---|
| `/` | Redirects → `/dashboard` (auth) or `/auth/login` |
| `/auth/login` | Email + password login |
| `/auth/forgot-password` | Request password reset email |
| `/auth/reset-password?token=…` | Set new password (1-hour token) |
| `/auth/error` | Auth error display |

### Authenticated Dashboard
| Route | Roles | Description |
|---|---|---|
| `/dashboard` | All | Role-specific home (teacher: students; admin: teacher stats) |
| `/dashboard/courses` | Teacher, Admin | Enrolled courses list |
| `/dashboard/course/[courseId]` | Teacher, Admin | Course detail with week timeline |
| `/dashboard/course/[courseId]/manage` | Teacher, Admin | Edit course, upload media, manage weeks/sessions |
| `/dashboard/course/[courseId]/week/[weekId]` | All enrolled | Week overview |
| `/dashboard/course/[courseId]/week/[weekId]/session/[sessionId]` | All enrolled | Lesson: video, comments, checklist, submissions |
| `/dashboard/students` | Teacher, Admin | Student list with management controls |
| `/dashboard/student/[studentId]` | Teacher, Admin | Student profile, enrolments, submission history |
| `/dashboard/manager` | Admin | Teacher management |
| `/dashboard/settings` | All | Update name / change password |

---

## API Reference

### Media Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/media/signed-url?key=…` | Required | Signed read URL for video/audio playback |
| `POST` | `/api/media/upload-url?filename=…&folder=…` | Required | Upload file body → store in Blob, returns `pathname` |
| `GET` | `/api/media/download?key=…` | Required | Download file (content-disposition attachment) |
| `GET` | `/api/media/view?pathname=…` | Required | Stream file content (proxied from Blob) |

**Allowed upload folders:** `feedback`, `lessons`, `submissions`  
**Students** can only upload to `submissions/<their-user-id>/`  
**Teachers/Admins** cannot upload to `submissions/` paths  
**Max file size:** 500 MB | **Types:** audio, video, image, PDF

### Auth Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/forgot-password` | Send reset email (always 200 — prevents enumeration) |
| `POST` | `/api/auth/reset-password` | Validate token + set new password + invalidate sessions |

---

## Database Schema

```
User ──┬── Enrollment ── Course ── Week ── Session ── ChecklistItem ── Submission ── Feedback
       ├── Submission
       ├── Feedback
       ├── Comment
       ├── ActiveSession
       └── PasswordReset
```

### Key Models

**`User`** — `id · email · name · hashedPassword · role(STUDENT|TEACHER|ADMIN) · avatarUrl · isArchived`

**`Course`** — `id · title · description · coverImage`

**`Week`** — `id · courseId · number · title · releaseAt` — drip gate; `number` is auto-incremented per course

**`Session`** — `id · weekId · title · description · order · videoKey · attachmentKey · releaseAt`

**`ChecklistItem`** — `id · sessionId · title · description · order` — each item requires a student submission

**`Submission`** — `id · checklistItemId · studentId · status(IDLE|PENDING|REVISION|COMPLETED) · fileKey · fileName · fileType`

**`Feedback`** — `id · submissionId · teacherId · audioKey · waveformJson · comment · approved`

**`Comment`** — `id · sessionId · userId · text · timestamp(Float)` — seconds into the video

**`Enrollment`** — `userId + courseId` (unique pair)

**`ActiveSession`** — `userId · deviceHash(SHA256) · sessionToken · lastActive` — enforces 2-session cap

**`PasswordReset`** — `userId · token(unique) · expiresAt · used`

---

## Media System

### Video Playback
- **Format:** HLS (`.m3u8`) or MP4/WebM
- **Player:** Video.js with `@videojs/http-streaming`
- **Speed control:** 0.5× · 0.75× · 1× · 1.5×
- **Access:** Signed URLs (60-min expiry, auto-refresh at 50 min)

### Audio Recording (Teacher Feedback / Student Submission)
- Real-time **40-bar frequency waveform** during recording
- Record → preview → confirm before uploading
- Waveform peak data saved as JSON alongside the audio file — replays identically in `WaveformPlayer`

### Video Recording (Student Submission)
- In-browser camera + microphone
- Echo cancellation & noise suppression
- Preview before submitting

### File Upload
- Drag-and-drop or click-to-browse via `ResumableUpload`
- Live progress bar (XHR `upload.onprogress`)
- Server-side path sanitisation (Unicode normalisation, traversal prevention)
- Dynamic error messages (`File is too large (max 500MB)`)

### Storage
| Environment | Backend |
|---|---|
| Production | Vercel Blob (`put`, `head`, `del`) |
| Development | Local `/public/uploads/` or Blob |

---

## Authentication & Security

| Feature | Detail |
|---|---|
| **Strategy** | JWT (7-day max age) |
| **Password hashing** | bcryptjs |
| **Concurrent sessions** | Max 2 per user (device-hash based) |
| **Activity timeout** | 30-min inactivity evicts session |
| **Archived user eviction** | Logged out within 60 s of archiving |
| **Password reset** | 32-byte random token, 1-hour expiry, single-use |
| **Session invalidation** | All sessions cleared on password change |
| **Media access** | Route-level role + enrolment check before serving any file |
| **Upload authorisation** | Folder-level RBAC; students sandboxed to own folder |
| **Path traversal** | `sanitizePathSegment()` — Unicode normalise, strip `../`, `\` |
| **Open redirect** | Removed from download route |

---

## PWA & Mobile

### Progressive Web App
- **Manifest:** dark theme (`#0A0A0A`) + gold accent (`#D4AF37`)
- **Display:** `standalone` (no browser chrome)
- **Start URL:** `/dashboard`
- **Icon set:** 11 PNG sizes (48→512) + 2 maskable variants for Android adaptive icons
- **Favicon:** `src/app/favicon.ico` (16/32/48 px ICO) + `src/app/icon.svg` (scalable SVG)

### Service Worker
- **Network-first** for HTML navigation
- **Cache-first** for static assets (JS · CSS · images · fonts)
- **Bypass** for all `/api/` routes
- Pre-caches `/`, `/auth/login`, `/manifest.json`

### Mobile UI
- Fixed top header (academy name centred, gold) on screens < `lg`
- Sidebar slides in as a drawer on tap (hamburger ☰ button)
- Backdrop overlay + Escape key + focus management (WCAG-compliant)
- Responsive padding and layout — no horizontal scroll on narrow screens

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- PostgreSQL database
- Vercel Blob store (or local dev mode)
- SMTP credentials for email

```bash
# 1. Clone and install
git clone https://github.com/rananorouzi/online-classroom.git
cd online-classroom
npm install

# 2. Configure environment (see below)
cp .env.example .env.local

# 3. Set up database
npx prisma migrate deploy
npx prisma db seed   # optional demo data

# 4. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

Create `.env.local` with the following:

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# NextAuth
AUTH_SECRET="your-secret-32-chars-minimum"
NEXTAUTH_URL="http://localhost:3000"

# Vercel Blob
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# Email (SMTP)
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="noreply@example.com"
EMAIL_PASS="your-smtp-password"
EMAIL_FROM="Music Academy Pro <noreply@example.com>"

# App URL (used in reset-password emails)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Icon Generation

All app icons and favicons are generated from an SVG template using `sharp`:

```bash
node scripts/gen-icons.mjs
```

This writes:
- `public/icons/icon-{48,72,96,128,144,152,167,180,192,256,512}.png` — standard PWA icons
- `public/icons/icon-{192,512}-maskable.png` — Android adaptive icons
- `src/app/favicon.ico` — multi-resolution ICO (16/32/48 px)
- `src/app/icon.svg` — scalable vector favicon (modern browsers)

To modify the icon design, edit `makeSvg()` or `makeMaskableSvg()` in `scripts/gen-icons.mjs` then re-run the script.

---

## License

Private — all rights reserved.

The platform includes timestamp comments on lessons, secure auth, and media handling through Vercel Blob for production deployments.

## Tech Stack

- `Next.js 16` (App Router)
- `React 19` + `TypeScript`
- `Tailwind CSS 4`
- `Prisma 7` + `PostgreSQL`
- `NextAuth v5 beta` (credentials provider)
- `video.js` + HLS streaming support
- `wavesurfer.js` for audio waveform playback
- `Vercel Blob` for media storage and delivery
- `Nodemailer` for password reset email flow

## Project Structure

```text
.
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/
│   ├── icons/
│   ├── sample-media/
│   └── sw.js
├── src/
│   ├── app/
│   │   ├── actions/           # server actions (courses, sessions, submissions, etc.)
│   │   ├── api/               # auth/media/upload endpoints
│   │   ├── auth/              # login + reset password pages
│   │   └── dashboard/         # teacher/student pages
│   ├── components/
│   │   ├── layout/
│   │   ├── media/
│   │   ├── pages/
│   │   └── ui/
│   ├── lib/                   # auth, db, s3, email, session guard
│   ├── proxy.ts               # edge auth gate
│   └── types/
├── package.json
└── next.config.ts
```

## Features

- Role-based authentication and protected routes
- Course management (create/update/delete)
- Week/session management with drip release dates
- Session media:
	- lesson videos
	- supplemental attachments (PDF/images, multi-attachment support)
- Checklist-based assignments
- Student submissions:
	- file upload
	- audio recording
	- video recording
- Teacher review panel:
	- approve
	- request revision
	- comment + audio feedback
- Timestamped lesson comments
- Account management and password reset
- Vercel Blob upload/download support (production)
- Local upload fallback for development only

## How To Run

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env` with at least:

```bash
AUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/online_classroom?schema=public
```

Optional for full features:

- SMTP for password reset emails:
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- Vercel Blob for cloud media:
	- `BLOB_READ_WRITE_TOKEN`

In production (including Vercel), Blob token is required for media uploads.

### 3. Push schema to database

```bash
npx prisma db push
```

If you use your own migration workflow, ensure generated SQL targets PostgreSQL.

### 4. Seed sample data (includes default manager)

```bash
npx prisma db seed
```

Default seeded users:

- `manager@musicacademy.pro / manager123` (ADMIN)

### 5. One-command local setup

```bash
npm run setup
```

This runs schema sync + seed in one step.

### 6. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy on Vercel

1. Create a PostgreSQL database (Neon/Supabase/Railway or equivalent).
2. Create a Vercel Blob store and get a `BLOB_READ_WRITE_TOKEN`.
3. Set Vercel environment variables:
	- `AUTH_SECRET`
	- `NEXTAUTH_URL` (your Vercel domain)
	- `DATABASE_URL` (PostgreSQL)
	- `BLOB_READ_WRITE_TOKEN`
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
4. Run `npx prisma db push` against production database.
5. Run `npx prisma db seed` once for initial manager account.
6. Deploy to Vercel.

## Build & Quality Checks

```bash
npm run lint
npm run build
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run ESLint
