import './globals.css';
import Header from '@/components/Header';
import type { Metadata } from 'next';
export const metadata: Metadata = { title:'LifeOS Academic Pro v3.1', description:'Dashboard-only timers with complete/done flow + history.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body><Header /><main className="container py-8">{children}</main></body></html>);
}
