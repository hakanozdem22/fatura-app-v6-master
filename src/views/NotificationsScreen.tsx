import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications
} from '../lib/notificationService';
import type { Notification } from '../lib/notificationService';
import { Bell, Trash2, CheckCircle2, Loader2 } from 'lucide-react';

export default function NotificationsScreen() {
    const { user } = useAuth();
    const userId = user?.id;
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const fetchNotificationsData = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        const data = await getNotifications(userId);
        setNotifications(data);
        setLoading(false);
    }, [userId]);

    useEffect(() => {
        let mounted = true;

        if (userId) {
            const init = async () => {
                const data = await getNotifications(userId);
                if (mounted) {
                    setNotifications(data);
                    setLoading(false);
                }
            };
            init();

            // Realtime dinle (Sayfa açıkken anlık listeye yansısın)
            const channel = supabase
                .channel('notifications_screen_changes')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                }, () => {
                    if (mounted) fetchNotificationsData();
                })
                .subscribe();

            return () => {
                mounted = false;
                supabase.removeChannel(channel);
            };
        }
    }, [userId, fetchNotificationsData]);

    const handleMarkAsRead = async (id: string, isAlreadyRead: boolean) => {
        if (isAlreadyRead) return;
        setActionLoading(id);
        await markAsRead(id);
        await fetchNotificationsData();
        setActionLoading(null);
    };

    const handleMarkAllAsRead = async () => {
        if (!user?.id) return;
        setActionLoading('mark-all');
        await markAllAsRead(user.id);
        await fetchNotificationsData();
        setActionLoading(null);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm('Bu bildirimi silmek istediğinize emin misiniz?')) {
            setActionLoading(id);
            await deleteNotification(id);
            await fetchNotificationsData();
            setActionLoading(null);
        }
    };

    const handleDeleteAll = async () => {
        if (!user?.id) return;
        if (window.confirm('Tüm bildirimleri kalıcı olarak silmek istediğinize emin misiniz?')) {
            setActionLoading('delete-all');
            await deleteAllNotifications(user.id);
            await fetchNotificationsData();
            setActionLoading(null);
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto flex flex-col h-full overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary text-3xl">notifications</span>
                        Bildirimlerim
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Hesabınızla ilgili tüm önemli gelişmeleri buradan takip edebilirsiniz.
                    </p>
                </div>

                <div className="flex gap-2">
                    {notifications.some(n => !n.is_read) && (
                        <button
                            onClick={handleMarkAllAsRead}
                            disabled={actionLoading === 'mark-all'}
                            className="btn btn-secondary py-2 px-4 shadow-sm"
                        >
                            {actionLoading === 'mark-all' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>Tümünü Okundu İşaretle</span>
                        </button>
                    )}

                    {notifications.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            disabled={actionLoading === 'delete-all'}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl transition-colors font-medium border border-red-100 dark:border-red-500/20"
                        >
                            {actionLoading === 'delete-all' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Trash2 className="w-4 h-4" />
                            )}
                            <span>Tümünü Sil</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/50 flex flex-col flex-1 overflow-hidden relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                        <p className="text-slate-500 dark:text-slate-400">Bildirimler yükleniyor...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-lg font-medium text-slate-600 dark:text-slate-300">Bildiriminiz bulunmuyor</p>
                        <p className="text-sm mt-1">Yeni bir gelişme olduğunda burada görebileceksiniz.</p>
                    </div>
                ) : (
                    <div className="overflow-y-auto flex-1 p-2">
                        <div className="flex flex-col gap-2">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleMarkAsRead(notification.id, notification.is_read)}
                                    className={`relative p-4 rounded-xl border transition-all cursor-pointer group flex items-start gap-4 ${notification.is_read
                                        ? 'bg-slate-50 dark:bg-slate-800/30 border-slate-100 dark:border-slate-700/30 hover:border-slate-200 dark:hover:border-slate-600'
                                        : 'bg-white dark:bg-slate-800 border-primary/20 hover:border-primary/40 shadow-sm'
                                        }`}
                                >
                                    {!notification.is_read && (
                                        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10"></div>
                                    )}

                                    <div className={`p-2 rounded-full shrink-0 ${notification.is_read
                                        ? 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                                        : 'bg-primary/10 text-primary dark:bg-primary/20'
                                        }`}>
                                        <Bell className="w-5 h-5" />
                                    </div>

                                    <div className="flex-1 min-w-0 pr-8">
                                        <h4 className={`font-semibold mb-1 truncate ${notification.is_read
                                            ? 'text-slate-600 dark:text-slate-300'
                                            : 'text-slate-900 dark:text-white'
                                            }`}>
                                            {notification.title}
                                        </h4>
                                        <p className={`text-sm ${notification.is_read
                                            ? 'text-slate-500 dark:text-slate-400'
                                            : 'text-slate-600 dark:text-slate-300'
                                            }`}>
                                            {notification.message}
                                        </p>
                                        <p className={`text-xs mt-2 ${notification.is_read
                                            ? 'text-slate-400 dark:text-slate-500'
                                            : 'text-primary/80 dark:text-primary-400'
                                            }`}>
                                            {new Date(notification.created_at).toLocaleString('tr-TR')}
                                        </p>
                                    </div>

                                    <button
                                        onClick={(e) => handleDelete(e, notification.id)}
                                        disabled={actionLoading === notification.id}
                                        className="absolute bottom-4 right-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                        title="Bildirimi Sil"
                                    >
                                        {actionLoading === notification.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
