import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Search, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
    approved_at?: string;
}

export default function InvoiceArchiveScreen() {
    const { profile } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'approved_at',
        direction: 'desc'
    });

    const role = profile?.role?.toLowerCase().trim();
    const isSatinalma = role === 'satinalma';
    const isMuhasebe = role === 'muhasebe';

    const fetchArchive = useCallback(async () => {
        setIsLoading(true);
        try {
            console.log("Fetching archive for role:", role);
            let query = supabase
                .from('invoices')
                .select('*')
                .eq('status', 'Onaylandı')
                .order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });

            if (isSatinalma) {
                query = query.eq('document_type', 'İrsaliye');
            } else if (isMuhasebe) {
                query = query.neq('document_type', 'İrsaliye');
            }

            const { data, error } = await query;

            if (error) {
                console.error("Arşiv çekme hatası:", error);
            } else {
                console.log("Archive query result count:", data?.length || 0);
                if (data && data.length > 0) {
                    console.log("Sample data:", { status: data[0].status, type: data[0].document_type });
                }
                setInvoices(data || []);
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isSatinalma, isMuhasebe, role, sortConfig]);

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ChevronsUpDown size={14} className="ml-1 opacity-30 group-hover:opacity-60 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={14} className="ml-1 text-primary" /> : <ChevronDown size={14} className="ml-1 text-primary" />;
    };

    useEffect(() => {
        fetchArchive();
    }, [fetchArchive]);

    const resetFilters = () => {
        setSearchQuery('');
        setStartDate('');
        setEndDate('');
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch =
            invoice.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesDate = true;
        if (startDate || endDate) {
            const invoiceDate = new Date(invoice.submission_date);
            if (startDate && invoiceDate < new Date(startDate)) matchesDate = false;
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (invoiceDate > end) matchesDate = false;
            }
        }

        return matchesSearch && matchesDate;
    });

    const dynamicColSpan = 8;

    return (
        <div className="mx-auto flex w-full max-w-[1450px] flex-col gap-8 p-8">
            <header className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {isSatinalma ? 'İrsaliye Arşivi' : 'Fatura Arşivi'}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    Sistemdeki tüm {isSatinalma ? 'irsaliye' : 'fatura'} kayıtlarını buradan inceleyebilirsiniz.
                </p>
            </header>

            <div className="flex flex-col lg:flex-row gap-4 items-center bg-[#0f172a] dark:bg-slate-900 p-4 rounded-xl shadow-lg border border-slate-800">
                {/* Arama Inputu */}
                <div className="relative flex-1 w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-500" />
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 h-11 border border-slate-800 rounded-lg bg-[#1e293b]/50 text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-slate-600"
                        placeholder="Şirket adı veya belge no ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                    />
                </div>

                {/* Tarih Aralığı ve Filtreler */}
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <div className="flex items-center gap-2 bg-[#1e293b]/30 h-11 px-2 rounded-lg border border-slate-800">
                        <input
                            type="date"
                            className="bg-transparent text-slate-300 text-sm outline-none p-1.5 focus:text-white transition-colors"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-600">-</span>
                        <input
                            type="date"
                            className="bg-transparent text-slate-300 text-sm outline-none p-1.5 focus:text-white transition-colors"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={resetFilters}
                        className="h-11 px-3 bg-[#1e293b]/50 hover:bg-[#1e293b] text-slate-400 hover:text-white border border-slate-800 rounded-lg transition-all shadow-sm flex items-center justify-center"
                        title="Filtreleri Sıfırla"
                    >
                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                    </button>

                    <div className="flex items-center gap-2 px-4 h-11 bg-blue-500/10 text-blue-400 rounded-lg border border-blue-500/20 ml-auto lg:ml-0">
                        <FileText size={18} />
                        <span className="font-bold text-sm whitespace-nowrap">{filteredInvoices.length} Kayıt</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th onClick={() => handleSort('id')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group whitespace-nowrap">
                                    <div className="flex items-center justify-center">Sıra No <SortIcon columnKey="id" /></div>
                                </th>
                                <th onClick={() => handleSort('company_name')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group whitespace-nowrap">
                                    <div className="flex items-center justify-center">Şirket/Firma <SortIcon columnKey="company_name" /></div>
                                </th>
                                <th onClick={() => handleSort('invoice_no')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group whitespace-nowrap">
                                    <div className="flex items-center justify-center">
                                        {isSatinalma ? 'İrsaliye No' : isMuhasebe ? 'Fatura No' : 'Belge No'} <SortIcon columnKey="invoice_no" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('submission_date')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group whitespace-nowrap">
                                    <div className="flex items-center justify-center">
                                        {isSatinalma ? 'İrsaliye Tarihi' : isMuhasebe ? 'Fatura Tarihi' : 'Belge Tarihi'} <SortIcon columnKey="submission_date" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('created_at')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group whitespace-nowrap">
                                    <div className="flex items-center justify-center">Yükleme Tarihi <SortIcon columnKey="created_at" /></div>
                                </th>
                                <th onClick={() => handleSort('approved_at')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 group whitespace-nowrap">
                                    <div className="flex items-center justify-center">Onay Tarihi <SortIcon columnKey="approved_at" /></div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Durum</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={dynamicColSpan} className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin" size={24} /> Veriler yükleniyor...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={dynamicColSpan} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-slate-500">
                                            <FileText size={40} className="mb-3 opacity-20" />
                                            <p className="font-medium">Arşivde {isSatinalma ? 'irsaliye' : 'fatura'} bulunamadı.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice, index) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-center">{index + 1}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-left">
                                            {invoice.company_name || <span className="text-slate-400 italic">Bilinmiyor</span>}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-center">{invoice.invoice_no}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center">
                                            {new Date(invoice.submission_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-center">
                                            {new Date(invoice.created_at || invoice.submission_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center">
                                            {invoice.approved_at ? new Date(invoice.approved_at).toLocaleDateString('tr-TR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                Arşivlendi
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {invoice.file_url ? (
                                                <a href={invoice.file_url} target="_blank" rel="noopener noreferrer"
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Dosyayı Gör">
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                </a>
                                            ) : (
                                                <span className="text-slate-300 dark:text-slate-700 w-9 text-center">-</span>
                                            )}
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
