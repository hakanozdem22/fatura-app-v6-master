import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, Search, FileText, XCircle, CheckCircle2, RotateCcw, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { sendNotification } from '../lib/notificationService';

import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';
import { useFileUrl } from '../hooks/useFileUrl';
import { getPresignedUrlFromR2 } from '../lib/r2Storage';

interface Invoice {
    id: string;
    invoice_no: string;
    company_name?: string;
    submission_date: string;
    amount: number;
    status: string;
    file_url?: string;
    original_file_url?: string;
    document_type?: string;
    created_at?: string;
    approved_at?: string;
    rejection_note?: string;
    rejected_by_id?: string;
    user_id?: string;
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

export default function RejectedDocumentsScreen() {
    const { user, profile } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [userMap, setUserMap] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmModal, setConfirmModal] = useState<{ show: boolean, invoice: Invoice | null }>({ show: false, invoice: null });
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const { resolvedUrl, isLoadingUrl } = useFileUrl(selectedInvoice?.file_url);

    const role = profile?.role?.toLowerCase().trim();
    const isSatinalma = role === 'satinalma';
    const isMuhasebe = role === 'muhasebe';
    const isManager = role === 'manager' || role === 'yonetici';

    const fetchRejected = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('invoices')
                .select('*')
                .eq('status', 'Reddedildi')
                .order('created_at', { ascending: false });

            if (isSatinalma) {
                query = query.eq('document_type', 'İrsaliye');
            } else if (isMuhasebe) {
                query = query.neq('document_type', 'İrsaliye');
            } else if (isManager) {
                // Müdürler sadece kendi reddettiklerini görsün
                if (user?.id) {
                    query = query.eq('rejected_by_id', user.id);
                }
            }

            const { data, error } = await query;

            if (error) {
                console.error("Reddedilenler çekme hatası:", error);
            } else {
                setInvoices(data || []);
            }

            // Kullanıcıları çek
            const { data: usersData } = await supabase.from('users').select('id, full_name, role');
            if (usersData) {
                const map: Record<string, string> = {};
                (usersData as { id: string, full_name: string, role: string }[]).forEach(u => {
                    const title = getRoleTitle(u.role);
                    map[u.id] = `${u.full_name} (${title})`;
                });
                setUserMap(map);
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        } finally {
            setIsLoading(false);
        }
    }, [isSatinalma, isMuhasebe, isManager, user?.id]);

    useEffect(() => {
        fetchRejected();
    }, [fetchRejected]);

    const handleReApprove = async () => {
        const invoice = confirmModal.invoice;
        if (!invoice) return;

        setIsActionLoading(true);
        try {
            let finalFileUrl = invoice.file_url;
            const stampUrl = profile?.approval_stamp_url;

            // DAMGALAMA İŞLEMİ (ManagerApprovalWorkspace.tsx'den uyarlandı)
            if (stampUrl && (invoice.original_file_url || invoice.file_url)) {
                // Her zaman varsa orijinali kullan (kaşeleri temizlemek için), yoksa mevcut olanı
                let sourceUrl = invoice.original_file_url || invoice.file_url;
                if (!sourceUrl) throw new Error("Dosya URL'si bulunamadı.");

                if (sourceUrl.startsWith('r2://')) sourceUrl = await getPresignedUrlFromR2(sourceUrl.replace('r2://', ''));

                const isPdf = sourceUrl.split('?')[0].toLowerCase().endsWith('.pdf');

                if (isPdf) {
                    try {
                        const existingPdfBytes = await fetch(sourceUrl).then(res => res.arrayBuffer());
                        const stampImageBytes = await fetch(stampUrl).then(res => res.arrayBuffer());
                        const pdfDoc = await PDFDocument.load(existingPdfBytes);

                        let stampImage;
                        if (stampUrl.toLowerCase().includes('.png')) {
                            stampImage = await pdfDoc.embedPng(stampImageBytes);
                        } else {
                            stampImage = await pdfDoc.embedJpg(stampImageBytes);
                        }

                        const pages = pdfDoc.getPages();
                        if (pages.length > 0) {
                            const firstPage = pages[0];
                            const { width } = firstPage.getSize();

                            const maxStampWidth = Math.min(150, width * 0.2);
                            const scaleFactor = maxStampWidth / stampImage.width;
                            const stampWidth = stampImage.width * scaleFactor;
                            const stampHeight = stampImage.height * scaleFactor;

                            const paddingX = 40;
                            const paddingY = 40;
                            const role = (profile?.role || '').toLowerCase().trim();

                            let posX = paddingX; // Default: Sol (Muhasebe/Satınalma)
                            if (role === 'yonetici') {
                                posX = (width - stampWidth) / 2; // Orta
                            } else if (role === 'manager') {
                                posX = Math.max(0, width - stampWidth - paddingX); // Sağ
                            }

                            const posY = paddingY;

                            firstPage.drawImage(stampImage, {
                                x: posX,
                                y: posY,
                                width: stampWidth,
                                height: stampHeight,
                            });
                        }

                        const pdfBytes = await pdfDoc.save();
                        const newFileName = `approved_${uuidv4()}.pdf`;
                        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

                        const { error: uploadError } = await supabase.storage
                            .from('invoices-pdfs')
                            .upload(`stamped/${newFileName}`, pdfBlob, {
                                contentType: 'application/pdf',
                            });

                        if (uploadError) throw uploadError;

                        const { data: { publicUrl } } = supabase.storage
                            .from('invoices-pdfs')
                            .getPublicUrl(`stamped/${newFileName}`);

                        finalFileUrl = publicUrl;
                    } catch (pdfError) {
                        console.error("PDF Damgalama Hatası:", pdfError);
                        throw new Error("PDF damgalanamadı.");
                    }
                } else {
                    try {
                        const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve(img);
                            img.onerror = reject;
                            img.src = url;
                        });

                        const [bgImg, stampImg] = await Promise.all([
                            loadImage(sourceUrl),
                            loadImage(stampUrl)
                        ]);

                        const canvas = document.createElement('canvas');
                        canvas.width = bgImg.width;
                        canvas.height = bgImg.height;
                        const ctx = canvas.getContext('2d');

                        if (ctx) {
                            ctx.drawImage(bgImg, 0, 0);
                            const maxStampWidth = bgImg.width * 0.25;
                            const scale = maxStampWidth / stampImg.width;
                            const sWidth = stampImg.width * scale;
                            const sHeight = stampImg.height * scale;
                            const role = (profile?.role || '').toLowerCase().trim();
                            const paddingX = bgImg.width * 0.05;
                            const paddingY = bgImg.height * 0.05;

                            let x = paddingX; // Default: Sol
                            if (role === 'yonetici') {
                                x = (bgImg.width - sWidth) / 2; // Orta
                            } else if (role === 'manager') {
                                x = bgImg.width - sWidth - paddingX; // Sağ
                            }

                            const y = bgImg.height - sHeight - paddingY;

                            ctx.drawImage(stampImg, x, y, sWidth, sHeight);
                            const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
                            const newFileName = `approved_${uuidv4()}.jpg`;

                            const { error: uploadError } = await supabase.storage
                                .from('invoices-pdfs')
                                .upload(`stamped/${newFileName}`, blob, { contentType: 'image/jpeg' });

                            if (uploadError) throw uploadError;

                            const { data: { publicUrl } } = supabase.storage
                                .from('invoices-pdfs')
                                .getPublicUrl(`stamped/${newFileName}`);

                            finalFileUrl = publicUrl;
                        }
                    } catch (imgError) {
                        console.error("Görsel Damgalama Hatası:", imgError);
                        throw new Error("Görsel damgalanamadı.");
                    }
                }
            }

            const { error } = await supabase
                .from('invoices')
                .update({
                    status: 'Müdür Onaylı',
                    file_url: finalFileUrl,
                    approved_by: user?.id,
                    approved_at: new Date().toISOString(),
                    rejection_note: null
                })
                .eq('id', invoice.id);

            if (error) throw error;

            await logAction(
                user?.email || 'unknown',
                'INVOICE_RE_APPROVED',
                `${invoice.invoice_no} numaralı belge hatalı red sonrası yeniden onaylandı.`,
                { invoice_id: invoice.id, invoice_no: invoice.invoice_no }
            );

            // BİLDİRİM GÖNDER (Yükleyen Personele)
            if (invoice.user_id) {
                await sendNotification({
                    user_id: invoice.user_id,
                    title: `Belgeniz Yeniden Onaylandı`,
                    message: `${invoice.invoice_no} nolu ${new Date(invoice.submission_date).toLocaleDateString('tr-TR')} tarihli belgeniz ${profile?.full_name} tarafından yeniden onaylanarak arşive çekildi.`,
                    source_id: invoice.id
                });
            }

            setConfirmModal({ show: false, invoice: null });
            setSelectedInvoice(null);
            fetchRejected();

            setSuccessMessage(`${invoice.invoice_no} numaralı belge başarıyla yeniden onaylandı.`);
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (err) {
            console.error("Yeniden onaylama hatası:", err);
            setSuccessMessage("Hata: İşlem gerçekleştirilemedi.");
            setTimeout(() => setSuccessMessage(null), 3000);
        } finally {
            setIsActionLoading(false);
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        return (
            invoice.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            invoice.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    });
    const dynamicColSpan = 6;


    return (
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-8 p-8">
            <header className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <XCircle className="text-red-500" size={32} />
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                        Reddedilen Belgeler
                    </h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                    {isManager ? "Kendi reddettiğiniz belgeleri buradan inceleyebilir ve gerekirse yeniden onaylayabilirsiniz." : "Hatalı olarak reddedilmiş belgeleri buradan inceleyebilir ve yeniden onaylayabilirsiniz."}
                </p>
            </header>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:max-w-md">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-slate-400" />
                    </div>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
                        placeholder="Şirket adı veya belge no ile ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                    />
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50">
                        <XCircle size={18} />
                        <span className="font-medium text-sm">Toplam {invoices.length} Reddedilen</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Şirket/Firma</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">
                                    {isSatinalma ? 'İrsaliye No' : isMuhasebe ? 'Fatura No' : 'Belge No'}
                                </th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Belge Tipi</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Belge Tarihi</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Red Nedeni</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Durum</th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">İşlemler</th>
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
                                            <CheckCircle2 size={40} className="text-emerald-400/20 mb-3" />
                                            <p className="font-medium">Reddedilen belge bulunamadı.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-left">
                                            {invoice.company_name || <span className="text-slate-400 italic">Bilinmiyor</span>}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-center">{invoice.invoice_no}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${invoice.document_type === 'İrsaliye'
                                                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50'
                                                : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50'
                                                }`}>
                                                {invoice.document_type || 'Belirtilmedi'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center whitespace-nowrap">
                                            {invoice.submission_date ? new Date(invoice.submission_date).toLocaleDateString('tr-TR') : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center max-w-[200px] truncate">
                                            {invoice.rejection_note || 'Belirtilmedi'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                                Reddedildi
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={() => setSelectedInvoice(invoice)}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="İncele ve Yeniden Onayla"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                </button>
                                                <button
                                                    onClick={() => setConfirmModal({ show: true, invoice: invoice })}
                                                    disabled={isActionLoading}
                                                    className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-lg transition-colors"
                                                    title="Hızlı Onayla"
                                                >
                                                    <RotateCcw size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Önizleme ve İşlem Modalı */}
            {selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <XCircle className="text-red-600 dark:text-red-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white leading-none">
                                        {selectedInvoice.company_name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Fatura No: {selectedInvoice.invoice_no} | Reddeden: {selectedInvoice.rejected_by_id ? userMap[selectedInvoice.rejected_by_id] || 'Bilinmiyor' : 'Sistem'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedInvoice(null)}
                                className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-hidden p-6 gap-6 flex flex-col lg:flex-row bg-slate-50 dark:bg-[#0f172a]">
                            <div className="flex-1 h-full min-h-[400px]">
                                {isLoadingUrl ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                        <Loader2 className="animate-spin mb-4" size={48} />
                                        <p>Güvenli arşive erişiliyor...</p>
                                    </div>
                                ) : resolvedUrl ? (
                                    resolvedUrl.split('?')[0].toLowerCase().endsWith('.pdf') ? (
                                        <iframe
                                            src={`${resolvedUrl}#toolbar=1`}
                                            className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg"
                                            title="Belge Önizleme"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 p-2 overflow-auto flex items-center justify-center">
                                            <img
                                                src={resolvedUrl}
                                                alt="Fatura"
                                                className="max-width-full h-auto rounded-lg object-contain"
                                            />
                                        </div>
                                    )
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        <FileText size={48} className="mb-2 opacity-20" />
                                        <p>Belge dosyası bulunamadı.</p>
                                    </div>
                                )}
                            </div>

                            <div className="w-full lg:w-72 flex flex-col gap-4">
                                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Belge Bilgileri</h4>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">İşlem Tarihi</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                                                {selectedInvoice.submission_date ? new Date(selectedInvoice.submission_date).toLocaleDateString('tr-TR') : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Reddeden Kişi</p>
                                            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                                                {selectedInvoice.rejected_by_id ? userMap[selectedInvoice.rejected_by_id] || 'Bilinmiyor' : 'Sistem'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">Belge Türü</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedInvoice.document_type || 'Fatura'}</p>
                                        </div>
                                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800">
                                            <p className="text-[10px] text-red-500 uppercase font-bold tracking-tighter">Red Nedeni</p>
                                            <p className="text-sm text-red-700 dark:text-red-400 font-medium italic mt-1">
                                                "{selectedInvoice.rejection_note || 'Belirtilmedi'}"
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-auto flex flex-col gap-3">
                                    <button
                                        onClick={() => setConfirmModal({ show: true, invoice: selectedInvoice })}
                                        disabled={isActionLoading}
                                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:-translate-y-1"
                                    >
                                        {isActionLoading ? (
                                            <Loader2 className="animate-spin" size={20} />
                                        ) : (
                                            <>
                                                <RotateCcw size={20} />
                                                Yeniden Onayla
                                            </>
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setSelectedInvoice(null)}
                                        className="w-full py-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 font-medium transition-colors"
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Özel Onay Modalı */}
            {confirmModal.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <RotateCcw className="text-emerald-600 dark:text-emerald-400" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Onaylıyor musunuz?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                <span className="font-bold text-slate-700 dark:text-slate-200">{confirmModal.invoice?.invoice_no}</span> numaralı belgeyi alım onaylı faturalar bölümüne göndermek üzeresiniz.
                            </p>
                        </div>
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
                            <button
                                onClick={() => setConfirmModal({ show: false, invoice: null })}
                                className="flex-1 py-3 text-slate-600 dark:text-slate-300 font-bold text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={handleReApprove}
                                disabled={isActionLoading}
                                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isActionLoading ? <Loader2 className="animate-spin" size={18} /> : 'Evet, Onayla'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Başarı Toast Mesajı */}
            {successMessage && (
                <div className="fixed bottom-8 right-8 z-[110] animate-in slide-in-from-right duration-500">
                    <div className="bg-emerald-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500">
                        <CheckCircle2 size={24} />
                        <span className="font-bold text-sm">{successMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
