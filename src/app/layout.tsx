import type { Metadata } from "next";
import { Urbanist, Fraunces } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

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
    images: ["/lyfe-logo.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${urbanist.variable} ${fraunces.variable}`}
    >
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
