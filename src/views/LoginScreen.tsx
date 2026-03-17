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
            console.log("Login başarılı, user:", data.user);
            await logAction(data.user?.email, 'Sisteme Giriş', 'Başarılı giriş yapıldı');
            navigate('/');
        }

        setLoading(false);
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
            </div>
        </div>
    );
}
