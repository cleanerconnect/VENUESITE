import { MobileSidebarDrawer, Sidebar } from "@/components/organizer/Sidebar";
import { Topbar } from "@/components/organizer/Topbar";
import { BottomTabs } from "@/components/organizer/BottomTabs";
import { ScannerModal } from "@/components/organizer/ScannerModal";
import { CheckInSheet } from "@/components/restaurant/CheckInSheet";
import { AssistantFAB } from "@/components/organizer/Assistant";
import { SessionSync } from "@/components/auth/SessionSync";
import { WorkspaceAccessProvider } from "@/lib/auth/workspace-access";
import { resolveSession } from "@/lib/auth/server-session";
import { resolveAccount } from "@/lib/auth/accounts";
import { redirect } from "next/navigation";

// Shell, sticky sidebar (desktop), top app bar, mobile bottom tabs.
// ScannerModal, CheckInSheet and AssistantFAB live here so they're
// persistent across every route. Keyboard shortcuts (⌘+Shift+S, ⌘+J)
// are wired in Topbar.
//
// The gate is server-side: the middleware bounces a request with no
// session cookie, and this layout redirects if the cookie resolves to
// nothing. There used to be a third gate reading localStorage, which
// could disagree with the other two — a client could be signed out
// while the server considered it signed in.
export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved server-side so the shell knows which venue is active and
  // which others this account holds, without the client asking.
  const session = await resolveSession();
  if (!session) redirect("/login?expired=1");

  const account = resolveAccount(session.userId);

  const access = {
    event: (account?.organizations.length ?? 0) > 0,
    venue: session.venues.length > 0,
  };

  return (
    <WorkspaceAccessProvider value={access}>
      <SessionSync
        userId={session.userId}
        email={session.email}
        organizerId={account?.organizations[0]?.id ?? ""}
        role={session.role === "owner" ? "owner" : session.role === "manager" ? "admin" : "scanner"}
      />
      <div className="min-h-screen flex">
        <div className="no-print contents">
          <Sidebar
            venues={session.venues}
            activeVenueId={session.venueId}
            viewerName={session.fullName}
            viewerRole={session.role}
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
          <CheckInSheet />
          <AssistantFAB />
        </div>
      </div>
    </WorkspaceAccessProvider>
  );
}
