import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('electronAPI', {
  startSubmission: (data: any) => ipcRenderer.send('start-submission', data),
  onSubmissionProgress: (callback: (data: any) => void) => ipcRenderer.on('submission-progress', (_event, value) => callback(value)),
  cancelSubmission: () => ipcRenderer.send('cancel-submission'),
  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  }
})
