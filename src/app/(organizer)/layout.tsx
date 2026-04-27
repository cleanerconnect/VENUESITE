import { Sidebar } from "@/components/organizer/Sidebar";
import { Topbar } from "@/components/organizer/Topbar";
import { BottomTabs } from "@/components/organizer/BottomTabs";
import { ScannerModal } from "@/components/organizer/ScannerModal";
import { AssistantFAB } from "@/components/organizer/Assistant";

// Shell — sticky sidebar (desktop), top app bar, mobile bottom tabs.
// ScannerModal and AssistantFAB live here so they're persistent across
// every route. Keyboard shortcuts (⌘+Shift+S, ⌘+J) are wired in Topbar.
export default function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col pb-20 md:pb-0">
        <Topbar />
        <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 md:px-8 py-6 md:py-8">
          {children}
        </main>
      </div>
      <BottomTabs />

      {/* Persistent global surfaces */}
      <ScannerModal />
      <AssistantFAB />
    </div>
  );
}
