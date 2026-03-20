import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { logAction } from '../lib/logger';
import logo from '../assets/logo.png';

export default function LoginScreen() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Yeni State'ler (Şifremi Unuttum ve Beni Hatırla)
    const [viewState, setViewState] = useState<'login' | 'forgot_email' | 'forgot_otp' | 'forgot_password'>('login');
    const [rememberMe, setRememberMe] = useState(
        localStorage.getItem('remember_me') === 'true'
    );
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error("Login hata:", error);
            setError(error.message);
            await logAction(email, 'Başarısız Giriş Denemesi', `Hata: ${error.message}`);
        } else {
            if (rememberMe) {
                localStorage.setItem('remember_me', 'true');
            } else {
                localStorage.removeItem('remember_me');
            }
            console.log("Login başarılı, user:", data.user);
            await logAction(data.user?.email, 'Sisteme Giriş', 'Başarılı giriş yapıldı');
            navigate('/');
        }

        setLoading(false);
    };

    // Şifre Sıfırlama İstediği (Mail)
    const handleResetPasswordRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError("Lütfen e-posta adresinizi girin.");
            return;
        }
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            setViewState('forgot_otp');
        }
    };

    // OTP Doğrulama
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const { error } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'recovery'
        });
        setLoading(false);
        if (error) {
            setError("Geçersiz veya süresi dolmuş kod.");
        } else {
            setViewState('forgot_password');
        }
    };

    // Yeni Şifre Kaydetme
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (newPassword !== confirmNewPassword) {
            setError('Şifreler eşleşmiyor. Lütfen tekrar kontrol edin.');
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            // Şifre güncellendi, ana sayfaya yönlendir
            navigate('/');
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-8">
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex items-center justify-center">
                        <img src={logo} alt="Ardıç Elektrik Logo" className="w-full h-full object-contain" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2 leading-tight">
                    Ardıç Elektrik<br /><span className="text-slate-900 dark:text-white text-xl">Entegrasyon Sistemi</span>
                </h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm">
                    Devam etmek için hesabınıza giriş yapın
                </p>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex gap-2 items-start dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
                        <span className="material-symbols-outlined text-[20px] isolate mt-0.5">error</span>
                        <span>{error}</span>
                    </div>
                )}

                {viewState === 'login' && (
                    <>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="email">
                                    E-posta
                                </label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none"
                                    placeholder="ornek@sirket.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="password">
                                    Şifre
                                </label>
                                <input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex items-center justify-between text-sm py-1">
                                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            checked={rememberMe}
                                            onChange={(e) => setRememberMe(e.target.checked)}
                                            className="appearance-none w-4 h-4 border-2 border-slate-300 dark:border-slate-600 rounded cursor-pointer checked:bg-primary checked:border-primary transition-colors focus:ring-2 focus:ring-primary/20 focus:outline-none"
                                        />
                                        <span className={`material-symbols-outlined text-[12px] absolute text-white pointer-events-none transition-opacity ${rememberMe ? 'opacity-100' : 'opacity-0'}`}>
                                            check
                                        </span>
                                    </div>
                                    <span className="font-medium group-hover:text-slate-800 group-hover:dark:text-white transition-colors select-none">Beni Hatırla</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => { setError(null); setViewState('forgot_email'); }}
                                    className="font-medium text-primary hover:text-primary-hover transition-colors select-none"
                                >
                                    Şifremi Unuttum
                                </button>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="material-symbols-outlined animate-spin">refresh</span>
                                    ) : (
                                        "Giriş Yap"
                                    )}
                                </button>
                            </div>
                        </form>

                        <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                            Hesabınız yok mu?{' '}
                            <Link to="/register" className="text-primary hover:underline font-medium">
                                Kayıt Ol
                            </Link>
                        </div>
                    </>
                )}

                {viewState === 'forgot_email' && (
                    <form onSubmit={handleResetPasswordRequest} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed mb-4">
                            Kayıtlı e-posta adresinizi girdiğinizde, şifrenizi sıfırlamanız için bir kurtarma kodu göndereceğiz.
                        </p>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="forgot-email">
                                E-posta
                            </label>
                            <input
                                id="forgot-email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none"
                                placeholder="ornek@sirket.com"
                            />
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : "Kurtarma Kodu Gönder"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setError(null); setViewState('login'); }}
                                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center"
                            >
                                Geri Dön
                            </button>
                        </div>
                    </form>
                )}

                {viewState === 'forgot_otp' && (
                    <form onSubmit={handleVerifyOtp} className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl mb-4">
                            <span className="material-symbols-outlined text-emerald-500 text-3xl mb-2">mark_email_read</span>
                            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-400">
                                <b>{email}</b> adresine doğrulama kodunu gönderdik. Lütfen spam/gereksiz klasörünü de kontrol ediniz.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="otp">
                                Doğrulama Kodu
                            </label>
                            <input
                                id="otp"
                                type="text"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none text-center font-mono text-xl tracking-widest"
                                placeholder="12345678"
                                maxLength={8}
                            />
                        </div>

                        <div className="pt-2 flex flex-col gap-2">
                            <button
                                type="submit"
                                disabled={loading || otp.length < 6}
                                className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : "Kodu Doğrula"}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setError(null); setViewState('forgot_email'); }}
                                className="w-full bg-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 font-medium py-2.5 px-4 transition-colors"
                            >
                                E-posta adresimi değiştirmek istiyorum
                            </button>
                        </div>
                    </form>
                )}

                {viewState === 'forgot_password' && (
                    <form onSubmit={handleUpdatePassword} className="space-y-4 animate-in fade-in zoom-in-95 duration-500">
                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl mb-4">
                            <span className="material-symbols-outlined text-blue-500 text-3xl mb-2">lock_open</span>
                            <h3 className="text-sm font-bold text-blue-800 dark:text-blue-400 mb-1">Hesabınız Doğrulandı</h3>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Şimdi yeni ve güçlü bir şifre belirleyebilirsiniz.
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="new-password">
                                Yeni Şifre
                            </label>
                            <input
                                id="new-password"
                                type="password"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none"
                                placeholder="En az 6 karakter"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="confirm-new-password">
                                Yeni Şifre Tekrar
                            </label>
                            <input
                                id="confirm-new-password"
                                type="password"
                                required
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none ${confirmNewPassword && newPassword !== confirmNewPassword
                                        ? 'border-red-400 dark:border-red-500'
                                        : 'border-slate-300 dark:border-slate-600'
                                    }`}
                                placeholder="En az 6 karakter"
                            />
                            {confirmNewPassword && newPassword !== confirmNewPassword && (
                                <p className="mt-1 text-xs text-red-500">Şifreler eşleşmiyor</p>
                            )}
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading || newPassword.length < 6 || confirmNewPassword.length < 6}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <span className="material-symbols-outlined animate-spin">refresh</span> : "Şifremi Güncelle ve Giriş Yap"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
