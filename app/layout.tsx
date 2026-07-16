import type { Metadata, Viewport } from "next";
import "./globals.css";
import { StoreProvider } from "@/components/StoreProvider";
import { BottomNav } from "@/components/BottomNav";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Training Tracker",
  description: "Tendon rehab & progressive-loading training tracker",
};

export const viewport: Viewport = {
  themeColor: "#0b0f17",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-white antialiased">
        <AuthProvider>
          <StoreProvider>
            {/* Mobile: single phone-width column with a bottom tab bar.
                Desktop (>=768px): sidebar + content, capped at 1400px, centred. */}
            <div className="md:flex md:justify-center">
              <BottomNav />
              <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-5 md:max-w-[1400px] md:px-8 md:pb-8">
                {children}
              </main>
            </div>
          </StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
