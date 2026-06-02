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
        <section
          className={
            role === "admin"
              ? "min-w-0 flex-1 overflow-x-hidden px-3 pb-28 pt-40 sm:px-4 sm:pt-36 md:ml-72 md:px-6 md:py-6 lg:px-8"
              : "min-w-0 flex-1 overflow-x-hidden px-3 pb-28 pt-40 sm:px-4 sm:pt-36 md:ml-72 md:px-6 md:py-6 lg:px-8"
          }
        >
          {children}
        </section>
      </div>
      <RealtimeNotifications userId={userId} role={role} userName={userName} />
    </main>
  );
}
