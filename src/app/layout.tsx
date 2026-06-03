import type { Metadata, Viewport } from "next";

import "./globals.css";
import "./visual-tuning.css";
import "./final-layout-fixes.css";
import "./visual-point-fixes.css";

export const metadata: Metadata = {
  title: "VuelosPro",
  description: "Sistema de administración de vuelos, pagos y QR.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
