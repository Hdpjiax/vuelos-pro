import type { Metadata, Viewport } from "next";
import { SupportButton } from '@/components/SupportButton';

import "./globals.css";

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
