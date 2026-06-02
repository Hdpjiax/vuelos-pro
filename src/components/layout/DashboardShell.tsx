import { RealtimeNotifications } from "@/components/notifications/RealtimeNotifications";
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
        <section className="min-w-0 flex-1 overflow-x-hidden px-3 pb-24 pt-[4.5rem] sm:px-5 md:ml-72 md:px-7 md:py-7 md:pt-7">
          {children}
        </section>
      </div>
      <RealtimeNotifications userId={userId} role={role} userName={userName} />
    </main>
  );
}