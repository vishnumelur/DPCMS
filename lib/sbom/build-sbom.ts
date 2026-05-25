type PkgEntry = {
  name: string;
  version: string;
  resolved: string;
  scope: 'prod' | 'dev';
};

type LockEntry = { version?: string; resolved?: string; dev?: boolean };

type LockFile = {
  packages?: Record<string, LockEntry>;
};

type PackageJson = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

export type SbomEntry = {
  name: string;
  version: string;
  scope: 'prod' | 'dev';
  resolution: 'direct' | 'transitive';
  resolved: string;
};

export type SbomBundle = {
  generatedAt: string;
  toolName: string;
  toolVersion: string;
  direct: SbomEntry[];
  totals: { direct: number; transitive: number; all: number };
};

/**
 * Pure: builds the SBOM bundle from already-loaded package.json + package-lock.json.
 * Callers do the static import (Next.js bundles JSON imported by literal path —
 * no fs reads needed, works in Vercel serverless without outputFileTracingIncludes).
 */
export function buildSbom(pkg: PackageJson, lock: LockFile): SbomBundle {
  const directDeps = Object.keys(pkg.dependencies ?? {});
  const directDev = Object.keys(pkg.devDependencies ?? {});
  const directSet = new Set<string>([...directDeps, ...directDev]);

  const entries: PkgEntry[] = [];
  const packages = lock.packages ?? {};

  for (const [lockPath, entry] of Object.entries(packages)) {
    if (lockPath === '') continue; // root
    if (!lockPath.startsWith('node_modules/')) continue;
    const rest = lockPath.slice('node_modules/'.length);
    if (rest.includes('node_modules/')) continue;
    const name = rest;
    if (!directSet.has(name)) continue;
    const scope: 'prod' | 'dev' = entry.dev || directDev.includes(name) ? 'dev' : 'prod';
    entries.push({
      name,
      version: entry.version ?? '?',
      resolved: entry.resolved ?? '',
      scope,
    });
  }

  entries.sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === 'prod' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const allDeps = Object.keys(packages).filter(
    (k) => k.startsWith('node_modules/') && !k.slice('node_modules/'.length).includes('node_modules/'),
  );

  return {
    generatedAt: new Date().toISOString(),
    toolName: pkg.name,
    toolVersion: pkg.version,
    direct: entries.map((e) => ({
      name: e.name,
      version: e.version,
      scope: e.scope,
      resolution: 'direct',
      resolved: e.resolved,
    })),
    totals: {
      direct: entries.length,
      transitive: Math.max(0, allDeps.length - entries.length),
      all: allDeps.length,
    },
  };
}

/**
 * Produce a minimal CycloneDX 1.5 document. POC fidelity only — for
 * production use the cyclonedx-bom CLI or @cyclonedx/cyclonedx-npm.
 */
export function toCycloneDx(bundle: SbomBundle): object {
  const serial = `urn:uuid:00000000-0000-0000-0000-${Date.now().toString().padStart(12, '0').slice(-12)}`;
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: serial,
    version: 1,
    metadata: {
      timestamp: bundle.generatedAt,
      tools: [
        { vendor: 'dpcms', name: 'dpcms-sbom', version: bundle.toolVersion },
      ],
      component: {
        type: 'application',
        name: bundle.toolName,
        version: bundle.toolVersion,
      },
    },
    components: bundle.direct.map((d) => ({
      type: 'library',
      'bom-ref': `pkg:npm/${d.name}@${d.version}`,
      name: d.name,
      version: d.version,
      purl: `pkg:npm/${d.name}@${d.version}`,
      scope: d.scope === 'prod' ? 'required' : 'optional',
      properties: [
        { name: 'dpcms:resolution', value: d.resolution },
        { name: 'dpcms:resolved', value: d.resolved },
      ],
    })),
  };
}
