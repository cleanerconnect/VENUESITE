import type { Metadata } from "next";
import { Urbanist, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { demoClockScript } from "@/lib/time/demo-clock";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-urbanist",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://lyfe.ma",
  ),
  title: "LYFE, Espace Organisateur",
  description:
    "Tableau de bord LYFE : pilotez vos événements, vos billets et vos versements en temps réel.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
  },
  openGraph: {
    title: "LYFE, Espace Organisateur",
    description:
      "Pilotez vos événements, vos billets et vos versements en temps réel.",
    images: ["/lyfe-logo.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nothing at all unless `LYFE_DEMO_CLOCK` is set. When it is, the
  // browser has to be shifted onto the same instant as the server
  // *before* React hydrates, or every time-derived string renders twice
  // and differently — Réservations hydrated « Aujourd'hui. » against
  // nothing. See `src/lib/time/demo-clock-shared.mjs`.
  const clock = demoClockScript();
  return (
    <html
      lang="fr"
      className={`${urbanist.variable} ${fraunces.variable}`}
    >
      <body>
        {/* First child of <body>, not inside a <head> the App Router
            owns: a <head> element written by a layout has its children
            dropped, and the script silently never ran — which is worse
            than not having it, because the server was then an hour off
            from a browser that thought it agreed. */}
        {clock ? <script dangerouslySetInnerHTML={{ __html: clock }} /> : null}
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
