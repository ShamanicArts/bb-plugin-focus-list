import { memo } from "react";
import { SortableSidebarSection } from "../list/BuiltInSidebarSection.js";
import type { ConsumeDragClickSuppression } from "../ui/use-drag-click-suppression.js";

/**
 * The divider that starts the Parked area in project mode. Every top-level
 * group ordered after it is parked; collapsing it hides them all behind one row.
 */
export const ParkedDivider = memo(function ParkedDivider({
  count,
  disabled,
  isCollapsed,
  onToggleCollapsed,
  consumeClickSuppression,
}: {
  count: number;
  disabled: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  consumeClickSuppression?: ConsumeDragClickSuppression;
}) {
  return (
    <div data-focus-parked-divider="" className="mt-2 border-t border-sidebar-border/60 pt-1">
      <SortableSidebarSection
        id="parked"
        label="Parked"
        disabled={disabled}
        stickyHeader={false}
        status={
          <span className="pr-2 text-xs tabular-nums text-subtle-foreground" aria-label={`${count} parked`}>
            {count}
          </span>
        }
        collapseControl={{ isCollapsed, onToggleCollapsed }}
        consumeClickSuppression={consumeClickSuppression}
      >
        {count === 0 ? (
          <p className="px-2 pb-1 text-xs text-subtle-foreground">
            Drag projects below this line to park them. They stay here, out of the way, until you drag them back.
          </p>
        ) : null}
      </SortableSidebarSection>
    </div>
  );
});
