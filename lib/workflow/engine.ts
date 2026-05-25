export type TransitionDef<S, E, Ctx> = {
  from: S;
  on: E;
  to: S;
  guard?: (ctx: Ctx) => boolean;
};

export type Flow<S, E, Ctx> = {
  initial: S;
  transitions: ReadonlyArray<TransitionDef<S, E, Ctx>>;
};

export function defineFlow<S, E, Ctx>(f: Flow<S, E, Ctx>): Flow<S, E, Ctx> {
  return Object.freeze({ ...f, transitions: Object.freeze([...f.transitions]) });
}

export type TransitionResult<S> = { ok: true; to: S } | { ok: false; reason: string };

export function transition<S, E, Ctx>(
  flow: Flow<S, E, Ctx>,
  from: S,
  event: E,
  ctx: Ctx,
): TransitionResult<S> {
  const match = flow.transitions.find((t) => t.from === from && t.on === event);
  if (!match) return { ok: false, reason: 'no_transition' };
  if (match.guard && !match.guard(ctx)) return { ok: false, reason: 'guard_denied' };
  return { ok: true, to: match.to };
}
