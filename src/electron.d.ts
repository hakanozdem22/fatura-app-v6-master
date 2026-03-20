export interface IElectronAPI {
    setFullScreen: (value: boolean) => void;
    setTitleBarTheme: (isDark: boolean) => void;
    uploadToDrive: (data: { buffer: Uint8Array, fileName: string, folderId: string }) => Promise<unknown>;
    onUpdateMessage: (callback: (message: string) => void) => void;
    onDownloadProgress: (callback: (progress: { percent: number }) => void) => void;
    onUpdateDownloaded: (callback: () => void) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
