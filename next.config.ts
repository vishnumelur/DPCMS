import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // The SBOM page + export route read package.json / package-lock.json via fs.
  // Vercel's serverless bundler doesn't auto-trace JSON imported by string path,
  // so we tell it explicitly which files to ship with these functions.
  outputFileTracingIncludes: {
    'app/(admin)/admin/sbom/page': ['./package.json', './package-lock.json'],
    'app/api/reports/sbom/route': ['./package.json', './package-lock.json'],
  },
};

export default withNextIntl(nextConfig);
