# Online Classroom (Music Academy Pro)

Production-style LMS for music education with role-based dashboards, drip content, media-rich lessons, assignment submissions, and teacher feedback workflows.

## Project Summary

This app supports two main roles:

- `TEACHER`: manage courses, weeks, sessions, checklist tasks, media, student enrollments, and review submissions.
- `STUDENT`: consume released lessons, submit practice work (file/audio/video), and view teacher feedback.

The platform includes timestamp comments on lessons, secure auth, and media handling through S3 signed URLs for production deployments.

## Tech Stack

- `Next.js 16` (App Router)
- `React 19` + `TypeScript`
- `Tailwind CSS 4`
- `Prisma 7` + `PostgreSQL`
- `NextAuth v5 beta` (credentials provider)
- `video.js` + HLS streaming support
- `wavesurfer.js` for audio waveform playback
- `AWS SDK v3` for signed media URLs (S3)
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
- S3 signed URL upload/download support (production)
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
- AWS S3 for cloud media:
	- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

In production (including Vercel), S3 variables are required for media uploads.

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
2. Create an S3 bucket and IAM credentials with read/write/delete access.
3. Set Vercel environment variables:
	- `AUTH_SECRET`
	- `NEXTAUTH_URL` (your Vercel domain)
	- `DATABASE_URL` (PostgreSQL)
	- `AWS_REGION`
	- `AWS_ACCESS_KEY_ID`
	- `AWS_SECRET_ACCESS_KEY`
	- `AWS_S3_BUCKET`
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
