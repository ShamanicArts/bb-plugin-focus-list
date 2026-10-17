---
name: focus-list
description: "Inspect or change the Focus list sidebar: focus decay (fold and fade days), the Parked area, organization mode, sort, section order, hidden and collapsed groups."
---

# Focus list preferences

The Focus list plugin (a fork of BB's thread list) owns the sidebar's layout state. Read it with
`bb focus-list prefs list --json`; keys are `focusFoldDays`, `focusFadeDays`, `showProviderIcons`, `threadLifecycles`, `organizationMode`,
`environmentGrouping`, `chronologicalSort`, `manualThreadOrder`, `sortDirection`, `sectionOrder`,
`manualSectionOrder`, `machineSectionOrder`, `hiddenGroups` (including the
built-in `threads` group),
`collapsedSections`, `collapsedProjects`, `collapsedThreads`,
`collapsedEnvironments`, `collapsedThreadSections`, and `collapsedMachines`.

```sh
bb focus-list prefs list [--json]
bb focus-list prefs get <key> [--json]
bb focus-list prefs set <key> <value> [--json]
bb focus-list prefs reset <key> [--json]
```

`set` takes JSON; a bare word is read as a string, so
`bb focus-list prefs set organizationMode machine` and
`bb focus-list prefs set manualSectionOrder '["pinned","sections","threads"]'`
both work. A value the key's schema rejects fails with
`invalid_preference_value` and leaves the stored value alone. Every open
window applies a change immediately. Sections themselves and a thread's
section are bb core state: use `bb thread section` and `bb thread update`.

On first load the plugin copies any non-default `sidebar.*` values from
`bb settings ui` once; after that the two are independent.

The header's Filter menu selects Active, Archived, or both; at least one must
remain selected. `bb focus-list prefs set threadLifecycles '["archived"]'`
shows archived threads, and `'["active","archived"]'` shows both. The default
is `'["active"]'`. Archived results load in pages; use Show more at the end
of the list. The same preference is available through `setPreference` RPC.

Organize → Rows → Provider icons toggles the icon before each thread title.
`showProviderIcons` defaults to `false`; use
`bb focus-list prefs set showProviderIcons true` to show them. Unknown
provider ids have no icon.

## Manual order

`chronologicalSort` `manual` (Sort → "Manual (drag to arrange)") orders threads by
`manualThreadOrder`, a list of thread ids, and nothing else: activity, unread state
and running work never move a thread. While dragging, a drop line shows above or
below the row under the pointer and the drop lands exactly there; holding still over
the middle of a row for about 0.6s switches to nesting (the row highlights, the line
disappears). Threads
missing from the list (new ones) sit above the listed ones, newest first, until
dragged. Focus decay still folds idle threads away.

## Focus decay

Activity for a thread is the latest of an agent updating it, the user reading
it, and it needing attention; a project's activity is its most active thread.

- `focusFoldDays` (default `3`, `0` = off): in project mode, a project's root
  threads idle this long fold into a "Show N older threads" row. Open, pinned,
  unread, waiting, queued and busy threads never fold; a thread tree stays
  visible while any thread in it is recent.
- `focusFadeDays` (default `14`, `0` = off): a project header fades after a day
  of idleness, reaching its faintest at this many days. Hover restores it; the
  project holding the open thread never fades.
- Parked: project mode's `sectionOrder` holds a `parked` divider. Every group
  ordered after it is parked; `collapsedSections` containing `parked` hides
  them behind one "Parked" row. New projects are inserted above the divider.

Organize → Focus changes both day settings (click to cycle). On first load the
plugin imports BB's bundled thread list layout once (`bb.thread-list.preferences.v1`).
