import { ComingSoon } from '@/components/app-shell/coming-soon';

export default function AdminResearchPage() {
  return (
    <ComingSoon
      title="M11 · Research Repository on Data Protection Laws"
      phase="P5"
      description="Searchable library of Indian and global data protection laws — DPDP Act 2023, DPDP Rules 2025, IT Act 2000, SPDI Rules 2011, GDPR, CCPA."
      rfpRefs={['M11.1', 'M11.2']}
      features={[
        'Full-text search with section linking',
        'Compare clauses across jurisdictions',
        'Subscribe to amendments + auto-alert',
        'Annotate clauses with internal interpretation notes',
        'AI Q&A grounded on the corpus',
      ]}
    />
  );
}
