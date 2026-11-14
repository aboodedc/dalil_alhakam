# Session finish alerts

Shows an alert when a DeepSeek Harness session stops running while you are not
watching it.

## What you get

- A toast at the bottom-right of the window with the session title. Clicking
  the title opens that session; the `×` dismisses one toast.
- A short two-tone chime while the window is visible.
- A desktop notification from the operating system while the window is in the
  background. Clicking it focuses Harness and opens the session.

## When it stays quiet

- The session you are currently looking at, with no Settings or Plugins panel
  open, because you can already see it finish.
- Sessions started by a subagent or team run. Their parent session still
  reports its own finish.
- Brand-new blank sessions.

## Limits

- The browser half only knows the sessions the page has learned about. A
  session that starts and finishes while the page is closed is not replayed;
  the next status baseline covers only sessions that are still running.
- Desktop notifications need permission. In a browser, the permission prompt
  appears after your first click or key press. Without permission the toast and
  chime still work.
- Sound needs one interaction with the page before the browser starts audio, so
  a finish that happens before your first click may be silent.

## Tuning

The behavior lives in the `OPTIONS` block at the top of `client.js`:
`chime`, `desktopNotifications`, `ignoreSubagentSessions`, `toastDurationMs`,
and `maxToasts`.
