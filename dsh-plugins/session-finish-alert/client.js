/**
 * Browser half of the session-finish-alert bundle.
 *
 * Watches the Client Session status source that `ui-session` maintains for
 * every Session the browser knows about, and reports the running -> idle
 * transition of a Session the user is not watching as three independent
 * alerts: an in-app toast with an Open action, a short chime, and a desktop
 * notification while the window is in the background.
 *
 * The source is fed by the forwarded `api-session/status` Host event plus the
 * Session list baseline, so a Session that was already running when the page
 * loaded still reports its finish. Nothing is written back to the Harness:
 * this plugin only reads state and shows UI.
 */
window.__ModuleLoader__.load({
  id: '@local/session-finish-alert',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'sessionFinishAlert'
    const STRINGS = {
      finished: 'Session finished',
      open: 'Open session',
      dismiss: 'Dismiss',
      untitled: 'Untitled session',
    }

    // Tunable behavior for this first version. Keep the defaults quiet enough
    // for a page the user is actively working in.
    const OPTIONS = {
      // Play a short two-tone chime when a desktop notification is not shown.
      chime: true,
      // Show a browser/desktop notification while the window is in the background.
      desktopNotifications: true,
      // Child sessions of a subagent or team run finish constantly; the parent
      // Session's finish is the event worth an alert.
      ignoreSubagentSessions: true,
      // How long one toast stays before it fades itself out.
      toastDurationMs: 6000,
      // At most this many toasts stack; older ones drop off the top.
      maxToasts: 4,
    }

    // ── a tiny stored observable for the toast stack ─────────────────────────
    // The renderer turns `hooks: { alerts }` into a `useAlerts(selector)` prop,
    // so the source only needs stable getSnapshot/subscribe members.
    function createAlertStore() {
      let items = []
      const listeners = new Set()
      const timers = new Map()
      let seq = 0

      const publish = () => {
        for (const listener of [...listeners]) {
          try { listener() } catch { /* one bad subscriber must not stop the rest */ }
        }
      }

      const remove = (alertId) => {
        const next = items.filter(item => item.alertId !== alertId)
        if (next.length === items.length) return
        items = next
        const timer = timers.get(alertId)
        if (timer !== undefined) {
          clearTimeout(timer)
          timers.delete(alertId)
        }
        publish()
      }

      return {
        source: {
          getSnapshot: () => items,
          subscribe: (listener) => {
            listeners.add(listener)
            return () => { listeners.delete(listener) }
          },
        },
        push(sessionId, title) {
          seq += 1
          const alertId = `session-finish-${String(seq)}`
          items = [...items, { alertId, sessionId, title }].slice(-OPTIONS.maxToasts)
          publish()
          timers.set(alertId, setTimeout(() => remove(alertId), OPTIONS.toastDurationMs))
        },
        dismiss: remove,
        dispose() {
          for (const timer of timers.values()) clearTimeout(timer)
          timers.clear()
          listeners.clear()
        },
      }
    }

    // ── the alert stack ──────────────────────────────────────────────────────
    const styles = {
      stack: {
        position: 'fixed',
        right: '16px',
        bottom: '16px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px',
        width: 'min(380px, calc(100vw - 32px))',
        // The overlay layer is click-through; each toast opts back in.
        pointerEvents: 'none',
      },
      toast: {
        pointerEvents: 'auto',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '10px',
        width: '100%',
        padding: '12px 12px 12px 14px',
        background: 'var(--dsw-alias-bg-overlay)',
        color: 'var(--dsw-alias-label-primary)',
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 'var(--dsw-radius-lg)',
        boxShadow: 'var(--dsw-elevation-prominent)',
        fontSize: '13px',
        lineHeight: '18px',
      },
      icon: {
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        marginTop: '1px',
        color: 'var(--dsw-alias-state-success-primary)',
      },
      body: {
        minWidth: 0,
        flex: '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
      },
      heading: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--dsw-alias-label-secondary)',
      },
      link: {
        minWidth: 0,
        padding: 0,
        border: 0,
        background: 'transparent',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--dsw-alias-label-primary)',
        font: 'inherit',
        fontSize: '13px',
        fontWeight: 500,
        lineHeight: '18px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      },
      close: {
        flex: 'none',
        width: '20px',
        height: '20px',
        padding: 0,
        border: 0,
        borderRadius: '6px',
        background: 'transparent',
        color: 'var(--dsw-alias-label-secondary)',
        font: 'inherit',
        fontSize: '16px',
        lineHeight: '18px',
        cursor: 'pointer',
      },
    }

    function CheckIcon() {
      return h(
        'svg',
        { viewBox: '0 0 16 16', width: 16, height: 16, 'aria-hidden': true, style: { display: 'block' } },
        h('circle', {
          cx: 8, cy: 8, r: 7, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5,
        }),
        h('path', {
          d: 'M4.6 8.2l2.2 2.2 4.6-4.9',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      )
    }

    function AlertStack({ useAlerts, dismiss, open, t }) {
      const alerts = useAlerts(value => value)
      if (alerts === undefined || alerts.length === 0) return null
      return h(
        'div',
        { style: styles.stack, role: 'region', 'aria-live': 'polite', 'aria-label': t('finished') },
        alerts.map(alert => h(
          'div',
          { key: alert.alertId, style: styles.toast, role: 'status' },
          h('span', { style: styles.icon }, h(CheckIcon)),
          h(
            'div',
            { style: styles.body },
            h('div', { style: styles.heading }, t('finished')),
            h(
              'button',
              {
                type: 'button',
                style: styles.link,
                title: t('open'),
                onClick: () => {
                  dismiss(alert.alertId)
                  open(alert.sessionId)
                },
              },
              alert.title,
            ),
          ),
          h(
            'button',
            {
              type: 'button',
              style: styles.close,
              'aria-label': t('dismiss'),
              title: t('dismiss'),
              onClick: () => { dismiss(alert.alertId) },
            },
            '×',
          ),
        )),
      )
    }

    // ── sound and desktop notification channels ──────────────────────────────
    let audioContext

    function ensureAudio() {
      if (typeof window === 'undefined') return undefined
      if (audioContext !== undefined) return audioContext
      const Ctor = window.AudioContext || window.webkitAudioContext
      if (typeof Ctor !== 'function') {
        audioContext = undefined
        return undefined
      }
      try {
        audioContext = new Ctor()
      } catch {
        audioContext = undefined
      }
      return audioContext
    }

    function playChime() {
      if (!OPTIONS.chime) return
      const audio = ensureAudio()
      if (audio === undefined) return
      const play = () => {
        try {
          const start = audio.currentTime + 0.01
          for (const note of [{ at: 0, frequency: 880 }, { at: 0.11, frequency: 1318.5 }]) {
            const oscillator = audio.createOscillator()
            const gain = audio.createGain()
            const from = start + note.at
            oscillator.type = 'sine'
            oscillator.frequency.value = note.frequency
            gain.gain.setValueAtTime(0, from)
            gain.gain.linearRampToValueAtTime(0.12, from + 0.012)
            gain.gain.exponentialRampToValueAtTime(0.0001, from + 0.16)
            oscillator.connect(gain)
            gain.connect(audio.destination)
            oscillator.start(from)
            oscillator.stop(from + 0.18)
          }
        } catch { /* audio is a courtesy, never a failure path */ }
      }
      if (audio.state === 'suspended') {
        void audio.resume().then(play).catch(() => {})
        return
      }
      play()
    }

    return {
      inject: ['slots', 'locale', 'sessions', 'uiSession', 'uiWorkspace', 'layout'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'en', STRINGS), 'session-finish-alert: strings')
        const t = ctx.locale.bind(NS)

        const store = createAlertStore()
        ctx.effect(() => () => store.dispose(), 'session-finish-alert: alert store')

        const openSession = (sessionId) => {
          try { ctx.uiWorkspace.openSession(sessionId) } catch { /* navigation is best effort */ }
        }

        const notifyDesktop = (title, sessionId) => {
          if (!OPTIONS.desktopNotifications) return false
          try {
            if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
            const notification = new Notification(t('finished'), {
              body: title,
              tag: `dsh-session-finished-${String(sessionId)}`,
            })
            notification.onclick = () => {
              try { window.focus() } catch { /* focus is best effort */ }
              openSession(sessionId)
              notification.close()
            }
            return true
          } catch {
            return false
          }
        }

        const announce = (sessionId) => {
          const row = ctx.sessions.list.getSnapshot().byId[sessionId]
          if (row !== undefined) {
            if (OPTIONS.ignoreSubagentSessions
              && (row.origin === 'subagent' || row.parentId !== undefined)) return
            if (row.blank === true) return
          }
          const title = row !== undefined && row.displayTitle !== undefined && row.displayTitle !== ''
            ? row.displayTitle
            : t('untitled')
          const mainView = row !== undefined && row.retainedBy !== undefined
            ? row.retainedBy.mainView ?? 0
            : 0
          const panelOpen = ctx.layout.panelInfo.getSnapshot().activePanelId !== null
          const visible = typeof document !== 'undefined' && document.visibilityState === 'visible'
          // The user is looking at this very conversation: no alert is needed.
          if (visible && !panelOpen && mainView > 0) return
          store.push(sessionId, title)
          if (visible) {
            playChime()
            return
          }
          // A desktop notification carries the operating system's own sound.
          if (!notifyDesktop(title, sessionId)) playChime()
        }

        // The Session status map covers the Session list baseline as well as
        // forwarded live status, so prime the running set from the first
        // snapshot and alert only on later running -> not-running transitions.
        const running = new Set()
        let primed = false
        const onStatus = (snapshot) => {
          const next = new Set()
          for (const [sessionId, status] of snapshot) {
            if (status !== undefined && status.running === true) next.add(sessionId)
          }
          if (primed) {
            for (const sessionId of running) {
              if (next.has(sessionId)) continue
              const status = snapshot.get(sessionId)
              // A row that left the catalog is a disposal, not a finished run.
              if (status === undefined || status.running !== false) continue
              announce(sessionId)
            }
          }
          running.clear()
          for (const sessionId of next) running.add(sessionId)
          primed = true
        }
        ctx.effect(() => {
          const source = ctx.uiSession.sessionStatus
          const dispose = source.subscribe(() => { onStatus(source.getSnapshot()) })
          onStatus(source.getSnapshot())
          return dispose
        }, 'session-finish-alert: session status')

        // Browsers only start audio and can only ask for notification
        // permission after a user gesture; prime both on the first one.
        let permissionRequested = false
        ctx.effect(() => {
          if (typeof window === 'undefined') return
          const prime = () => {
            const audio = ensureAudio()
            if (audio !== undefined && audio.state === 'suspended') void audio.resume().catch(() => {})
            if (permissionRequested) return
            permissionRequested = true
            if (!OPTIONS.desktopNotifications) return
            if (typeof Notification === 'undefined' || Notification.permission !== 'default') return
            try { void Notification.requestPermission() } catch { /* denied is fine */ }
          }
          window.addEventListener('pointerdown', prime, { capture: true, passive: true })
          window.addEventListener('keydown', prime, { capture: true })
          return () => {
            window.removeEventListener('pointerdown', prime, { capture: true })
            window.removeEventListener('keydown', prime, { capture: true })
            if (audioContext !== undefined) {
              try { void audioContext.close() } catch { /* already closed */ }
              audioContext = undefined
            }
          }
        }, 'session-finish-alert: gesture priming')

        ctx.slots.inject('shell.overlay', () => ctx.slots.register({
          name: 'shell.overlay',
          id: 'session-finish-alert',
          order: 50,
          locale: NS,
          inject: () => ({
            hooks: { alerts: store.source },
            dismiss: store.dismiss,
            open: openSession,
          }),
        }, AlertStack))
      },
    }
  },
})
