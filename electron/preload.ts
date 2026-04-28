import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  startSubmission: (data: any) => ipcRenderer.send('start-submission', data),
  onSubmissionProgress: (callback: (data: any) => void) =>
    ipcRenderer.on('submission-progress', (_event, value) => callback(value)),
  cancelSubmission: () => ipcRenderer.send('cancel-submission'),

  embedWebContents: (url: string, bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send('embed-webcontents', { url, bounds }),
  destroyWebContents: () => ipcRenderer.send('destroy-webcontents'),
  resizeWebContents: (bounds: { x: number; y: number; width: number; height: number }) =>
    ipcRenderer.send('resize-webcontents', bounds),
  onWebContentsStatus: (callback: (data: { status: string; url?: string; error?: string }) => void) =>
    ipcRenderer.on('webcontents-status', (_event, value) => callback(value)),
  removeWebContentsStatusListener: () =>
    ipcRenderer.removeAllListeners('webcontents-status'),

  pickLocalPdf: () => ipcRenderer.invoke('pick-local-pdf'),
  attachFileToPortalInput: (webContentsId: number, filePath: string) =>
    ipcRenderer.invoke('attach-file-to-portal-input', { webContentsId, filePath }),

  on: (channel: string, callback: Function) => {
    ipcRenderer.on(channel, (_, data) => callback(data))
  },
})
