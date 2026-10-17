import { describe, expect, it } from "vitest";
import { getSidebarThreadComparator } from "./ProjectList.js";
import { reorderManualThreadOrder } from "../model/manual-thread-order.js";
import { makeSidebarThread } from "../model/fixtures.js";
import type { SidebarThread } from "../model/sidebar-thread.js";

function thread(id: string, createdAt: number, updatedAt: number, status: SidebarThread["status"] = "idle"): SidebarThread {
  return makeSidebarThread({
    id,
    projectId: "proj_1",
    title: id,
    titleFallback: id,
    lastReadAt: 0,
    latestAttentionAt: updatedAt,
    createdAt,
    updatedAt,
    status,
  });
}

const sorted = (threads: SidebarThread[], order: string[]) =>
  [...threads]
    .sort(getSidebarThreadComparator("manual", "default", null, order))
    .map((t) => t.id);

describe("manual thread order", () => {
  it("keeps the dragged order whatever the activity", () => {
    const threads = [
      thread("thr_moonshot", 1, 900, "active"),
      thread("thr_firstmate", 2, 10),
      thread("thr_touchwood", 3, 500),
    ];
    expect(sorted(threads, ["thr_firstmate", "thr_touchwood", "thr_moonshot"])).toEqual([
      "thr_firstmate",
      "thr_touchwood",
      "thr_moonshot",
    ]);
  });

  it("puts threads it has never seen above the ordered ones, newest first", () => {
    const threads = [thread("thr_a", 1, 1), thread("thr_new1", 5, 5), thread("thr_new2", 9, 9)];
    expect(sorted(threads, ["thr_a"])).toEqual(["thr_new2", "thr_new1", "thr_a"]);
  });

  it("drops a thread exactly where the drop line was", () => {
    expect(
      reorderManualThreadOrder({
        order: [],
        siblingIds: ["thr_a", "thr_b", "thr_c"],
        activeId: "thr_a",
        targetId: "thr_b",
        placement: "after",
      }),
    ).toEqual(["thr_b", "thr_a", "thr_c"]);
    const order = reorderManualThreadOrder({
      order: ["thr_x_other_project", "thr_b"],
      siblingIds: ["thr_a", "thr_b", "thr_c"],
      activeId: "thr_c",
      targetId: "thr_a",
      placement: "before",
    });
    expect(order).toEqual(["thr_c", "thr_a", "thr_b", "thr_x_other_project"]);
    expect(
      sorted([thread("thr_a", 1, 1), thread("thr_b", 2, 2), thread("thr_c", 3, 3)], order),
    ).toEqual(["thr_c", "thr_a", "thr_b"]);
  });
});
