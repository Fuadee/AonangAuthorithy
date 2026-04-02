import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Electricity Service Requests',
  description: 'MVP สำหรับจัดการคำร้องผู้ใช้ไฟฟ้า'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold">Electricity Request MVP</h1>
            <nav className="flex items-center gap-3 text-sm">
              <Link className="btn-secondary" href="/dashboard">
                Dashboard
              </Link>
              <Link className="btn-secondary" href="/surveyor">
                งานนักสำรวจ
              </Link>
              <Link className="btn-primary" href="/requests/new">
                สร้างคำร้องใหม่
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
