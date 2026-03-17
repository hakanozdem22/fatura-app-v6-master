import { useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Loader2, UploadCloud, CheckCircle2, Moon, Sun, Trash2 } from 'lucide-react';
import { logAction } from '../lib/logger';
import { useTheme } from '../context/ThemeContext';

export default function SettingsScreen() {
    const { profile, user, refreshProfile } = useAuth();
    const { theme, toggleTheme } = useTheme();

    // Upload states
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [avatarUploadMessage, setAvatarUploadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [isUploadingStamp, setIsUploadingStamp] = useState<{ [key: string]: boolean }>({ approval: false, rejection: false });
    const [stampMessage, setStampMessage] = useState<{ type: 'success' | 'error', text: string, target: 'approval' | 'rejection' } | null>(null);
    const approvalStampInputRef = useRef<HTMLInputElement>(null);
    const rejectionStampInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 2 * 1024 * 1024) {
            setAvatarUploadMessage({ type: 'error', text: 'Dosya boyutu 2MB\'dan küçük olmalıdır.' });
            return;
        }

        setIsUploadingAvatar(true);
        setAvatarUploadMessage(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `uploads/avatars/${user.id}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('invoices-pdfs')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('invoices-pdfs')
                .getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('users')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Update Auth Metadata for consistency
            await supabase.auth.updateUser({
                data: { avatar_url: publicUrl }
            });

            if (refreshProfile) {
                await refreshProfile();
            }

            setAvatarUploadMessage({ type: 'success', text: 'Profil fotoğrafı güncellendi.' });
            await logAction(user?.email, 'Profil Güncelleme', 'Profil fotoğrafı yüklendi');
        } catch (error: unknown) {
            console.error('Profil fotoğrafı yükleme hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Yükleme sırasında hata oluştu.';
            setAvatarUploadMessage({ type: 'error', text: `Hata: ${errorMessage}` });
        } finally {
            setIsUploadingAvatar(false);
            if (avatarInputRef.current) avatarInputRef.current.value = '';
            setTimeout(() => setAvatarUploadMessage(null), 5000);
        }
    };

    const handleDeleteAvatar = async () => {
        if (!user || !profile?.avatar_url) return;

        setIsUploadingAvatar(true);
        setAvatarUploadMessage(null);

        try {
            const { error: dbError } = await supabase
                .from('users')
                .update({ avatar_url: null })
                .eq('id', user.id);

            if (dbError) throw dbError;

            await supabase.auth.updateUser({
                data: { avatar_url: null }
            });

            if (refreshProfile) {
                await refreshProfile();
            }

            setAvatarUploadMessage({ type: 'success', text: 'Profil fotoğrafı kaldırıldı.' });
            await logAction(user?.email, 'Profil Güncelleme', 'Profil fotoğrafı kaldırıldı');
        } catch (error: unknown) {
            console.error('Fotoğraf silme hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kaldırma sırasında hata oluştu.';
            setAvatarUploadMessage({ type: 'error', text: `Hata: ${errorMessage}` });
        } finally {
            setIsUploadingAvatar(false);
            setTimeout(() => setAvatarUploadMessage(null), 5000);
        }
    };

    const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'approval' | 'rejection') => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 2 * 1024 * 1024) {
            setStampMessage({ type: 'error', text: 'Dosya boyutu 2MB\'dan küçük olmalıdır.', target: type });
            return;
        }

        setIsUploadingStamp(prev => ({ ...prev, [type]: true }));
        setStampMessage(null);

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `uploads/stamps/${user.id}_${type}_${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('invoices-pdfs')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('invoices-pdfs')
                .getPublicUrl(fileName);

            const fieldToUpdate = type === 'approval' ? 'approval_stamp_url' : 'rejection_stamp_url';

            const { error: dbError } = await supabase
                .from('users')
                .update({ [fieldToUpdate]: publicUrl })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Auth Metadata'yı güvenli bir şekilde güncelle (mevcutları koruyarak)
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            await supabase.auth.updateUser({
                data: {
                    ...currentUser?.user_metadata,
                    [fieldToUpdate]: publicUrl
                }
            });

            if (refreshProfile) {
                await refreshProfile();
            }

            setStampMessage({ type: 'success', text: `${type === 'approval' ? 'Onay' : 'Ret'} kaşesi güncellendi.`, target: type });
            await logAction(user?.email, 'Profil Güncelleme', `${type === 'approval' ? 'Onay' : 'Ret'} kaşesi yüklendi`);
        } catch (error: unknown) {
            console.error('Kaşe yükleme hatası:', error);
            let errorMessage = error instanceof Error ? error.message : 'Yükleme sırasında hata oluştu.';

            // Eğer veritabanı hatasıysa ve sütun yoksa özel mesaj göster
            if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
                errorMessage = 'Veritabanında gerekli sütunlar (approval_stamp_url/rejection_stamp_url) eksik. Lütfen SQL ile ekleyin.';
            }

            setStampMessage({ type: 'error', text: `Hata: ${errorMessage}`, target: type });
        } finally {
            setIsUploadingStamp(prev => ({ ...prev, [type]: false }));
            if (type === 'approval' && approvalStampInputRef.current) approvalStampInputRef.current.value = '';
            if (type === 'rejection' && rejectionStampInputRef.current) rejectionStampInputRef.current.value = '';
            setTimeout(() => setStampMessage(null), 10000); // 10 saniye göster
        }
    };

    const handleDeleteStamp = async (type: 'approval' | 'rejection') => {
        if (!user) return;

        setIsUploadingStamp(prev => ({ ...prev, [type]: true }));
        setStampMessage(null);

        try {
            const fieldToUpdate = type === 'approval' ? 'approval_stamp_url' : 'rejection_stamp_url';

            const { error: dbError } = await supabase
                .from('users')
                .update({ [fieldToUpdate]: null })
                .eq('id', user.id);

            if (dbError) throw dbError;

            // Auth Metadata'yı güvenli bir şekilde temizle
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            await supabase.auth.updateUser({
                data: {
                    ...currentUser?.user_metadata,
                    [fieldToUpdate]: null
                }
            });

            if (refreshProfile) {
                await refreshProfile();
            }

            setStampMessage({ type: 'success', text: `${type === 'approval' ? 'Onay' : 'Ret'} kaşesi kaldırıldı.`, target: type });
            await logAction(user?.email, 'Profil Güncelleme', `${type === 'approval' ? 'Onay' : 'Ret'} kaşesi kaldırıldı`);
        } catch (error: unknown) {
            console.error('Kaşe silme hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kaldırma sırasında hata oluştu.';
            setStampMessage({ type: 'error', text: `Hata: ${errorMessage}`, target: type });
        } finally {
            setIsUploadingStamp(prev => ({ ...prev, [type]: false }));
            setTimeout(() => setStampMessage(null), 5000);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Ayarlar</h1>
                <p className="text-sm text-slate-500 mt-1">Kullanıcı ve görünüm ayarlarınızı yönetin</p>
            </div>

            <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-border-light dark:border-border-dark overflow-hidden">
                <div className="p-6">
                    <div className="space-y-8 animate-fade-in">
                        {/* Tema Ayarları */}
                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Görünüm Ayarları</h2>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-surface-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Koyu Tema</p>
                                        <p className="text-xs text-slate-500">Uygulama görünümünü değiştirin</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTheme}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${theme === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        </section>

                        <hr className="border-border-light dark:border-border-dark" />

                        {/* Kullanıcı Bilgileri */}
                        <section>
                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Kullanıcı Bilgileri</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Ad Soyad</label>
                                    <input type="text" className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-surface-dark/30 text-slate-600 dark:text-slate-400 outline-none" defaultValue={profile?.full_name || ''} disabled />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">E-posta</label>
                                    <input type="email" className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-surface-dark/30 text-slate-600 dark:text-slate-400 outline-none" defaultValue={profile?.email || ''} disabled />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Rol</label>
                                    <input type="text" className="w-full px-4 py-2 rounded-lg border border-border-light dark:border-border-dark bg-slate-50 dark:bg-surface-dark/30 text-slate-600 dark:text-slate-400 outline-none capitalize" value={profile?.role === 'admin' ? 'Yönetici' : profile?.role === 'manager' ? 'Müdür' : profile?.role === 'muhasebe' ? 'Muhasebe' : profile?.role === 'satinalma' ? 'Satın Alma' : profile?.role === 'irsaliye' ? 'İrsaliye Sorumlusu' : profile?.role === 'fatura_irsaliye' ? 'Fatura / İrsaliye Sorumlusu' : 'Fatura Sorumlusu'} disabled />
                                </div>
                            </div>

                            {/* Profil Fotoğrafı Yükleme */}
                            <div className="p-4 bg-slate-50 dark:bg-surface-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Profil Fotoğrafı</h3>
                                <div className="flex flex-col sm:flex-row gap-6 items-center">
                                    <div className="flex flex-col items-center">
                                        <div className="w-24 h-24 rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden relative shadow-sm">
                                            {profile?.avatar_url ? (
                                                <img src={profile.avatar_url} alt="Profil" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="material-symbols-outlined text-4xl text-slate-300">person</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-4 text-center sm:text-left">
                                        <p className="text-xs text-slate-500">
                                            PNG veya JPG formatında, maksimum 2MB boyutunda bir fotoğraf yükleyin.
                                        </p>

                                        <input
                                            type="file"
                                            ref={avatarInputRef}
                                            onChange={handleAvatarUpload}
                                            accept=".jpg, .jpeg, .png, .webp"
                                            className="hidden"
                                            id="avatar-upload"
                                            disabled={isUploadingAvatar}
                                        />
                                        <div className="flex flex-wrap items-center gap-3">
                                            <label
                                                htmlFor="avatar-upload"
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${isUploadingAvatar ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' : 'bg-primary text-white hover:bg-primary-600 shadow-sm'}`}
                                            >
                                                {isUploadingAvatar ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                                {isUploadingAvatar ? 'İşleniyor...' : profile?.avatar_url ? 'Fotoğrafı Değiştir' : 'Fotoğrafı Güncelle'}
                                            </label>

                                            {profile?.avatar_url && !isUploadingAvatar && (
                                                <button
                                                    onClick={handleDeleteAvatar}
                                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 transition-colors border border-red-100 dark:border-red-900/50"
                                                >
                                                    <Trash2 size={16} />
                                                    Resmi Kaldır
                                                </button>
                                            )}
                                        </div>

                                        {avatarUploadMessage && (
                                            <div className={`mt-2 text-xs px-3 py-2 rounded-md flex items-center justify-center sm:justify-start gap-2 ${avatarUploadMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                {avatarUploadMessage.type === 'success' ? <CheckCircle2 size={14} /> : <span className="material-symbols-outlined text-[14px]">error</span>}
                                                {avatarUploadMessage.text}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Kaşe Ayarları */}
                            {(profile?.role === 'manager' || profile?.role === 'muhasebe' || profile?.role === 'satinalma') && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                    {/* Onay Kaşesi */}
                                    <div className="p-4 bg-slate-50 dark:bg-surface-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Onay Kaşesi</h3>
                                        <div className="flex flex-col gap-6 items-center sm:flex-row">
                                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden relative shadow-sm">
                                                {profile?.approval_stamp_url ? (
                                                    <img
                                                        src={profile.approval_stamp_url}
                                                        alt="Onay Kaşesi"
                                                        className="w-full h-full object-contain"
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <span className="material-symbols-outlined text-4xl text-slate-300">verified_user</span>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4 text-center sm:text-left">
                                                <input
                                                    type="file"
                                                    ref={approvalStampInputRef}
                                                    onChange={(e) => handleStampUpload(e, 'approval')}
                                                    accept=".jpg, .jpeg, .png"
                                                    className="hidden"
                                                    id="approval-stamp-upload"
                                                    disabled={isUploadingStamp.approval}
                                                />
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <label
                                                        htmlFor="approval-stamp-upload"
                                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${isUploadingStamp.approval ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'}`}
                                                    >
                                                        {isUploadingStamp.approval ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                                        {isUploadingStamp.approval ? 'İşleniyor...' : profile?.approval_stamp_url ? 'Kaşeyi Değiştir' : 'Onay Kaşesi Yükle'}
                                                    </label>

                                                    {profile?.approval_stamp_url && !isUploadingStamp.approval && (
                                                        <button
                                                            onClick={() => handleDeleteStamp('approval')}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors border border-red-100 dark:border-red-900/50"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                {stampMessage?.target === 'approval' && (
                                                    <div className={`mt-2 text-xs px-3 py-2 rounded-md flex items-center justify-center sm:justify-start gap-2 ${stampMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                        {stampMessage.type === 'success' ? <CheckCircle2 size={14} /> : <span className="material-symbols-outlined text-[14px]">error</span>}
                                                        {stampMessage.text}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Ret Kaşesi */}
                                    <div className="p-4 bg-slate-50 dark:bg-surface-dark/50 rounded-lg border border-border-light dark:border-border-dark">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Ret Kaşesi</h3>
                                        <div className="flex flex-col gap-6 items-center sm:flex-row">
                                            <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-center overflow-hidden relative shadow-sm">
                                                {profile?.rejection_stamp_url ? (
                                                    <img
                                                        src={profile.rejection_stamp_url}
                                                        alt="Ret Kaşesi"
                                                        className="w-full h-full object-contain"
                                                        crossOrigin="anonymous"
                                                    />
                                                ) : (
                                                    <span className="material-symbols-outlined text-4xl text-slate-300">cancel</span>
                                                )}
                                            </div>
                                            <div className="flex-1 space-y-4 text-center sm:text-left">
                                                <input
                                                    type="file"
                                                    ref={rejectionStampInputRef}
                                                    onChange={(e) => handleStampUpload(e, 'rejection')}
                                                    accept=".jpg, .jpeg, .png"
                                                    className="hidden"
                                                    id="rejection-stamp-upload"
                                                    disabled={isUploadingStamp.rejection}
                                                />
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <label
                                                        htmlFor="rejection-stamp-upload"
                                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors cursor-pointer ${isUploadingStamp.rejection ? 'bg-slate-100 text-slate-400 cursor-not-allowed dark:bg-slate-800' : 'bg-red-600 text-white hover:bg-red-700 shadow-sm'}`}
                                                    >
                                                        {isUploadingStamp.rejection ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                                                        {isUploadingStamp.rejection ? 'İşleniyor...' : profile?.rejection_stamp_url ? 'Kaşeyi Değiştir' : 'Ret Kaşesi Yükle'}
                                                    </label>

                                                    {profile?.rejection_stamp_url && !isUploadingStamp.rejection && (
                                                        <button
                                                            onClick={() => handleDeleteStamp('rejection')}
                                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors border border-red-100 dark:border-red-900/50"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                                {stampMessage?.target === 'rejection' && (
                                                    <div className={`mt-2 text-xs px-3 py-2 rounded-md flex items-center justify-center sm:justify-start gap-2 ${stampMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                        {stampMessage.type === 'success' ? <CheckCircle2 size={14} /> : <span className="material-symbols-outlined text-[14px]">error</span>}
                                                        {stampMessage.text}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
