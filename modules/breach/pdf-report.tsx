import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import type { breachIncident, breachAction } from '@/db/schema';

type Incident = typeof breachIncident.$inferSelect;
type Action = typeof breachAction.$inferSelect;

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111',
  },
  letterhead: {
    borderBottom: 2,
    borderBottomColor: '#0a4d68',
    paddingBottom: 8,
    marginBottom: 16,
  },
  brand: { fontSize: 14, fontWeight: 700, color: '#0a4d68' },
  brandSub: { fontSize: 9, color: '#444', marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  subtitle: { fontSize: 9, color: '#555', marginBottom: 12 },
  section: { marginTop: 10, marginBottom: 4 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: '#0a4d68',
    borderBottom: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 2,
    marginBottom: 4,
  },
  pBody: { lineHeight: 1.5, marginBottom: 4 },
  meta: { flexDirection: 'row', marginBottom: 2 },
  metaKey: { width: 140, color: '#555' },
  metaVal: { flex: 1 },
  severityBadge: {
    fontSize: 9,
    fontWeight: 700,
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 5,
    paddingRight: 5,
    borderRadius: 3,
    color: '#fff',
    alignSelf: 'flex-start',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 3,
    paddingBottom: 3,
    borderBottom: 0.5,
    borderBottomColor: '#eaeaea',
  },
  timeCell: { width: 130, color: '#555', fontFamily: 'Courier' },
  kindCell: { width: 90, color: '#0a4d68', textTransform: 'uppercase' },
  notesCell: { flex: 1 },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    fontSize: 8,
    color: '#888',
    borderTop: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 4,
    textAlign: 'center',
  },
  bullet: { marginLeft: 8, marginBottom: 2 },
});

const SEVERITY_COLOR: Record<string, string> = {
  low: '#6b7280',
  medium: '#ca8a04',
  high: '#dc2626',
  critical: '#7f1d1d',
};

function fmt(d: Date | null | undefined): string {
  return d ? d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC' : '—';
}

export function DpbReportDocument(props: {
  incident: Incident;
  actions: ReadonlyArray<Action>;
  cohortCount: number;
}) {
  const { incident, actions, cohortCount } = props;
  const severityColor = SEVERITY_COLOR[incident.severity] ?? '#6b7280';

  return (
    <Document
      title={`DPB Notification — ${incident.title}`}
      author="Kerala State Cooperative Bank — DPCMS"
      subject="Personal Data Breach Notification to the Data Protection Board of India"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <Text style={styles.brand}>KERALA STATE COOPERATIVE BANK</Text>
          <Text style={styles.brandSub}>
            Apex Cooperative Bank of Kerala · Registered under the Banking Regulation Act, 1949
          </Text>
          <Text style={styles.brandSub}>
            Data Protection Officer: dpo@kscb.in · Generated via DPCMS
          </Text>
        </View>

        <Text style={styles.title}>Notification of Personal Data Breach</Text>
        <Text style={styles.subtitle}>
          To the Data Protection Board of India — DPDP Act 2023 §8(6) read with the DPDP Rules
          2025. POC placeholder; final form will track the DPB-prescribed schema once notified.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1 · Identification</Text>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Incident ID</Text>
            <Text style={styles.metaVal}>{incident.id}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Title</Text>
            <Text style={styles.metaVal}>{incident.title}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Severity</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                {incident.severity.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Status</Text>
            <Text style={styles.metaVal}>{incident.status}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Detected at</Text>
            <Text style={styles.metaVal}>{fmt(incident.detectedAt)}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Reporting deadline</Text>
            <Text style={styles.metaVal}>{fmt(incident.reportingDeadlineAt)} (detected + 72h)</Text>
          </View>
          {incident.reportedAt ? (
            <View style={styles.meta}>
              <Text style={styles.metaKey}>Reported to DPB at</Text>
              <Text style={styles.metaVal}>{fmt(incident.reportedAt)}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2 · Description of the incident</Text>
          <Text style={styles.pBody}>
            {incident.description || 'No description recorded.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3 · Affected data principals</Text>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Estimated count</Text>
            <Text style={styles.metaVal}>
              {incident.estimatedAffectedCount.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Cohort built</Text>
            <Text style={styles.metaVal}>
              {cohortCount.toLocaleString('en-IN')} principal(s)
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaKey}>Data categories</Text>
            <Text style={styles.metaVal}>
              {incident.affectedDataCategories.length
                ? incident.affectedDataCategories.join(', ')
                : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4 · Root cause (preliminary)</Text>
          <Text style={styles.pBody}>
            {incident.rootCause?.trim() || 'Investigation in progress.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5 · Containment & remediation actions</Text>
          {actions.length === 0 ? (
            <Text style={styles.pBody}>No actions recorded yet.</Text>
          ) : (
            actions.map((a) => (
              <View key={a.id} style={styles.timelineRow}>
                <Text style={styles.timeCell}>{fmt(a.createdAt)}</Text>
                <Text style={styles.kindCell}>{a.kind}</Text>
                <Text style={styles.notesCell}>{a.notes ?? '—'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6 · Notification to data principals</Text>
          <Text style={styles.pBody}>
            {cohortCount > 0
              ? `Cohort of ${cohortCount.toLocaleString(
                  'en-IN',
                )} principal(s) prepared for direct notification (POC: no email/SMS gateway wired in this build).`
              : 'No principal cohort built yet; notification pending.'}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7 · Authorised signatory</Text>
          <Text style={styles.pBody}>Data Protection Officer · Kerala State Cooperative Bank</Text>
          <Text style={[styles.pBody, { marginTop: 18 }]}>
            ____________________________________________
          </Text>
          <Text style={[styles.pBody, { color: '#666' }]}>
            Signature / Digital signature placeholder
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          Generated by DPCMS POC at {new Date().toISOString()} ·
          {' '}Incident {incident.id} · Confidential — DPB notification only
        </Text>
      </Page>
    </Document>
  );
}

export async function renderDpbReportPdf(
  incident: Incident,
  actions: ReadonlyArray<Action>,
  cohortCount: number,
): Promise<Buffer> {
  const stream = await pdf(
    <DpbReportDocument
      incident={incident}
      actions={actions}
      cohortCount={cohortCount}
    />,
  ).toBuffer();
  // @react-pdf/renderer returns a Node Readable. Drain to a Buffer.
  return toBuffer(stream as unknown as NodeJS.ReadableStream);
}

async function toBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer | string) =>
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string)),
    );
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
