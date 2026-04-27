"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // ── Legacy: Playwright-based submission ────────────────────────────────
  startSubmission: (data) => electron.ipcRenderer.send("start-submission", data),
  onSubmissionProgress: (callback) => electron.ipcRenderer.on("submission-progress", (_event, value) => callback(value)),
  cancelSubmission: () => electron.ipcRenderer.send("cancel-submission"),
  // ── WebContentsView: Embedded venue portal ─────────────────────────────
  /** Embed the venue portal URL inside the app window at the given DOM bounds */
  embedWebContents: (url, bounds) => electron.ipcRenderer.send("embed-webcontents", { url, bounds }),
  /** Remove the embedded view */
  destroyWebContents: () => electron.ipcRenderer.send("destroy-webcontents"),
  /** Resize the embedded view (call after layout changes) */
  resizeWebContents: (bounds) => electron.ipcRenderer.send("resize-webcontents", bounds),
  /** Listen for load status events from the embedded view */
  onWebContentsStatus: (callback) => electron.ipcRenderer.on("webcontents-status", (_event, value) => callback(value)),
  // ── Generic channel listener ───────────────────────────────────────────
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_, data) => callback(data));
  }
});
