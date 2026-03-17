import { useAuth } from '../context/AuthContext';

export default function PendingApprovalScreen() {
    const { signOut, refreshProfile } = useAuth();

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mx-auto flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-[32px]">hourglass_empty</span>
                </div>

                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Onay Bekliyor
                </h1>

                <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                    Hesabınız başarıyla oluşturuldu ancak henüz bir yönetici tarafından onaylanmadı.
                    Müdürünüz hesabınızı onayladığında sisteme erişebileceksiniz.
                </p>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={refreshProfile}
                        className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                        Durumu Kontrol Et
                    </button>

                    <button
                        onClick={signOut}
                        className="w-full hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                        Çıkış Yap
                    </button>
                </div>
            </div>
        </div>
    );
}
