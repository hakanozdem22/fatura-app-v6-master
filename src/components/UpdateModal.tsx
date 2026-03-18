import React, { useEffect, useState } from 'react';

const UpdateModal: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [percent, setPercent] = useState(0);
    const [isDownloaded, setIsDownloaded] = useState(false);

    useEffect(() => {
        const api = window.electronAPI;
        if (!api) return; // Electron dışında (tarayıcıda) çalışıyorsak erken çık

        api.onUpdateMessage((msg: string) => {
            setMessage(msg);
            // Mesaj "Güncellemeler kontrol ediliyor..." dışındaysa modalı göster
            if (msg.includes('mevcut') || msg.includes('indiriliyor') || msg.includes('Hata')) {
                setIsVisible(true);
            }
        });

        api.onDownloadProgress((progress: { percent: number }) => {
            setIsVisible(true);
            setPercent(Math.round(progress.percent || 0));
        });

        api.onUpdateDownloaded(() => {
            setIsDownloaded(true);
            setMessage('Güncelleme indirildi. Uygulama yeniden başlatılıyor...');
        });
    }, []);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                        <span className="material-symbols-outlined text-primary text-3xl animate-pulse">
                            system_update
                        </span>
                    </div>

                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                        Uygulama Güncelleniyor
                    </h2>

                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
                        {message || 'Yeni sürüm hazırlanıyor...'}
                    </p>

                    {!isDownloaded && percent > 0 && (
                        <div className="w-full mb-2">
                            <div className="flex justify-between text-xs font-medium text-slate-400 mb-2">
                                <span>İlerleme</span>
                                <span>%{percent}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-300 ease-out"
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {isDownloaded && (
                        <div className="flex items-center gap-2 text-emerald-500 font-medium">
                            <span className="material-symbols-outlined">check_circle</span>
                            <span>Hazır!</span>
                        </div>
                    )}

                    <p className="mt-6 text-[11px] text-slate-400 italic">
                        Lütfen uygulama güncellenirken pencereyi kapatmayın.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpdateModal;
