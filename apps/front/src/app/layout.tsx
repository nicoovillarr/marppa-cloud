import "./globals.css";
import "@/libs/extensions/array-extension";
import "@/libs/extensions/string-extension";
import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono, Big_Shoulders_Display } from "next/font/google";
import { AppBar } from "@/core/ui/AppBar";
import { Footer } from "@/core/ui/Footer";
import { TickProvider } from "@/auth/ui/TickProvider";
import { WebSocketProvider } from "@/core/ui/WebsocketProvider";
import { DialogProvider } from "@/core/ui/DialogProvider";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const shouldersDisplay = Big_Shoulders_Display({
  variable: "--font-shoulders-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Marppa Cloud",
  description: "Your infrastructure, in view.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${plexSans.variable} ${plexMono.variable} ${shouldersDisplay.variable} antialiased grid min-h-dvh grid-rows-[64px_1fr_auto] bg-surface text-ink`}
      >
        <TickProvider>
          <WebSocketProvider>
            <DialogProvider>
              <AppBar />
              {children}
              <Footer />
            </DialogProvider>
          </WebSocketProvider>
        </TickProvider>
      </body>
    </html>
  );
}
