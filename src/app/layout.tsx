import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Essay Engine",
  description: "Translator / paraphraser engine",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Inter", "Segoe UI", system-ui, sans-serif',
          fontSize: "16px",
          lineHeight: 1.6,
          color: "#d8dee8",
          background: "#070b12",
        }}
      >
        {children}
      </body>
    </html>
  );
}
