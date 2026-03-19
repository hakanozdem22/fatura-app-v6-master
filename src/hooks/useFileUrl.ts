import { useState, useEffect } from 'react';
import { getPresignedUrlFromR2 } from '../lib/r2Storage';

/**
 * Resolves an r2:// URL into a short-lived presigned URL.
 * Passes through standard http/https URLs unchanged.
 */
export function useFileUrl(originalUrl?: string) {
    const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
    const [isLoadingUrl, setIsLoadingUrl] = useState<boolean>(false);

    useEffect(() => {
        if (!originalUrl) return;

        if (originalUrl.startsWith('r2://')) {
            setIsLoadingUrl(true);
            let isActive = true;
            getPresignedUrlFromR2(originalUrl.replace('r2://', ''))
                .then(url => {
                    if (isActive) {
                        setPresignedUrl(url);
                        setIsLoadingUrl(false);
                    }
                })
                .catch(err => {
                    if (isActive) {
                        console.error("Link çözme hatası (R2):", err);
                        setPresignedUrl(null);
                        setIsLoadingUrl(false);
                    }
                });
            return () => { isActive = false; };
        }
    }, [originalUrl]);

    const resolvedUrl = (originalUrl && originalUrl.startsWith('r2://')) ? presignedUrl : (originalUrl || null);

    return { resolvedUrl, isLoadingUrl };
}

/**
 * Helper to open a file in a new tab, unwrapping r2:// if needed.
 */
export const executeViewFile = async (fileUrl?: string) => {
    if (!fileUrl) return;
    if (fileUrl.startsWith('r2://')) {
        try {
            const url = await getPresignedUrlFromR2(fileUrl.replace('r2://', ''));
            window.open(url, '_blank');
        } catch (e) {
            console.error("Dosya açılırken hata:", e);
            alert("Güvenli arşive erişilirken bir hata oluştu.");
        }
    } else {
        window.open(fileUrl, '_blank');
    }
};
