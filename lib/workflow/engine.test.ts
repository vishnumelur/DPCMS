import { describe, it, expect } from 'vitest';
import { defineFlow, transition, type Flow } from './engine';

type State = 'NEW' | 'IN_REVIEW' | 'DONE' | 'REJECTED';
type Event = 'START_REVIEW' | 'APPROVE' | 'REJECT';

const flow: Flow<State, Event, { role: 'dpo' | 'customer' }> = defineFlow({
  initial: 'NEW',
  transitions: [
    { from: 'NEW',       on: 'START_REVIEW', to: 'IN_REVIEW', guard: ({ role }) => role === 'dpo' },
    { from: 'IN_REVIEW', on: 'APPROVE',      to: 'DONE',      guard: ({ role }) => role === 'dpo' },
    { from: 'IN_REVIEW', on: 'REJECT',       to: 'REJECTED',  guard: ({ role }) => role === 'dpo' },
  ],
});

describe('workflow engine', () => {
  it('initial state is the declared one', () => {
    expect(flow.initial).toBe('NEW');
  });

  it('allowed transition succeeds', () => {
    const r = transition(flow, 'NEW', 'START_REVIEW', { role: 'dpo' });
    expect(r.ok).toBe(true);
    expect(r.ok && r.to).toBe('IN_REVIEW');
  });

  it('disallowed transition by guard fails', () => {
    const r = transition(flow, 'NEW', 'START_REVIEW', { role: 'customer' });
    expect(r.ok).toBe(false);
  });

  it('unknown event from state fails', () => {
    const r = transition(flow, 'DONE', 'APPROVE', { role: 'dpo' });
    expect(r.ok).toBe(false);
  });
});
