import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Search, History, Calendar, Filter } from 'lucide-react';
import type { UserProfile } from '../types/auth';

interface SystemLog {
    id: string;
    user_email: string;
    action: string;
    details?: string;
    created_at: string;
}

export default function SystemLogsScreen() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Fetch logs
            const fetchLogsPromise = supabase
                .from('system_logs')
                .select('*')
                .order('created_at', { ascending: false });

            // Fetch users to map emails to names
            const fetchUsersPromise = supabase.from('users').select('*');

            const [logsResponse, usersResponse] = await Promise.all([fetchLogsPromise, fetchUsersPromise]);

            if (logsResponse.error) {
                console.error("Logları çekme hatası:", logsResponse.error);
            } else {
                setLogs(logsResponse.data || []);
            }

            if (usersResponse.error) {
                console.error("Kullanıcıları çekme hatası:", usersResponse.error);
            } else if (usersResponse.data) {
                const map: Record<string, string> = {};
                (usersResponse.data as UserProfile[]).forEach(user => {
                    if (user.email && user.full_name) {
                        map[user.email] = user.full_name;
                    }
                });
                setUserMap(map);
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredLogs = logs.filter(log => {
        const userName = userMap[log.user_email] || log.user_email;

        // Search Filter
        const matchesSearch =
            userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));

        // Date Filter
        let matchesDate = true;
        const logDateObj = new Date(log.created_at);
        // Resetting time portion for accurate day comparison
        logDateObj.setHours(0, 0, 0, 0);

        if (startDate) {
            const startObj = new Date(startDate);
            startObj.setHours(0, 0, 0, 0);
            if (logDateObj < startObj) matchesDate = false;
        }

        if (endDate) {
            const endObj = new Date(endDate);
            endObj.setHours(0, 0, 0, 0);
            if (logDateObj > endObj) matchesDate = false;
        }

        return matchesSearch && matchesDate;
    });

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <History size={24} />
                    </div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Sistem Kayıtları</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 pl-13">Tüm kullanıcı etkinliklerini, yapılan değişiklikleri ve onay işlemlerini kronolojik olarak izleyin.</p>
            </header>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                        placeholder="Kullanıcı adı, işlem veya detay ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                    />
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <Filter size={16} /> Tarih:
                    </div>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
                        title="Başlangıç Tarihi"
                    />
                    <span className="text-slate-400 hidden sm:block">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full sm:w-auto px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors text-sm"
                        title="Bitiş Tarihi"
                    />
                </div>

                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-lg transition-colors border border-indigo-200 dark:border-indigo-800/50"
                >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span className="font-medium text-sm">Listeyi Yenile</span>
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white w-48">Tarih / Saat</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Kullanıcı İşlemi Yapan</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">İşlem Özeti</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white">Detaylar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin" size={24} /> Kayıtlar yükleniyor...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <History size={40} className="text-slate-300 dark:text-slate-700 mb-3" />
                                            <p className="text-slate-500 font-medium">Log kaydı bulunamadı.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
                                                    <Calendar size={14} className="text-slate-400" />
                                                    {formatDate(log.created_at)}
                                                </span>
                                                <span className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5 ml-[20px]">
                                                    {formatTime(log.created_at)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-indigo-700 dark:text-indigo-400">
                                                    {userMap[log.user_email] || 'Bilinmeyen Kullanıcı'}
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    {log.user_email}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                                            {log.details || <span className="italic text-slate-400">-</span>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
