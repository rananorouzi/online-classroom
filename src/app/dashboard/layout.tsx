import type { ReactNode } from "react";
import DashboardQuickActions from "@/components/layout/DashboardQuickActions";
import DashboardSessionProvider from "./SessionProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardSessionProvider>
      <DashboardQuickActions />
      {children}
    </DashboardSessionProvider>
  );
}