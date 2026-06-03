import { RealtimeNotifications } from "@/components/notifications/RealtimeNotifications";
import { SupportChat } from "@/components/SupportChat";

import { Sidebar } from "./Sidebar";

type DashboardShellProps = {
  role: "admin" | "user";
  userId: string;
  userName?: string;
  children: React.ReactNode;
};

export function DashboardShell({ role, userId, userName, children }: DashboardShellProps) {
  return (
    <main className={role === "admin" ? "admin-bg min-h-screen" : "dashboard-bg min-h-screen"}>
      <div className="flex min-h-screen w-full max-w-full overflow-x-hidden">
        <Sidebar role={role} userName={userName} />
        <section className="dashboard-content min-w-0 flex-1 overflow-x-hidden px-4 pb-24 pt-[5.25rem] sm:px-6 md:ml-80 md:px-8 md:py-8 md:pt-8 2xl:px-12 2xl:py-10">
          {children}
        </section>
      </div>
      <RealtimeNotifications userId={userId} role={role} userName={userName} />
      {role === "user" && (
        <SupportChat userId={userId} userName={userName} />
      )}
    </main>
  );
}
