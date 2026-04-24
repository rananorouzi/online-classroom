import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";

const dbPath = path.resolve(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });

const prisma = new PrismaClient({ adapter });

async function main() {
  // Create teacher
  const teacher = await prisma.user.upsert({
    where: { email: "teacher@musicacademy.pro" },
    update: {},
    create: {
      email: "teacher@musicacademy.pro",
      name: "Prof. Harmony",
      hashedPassword: await bcrypt.hash("teacher123", 12),
      role: "TEACHER",
    },
  });

  // Create student
  const student = await prisma.user.upsert({
    where: { email: "student@musicacademy.pro" },
    update: {},
    create: {
      email: "student@musicacademy.pro",
      name: "Alex Student",
      hashedPassword: await bcrypt.hash("student123", 12),
      role: "STUDENT",
    },
  });

  // Create course
  const course = await prisma.course.upsert({
    where: { id: "seed-course-1" },
    update: {},
    create: {
      id: "seed-course-1",
      title: "Classical Guitar Mastery",
      description:
        "A 12-week journey from intermediate to advanced classical guitar technique",
    },
  });

  // Enroll student
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId: student.id, courseId: course.id },
    },
    update: {},
    create: { userId: student.id, courseId: course.id },
  });

  // Enroll teacher
  await prisma.enrollment.upsert({
    where: {
      userId_courseId: { userId: teacher.id, courseId: course.id },
    },
    update: {},
    create: { userId: teacher.id, courseId: course.id },
  });

  // Create weeks (all released — no future locked weeks)
  const weekData = [
    { number: 1, title: "Fingerpicking Foundations", daysOffset: -14 },
    { number: 2, title: "Arpeggios & Patterns", daysOffset: -7 },
    { number: 3, title: "Tremolo Technique", daysOffset: -1 },
  ];

  for (const wd of weekData) {
    const releaseAt = new Date();
    releaseAt.setDate(releaseAt.getDate() + wd.daysOffset);

    const week = await prisma.week.upsert({
      where: {
        courseId_number: { courseId: course.id, number: wd.number },
      },
      update: {},
      create: {
        courseId: course.id,
        number: wd.number,
        title: wd.title,
        releaseAt,
      },
    });

    // Create 2 sessions per week
    for (let s = 1; s <= 2; s++) {
      const session = await prisma.session.create({
        data: {
          weekId: week.id,
          title: `${wd.title} - Part ${s}`,
          order: s,
          releaseAt,
          videoKey: `courses/${course.id}/week-${wd.number}/session-${s}/video.m3u8`,
        },
      });

      // Create checklist items
      const checklistTitles = [
        "Practice the main exercise (15 min)",
        "Record yourself playing the piece",
        "Submit self-reflection notes",
      ];

      for (let c = 0; c < checklistTitles.length; c++) {
        await prisma.checklistItem.create({
          data: {
            sessionId: session.id,
            title: checklistTitles[c],
            order: c + 1,
          },
        });
      }
    }
  }

  console.log("Seed complete!");
  console.log(`Teacher: teacher@musicacademy.pro / teacher123`);
  console.log(`Student: student@musicacademy.pro / student123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
