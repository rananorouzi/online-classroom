# Online Classroom (Music Academy Pro)

Production-style LMS for music education with role-based dashboards, drip content, media-rich lessons, assignment submissions, and teacher feedback workflows.

## Project Summary

This app supports two main roles:

- `TEACHER`: manage courses, weeks, sessions, checklist tasks, media, student enrollments, and review submissions.
- `STUDENT`: consume released lessons, submit practice work (file/audio/video), and view teacher feedback.

The platform includes timestamp comments on lessons, secure auth, and media handling for local development and S3-based deployments.

## Tech Stack

- `Next.js 16` (App Router)
- `React 19` + `TypeScript`
- `Tailwind CSS 4`
- `Prisma 7` + `SQLite` (`better-sqlite3` adapter)
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
- Local media upload API and S3 signed URL support

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
DATABASE_URL=file:./prisma/dev.db
```

Optional for full features:

- SMTP for password reset emails:
	- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- AWS S3 for cloud media:
	- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`

If AWS variables are missing, media routes fall back to local development behavior where applicable.

### 3. Apply database migrations

```bash
npx prisma migrate deploy
```

For local development, you can also use:

```bash
npx prisma migrate dev
```

### 4. (Optional) Seed sample data

```bash
npx prisma db seed
```

### 5. Start development server

```bash
npm run dev
```

Open `http://localhost:3000`.

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
