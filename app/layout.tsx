import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Project Triage",
  description: "Medical intake and provider triage workspace"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-slate-100">
        {children}
      </body>
    </html>
  );
}
