import { useAtom, useAtomValue } from "jotai";
import { useCallback } from "react";
import { reorderManualThreadOrder } from "../model/manual-thread-order.js";
import {
  sidebarChronologicalSortAtom,
  sidebarManualThreadOrderAtom,
} from "../preferences/atoms.js";

type ManualReorder = (request: {
  activeId: string;
  targetId: string;
  placement: "before" | "after";
  siblingIds: string[];
}) => void;

/** The drop handler for manual order, or undefined when the list sorts some other way. */
export function useManualThreadReorder(): ManualReorder | undefined {
  const sort = useAtomValue(sidebarChronologicalSortAtom);
  const [order, setOrder] = useAtom(sidebarManualThreadOrderAtom);
  const reorder = useCallback<ManualReorder>(
    (request) => setOrder(reorderManualThreadOrder({ order, ...request })),
    [order, setOrder],
  );
  return sort === "manual" ? reorder : undefined;
}
