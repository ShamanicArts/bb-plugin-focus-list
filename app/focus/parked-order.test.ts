import { describe, expect, it } from "vitest";
import { normalizeSidebarSectionOrder } from "../model/sidebar-section-order.js";

const base = { legacyEntityAnchor: "projects" as const, hasPinnedSection: true, hasParkedSection: true };

describe("Parked divider in the project order", () => {
  it("appends the divider at the end of an existing layout", () => {
    expect(
      normalizeSidebarSectionOrder({ ...base, storedOrder: ["pinned", "project:a", "project:b", "threads"], entitySectionIds: ["project:a", "project:b"] }),
    ).toEqual(["pinned", "project:a", "project:b", "threads", "parked"]);
  });

  it("keeps parked projects parked and puts new projects above the divider", () => {
    expect(
      normalizeSidebarSectionOrder({
        ...base,
        storedOrder: ["pinned", "project:a", "threads", "parked", "project:old"],
        entitySectionIds: ["project:a", "project:old", "project:new"],
      }),
    ).toEqual(["pinned", "project:a", "project:new", "threads", "parked", "project:old"]);
  });

  it("puts a new project above the divider even when every other project is parked", () => {
    expect(
      normalizeSidebarSectionOrder({
        ...base,
        storedOrder: ["pinned", "parked", "project:old"],
        entitySectionIds: ["project:old", "project:new"],
        hasThreadsSection: false,
      }),
    ).toEqual(["pinned", "project:new", "parked", "project:old"]);
  });

  it("leaves other organization modes without a divider", () => {
    expect(
      normalizeSidebarSectionOrder({ ...base, hasParkedSection: false, storedOrder: ["pinned", "parked", "project:a"], entitySectionIds: ["project:a"] }),
    ).toEqual(["pinned", "project:a", "threads"]);
  });
});
