import type { Metadata } from 'next';
import { IBM_Plex_Sans_Thai } from 'next/font/google';
import { TopNavigation } from '@/components/top-navigation';
import './globals.css';

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  subsets: ['thai'],
  weight: ['400', '600']
});

export const metadata: Metadata = {
  title: 'Electricity Service Requests',
  description: 'MVP สำหรับจัดการคำร้องผู้ใช้ไฟฟ้า'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={ibmPlexSansThai.className}>
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-6 py-4">
            <h1 className="text-lg font-semibold text-slate-900">Electricity Request Dashboard</h1>
            <TopNavigation />
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-6 py-4">{children}</main>
      </body>
    </html>
  );
}
