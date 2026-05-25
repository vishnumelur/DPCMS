import { auth } from '@/auth';
import { db } from '@/db/client';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AssessmentListView } from '@/components/assessment/list-view';
import { listAssessments } from '@/modules/assessment/service';
import { listActivities } from '@/modules/ropa/service';

export const dynamic = 'force-dynamic';

export default async function AdminDpiaPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const userRows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = userRows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const [rows, activities] = await Promise.all([
    listAssessments(u.orgId, 'dpia'),
    listActivities(u.orgId),
  ]);

  return (
    <AssessmentListView
      kind="dpia"
      rows={rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        riskScore: r.riskScore,
        riskLevel: r.riskLevel,
        aiPrefilled: r.aiPrefilled,
        createdAt: r.createdAt,
      }))}
      activities={activities.map((a) => ({ id: a.id, name: a.name }))}
    />
  );
}
