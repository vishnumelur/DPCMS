'use client';

import { useRef, useTransition } from 'react';
import { grantConsentAction, withdrawConsentAction } from '@/lib/actions/consent';

export function ConsentToggle({
  purposeId,
  active,
  label,
}: {
  purposeId: string;
  active: boolean;
  label: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const action = active ? withdrawConsentAction : grantConsentAction;
  return (
    <form ref={formRef} action={action} className="m-0">
      <input type="hidden" name="purposeId" value={purposeId} />
      <label className="inline-flex cursor-pointer items-center">
        <input
          type="checkbox"
          className="ios-switch"
          defaultChecked={active}
          disabled={pending}
          onChange={() => {
            startTransition(() => {
              formRef.current?.requestSubmit();
            });
          }}
          aria-label={`Toggle ${label}`}
        />
      </label>
    </form>
  );
}
