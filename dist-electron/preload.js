"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  startSubmission: (data) => electron.ipcRenderer.send("start-submission", data),
  onSubmissionProgress: (callback) => electron.ipcRenderer.on("submission-progress", (_event, value) => callback(value)),
  cancelSubmission: () => electron.ipcRenderer.send("cancel-submission"),
  embedWebContents: (url, bounds) => electron.ipcRenderer.send("embed-webcontents", { url, bounds }),
  destroyWebContents: () => electron.ipcRenderer.send("destroy-webcontents"),
  resizeWebContents: (bounds) => electron.ipcRenderer.send("resize-webcontents", bounds),
  onWebContentsStatus: (callback) => electron.ipcRenderer.on("webcontents-status", (_event, value) => callback(value)),
  removeWebContentsStatusListener: () => electron.ipcRenderer.removeAllListeners("webcontents-status"),
  pickLocalPdf: () => electron.ipcRenderer.invoke("pick-local-pdf"),
  attachFileToPortalInput: (webContentsId, filePath) => electron.ipcRenderer.invoke("attach-file-to-portal-input", { webContentsId, filePath }),
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_, data) => callback(data));
  }
});
