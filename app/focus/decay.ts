import {
  getProjectThreadItemDescendants,
  type ProjectThreadItem,
} from "../model/project-thread-groups.js";
import type { SidebarThread } from "../model/sidebar-thread.js";

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Most faded a project header gets; still readable, clearly out of focus. */
export const MIN_FADE_OPACITY = 0.4;
/** Fading starts once a project has been idle this long. */
const FADE_GRACE_MS = DAY_MS;

/** Last moment anyone touched the thread: an agent updating it, you reading it, or it asking for you. */
export function threadActivityAt(thread: SidebarThread): number {
  return Math.max(thread.updatedAt, thread.lastReadAt ?? 0, thread.latestAttentionAt);
}

/** Threads that always stay in view, however old. */
export function isStickyThread(thread: SidebarThread, selectedThreadId: string | undefined): boolean {
  return (
    thread.id === selectedThreadId ||
    thread.isPinned ||
    thread.isUnread ||
    thread.hasPendingInteraction ||
    thread.queuedWork !== "none" ||
    thread.indicator !== "none"
  );
}

export function latestActivityAt(threads: readonly SidebarThread[]): number | null {
  let latest: number | null = null;
  for (const thread of threads) {
    const at = threadActivityAt(thread);
    if (latest === null || at > latest) latest = at;
  }
  return latest;
}

/**
 * Opacity for something idle since `activityAt`: fully opaque for the first
 * day, then easing down to MIN_FADE_OPACITY at `fadeDays`. 0 days disables it.
 */
export function fadeOpacity(activityAt: number | null, now: number, fadeDays: number): number {
  if (fadeDays <= 0 || activityAt === null) return 1;
  const span = fadeDays * DAY_MS - FADE_GRACE_MS;
  const idle = now - activityAt - FADE_GRACE_MS;
  if (idle <= 0) return 1;
  if (span <= 0 || idle >= span) return MIN_FADE_OPACITY;
  const progress = idle / span;
  return 1 - (1 - MIN_FADE_OPACITY) * Math.sqrt(progress);
}

export interface FoldedItems {
  visible: readonly ProjectThreadItem[];
  folded: readonly ProjectThreadItem[];
  /** Threads (including children) inside the folded items. */
  foldedThreadCount: number;
}

/**
 * Splits a project's root items into recent and folded ones. A root item
 * (thread tree, worktree group or section) stays visible while any thread
 * inside it is recent or sticky. Order is preserved.
 */
export function foldIdleItems(
  items: readonly ProjectThreadItem[],
  options: { now: number; foldDays: number; selectedThreadId: string | undefined },
): FoldedItems {
  if (options.foldDays <= 0) return { visible: items, folded: [], foldedThreadCount: 0 };
  const cutoff = options.now - options.foldDays * DAY_MS;
  const visible: ProjectThreadItem[] = [];
  const folded: ProjectThreadItem[] = [];
  let foldedThreadCount = 0;
  for (const item of items) {
    const threads = getProjectThreadItemDescendants([item]);
    const keep = threads.length === 0 || threads.some(
      (thread) => isStickyThread(thread, options.selectedThreadId) || threadActivityAt(thread) >= cutoff,
    );
    if (keep) {
      visible.push(item);
    } else {
      folded.push(item);
      foldedThreadCount += threads.length;
    }
  }
  return folded.length === 0 ? { visible: items, folded, foldedThreadCount } : { visible, folded, foldedThreadCount };
}
