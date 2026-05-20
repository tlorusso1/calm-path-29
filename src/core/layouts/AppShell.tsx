import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <TopBar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <BottomNav />
    </div>
  );
}
