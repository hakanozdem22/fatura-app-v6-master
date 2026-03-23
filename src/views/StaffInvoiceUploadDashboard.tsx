import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FileUp, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { sendNotification } from '../lib/notificationService';
import { executeViewFile } from '../hooks/useFileUrl';

interface Invoice {
    id: string;
    invoice_no: string;
    company_name?: string;
    submission_date: string;
    amount: number;
    status: string;
    file_url?: string;
    original_file_url?: string; // NEW column
    user_id?: string;
    document_type?: string;
    assigned_manager_id?: string;
    created_at?: string;
    rejection_note?: string;
}

interface Manager {
    id: string;
    full_name: string;
    email: string;
    role: string;
}

// Custom Select Component for Dark Mode
function CustomSelect({
    label,
    value,
    options,
    onChange,
    placeholder = "Seçiniz...",
    disabled = false,
    required = false
}: {
    label: string,
    value: string,
    options: { value: string, label: string }[],
    onChange: (val: string) => void,
    placeholder?: string,
    disabled?: boolean,
    required?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value);

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <label className={`text-[11px] font-black uppercase tracking-[0.2em] px-1 italic ${required ? 'text-red-500/80' : 'text-slate-500'}`}>
                {label} {required && '*'}
            </label>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full bg-[#1e293b]/50 border border-slate-700/50 p-3 rounded-xl text-[15px] font-bold flex items-center justify-between cursor-pointer transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600 focus:ring-2 focus:ring-blue-500/50'} ${isOpen ? 'ring-2 ring-blue-500/50 border-blue-500/50' : ''}`}
            >
                <span className={selectedOption ? 'text-white' : 'text-slate-500'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={18} className={`text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[70] left-0 right-0 mt-2 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-h-60 overflow-y-auto py-2">
                        {options.map((opt) => (
                            <div
                                key={opt.value}
                                onClick={() => {
                                    onChange(opt.value);
                                    setIsOpen(false);
                                }}
                                className={`px-4 py-3 text-sm font-bold cursor-pointer transition-colors ${value === opt.value ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'}`}
                            >
                                {opt.label}
                            </div>
                        ))}
                        {options.length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-500 italic">Seçenek bulunamadı</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function StaffInvoiceUploadDashboard() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'idle' | 'info' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [invoiceToDelete, setInvoiceToDelete] = useState<{ id: string, fileUrl: string | undefined } | null>(null);
    const [managers, setManagers] = useState<Manager[]>([]);
    const { user, profile } = useAuth();

    // Normalizasyon fonksiyonu (Türkçe karakter hassasiyetini ortadan kaldırır)
    const turkishNormalize = (str: string) => {
        return str
            .toLowerCase()
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c')
            .replace(/i̇/g, 'i')
            .trim();
    };

    // Tarih formatlama fonksiyonu (GG.AA.YYYY)
    const formatDateInput = (value: string) => {
        const digits = value.replace(/\D/g, '').substring(0, 8);
        let formatted = digits;
        if (digits.length > 2) {
            formatted = digits.substring(0, 2) + '.' + digits.substring(2);
        }
        if (digits.length > 4) {
            formatted = digits.substring(0, 2) + '.' + digits.substring(2, 4) + '.' + digits.substring(4);
        }
        return formatted;
    };

    const userRole = profile?.role?.toLowerCase().trim() || '';
    const isWaybillRole = userRole.includes('irsaliye');
    const isFaturaRole = userRole.includes('fatura') || userRole === 'user';

    // YENİ: Ön izleme modalı state'leri
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [pendingInvoiceData, setPendingInvoiceData] = useState<Omit<Invoice, 'id'> | null>(null);
    const [previewFileUrl, setPreviewFileUrl] = useState<string | null>(null);
    const [previewFileType, setPreviewFileType] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Faturaları Supabase'den çek
    const fetchInvoices = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'Bekliyor')
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Fatura çekme hatası:", error);
            } else {
                setInvoices(data || []);
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    const fetchApprovers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, full_name, email, role')
                .in('role', ['manager', 'yonetici'])
                .eq('status', 'active');

            if (error) {
                console.error("Yöneticileri çekme hatası:", error);
            } else {
                setManagers(data || []);
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        }
    }, []);

    useEffect(() => {
        if (user) {
            fetchInvoices();
            fetchApprovers();
        }
    }, [user, fetchInvoices, fetchApprovers]);

    // Belge tipi İrsaliye seçildiğinde varsayılan onay amiri olarak Yüksel Koçyiğit'i ata
    useEffect(() => {
        if (pendingInvoiceData && pendingInvoiceData.document_type === 'İrsaliye' && !pendingInvoiceData.assigned_manager_id) {
            const yuksel = managers.find(m => {
                const normalizedName = turkishNormalize(m.full_name || '');
                return normalizedName.includes('yuksel') && normalizedName.includes('kocyigit');
            });
            if (yuksel) {
                setPendingInvoiceData(prev => prev ? { ...prev, assigned_manager_id: yuksel.id } : null);
            }
        }
    }, [pendingInvoiceData, managers]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            setUploadStatus({ type: 'error', message: 'Dosya boyutu 20MB\'dan küçük olmalıdır.' });
            return;
        }

        setIsUploading(true);
        setUploadStatus({ type: 'info', message: 'Belge Hazırlanıyor...' });

        try {
            setUploadStatus({ type: 'info', message: 'Belge buluta yükleniyor...' });

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
            const filePath = `uploads/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('invoices-pdfs')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('invoices-pdfs')
                .getPublicUrl(filePath);

            const docType = isWaybillRole ? 'İrsaliye' : (isFaturaRole ? 'Fatura' : '');

            setPendingInvoiceData({
                invoice_no: '',
                company_name: '',
                submission_date: '',
                amount: 0,
                status: 'Bekliyor',
                file_url: publicUrl,
                user_id: user?.id,
                document_type: docType,
                assigned_manager_id: '',
            });

            setPreviewFileUrl(URL.createObjectURL(file));
            setPreviewFileType(file.type);


            setShowPreviewModal(true);

        } catch (error: unknown) {
            console.error('Yükleme hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Yükleme sırasında bir hata oluştu.';
            setUploadStatus({ type: 'error', message: errorMessage });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setTimeout(() => setUploadStatus({ type: 'idle', message: '' }), 5000);
        }
    };

    const handleConfirmSubmit = async () => {
        if (!pendingInvoiceData) return;

        // Validasyonlar
        if (!pendingInvoiceData.document_type) {
            setUploadStatus({ type: 'error', message: 'Lütfen belge tipini (Fatura/İrsaliye) seçiniz.' });
            return;
        }

        if (!pendingInvoiceData.assigned_manager_id) {
            setUploadStatus({ type: 'error', message: 'Lütfen belgeyi onaylayacak olanı (Müdür/Yönetici) seçiniz.' });
            return;
        }

        // Tarih Validasyonu (GG.AA.YYYY)
        const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\.(0[1-9]|1[0-2])\.\d{4}$/;
        if (!dateRegex.test(pendingInvoiceData.submission_date)) {
            setUploadStatus({ type: 'error', message: 'Lütfen tarihi GG.AA.YYYY formatında giriniz (Örn: 17.03.2024)' });
            return;
        }

        setUploadStatus({ type: 'info', message: 'Belge sisteme kaydediliyor...' });
        setShowPreviewModal(false);

        try {
            // Tarihi veritabanına hazır hale getir (GG.AA.YYYY -> YYYY-MM-DD)
            const [day, month, year] = pendingInvoiceData.submission_date.split('.');
            const dbDate = `${year}-${month}-${day}`;

            const { data, error: dbError } = await supabase
                .from('invoices')
                .insert([{
                    ...pendingInvoiceData,
                    submission_date: dbDate // Veritabanı formatına dönüştürülen tarih
                }])
                .select()
                .single();

            if (dbError) {
                console.error("Veritabanı kayıt hatası:", dbError);
                throw new Error("Belge bilgileri kaydedilemedi.");
            }

            setUploadStatus({ type: 'success', message: 'Belge onaya başarıyla gönderildi.' });
            fetchInvoices(); // Listeyi yenile

            // YENİ: Başarılı Yükleme Logu
            await logAction(
                user?.email,
                'Belge Yükleme',
                `${pendingInvoiceData.document_type} yüklendi: ${pendingInvoiceData.invoice_no} (${pendingInvoiceData.company_name})`,
                undefined
            );

            // BİLDİRİM GÖNDER (Seçilen Yöneticiye)
            if (pendingInvoiceData.assigned_manager_id) {
                await sendNotification({
                    user_id: pendingInvoiceData.assigned_manager_id,
                    title: `Yeni ${pendingInvoiceData.document_type} Onay Bekliyor`,
                    message: `${pendingInvoiceData.invoice_no} nolu ${new Date(pendingInvoiceData.submission_date).toLocaleDateString('tr-TR')} tarihli ${pendingInvoiceData.document_type.toLowerCase()} onayınız için ${profile?.full_name} tarafından sisteme yüklendi.`,
                    source_id: data.id
                });
            }

            setPendingInvoiceData(null);
        } catch (error: unknown) {
            console.error('Kayıt hatası:', error);
            const errorMessage = error instanceof Error ? error.message : 'Kayıt sırasında bir hata oluştu.';
            setUploadStatus({ type: 'error', message: errorMessage });
            setShowPreviewModal(true); // Hata durumunda modalı geri açabiliriz
        }
    };

    const handleDeleteClick = (id: string, fileUrl: string | undefined) => {
        setInvoiceToDelete({ id, fileUrl });
        setShowDeleteModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!invoiceToDelete) return;

        const { id, fileUrl } = invoiceToDelete;
        setShowDeleteModal(false);
        setInvoiceToDelete(null);

        try {
            // 1. Veritabanından sil
            const { error: dbError } = await supabase
                .from('invoices')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            // 2. Storage'dan sil (Eğer dosya varsa)
            if (fileUrl) {
                // publicUrl'den dosya adını/yolunu çıkar: /storage/v1/object/public/invoices-pdfs/uploads/dosyadi.pdf
                const matches = fileUrl.match(/\/invoices-pdfs\/(.+)$/);
                if (matches && matches[1]) {
                    const filePath = matches[1];
                    const { error: storageError } = await supabase.storage
                        .from('invoices-pdfs')
                        .remove([filePath]);

                    if (storageError) console.error("Storage silme hatası:", storageError);
                }
            }

            // Listeyi UI'da güncelle
            setInvoices(invoices.filter(inv => inv.id !== id));
            setUploadStatus({ type: 'success', message: 'Belge başarıyla silindi.' });

            // YENİ: Başarılı Silme Logu
            await logAction(
                user?.email,
                'Belge Silme (Kullanıcı İşlemi)',
                `Bekleyen belge silindi: ID = ${id}`
            );

            setTimeout(() => setUploadStatus({ type: 'idle', message: '' }), 3000);

        } catch (error: unknown) {
            console.error('Silme hatası:', error);
            setUploadStatus({ type: 'error', message: 'Belge silinirken bir hata oluştu.' });
            setTimeout(() => setUploadStatus({ type: 'idle', message: '' }), 5000);
        }
    };

    const StatusBadge = ({ invoice }: { invoice: Invoice }) => {
        const { status, document_type } = invoice;
        switch (status) {
            case 'Bekliyor':
                return <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">Onay Bekliyor</span>;
            case 'Müdür Onaylı':
                return (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        {document_type === 'İrsaliye' ? 'Onay Bekliyor (Satın Alma)' : 'Onay Bekliyor (Muhasebe)'}
                    </span>
                );
            case 'Onaylandı':
                return <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">Arşivlendi</span>;
            case 'Reddedildi':
                return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">Reddedildi</span>;
            default:
                return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-400">{status}</span>;
        }
    };

    return (
        <>
            {/* Modal: PDF ve OCR Önizleme Onayı */}
            {showPreviewModal && pendingInvoiceData && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/90 backdrop-blur-md p-0 sm:p-4">
                    <div className="w-full max-w-7xl h-full sm:h-[90vh] flex flex-col md:flex-row rounded-none sm:rounded-2xl bg-[#0f172a] shadow-2xl border border-slate-800 overflow-y-auto md:overflow-hidden text-white/90 font-sans tracking-tight">

                        {/* Sol Taraf: Medya Önizleme */}
                        <div className="w-full md:w-[65%] bg-[#020617] flex flex-col border-r border-slate-800/50 min-h-[60vh] md:h-full">

                            <div className="flex-1 overflow-hidden flex justify-center items-stretch p-0 bg-slate-950">
                                <div className="w-full h-full bg-slate-900/50 shadow-2xl relative group">
                                    {previewFileType?.includes('pdf') ? (
                                        <iframe src={previewFileUrl || ''} className="w-full h-full border-none filter invert-[0.05]" />
                                    ) : (
                                        <div className="w-full h-full overflow-auto p-4 sm:p-8 flex justify-center items-start">
                                            <img src={previewFileUrl || ''} alt="Belge" className="max-w-full h-auto object-contain transition-transform duration-500 shadow-2xl" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Sağ Taraf: Detaylar ve Form */}
                        <div className="w-full md:w-[35%] flex flex-col bg-[#0f172a] overflow-y-auto md:h-full min-h-[400px]">
                            <div className="p-5 flex flex-col gap-4 flex-1">

                                {/* Başlık Bölümü */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                            <CheckCircle2 size={22} className="text-emerald-500" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white tracking-tighter">Onaya Gönder</h2>
                                            <p className="text-sm text-slate-400 font-medium leading-relaxed">Belge detaylarını kontrol edip bir onay amiri seçiniz.</p>
                                        </div>
                                    </div>

                                    {/* Uyarı Kutusu */}
                                    {formError ? (
                                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex gap-4 items-start animate-in fade-in slide-in-from-top-2 duration-300">
                                            <div className="w-6 h-6 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center shrink-0">
                                                <AlertCircle size={14} className="text-red-500" />
                                            </div>
                                            <p className="text-[13px] text-red-400 font-bold leading-relaxed">
                                                {formError}
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="bg-[#1e293b]/50 border border-slate-800 p-4 rounded-xl flex gap-4 items-start animate-in fade-in slide-in-from-top-2 duration-700">
                                            <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shrink-0">
                                                <AlertCircle size={14} className="text-blue-500" />
                                            </div>
                                            <p className="text-[13px] text-slate-300 leading-relaxed font-medium">
                                                Lütfen belge detaylarını kontrol ediniz ve eksik alanları doldurunuz.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Personel Kartı */}
                                <div className="bg-[#1e293b]/40 border border-slate-800 p-3 rounded-2xl flex items-center gap-4 ring-1 ring-white/5">
                                    <div className="w-10 h-10 rounded-full bg-[#1d4ed8]/20 border border-blue-500/20 flex items-center justify-center text-xl font-black text-blue-500 shadow-inner ring-1 ring-blue-500/10 overflow-hidden">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            profile?.full_name ? profile.full_name[0].toUpperCase() : 'B'
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Yükleyen Personel</p>
                                        <p className="text-[15px] font-extrabold text-white tracking-tight">{profile?.full_name || 'Kullanıcı'}</p>
                                    </div>
                                </div>

                                {/* Form Alanları */}
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <CustomSelect
                                            label="Belge Tipi"
                                            value={pendingInvoiceData.document_type || ''}
                                            options={[
                                                ...(userRole.includes('irsaliye') && !userRole.includes('fatura') ? [] : [{ value: 'Fatura', label: 'Fatura' }]),
                                                ...(userRole.includes('fatura') && !userRole.includes('irsaliye') ? [] : [{ value: 'İrsaliye', label: 'İrsaliye' }])
                                            ]}
                                            onChange={(val) => setPendingInvoiceData({ ...pendingInvoiceData, document_type: val })}
                                            required
                                            disabled={userRole !== 'fatura_irsaliye' && (userRole.includes('irsaliye') || userRole.includes('fatura') || userRole === 'user')}
                                        />
                                        <CustomSelect
                                            label="Onay Amiri"
                                            value={pendingInvoiceData.assigned_manager_id || ''}
                                            options={managers.map(m => ({
                                                value: m.id,
                                                label: `${m.full_name} (${m.role === 'manager' ? 'Müdür' : 'Yönetici'})`
                                            }))}
                                            onChange={(val) => setPendingInvoiceData({ ...pendingInvoiceData, assigned_manager_id: val })}
                                            placeholder="Seçiniz..."
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Şirket/Ünvan</label>
                                        <input
                                            type="text"
                                            value={pendingInvoiceData.company_name || ''}
                                            onChange={(e) => setPendingInvoiceData({ ...pendingInvoiceData, company_name: e.target.value })}
                                            className="w-full bg-[#1e293b]/50 border border-slate-700/50 p-3.5 rounded-xl text-[16px] font-extrabold outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">
                                                {profile?.role === 'fatura_irsaliye' ? 'Fatura / İrsaliye Numarası' : (pendingInvoiceData.document_type === 'İrsaliye' ? 'İrsaliye Numarası' : 'Fatura Numarası')}
                                            </label>
                                            <input
                                                type="text"
                                                value={pendingInvoiceData.invoice_no || ''}
                                                onChange={(e) => {
                                                    const rawValue = e.target.value.toUpperCase();
                                                    if (/[^a-zA-Z0-9_-]/.test(rawValue)) {
                                                        setFormError('Belge numarası özel karakter içeremez. Sadece harf, rakam, tire (-) ve alt çizgi (_) kullanabilirsiniz.');
                                                    } else {
                                                        setFormError(null);
                                                        setPendingInvoiceData({ ...pendingInvoiceData, invoice_no: rawValue });
                                                    }
                                                }}
                                                className={`w-full bg-[#1e293b]/50 border ${formError ? 'border-red-500/50 focus:ring-red-500/50' : 'border-slate-700/50 focus:ring-blue-500/50'} p-3.5 rounded-xl text-[15px] font-black outline-none focus:ring-2 transition-all`}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] px-1">
                                                {profile?.role === 'fatura_irsaliye' ? 'Fatura / İrsaliye Tarihi' : (pendingInvoiceData.document_type === 'İrsaliye' ? 'İrsaliye Tarihi' : 'Fatura Tarihi')}
                                            </label>
                                            <input
                                                type="text"
                                                value={pendingInvoiceData.submission_date || ''}
                                                onChange={(e) => {
                                                    const formattedDate = formatDateInput(e.target.value);
                                                    setPendingInvoiceData(prev => prev ? { ...prev, submission_date: formattedDate } : null);
                                                }}
                                                placeholder="GG.AA.YYYY"
                                                className="w-full bg-[#1e293b]/50 border border-slate-700/50 p-3.5 rounded-xl text-[15px] font-black outline-none focus:ring-2 focus:ring-blue-500/50 text-center"
                                            />
                                        </div>
                                    </div>

                                </div>
                            </div>

                            {/* Butonlar */}
                            <div className="p-5 pt-0 flex gap-3 mt-auto">
                                <button
                                    onClick={() => { setShowPreviewModal(false); setPendingInvoiceData(null); }}
                                    className="flex-1 py-3.5 rounded-xl bg-[#1e293b] text-[#94a3b8] font-black text-[14px] hover:bg-[#334155] hover:text-white transition shadow-lg border border-slate-700/50"
                                >
                                    İptal Et
                                </button>
                                <button
                                    onClick={handleConfirmSubmit}
                                    className="flex-[1.5] py-3.5 rounded-xl bg-[#2563eb] text-white font-black text-[15px] hover:bg-[#1d4ed8] transition shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
                                >
                                    Gönder <span className="material-symbols-outlined text-[20px]">send</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                                <AlertCircle size={24} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Belgeyi Sil</h3>
                        </div>
                        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                            Bu belgeyi ve bağlı olduğu PDF dosyasını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </p>
                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                onClick={() => { setShowDeleteModal(false); setInvoiceToDelete(null); }}
                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 dark:hover:bg-red-500"
                            >
                                Sil
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
                {/*  Header  */}
                <header className="flex flex-col gap-1">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                        {profile?.role?.toLowerCase().includes('irsaliye') ? 'İrsaliye Sorumlusu Paneli' : (profile?.role?.toLowerCase().includes('fatura') || profile?.role === 'user' ? 'Fatura Sorumlusu Paneli' : 'Fatura / İrsaliye Sorumlusu Paneli')}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">Onay için gönderdiğiniz son belgeleri yönetin ve takip edin.</p>
                </header>

                {/*  Stats Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                                <span className="material-symbols-outlined">pending_actions</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Onay Bekleyen Belgeleriniz</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{invoices.filter(i => i.status === 'Bekliyor').length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                                <span className="material-symbols-outlined">check_circle</span>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Arşivlenenler</p>
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{invoices.filter(i => i.status === 'Onaylandı').length}</p>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchInvoices()}
                        disabled={isLoading}
                        className="group flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm transition-all hover:bg-blue-100 hover:shadow-md dark:border-blue-900/30 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 disabled:opacity-50"
                    >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>
                            <span className="material-symbols-outlined">refresh</span>
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Sayfayı Yenile</p>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/60">Verileri Manuel Güncelle</p>
                        </div>
                    </button>
                </div>

                {/*  Upload Section  */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="border-b border-slate-100 p-6 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Yeni Belge Yükle</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Belgelerinizi güvenli bir şekilde aktarın.</p>
                        </div>
                        {uploadStatus.message && (
                            <div className={`text-sm px-4 py-2 rounded-md flex items-center gap-2 
                                ${uploadStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : uploadStatus.type === 'info' ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                                        : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                                {uploadStatus.type === 'success' ? <CheckCircle2 size={16} /> : uploadStatus.type === 'info' ? <Loader2 className="animate-spin" size={16} /> : <AlertCircle size={16} />}
                                {uploadStatus.message}
                            </div>
                        )}
                    </div>
                    <div className="p-6">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".pdf, .jpg, .jpeg, .png"
                            className="hidden"
                            id="file-upload"
                            disabled={isUploading}
                        />
                        <label htmlFor="file-upload" className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 py-12 text-center transition-colors cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-primary dark:hover:bg-primary/10'}`}>
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white text-primary shadow-sm dark:bg-slate-800">
                                {isUploading ? <Loader2 className="animate-spin text-primary" size={32} /> : <FileUp size={32} />}
                            </div>
                            <p className="text-lg font-medium text-slate-900 dark:text-white">
                                {isUploading ? 'Belge Hazırlanıyor...' : (profile?.role?.toLowerCase().includes('irsaliye') ? 'İrsaliyenizi (PDF/Fotoğraf) seçmek için tıklayın' : 'Faturanızı (PDF/Fotoğraf) seçmek için tıklayın')}
                            </p>
                            <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                                Desteklenen formatlar: PDF, JPG, PNG (Maks 20MB)
                            </p>
                        </label>
                    </div>
                </div>

                {/*  Recent Uploads Table  */}
                <div className="flex flex-col gap-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Onaya Gönderilenler</h3>
                    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] text-left text-sm">
                                <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Şirket/Firma</th>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Belge Tipi</th>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">
                                            {profile?.role?.toLowerCase().includes('irsaliye') ? 'İrsaliye No' : (profile?.role?.toLowerCase().includes('fatura') ? 'Fatura No' : 'Belge No')}
                                        </th>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">
                                            {profile?.role?.toLowerCase().includes('irsaliye') ? 'İrsaliye Tarihi' : (profile?.role?.toLowerCase().includes('fatura') ? 'Fatura Tarihi' : 'Belge Tarihi')}
                                        </th>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Yükleme Tarihi</th>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Durum</th>
                                        <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="animate-spin" size={20} /> Veriler yükleniyor...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="px-6 py-8 text-center text-slate-500">
                                                Henüz belge yüklenmemiş.
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((invoice) => (
                                            <tr key={invoice.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
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
                                                <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-center">{invoice.invoice_no}</td>
                                                <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center">
                                                    {new Date(invoice.submission_date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-center">
                                                    {new Date(invoice.created_at || invoice.submission_date).toLocaleDateString('tr-TR')}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <StatusBadge invoice={invoice} />
                                                        {invoice.status === 'Reddedildi' && invoice.rejection_note && (
                                                            <span className="text-[10px] text-red-500 font-medium max-w-[120px] truncate" title={invoice.rejection_note}>
                                                                {invoice.rejection_note}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-end gap-2">
                                                        {invoice.file_url && (
                                                            <button onClick={() => executeViewFile(invoice.file_url)} className="text-slate-400 hover:text-primary dark:hover:text-primary transition-colors inline-block" title="Dosyayı Gör">
                                                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteClick(invoice.id, invoice.file_url)}
                                                            className="text-slate-400 hover:text-red-500 transition-colors inline-block"
                                                            title="Faturayı Sil"
                                                        >
                                                            <span className="material-symbols-outlined text-[20px]">delete</span>
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
                </div>
            </div>
        </>
    );
}
