import { signOutAction } from '@/lib/actions/sign-out';
import { Button } from '@/components/ui/button';

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right sm:block">
        <p className="text-sm font-medium leading-tight">{email}</p>
        <p className="text-xs text-muted-foreground">DPO · global scope</p>
      </div>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm">
          Sign out
        </Button>
      </form>
    </div>
  );
}
