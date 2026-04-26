"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  startSubmission: (data) => electron.ipcRenderer.send("start-submission", data),
  onSubmissionProgress: (callback) => electron.ipcRenderer.on("submission-progress", (_event, value) => callback(value)),
  cancelSubmission: () => electron.ipcRenderer.send("cancel-submission"),
  on: (channel, callback) => {
    electron.ipcRenderer.on(channel, (_, data) => callback(data));
  }
});
