import { auth } from '@/auth';
import { db } from '@/db/client';
import { nominee, user } from '@/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { addNomineeAction, revokeNomineeAction } from '@/lib/actions/nominees';

export const dynamic = 'force-dynamic';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  verified: 'default',
  rejected: 'destructive',
};

export default async function MyNomineesPage() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return <p className="text-sm">Sign in.</p>;
  const rows = await db.select().from(user).where(eq(user.email, email)).limit(1);
  const u = rows[0];
  if (!u?.orgId) return <p className="text-sm">No org.</p>;

  const myNominees = await db
    .select()
    .from(nominee)
    .where(and(eq(nominee.principalUserId, u.id), eq(nominee.orgId, u.orgId)))
    .orderBy(desc(nominee.createdAt));

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Nominees</h1>
          <p className="text-sm text-muted-foreground">
            Per DPDP Act §14, you may nominate another individual to exercise your data-principal
            rights in the event of incapacity or death. Each nomination is recorded in the
            tamper-evident audit chain.
          </p>
        </div>
        <Badge variant="default">Live · P5</Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your nominees ({myNominees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {myNominees.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You have not nominated anyone yet. Use the form below to add a nominee.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Relation</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myNominees.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-medium">{n.name}</TableCell>
                    <TableCell className="text-xs">{n.email}</TableCell>
                    <TableCell className="text-xs">{n.relation}</TableCell>
                    <TableCell className="text-xs">
                      {n.permissions.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        n.permissions.join(', ')
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={STATUS_VARIANT[n.verificationStatus] ?? 'outline'}
                        className="uppercase text-[10px]"
                      >
                        {n.verificationStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <form action={revokeNomineeAction} className="inline">
                        <input type="hidden" name="nomineeId" value={n.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Revoke
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add a nominee</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addNomineeAction} className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-base">Name</Label>
              <Input id="name" name="name" placeholder="e.g. Asha Verghese" required className="h-11 text-base" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-base">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="e.g. asha@example.com"
                required
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="relation" className="text-base">Relation</Label>
              <Input
                id="relation"
                name="relation"
                placeholder="spouse / child / sibling / parent"
                required
                className="h-11 text-base"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-base">Permissions</Label>
              <div className="flex flex-wrap gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="permissions" value="view" defaultChecked className="h-4 w-4" />
                  view
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="permissions" value="withdraw" className="h-4 w-4" />
                  withdraw
                </label>
                <label className="flex items-center gap-1.5 text-sm">
                  <input type="checkbox" name="permissions" value="erase" className="h-4 w-4" />
                  erase
                </label>
              </div>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" size="lg" className="h-11">Add nominee</Button>
            </div>
          </form>
          <p className="mt-3 text-[10px] text-muted-foreground">
            New nominations enter <code className="rounded bg-muted px-1">pending</code> state. A
            successor verification flow (Aadhaar OTP / DigiLocker death certificate) would precede
            transition to <code className="rounded bg-muted px-1">verified</code> in production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
