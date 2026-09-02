import { MobileSidebarDrawer, Sidebar } from "@/components/organizer/Sidebar";
import { Topbar } from "@/components/organizer/Topbar";
import { BottomTabs } from "@/components/organizer/BottomTabs";
import { ScannerModal } from "@/components/organizer/ScannerModal";
import { AssistantFAB } from "@/components/organizer/Assistant";
import { SessionGuard } from "@/components/auth/SessionGuard";
import { resolveSession } from "@/lib/auth/server-session";

// Shell, sticky sidebar (desktop), top app bar, mobile bottom tabs.
// ScannerModal and AssistantFAB live here so they're persistent across
// every route. Keyboard shortcuts (⌘+Shift+S, ⌘+J) are wired in Topbar.
// SessionGuard is the front door — it redirects to /login if no valid
// session exists in localStorage.
export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved server-side so the shell knows which venue is active and
  // which others this account holds, without the client asking.
  const session = await resolveSession();

  return (
    <SessionGuard>
      <div className="min-h-screen flex">
        <div className="no-print contents">
          <Sidebar
            venues={session?.venues ?? []}
            activeVenueId={session?.venueId ?? ""}
            viewerName={session?.fullName ?? ""}
            viewerRole={session?.role}
          />
          <MobileSidebarDrawer />
        </div>
        <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
          <div className="no-print contents">
            <Topbar />
          </div>
          <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 md:px-8 py-6 md:py-8">
            {children}
          </main>
        </div>
        <div className="no-print contents">
          <BottomTabs />

          {/* Persistent global surfaces */}
          <ScannerModal />
          <AssistantFAB />
        </div>
      </div>
    </SessionGuard>
  );
}
