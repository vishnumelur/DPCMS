export type RfpStatus = 'RA' | 'CA' | 'NA';

export type RfpRequirement = {
  /** Stable id: `M{moduleNumber}.{section}.{number}` e.g. M1.A.3 */
  id: string;
  module: string;
  section: string;
  number: string;
  text: string;
  status: RfpStatus;
  demoPath?: string;
  evidencePath?: string;
  phase: 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
};
