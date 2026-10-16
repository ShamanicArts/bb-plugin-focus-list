# Focus List

A fork of BB's built-in sidebar thread list that keeps what you're working on in focus, without archiving anything:

- **Idle projects fade.** A project header starts fading after a day without activity and reaches its faintest after 14 days (configurable). Hover brings it back; the project you have open never fades.
- **Older threads fold away.** Inside each project, threads idle for 3 days (configurable) fold into **Show N older threads**. Open, pinned, unread, running, queued and waiting threads always stay visible.
- **Parked area.** Drag faded projects below the **Parked** divider. Collapse it and they all tuck behind one row — still there, not archived, and an easy list to audit for archiving.

Activity means an agent updating a thread, you reading it, or it asking for you.

Everything else is BB's list unchanged: pinned threads, custom sections, project/machine/chronological organization, nesting, worktree grouping, drag to reorder, keyboard jump shortcuts and status glyphs. On first run it imports your existing layout from BB's thread list once.

## Use

Install, then choose **Focus list** under **Settings → Appearance → Sidebar** if it isn't active. Focus features apply when the list is organized **by project**. Tune them under the list's **Organize → Focus** menu or the CLI:

```sh
bb focus-list prefs set focusFoldDays 7    # 0 turns folding off
bb focus-list prefs set focusFadeDays 30   # 0 turns fading off
```

Switch back to BB's own list any time in the same Settings menu.

## Development

```sh
npm install
npm test
npx tsc --noEmit
bb plugin build
bb plugin install . --yes
```

The list source is forked from BB's bundled `thread-list` plugin (MIT); focus additions live in `app/focus/` plus small hooks in `ProjectList.tsx`, `ProjectRow.tsx`, `TopLevelSidebarSection.tsx` and the section-order model.

## License

MIT — see [LICENSE](LICENSE).
