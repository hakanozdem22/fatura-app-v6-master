export interface DriveUploadResult {
    success: boolean;
    fileId?: string;
    webViewLink?: string;
    error?: string;
}

export const googleDriveService = {
    /**
     * Dosyayı Google Drive'a yükler (Electron Main Process üzerinden)
     */
    async uploadFile(file: Blob, fileName: string, folderId?: string): Promise<DriveUploadResult> {
        try {
            // Blob'u ArrayBuffer'a çevir (Electron IPC kopyalamayı optimize eder)
            const arrayBuffer = await file.arrayBuffer();

            // Electron API üzerinden yükleme isteği gönder
            const result = await (window as any).electronAPI.uploadToDrive({
                buffer: arrayBuffer,
                fileName,
                folderId: folderId || import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID
            });

            return result;
        } catch (error: any) {
            console.error('Google Drive Upload Service Error:', error);
            return {
                success: false,
                error: error.message || 'Bilinmeyen bir hata oluştu.'
            };
        }
    }
};
