import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    setFullScreen: (value: boolean) => ipcRenderer.send('set-fullscreen', value),
    setTitleBarTheme: (isDark: boolean) => ipcRenderer.send('set-titlebar-theme', isDark),
    uploadToDrive: (data: { buffer: Buffer, fileName: string, folderId: string }) => ipcRenderer.invoke('upload-to-drive', data),
    onUpdateMessage: (callback: (message: string) => void) => ipcRenderer.on('update-message', (_event, message) => callback(message)),
    onDownloadProgress: (callback: (progress: any) => void) => ipcRenderer.on('download-progress', (_event, progress) => callback(progress)),
    onUpdateDownloaded: (callback: () => void) => ipcRenderer.on('update-downloaded', () => callback()),
});
