import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';
import { logAction } from '../lib/logger';

export default function RegisterScreen() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Create the user in Supabase Auth
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // 2. Insert into custom users table (Default role: user, status: pending_approval)
                const { error: insertError } = await supabase.from('users').insert({
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    role: 'user',
                    status: 'pending_approval'
                });

                if (insertError) {
                    console.error("Error inserting custom user data:", insertError);
                    // Optionally handle cleanup or show error
                }

                setSuccess(true);
                await logAction(email, 'Yeni Kayıt', `${fullName} adıyla yeni hesap oluşturuldu`);
                // navigate will be handled after reading success state or redirecting directly
            }

        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Kayıt sırasında bir hata oluştu';
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 mx-auto flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-[32px]">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Kayıt Başarılı</h2>
                    <p className="text-slate-600 dark:text-slate-400 mb-6">
                        Hesabınız başarıyla oluşturuldu. Ancak, uygulamaya erişebilmek için bir yöneticinin onayını beklemeniz gerekmektedir.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="bg-primary hover:bg-primary-hover text-white font-medium py-2 px-6 rounded-lg transition-colors"
                    >
                        Giriş Ekranına Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark rounded-xl shadow-lg border border-border-light dark:border-border-dark p-8">
                <div className="flex justify-center mb-6">
                    <div className="w-12 h-12 rounded-lg bg-primary flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[28px]">person_add</span>
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
                    Yeni Hesap Oluştur
                </h1>
                <p className="text-center text-slate-500 dark:text-slate-400 mb-8 text-sm">
                    Fatura yöneticisine katılmak için formu doldurun
                </p>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm flex gap-2 items-start dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-400">
                        <span className="material-symbols-outlined text-[20px] isolate mt-0.5">error</span>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1" htmlFor="fullname">
                            Ad Soyad
                        </label>
                        <input
                            id="fullname"
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary dark:bg-slate-800 dark:text-white transition-colors outline-none"
                            placeholder="John Doe"
                        />
                    </div>

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
                            Şifre (En az 6 karakter)
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            minLength={6}
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
                                "Kayıt Ol"
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    Zaten hesabınız var mı?{' '}
                    <Link to="/login" className="text-primary hover:underline font-medium">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </div>
    );
}
