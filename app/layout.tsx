import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomNav } from "@/components/layout/BottomNav";
import { CreateEventFab } from "@/components/layout/CreateEventFab";

export const metadata: Metadata = {
  title: "LYFE — Tableau de bord organisateur",
  description: "Gérez vos événements, billets et versements sur LYFE.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-bg text-ink">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 pb-20 md:pb-0">{children}</main>
        </div>
        <BottomNav />
        <CreateEventFab />
      </body>
    </html>
  );
}
