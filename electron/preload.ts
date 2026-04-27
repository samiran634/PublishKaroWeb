import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Legacy: Playwright-based submission ────────────────────────────────
  startSubmission: (data: any) => ipcRenderer.send('start-submission', data),
  onSubmissionProgress: (callback: (data: any) => void) =>
    ipcRenderer.on('submission-progress', (_event, value) => callback(value)),
  cancelSubmission: () => ipcRenderer.send('cancel-submission'),

  // ── WebContentsView: Embedded venue portal ─────────────────────────────
  /** Embed the venue portal URL inside the app window at the given DOM bounds */
  embedWebContents: (url: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send('embed-webcontents', { url, bounds }),

  /** Remove the embedded view */
  destroyWebContents: () => ipcRenderer.send('destroy-webcontents'),

  /** Resize the embedded view (call after layout changes) */
  resizeWebContents: (bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send('resize-webcontents', bounds),

  /** Listen for load status events from the embedded view */
  onWebContentsStatus: (callback: (data: { status: string; url?: string; error?: string }) => void) =>
    ipcRenderer.on('webcontents-status', (_event, value) => callback(value)),

  // ── Generic channel listener ───────────────────────────────────────────
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  },
})
