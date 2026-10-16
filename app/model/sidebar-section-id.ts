export type SidebarSectionId =
  | "pinned"
  | "threads"
  | "parked"
  | `project:${string}`
  | `section:${string}`
  | `machine:${string}`;
export type CollapsibleSidebarSectionId = "pinned" | "threads" | "parked";
export type BuiltInContentSectionId = "pinned" | "threads";
