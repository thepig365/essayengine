import type { ReactNode } from "react";

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
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          color: "#d8dee8",
          background: "#070b12",
        }}
      >
        {children}
      </body>
    </html>
  );
}
