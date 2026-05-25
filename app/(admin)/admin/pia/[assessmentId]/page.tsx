import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { db } from '@/db/client';
import { user, userRole, role, processingActivity } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AssessmentDetailView } from '@/components/assessment/detail-view';
import {
  getAssessment,
  listResponses,
  listActions,
} from '@/modules/assessment/service';
import type { RoleKind } from '@/lib/auth/rbac';

export const dynamic = 'force-dynamic';

type PageProps = { params: Promise<{ assessmentId: string }> };

export default async function PiaDetailPage({ params }: PageProps) {
  const { assessmentId } = await params;

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const a = await getAssessment(u.orgId, assessmentId);
  if (!a || a.kind !== 'pia') return notFound();

  const [responses, actions, links] = await Promise.all([
    listResponses(assessmentId),
    listActions(assessmentId),
    db.select().from(userRole).where(eq(userRole.userId, u.id)),
  ]);

  const roleIds = links.map((l) => l.roleId);
  const rolesRows = roleIds.length
    ? await db.select().from(role).where(eq(role.orgId, u.orgId))
    : [];
  const roleKinds = rolesRows
    .filter((r) => roleIds.includes(r.id))
    .map((r) => r.kind as RoleKind);

  const canApprove = roleKinds.includes('dpo');
  const canSubmit = roleKinds.includes('dpo') || roleKinds.includes('privacy_steward');

  let linkedActivityName: string | null = null;
  if (a.processingActivityId) {
    const act = await db
      .select()
      .from(processingActivity)
      .where(eq(processingActivity.id, a.processingActivityId))
      .limit(1);
    linkedActivityName = act[0]?.name ?? null;
  }

  return (
    <AssessmentDetailView
      kind="pia"
      assessment={{
        id: a.id,
        kind: a.kind,
        title: a.title,
        description: a.description,
        status: a.status,
        riskScore: a.riskScore,
        riskLevel: a.riskLevel,
        aiPrefilled: a.aiPrefilled,
        processingActivityId: a.processingActivityId,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      }}
      responses={responses.map((r) => ({
        questionKey: r.questionKey,
        answer: r.answer,
        score: r.score,
      }))}
      actions={actions.map((x) => ({
        id: x.id,
        kind: x.kind,
        notes: x.notes,
        createdAt: x.createdAt,
      }))}
      canApprove={canApprove}
      canSubmit={canSubmit}
      linkedActivityName={linkedActivityName}
    />
  );
}
