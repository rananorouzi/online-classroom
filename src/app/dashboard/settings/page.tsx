import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import SettingsForm from "./SettingsForm";
import Breadcrumb from "@/components/layout/Breadcrumb";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) redirect("/auth/login");

  return (
    <main className="px-6 py-12">
      <div className="mb-8">
        <Breadcrumb
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Settings" },
          ]}
        />
        <h1 className="mt-3 text-2xl font-bold text-primary">
          Account Settings
        </h1>
      </div>
      <SettingsForm user={user} />
    </main>
  );
}
