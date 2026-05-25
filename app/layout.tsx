import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DPCMS — Data Privacy & Consent Management System',
  description: 'DPDP Act 2023 compliance platform for Kerala State Cooperative Bank',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
