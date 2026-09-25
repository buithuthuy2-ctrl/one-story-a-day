import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One Story a Day | Góc đọc mỗi ngày",
  description: "Không gian nghe, đọc truyện và luyện đọc hiểu mỗi ngày.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
