'use client';

import { Button } from '@/components/ui/button';

type Props = {
  label: string;
  username: string;
  password: string;
};

/**
 * Click-to-fill helper for evaluators. Imperatively sets the value of the
 * username + password inputs (by id) and fires an `input` event so React's
 * controlled inputs (and form validators) see the change.
 */
export function DemoFillButton({ label, username, password }: Props) {
  function handleClick() {
    const userInput = document.getElementById('username') as HTMLInputElement | null;
    const passInput = document.getElementById('password') as HTMLInputElement | null;
    setInputValue(userInput, username);
    setInputValue(passInput, password);
    userInput?.focus();
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-3 w-full"
      onClick={handleClick}
    >
      {label}
    </Button>
  );
}

function setInputValue(input: HTMLInputElement | null, value: string) {
  if (!input) return;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )?.set;
  if (nativeSetter) {
    nativeSetter.call(input, value);
  } else {
    input.value = value;
  }
  input.dispatchEvent(new Event('input', { bubbles: true }));
}
