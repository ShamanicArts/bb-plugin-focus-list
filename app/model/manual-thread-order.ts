// The user's own thread order. Activity never moves a thread: only a drag does.
// Threads missing from the order (new ones) sit above the ordered ones, newest first,
// until they are dragged; old threads still fold away through focus decay.

export function buildManualRank(order: readonly string[]): Map<string, number> {
  return new Map(order.map((threadId, index) => [threadId, index]));
}

export function reorderManualThreadOrder({
  order,
  siblingIds,
  activeId,
  targetId,
  placement,
}: {
  order: readonly string[];
  siblingIds: readonly string[];
  activeId: string;
  targetId: string;
  placement: "before" | "after";
}): string[] {
  if (activeId === targetId || !siblingIds.includes(activeId)) return [...order];
  const rest = siblingIds.filter((id) => id !== activeId);
  const targetIndex = rest.indexOf(targetId);
  if (targetIndex === -1) return [...order];
  const moved = [...rest];
  moved.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, activeId);
  const siblings = new Set(moved);
  // Sibling ranks only matter relative to each other, so the moved group goes first.
  return [...moved, ...order.filter((threadId) => !siblings.has(threadId))];
}
