import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { executeViewFile } from '../hooks/useFileUrl';
import { Loader2, Search, FileText } from 'lucide-react';

interface Invoice {
    id: string;
    invoice_no: string;
    company_name?: string;
    submission_date: string;
    amount: number;
    status: string;
    file_url?: string;
    document_type?: string;
    created_at?: string;
    rejection_note?: string;
    rejected_by_id?: string;
    rejector?: {
        full_name: string;
        role?: string;
    };
}

const getRoleTitle = (role: string = '') => {
    const r = role.toLowerCase().trim();
    if (r === 'manager') return 'Müdür';
    if (r === 'yonetici') return 'Yönetici';
    if (r === 'muhasebe') return 'Muhasebe';
    if (r === 'satinalma') return 'Satın Alma';
    if (r === 'irsaliye') return 'İrsaliye Sorumlusu';
    if (r === 'fatura_irsaliye') return 'Fatura / İrsaliye Sorumlusu';
    return 'Fatura Sorumlusu';
};

export default function MyInvoicesScreen() {
    const { user, profile } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('Tümü');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Ret nedeni modalı için state
    const [isReasonModalOpen, setIsReasonModalOpen] = useState(false);
    const [selectedNote, setSelectedNote] = useState('');
    const [selectedRejectorName, setSelectedRejectorName] = useState('');

    const fetchMyInvoices = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // Belgeleri çek
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Kullanıcıları da çekerek isim eşleşmesi yap (yedek mekanizma)
            const { data: usersData } = await supabase.from('users').select('id, full_name, role');
            if (usersData) {
                const map: Record<string, string> = {};
                (usersData as { id: string, full_name: string, role: string }[]).forEach(u => {
                    const title = getRoleTitle(u.role);
                    map[u.id] = `${u.full_name} (${title})`;
                });
                setUserMap(map);
            }

            setInvoices(data || []);
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchMyInvoices();
    }, [fetchMyInvoices]);

    const filteredInvoices = invoices.filter(invoice => {
        const matchesStatus = statusFilter === 'Tümü' || invoice.status === statusFilter;
        const matchesSearch = invoice.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase());

        // Tarih filtresi mantığı
        if (!invoice.submission_date) return matchesStatus && matchesSearch;

        const invoiceDate = new Date(invoice.submission_date);
        if (isNaN(invoiceDate.getTime())) return matchesStatus && matchesSearch;

        invoiceDate.setHours(0, 0, 0, 0);

        let matchesDate = true;
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (invoiceDate < start) matchesDate = false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (invoiceDate > end) matchesDate = false;
        }

        return matchesStatus && matchesSearch && matchesDate;
    });

    const StatusBadge = ({ invoice }: { invoice: Invoice }) => {
        const status = invoice.status;
        if (status === 'Onaylandı') {
            return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Arşivlendi</span>;
        }
        if (status === 'Müdür Onaylı') {
            return (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                    {invoice.document_type === 'İrsaliye' ? 'Onay Bekliyor (Satın Alma)' : 'Onay Bekliyor (Muhasebe)'}
                </span>
            );
        }
        if (status === 'Bekliyor') {
            return <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Onay Bekliyor (Müdür)</span>;
        }
        if (status === 'Reddedildi') {
            return (
                <button
                    onClick={() => {
                        setSelectedNote(invoice.rejection_note || 'Neden belirtilmemiş.');
                        setSelectedRejectorName(invoice.rejector?.full_name || (invoice.rejected_by_id ? userMap[invoice.rejected_by_id] : '') || 'Bilinmiyor');
                        setIsReasonModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 group cursor-pointer hover:opacity-80 active:scale-95 transition-all outline-none mx-auto w-fit"
                    title="Ret Nedenini Gör"
                >
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-800/50 transition-colors">
                        {status}
                    </span>
                    <span className="material-symbols-outlined text-[18px] text-red-500 group-hover:scale-110 transition-transform">info</span>
                </button>
            );
        }
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-400">{status}</span>;
    };

    return (
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-8">
            <header className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Belgelerim
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {profile?.role === 'irsaliye'
                        ? 'Onay sürecindeki, onaylanan veya reddedilen geçmiş irsaliyelerinizi buradan takip edebilirsiniz.'
                        : 'Onay sürecindeki, onaylanan veya reddedilen geçmiş faturalarınızı buradan takip edebilirsiniz.'}
                </p>
            </header>

            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative w-full lg:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Şirket adı veya fatura no ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="block w-[140px] pl-3 pr-2 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary rounded-lg text-slate-700 dark:text-slate-300 shrink-0"
                            title="Başlangıç Tarihi"
                        />
                        <span className="text-slate-400 font-bold">-</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="block w-[140px] pl-3 pr-2 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary rounded-lg text-slate-700 dark:text-slate-300 shrink-0"
                            title="Bitiş Tarihi"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block min-w-[150px] pl-3 pr-10 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary rounded-lg text-slate-700 dark:text-slate-300 cursor-pointer appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right 0.5rem center', backgroundSize: '1.5em 1.5em', backgroundRepeat: 'no-repeat' }}
                    >
                        <option value="Tümü">Tüm Durumlar</option>
                        <option value="Bekliyor">Onay Bekleyenler (Müdür)</option>
                        <option value="Müdür Onaylı">Onay Bekleyenler (Muhasebe)</option>
                        <option value="Onaylandı">Arşivlenenler</option>
                        <option value="Reddedildi">Reddedilenler</option>
                    </select>
                    <button
                        onClick={() => fetchMyInvoices()}
                        disabled={isLoading}
                        className="p-2 text-slate-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50 shrink-0 flex items-center justify-center min-w-[42px] min-h-[42px]"
                        title="Yenile"
                    >
                        <span className={`material-symbols-outlined block ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center min-w-[200px]">Şirket/Firma</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center min-w-[120px]">Belge Tipi</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center min-w-[160px]">
                                    {profile?.role === 'fatura_irsaliye' ? 'Fatura / İrsaliye No' : (profile?.role === 'irsaliye' || profile?.role === 'satinalma' ? 'İrsaliye No' : 'Fatura No')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">
                                    {profile?.role === 'fatura_irsaliye' ? 'Fatura / İrsaliye Tarihi' : (profile?.role === 'irsaliye' || profile?.role === 'satinalma' ? 'İrsaliye Tarihi' : 'Fatura Tarihi')}
                                </th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Yükleme Tarihi</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Durum</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center pr-10">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin" size={24} /> Veriler yükleniyor...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <FileText size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
                                            <p className="text-slate-500 font-medium">İşlem görmüş belge bulunmuyor.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-left">
                                            {invoice.company_name || <span className="text-slate-400 italic">Bilinmiyor</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${invoice.document_type === 'İrsaliye'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
                                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'
                                                }`}>
                                                {invoice.document_type || 'Belirtilmedi'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-500 dark:text-slate-400 text-center">{invoice.invoice_no}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap text-center">
                                            {new Date(invoice.submission_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap text-center">
                                            {new Date(invoice.created_at || invoice.submission_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <StatusBadge invoice={invoice} />
                                        </td>
                                        <td className="px-6 py-4 text-center pr-6">
                                            {invoice.file_url ? (
                                                <button onClick={() => executeViewFile(invoice.file_url)}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Dosyayı İndir/Gör">
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                </button>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ret Nedeni Modalı */}
            {isReasonModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center gap-4 p-6 border-b border-slate-100 dark:border-slate-800 bg-red-50/30 dark:bg-red-900/10">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                                <FileText size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Belge Reddedildi</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Ret nedenini ve detayları aşağıda bulabilirsiniz</p>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Reddeden Kişi</label>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                                    <span className="material-symbols-outlined text-red-500">person</span>
                                    {selectedRejectorName}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Ret Açıklaması</label>
                                <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                                    {selectedNote}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
                            <button
                                onClick={() => setIsReasonModalOpen(false)}
                                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
