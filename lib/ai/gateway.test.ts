import { describe, it, expect } from 'vitest';
import { redactPII } from './redact';

describe('redactPII', () => {
  it('redacts an email', () => {
    expect(redactPII('Contact user@example.com today')).toContain('[EMAIL]');
  });
  it('redacts an Indian mobile number', () => {
    expect(redactPII('Call +91 9876543210 now')).toContain('[PHONE]');
  });
  it('redacts a PAN-shaped string', () => {
    expect(redactPII('PAN ABCDE1234F belongs to')).toContain('[PAN]');
  });
  it('redacts an Aadhaar-shaped string', () => {
    expect(redactPII('Aadhaar 1234 5678 9012 issued')).toContain('[AADHAAR]');
  });
  it('leaves unrelated text intact', () => {
    expect(redactPII('No PII here')).toBe('No PII here');
  });
});
