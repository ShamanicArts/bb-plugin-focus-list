import { describe, expect, it } from "vitest";
import type { ProjectThreadItem } from "../model/project-thread-groups.js";
import type { SidebarThread } from "../model/sidebar-thread.js";
import { DAY_MS, MIN_FADE_OPACITY, fadeOpacity, foldIdleItems, isStickyThread, threadActivityAt } from "./decay.js";

const NOW = Date.UTC(2026, 9, 16, 12);

function thread(id: string, idleDays: number, patch: Partial<SidebarThread> = {}): SidebarThread {
  const at = NOW - idleDays * DAY_MS;
  return {
    id, updatedAt: at, lastReadAt: at, latestAttentionAt: at, isPinned: false, isUnread: false,
    hasPendingInteraction: false, queuedWork: "none", indicator: "none", ...patch,
  } as SidebarThread;
}
const item = (t: SidebarThread, children: SidebarThread[] = []): ProjectThreadItem => ({
  kind: "thread",
  node: { thread: t, children: children.map((child) => item(child)) },
} as unknown as ProjectThreadItem);
const ids = (items: readonly ProjectThreadItem[]) => items.map((entry) => (entry.kind === "thread" ? entry.node.thread.id : entry.kind));

describe("focus decay", () => {
  it("uses the latest of agent updates, reads and attention", () => {
    expect(threadActivityAt(thread("a", 10, { lastReadAt: NOW - DAY_MS }))).toBe(NOW - DAY_MS);
    expect(threadActivityAt(thread("a", 10, { lastReadAt: null }))).toBe(NOW - 10 * DAY_MS);
  });

  it("keeps selected, pinned, unread, waiting, queued and busy threads in view", () => {
    for (const patch of [{ isPinned: true }, { isUnread: true }, { hasPendingInteraction: true }, { queuedWork: "waiting" }, { indicator: "runtime" }] as const) {
      expect(isStickyThread(thread("a", 30, patch as Partial<SidebarThread>), undefined)).toBe(true);
    }
    expect(isStickyThread(thread("a", 30), "a")).toBe(true);
    expect(isStickyThread(thread("a", 30), "b")).toBe(false);
  });

  it("folds idle root items in order, keeping items with any recent or sticky thread", () => {
    const items = [
      item(thread("new", 0.5)),
      item(thread("old", 9)),
      item(thread("old-parent", 9), [thread("recent-child", 1)]),
      item(thread("old-pinned", 30, { isPinned: true })),
      item(thread("older", 20), [thread("older-child", 20)]),
    ];
    const result = foldIdleItems(items, { now: NOW, foldDays: 3, selectedThreadId: undefined });
    expect(ids(result.visible)).toEqual(["new", "old-parent", "old-pinned"]);
    expect(ids(result.folded)).toEqual(["old", "older"]);
    expect(result.foldedThreadCount).toBe(3);
    expect(ids(foldIdleItems(items, { now: NOW, foldDays: 3, selectedThreadId: "old" }).visible)).toContain("old");
    expect(foldIdleItems(items, { now: NOW, foldDays: 0, selectedThreadId: undefined }).folded).toHaveLength(0);
  });

  it("fades after a day of idleness down to the floor at the fade horizon", () => {
    expect(fadeOpacity(NOW - 0.5 * DAY_MS, NOW, 14)).toBe(1);
    const midway = fadeOpacity(NOW - 7 * DAY_MS, NOW, 14);
    expect(midway).toBeLessThan(1);
    expect(midway).toBeGreaterThan(MIN_FADE_OPACITY);
    expect(fadeOpacity(NOW - 14 * DAY_MS, NOW, 14)).toBe(MIN_FADE_OPACITY);
    expect(fadeOpacity(NOW - 90 * DAY_MS, NOW, 14)).toBe(MIN_FADE_OPACITY);
    expect(fadeOpacity(NOW - 90 * DAY_MS, NOW, 0)).toBe(1);
    expect(fadeOpacity(null, NOW, 14)).toBe(1);
  });
});
