import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Geist } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { cn } from '@/lib/utils';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'DPCMS — Kerala State Cooperative Bank',
  description: 'Data Privacy & Consent Management System aligned to DPDP Act 2023',
};

// Next 16: themeColor must live on `viewport`, not `metadata`.
export const viewport: Viewport = {
  themeColor: '#1d6470',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} className={cn('font-sans', geist.variable)}>
      <head>
        {/* Preload the bank logo so the brand image is in cache before any
            <img> tag is parsed. Eliminates the alt-text-during-loading flash
            on language switch + slow networks. */}
        <link rel="preload" as="image" href="/logo-kerala-bank.png" fetchPriority="high" />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
