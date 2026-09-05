import { contextBridge, ipcRenderer } from 'electron'

const api = {
  saveExport: (req: { defaultName: string; mime: string; base64?: string; text?: string }) =>
    ipcRenderer.invoke('export:save', req),
  copyImage: (base64: string): Promise<boolean> => ipcRenderer.invoke('clipboard:image', base64),
  getInfo: (): Promise<{ name: string; version: string }> => ipcRenderer.invoke('app:info')
}

contextBridge.exposeInMainWorld('forge', api)
