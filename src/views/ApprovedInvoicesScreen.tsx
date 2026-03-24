import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Loader2, CheckCircle2, Search, Trash2, AlertTriangle, X, FileText, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';
import { sendNotification } from '../lib/notificationService';

import { PDFDocument } from 'pdf-lib';
import { uploadFileToR2, getPresignedUrlFromR2 } from '../lib/r2Storage';
import { useFileUrl, executeViewFile } from '../hooks/useFileUrl';

interface Invoice {
    id: string;
    invoice_no: string;
    company_name?: string;
    submission_date: string;
    amount: number;
    status: string;
    file_url?: string;
    document_type?: string;
    approved_at?: string;
    user_id?: string;
    created_at?: string;
    rejection_note?: string;
    approval_note?: string;
    assigned_manager_id?: string;
}

export default function ApprovedInvoicesScreen() {
    const [searchParams] = useSearchParams();
    const docType = searchParams.get('type');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string, invoiceNo: string }>({ isOpen: false, id: '', invoiceNo: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
        key: 'approved_at',
        direction: 'desc'
    });

    const handleSort = (key: string) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
        }));
    };

    const SortIcon = ({ columnKey }: { columnKey: string }) => {
        if (sortConfig.key !== columnKey) return <ChevronsUpDown size={16} className="ml-1 opacity-20 group-hover:opacity-50 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ChevronUp size={16} className="ml-1 text-primary stroke-[2.5]" /> : <ChevronDown size={16} className="ml-1 text-primary stroke-[2.5]" />;
    };

    // Muhasebe Workspace States
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [actionStatus, setActionStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectNote, setRejectNote] = useState('');
    const { user, profile } = useAuth();

    // Rolü normalleştir
    const rawRole = (profile?.role || 'user').toLowerCase().trim();
    const isManager = rawRole === 'manager';
    const isMuhasebe = rawRole === 'muhasebe';
    const isSatinalma = rawRole === 'satinalma';

    const { resolvedUrl, isLoadingUrl } = useFileUrl(selectedInvoice?.file_url);

    const fetchApprovedInvoices = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .from('invoices')
                .select('*')
                .order('approved_at', { ascending: false });

            if (isMuhasebe) {
                query = query.eq('status', 'Müdür Onaylı').neq('document_type', 'İrsaliye');
            } else if (isSatinalma) {
                query = query.eq('status', 'Müdür Onaylı').eq('document_type', 'İrsaliye');
            } else if (isManager) {
                // Müdür hem tamamen onaylanmışları hem de kendi onaylayıp muhasebe/satın alma bekleyenleri görsün
                query = query.in('status', ['Onaylandı', 'Müdür Onaylı']);
                if (user?.id) query = query.eq('approved_by', user.id);
                if (docType) query = query.eq('document_type', docType);
            } else {
                query = query.eq('status', 'Onaylandı');
            }

            const { data, error } = await query;

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
    }, [user?.id, isMuhasebe, isManager, isSatinalma, docType]);

    useEffect(() => {
        fetchApprovedInvoices();
    }, [fetchApprovedInvoices]);

    const handleDeleteClick = (id: string, invoiceNo: string) => {
        setDeleteModal({ isOpen: true, id, invoiceNo });
    };

    const handleApprove = async () => {
        if (!selectedInvoice || isProcessing) return;
        setIsProcessing(true);
        try {
            let finalFileUrl = selectedInvoice.file_url;

            // Muhasebe'nin onay kaşesini çek
            const { data: userProfile } = user ? await supabase.from('users').select('approval_stamp_url').eq('id', user.id).single() : { data: null };
            const stampUrl = userProfile?.approval_stamp_url || profile?.approval_stamp_url;

            if (stampUrl && selectedInvoice.file_url) {
                // R2 üzerinden geliyorsa geçici URL üret
                let sourceFetchUrl = selectedInvoice.file_url;
                const isAlreadyInR2 = sourceFetchUrl.startsWith('r2://');
                if (isAlreadyInR2) {
                    const r2Key = sourceFetchUrl.replace('r2://', '');
                    sourceFetchUrl = await getPresignedUrlFromR2(r2Key);
                }

                const isPdf = selectedInvoice.file_url.toLowerCase().includes('.pdf');
                if (isPdf) {
                    setActionStatus({ type: 'idle', message: 'Onay kaşesi ekleniyor (PDF)...' });
                    try {
                        const existingPdfBytes = await fetch(sourceFetchUrl).then(res => res.arrayBuffer());
                        const pdfDoc = await PDFDocument.load(existingPdfBytes);
                        const pages = pdfDoc.getPages();
                        const stampImageBytes = await fetch(stampUrl).then(res => res.arrayBuffer());
                        let stampImage;
                        if (stampUrl.toLowerCase().includes('.png')) {
                            stampImage = await pdfDoc.embedPng(stampImageBytes);
                        } else {
                            stampImage = await pdfDoc.embedJpg(stampImageBytes);
                        }

                        pages.forEach((page) => {
                            const { width } = page.getSize();
                            const maxStampWidth = Math.min(150, width * 0.2);
                            const scaleFactor = maxStampWidth / stampImage.width;
                            const stampWidth = stampImage.width * scaleFactor;
                            const stampHeight = stampImage.height * scaleFactor;
                            const safeX = 40;
                            const safeY = 40;
                            page.drawImage(stampImage, {
                                x: safeX,
                                y: safeY,
                                width: stampWidth,
                                height: stampHeight,
                            });
                        });

                        const pdfBytes = await pdfDoc.save();
                        const safeInvoiceNo = selectedInvoice.invoice_no.replace(/[^a-zA-Z0-9_-]/g, '_');
                        const r2Folder = selectedInvoice.document_type === 'İrsaliye' ? 'irsaliyeler' : 'faturalar';
                        const newFileName = `${safeInvoiceNo}.pdf`;
                        const r2Key = `${r2Folder}/${newFileName}`;
                        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

                        setActionStatus({ type: 'idle', message: 'Dosya güvenli arşive (R2) yükleniyor...' });
                        const r2Success = await uploadFileToR2(pdfBlob, r2Key, 'application/pdf');
                        if (!r2Success) throw new Error("R2 Kasa Yükleme Başarısız!");

                        finalFileUrl = `r2://${r2Key}`;

                        // Eski dosya Supabase'de ise temizle
                        if (!isAlreadyInR2) {
                            const matches = selectedInvoice.file_url.match(/\/invoices-pdfs\/(.+)$/);
                            if (matches && matches[1]) {
                                await supabase.storage.from('invoices-pdfs').remove([matches[1]]);
                            }
                        }
                    } catch (pdfError) {
                        console.error("Muhasebe Kaşesi Hatası (PDF):", pdfError);
                        setActionStatus({ type: 'error', message: 'PDF damgalanamadı.' });
                        setIsProcessing(false);
                        return;
                    }
                } else {
                    // GÖRSEL DAMGALAMA
                    setActionStatus({ type: 'idle', message: 'Onay kaşesi ekleniyor (Görsel)...' });
                    try {
                        const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve(img);
                            img.onerror = reject;
                            img.src = url;
                        });

                        const [bgImg, stampImg] = await Promise.all([
                            loadImage(sourceFetchUrl),
                            loadImage(stampUrl)
                        ]);

                        const canvas = document.createElement('canvas');
                        canvas.width = bgImg.width;
                        canvas.height = bgImg.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(bgImg, 0, 0);
                            const maxStampWidth = bgImg.width * 0.20;
                            const scale = maxStampWidth / stampImg.width;
                            const sWidth = stampImg.width * scale;
                            const sHeight = stampImg.height * scale;
                            const x = 40;
                            const y = bgImg.height - sHeight - 40;
                            ctx.drawImage(stampImg, x, y, sWidth, sHeight);

                            const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
                            const safeInvoiceNo = selectedInvoice.invoice_no.replace(/[^a-zA-Z0-9_-]/g, '_');
                            const r2Folder = selectedInvoice.document_type === 'İrsaliye' ? 'irsaliyeler' : 'faturalar';
                            const newFileName = `${safeInvoiceNo}.jpg`;
                            const r2Key = `${r2Folder}/${newFileName}`;

                            setActionStatus({ type: 'idle', message: 'Dosya güvenli arşive (R2) yükleniyor...' });
                            const r2Success = await uploadFileToR2(blob, r2Key, 'image/jpeg');
                            if (!r2Success) throw new Error("R2 Kasa Yükleme Başarısız!");

                            finalFileUrl = `r2://${r2Key}`;

                            if (!isAlreadyInR2) {
                                const matches = selectedInvoice.file_url.match(/\/invoices-pdfs\/(.+)$/);
                                if (matches && matches[1]) {
                                    await supabase.storage.from('invoices-pdfs').remove([matches[1]]);
                                }
                            }
                        }
                    } catch (imgError) {
                        console.error("Muhasebe Kaşesi Hatası (Görsel):", imgError);
                        setActionStatus({ type: 'error', message: 'Görsel damgalanamadı.' });
                        setIsProcessing(false);
                        return;
                    }
                }
            }

            const { error } = await supabase
                .from('invoices')
                .update({
                    status: 'Onaylandı',
                    file_url: finalFileUrl,
                    accountant_id: user?.id,
                    accountant_approved_at: new Date().toISOString()
                })
                .eq('id', selectedInvoice.id);

            if (error) throw error;

            setActionStatus({ type: 'success', message: `Belge #${selectedInvoice.invoice_no} ${isSatinalma ? 'satınalma' : 'muhasebe'} tarafından onaylandı.` });

            await logAction(
                user?.email,
                isSatinalma ? 'Satınalma Onayı' : 'Muhasebe Onayı',
                `${selectedInvoice.document_type || 'Belge'} #${selectedInvoice.invoice_no} ${isSatinalma ? 'satınalma' : 'muhasebe'} tarafından onaylandı`,
                undefined
            );

            // BİLDİRİM GÖNDER (Yükleyen Personele)
            if (selectedInvoice.user_id) {
                await sendNotification({
                    user_id: selectedInvoice.user_id,
                    title: `Belgeniz Nihai Onay Aldı (${isSatinalma ? 'Satın Alma' : 'Muhasebe'})`,
                    message: `${selectedInvoice.invoice_no} nolu ${new Date(selectedInvoice.submission_date).toLocaleDateString('tr-TR')} tarihli ${selectedInvoice.document_type?.toLowerCase()} ${isSatinalma ? 'Satın Alma' : 'Muhasebe'} birimi tarafındanda onaylanarak süreç tamamlandı.`,
                    source_id: selectedInvoice.id
                });
            }

            // BİLDİRİM GÖNDER (Müdüre/Yöneticiye - eğer yükleyici değilse)
            if (selectedInvoice.assigned_manager_id && selectedInvoice.assigned_manager_id !== selectedInvoice.user_id) {
                await sendNotification({
                    user_id: selectedInvoice.assigned_manager_id,
                    title: `Onayladığınız Belge Nihai Onay Aldı`,
                    message: `${selectedInvoice.invoice_no} nolu belge ${isSatinalma ? 'Satın Alma' : 'Muhasebe'} birimi tarafından onaylanarak arşivlendi.`,
                    source_id: selectedInvoice.id
                });
            }

            fetchApprovedInvoices();
            setTimeout(() => {
                setSelectedInvoice(null);
            }, 1500);
        } catch (err) {
            console.error("Onay hatası:", err);
            setActionStatus({ type: 'error', message: 'Onay verilirken bir hata oluştu.' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!selectedInvoice || !rejectNote || isProcessing) return;
        setIsProcessing(true);
        try {
            let finalFileUrl = selectedInvoice.file_url;

            // Ret kaşesini çek
            const { data: userProfile } = user ? await supabase.from('users').select('rejection_stamp_url').eq('id', user.id).single() : { data: null };
            const stampUrl = userProfile?.rejection_stamp_url || profile?.rejection_stamp_url;

            if (stampUrl && selectedInvoice.file_url) {
                let sourceFetchUrl = selectedInvoice.file_url;
                const isAlreadyInR2 = sourceFetchUrl.startsWith('r2://');
                if (isAlreadyInR2) {
                    const r2Key = sourceFetchUrl.replace('r2://', '');
                    sourceFetchUrl = await getPresignedUrlFromR2(r2Key);
                }

                const isPdf = selectedInvoice.file_url.toLowerCase().includes('.pdf');
                if (isPdf) {
                    setActionStatus({ type: 'idle', message: 'Ret kaşesi ekleniyor (PDF)...' });
                    try {
                        const existingPdfBytes = await fetch(sourceFetchUrl).then(res => res.arrayBuffer());
                        const pdfDoc = await PDFDocument.load(existingPdfBytes);
                        const pages = pdfDoc.getPages();
                        const stampImageBytes = await fetch(stampUrl).then(res => res.arrayBuffer());
                        let stampImage;
                        if (stampUrl.toLowerCase().includes('.png')) {
                            stampImage = await pdfDoc.embedPng(stampImageBytes);
                        } else {
                            stampImage = await pdfDoc.embedJpg(stampImageBytes);
                        }

                        pages.forEach(page => {
                            const { width } = page.getSize();
                            const maxStampWidth = Math.min(150, width * 0.2);
                            const scaleFactor = maxStampWidth / stampImage.width;
                            const stampWidth = stampImage.width * scaleFactor;
                            const stampHeight = stampImage.height * scaleFactor;
                            const safeX = 40;
                            const safeY = 40;
                            page.drawImage(stampImage, { x: safeX, y: safeY, width: stampWidth, height: stampHeight });
                        });
                        const pdfBytes = await pdfDoc.save();
                        const safeInvoiceNo = selectedInvoice.invoice_no.replace(/[^a-zA-Z0-9_-]/g, '_');
                        const r2Folder = selectedInvoice.document_type === 'İrsaliye' ? 'irsaliyeler' : 'faturalar';
                        const newFileName = `${safeInvoiceNo}.pdf`;
                        const r2Key = `${r2Folder}/${newFileName}`;
                        const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });

                        setActionStatus({ type: 'idle', message: 'Dosya güvenli arşive (R2) yükleniyor...' });
                        const r2Success = await uploadFileToR2(pdfBlob, r2Key, 'application/pdf');
                        if (!r2Success) throw new Error("R2 Kasa Yükleme Başarısız!");

                        finalFileUrl = `r2://${r2Key}`;

                        if (!isAlreadyInR2) {
                            const matches = selectedInvoice.file_url.match(/\/invoices-pdfs\/(.+)$/);
                            if (matches && matches[1]) {
                                await supabase.storage.from('invoices-pdfs').remove([matches[1]]);
                            }
                        }
                    } catch (e: unknown) {
                        console.error("PDF ret kaşesi hatası:", e);
                        const errorMessage = e instanceof Error ? e.message : 'Bilinmeyen hata';
                        setActionStatus({ type: 'error', message: 'PDF ret kaşesi eklenemedi: ' + errorMessage });
                        setIsProcessing(false);
                        return;
                    }
                } else {
                    // GÖRSEL RET KAŞESİ
                    setActionStatus({ type: 'idle', message: 'Ret kaşesi ekleniyor (Görsel)...' });
                    try {
                        const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            img.onload = () => resolve(img);
                            img.onerror = () => reject(new Error("Resim yüklenemedi: " + url));
                            img.src = url;
                        });

                        const [bgImg, stampImg] = await Promise.all([
                            loadImage(sourceFetchUrl),
                            loadImage(stampUrl)
                        ]);

                        const canvas = document.createElement('canvas');
                        canvas.width = bgImg.width;
                        canvas.height = bgImg.height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(bgImg, 0, 0);
                            const maxStampWidth = bgImg.width * 0.20;
                            const scale = maxStampWidth / stampImg.width;
                            const sWidth = stampImg.width * scale;
                            const sHeight = stampImg.height * scale;
                            const x = 40;
                            const y = bgImg.height - sHeight - 40;
                            ctx.drawImage(stampImg, x, y, sWidth, sHeight);

                            const blob: Blob = await new Promise((resolve, reject) => {
                                canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Blob oluşturulamadı")), 'image/jpeg', 0.9);
                            });

                            const safeInvoiceNo = selectedInvoice.invoice_no.replace(/[^a-zA-Z0-9_-]/g, '_');
                            const r2Folder = selectedInvoice.document_type === 'İrsaliye' ? 'irsaliyeler' : 'faturalar';
                            const newFileName = `${safeInvoiceNo}.jpg`;
                            const r2Key = `${r2Folder}/${newFileName}`;

                            setActionStatus({ type: 'idle', message: 'Dosya güvenli arşive (R2) yükleniyor...' });
                            const r2Success = await uploadFileToR2(blob, r2Key, 'image/jpeg');
                            if (!r2Success) throw new Error("R2 Kasa Yükleme Başarısız!");

                            finalFileUrl = `r2://${r2Key}`;

                            if (!isAlreadyInR2) {
                                const matches = selectedInvoice.file_url.match(/\/invoices-pdfs\/(.+)$/);
                                if (matches && matches[1]) {
                                    await supabase.storage.from('invoices-pdfs').remove([matches[1]]);
                                }
                            }
                        }
                    } catch (imgError: unknown) {
                        console.error("Görsel ret kaşesi hatası:", imgError);
                        const errorMessage = imgError instanceof Error ? imgError.message : 'Bilinmeyen hata';
                        setActionStatus({ type: 'error', message: 'Görsel ret kaşesi eklenemedi: ' + errorMessage });
                        setIsProcessing(false);
                        return;
                    }
                }
            }

            const { error } = await supabase
                .from('invoices')
                .update({
                    status: 'Reddedildi',
                    rejection_note: rejectNote,
                    rejected_by_id: user?.id,
                    file_url: finalFileUrl,
                    accountant_id: user?.id,
                    rejection_date: new Date().toISOString(),
                    approved_at: new Date().toISOString() // Sistem uyumluluğu için
                })
                .eq('id', selectedInvoice.id);

            if (error) throw error;

            setActionStatus({ type: 'success', message: `Belge #${selectedInvoice.invoice_no} ${isSatinalma ? 'satınalma' : 'muhasebe'} tarafından reddedildi.` });

            await logAction(
                user?.email,
                isSatinalma ? 'Satınalma Reddi' : 'Muhasebe Reddi',
                `${selectedInvoice.document_type || 'Belge'} #${selectedInvoice.invoice_no} ${isSatinalma ? 'satınalma' : 'muhasebe'} tarafından reddedildi. Sebep: ${rejectNote}`,
                undefined
            );

            // BİLDİRİM GÖNDER (Yükleyen Personele)
            if (selectedInvoice.user_id) {
                await sendNotification({
                    user_id: selectedInvoice.user_id,
                    title: `Belgeniz Reddedildi (${isSatinalma ? 'Satın Alma' : 'Muhasebe'})`,
                    message: `${selectedInvoice.invoice_no} nolu ${new Date(selectedInvoice.submission_date).toLocaleDateString('tr-TR')} tarihli ${selectedInvoice.document_type?.toLowerCase()} ${isSatinalma ? 'Satın Alma' : 'Muhasebe'} birimi tarafından reddedildi. Sebep: ${rejectNote}`,
                    source_id: selectedInvoice.id
                });
            }

            // BİLDİRİM GÖNDER (Müdüre/Yöneticiye)
            if (selectedInvoice.assigned_manager_id && selectedInvoice.assigned_manager_id !== selectedInvoice.user_id) {
                await sendNotification({
                    user_id: selectedInvoice.assigned_manager_id,
                    title: `Onayladığınız Belge Reddedildi`,
                    message: `${selectedInvoice.invoice_no} nolu belge ${isSatinalma ? 'Satın Alma' : 'Muhasebe'} birimi tarafından reddedildi. Sebep: ${rejectNote}`,
                    source_id: selectedInvoice.id
                });
            }

            fetchApprovedInvoices();
            setTimeout(() => {
                setSelectedInvoice(null);
                setIsRejecting(false);
            }, 1500);
        } catch (err: unknown) {
            console.error("Red hatası:", err);
            const errorMessage = err instanceof Error ? err.message : 'İşlem sırasında bir hata oluştu.';
            setActionStatus({ type: 'error', message: 'Hata: ' + errorMessage });
        } finally {
            setIsProcessing(false);
        }
    };

    const confirmDelete = async () => {
        setIsDeleting(true);
        try {
            // Faturayı bul (Dosya URL'sini almak için)
            const invoiceToDelete = invoices.find(inv => inv.id === deleteModal.id);

            // Veritabanından sil
            const { error } = await supabase
                .from('invoices')
                .delete()
                .eq('id', deleteModal.id);

            if (error) {
                console.error("Fatura silme hatası:", error);
            } else {
                // UI'ı güncelle
                setInvoices(prev => prev.filter(inv => inv.id !== deleteModal.id));

                // Eğer varsa Supabase Storage'dan dosyasını da kalıcı olarak sil
                if (invoiceToDelete?.file_url) {
                    const matches = invoiceToDelete.file_url.match(/\/invoices-pdfs\/(.+)$/);
                    if (matches && matches[1]) {
                        const filePath = matches[1];
                        const { error: storageError } = await supabase.storage
                            .from('invoices-pdfs')
                            .remove([filePath]);

                        if (storageError) console.error("Storage silme hatası:", storageError);
                    }
                }

                await logAction(
                    user?.email,
                    'Onaylı Fatura Silme',
                    `Onaylı fatura silindi: Fatura No #${deleteModal.invoiceNo} (ID: ${deleteModal.id})`
                );
            }
        } catch (err) {
            console.error("Beklenmeyen hata:", err);
        } finally {
            setIsDeleting(false);
            setDeleteModal({ isOpen: false, id: '', invoiceNo: '' });
        }
    };
    const filteredInvoices = invoices.filter(invoice =>
        invoice.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invoice.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        const { key, direction } = sortConfig;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let aValue: any = a[key as keyof Invoice];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let bValue: any = b[key as keyof Invoice];

        if (aValue === bValue) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            if (key.includes('date') || key.includes('_at')) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue).getTime();
            } else {
                return direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    return (
        <div className="mx-auto flex w-full max-w-[1450px] flex-col gap-8 px-8 pb-8 pt-2">
            <header className="flex flex-col gap-1">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
                    {isMuhasebe ? 'Alım Onaylı Faturalar' : (isSatinalma ? 'Müdür Onaylı İrsaliyeler' : (isManager && docType === 'Fatura' ? 'Onaylanan Faturalar' : (isManager && docType === 'İrsaliye' ? 'Onaylanan İrsaliyeler' : 'Onaylanan Belgeler')))}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">
                    {isMuhasebe
                        ? 'Sistemde onay sürecinde olan tüm faturaları buradan görüntüleyebilirsiniz'
                        : isSatinalma
                            ? 'Sistemde onay sürecinde olan tüm irsaliyeleri buradan görüntüleyebilirsiniz'
                            : (isManager && docType === 'Fatura' ? 'Onayladığınız tüm faturaları buradan görüntüleyebilirsiniz' : (isManager && docType === 'İrsaliye' ? 'Onayladığınız tüm irsaliyeleri buradan görüntüleyebilirsiniz' : 'Sistemde onay sürecinde olan veya onaylanmış tüm belgeleri buradan görüntüleyebilir ve arayabilirsiniz.'))}
                </p>
            </header>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div className="relative w-full sm:max-w-md">
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
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                        <CheckCircle2 size={18} />
                        <span className="font-medium text-sm">Toplam {invoices.length} {isSatinalma || docType === 'İrsaliye' ? 'Onaylı İrsaliye' : 'Onaylı Fatura'}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th onClick={() => handleSort('company_name')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center justify-center">Şirket/Firma <SortIcon columnKey="company_name" /></div>
                                </th>
                                <th onClick={() => handleSort('invoice_no')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center justify-center">
                                        {isMuhasebe || docType === 'Fatura' ? 'Fatura No' : (isSatinalma || docType === 'İrsaliye' ? 'İrsaliye No' : 'Belge No')}
                                        <SortIcon columnKey="invoice_no" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('submission_date')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center justify-center">
                                        {isMuhasebe || docType === 'Fatura' ? 'Fatura Tarihi' : (isSatinalma || docType === 'İrsaliye' ? 'İrsaliye Tarihi' : 'Belge Tarihi')}
                                        <SortIcon columnKey="submission_date" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('created_at')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center justify-center">Yükleme Tarihi <SortIcon columnKey="created_at" /></div>
                                </th>
                                <th onClick={() => handleSort('approved_at')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center justify-center">Onay Tarihi <SortIcon columnKey="approved_at" /></div>
                                </th>
                                <th onClick={() => handleSort('status')} className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group">
                                    <div className="flex items-center justify-center">Durum <SortIcon columnKey="status" /></div>
                                </th>
                                <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">İşlemler</th>
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
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <CheckCircle2 size={40} className="text-emerald-400/50 mb-3" />
                                            <p className="text-slate-500 font-medium">{isSatinalma || docType === 'İrsaliye' ? 'İrsaliye bulunamadı.' : 'Fatura bulunamadı.'}</p>
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
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center">
                                            {new Date(invoice.submission_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-center">
                                            {new Date(invoice.created_at || invoice.submission_date).toLocaleDateString('tr-TR')}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-emerald-600 dark:text-emerald-400 text-center">
                                            {invoice.approved_at ? new Date(invoice.approved_at).toLocaleDateString('tr-TR') : <span className="text-slate-400 font-normal">-</span>}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {invoice.status === 'Müdür Onaylı' ? (
                                                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                                        {invoice.document_type === 'İrsaliye' ? 'Satın Alma Onayında' : 'Muhasebe Onayında'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                        Onaylandı
                                                    </span>
                                                )}
                                                {invoice.approval_note && (
                                                    <span className="text-[10px] text-slate-500 font-medium italic">
                                                        ({invoice.approval_note})
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                {((invoice.status === 'Müdür Onaylı' || invoice.status === 'Onaylandı') && (isMuhasebe || isSatinalma)) && (
                                                    <button
                                                        onClick={() => { setSelectedInvoice(invoice); setRejectNote(''); setIsRejecting(false); setActionStatus({ type: 'idle', message: '' }); }}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                                                        title="İncele ve Onayla/Reddet"
                                                    >
                                                        <FileText size={16} />
                                                        İncele
                                                    </button>
                                                )}
                                                {invoice.file_url ? (
                                                    <button onClick={() => executeViewFile(invoice.file_url)}
                                                        className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title="Dosyayı Gör">
                                                        <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-slate-300 dark:text-slate-700 w-9 text-center">-</span>
                                                )}
                                                {!isManager && (
                                                    <button
                                                        onClick={() => handleDeleteClick(invoice.id, invoice.invoice_no)}
                                                        className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Custom Delete Confirmation Modal */}
            {
                deleteModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">
                            <div className="flex justify-between items-start p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Faturayı Sil</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Bu işlem geri alınamaz</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => !isDeleting && setDeleteModal({ isOpen: false, id: '', invoiceNo: '' })}
                                    className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="p-6">
                                <p className="text-slate-600 dark:text-slate-300">
                                    <span className="font-bold text-slate-900 dark:text-white">{deleteModal.invoiceNo}</span> numaralı faturayı silmek istediğinize emin misiniz? Fatura kalıcı olarak silinecek ve sistemden kaldırılacaktır.
                                </p>
                            </div>
                            <div className="p-5 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80">
                                <button
                                    onClick={() => setDeleteModal({ isOpen: false, id: '', invoiceNo: '' })}
                                    disabled={isDeleting}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors disabled:opacity-50"
                                >
                                    {isDeleting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            Siliniyor...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 size={16} />
                                            Evet, Sil
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Accounting Review Modal (İncele & Onayla/Reddet) */}
            {
                selectedInvoice && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                            {/* Modal Body */}
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                                {/* Left: Document Preview */}
                                <div className="flex-1 bg-slate-100 dark:bg-slate-950 p-0 overflow-hidden relative border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 flex items-center justify-center">
                                    {isLoadingUrl ? (
                                        <div className="flex flex-col items-center justify-center p-8 gap-4 text-slate-400">
                                            <Loader2 className="animate-spin" size={48} />
                                            <p>Güvenli arşive erişiliyor...</p>
                                        </div>
                                    ) : resolvedUrl ? (
                                        resolvedUrl.split('?')[0].toLowerCase().endsWith('.pdf') ? (
                                            <iframe
                                                src={`${resolvedUrl}#toolbar=1`}
                                                className="w-full h-full border-none"
                                                title="Belge Önizleme"
                                            />
                                        ) : (
                                            <img
                                                src={resolvedUrl}
                                                alt="Belge"
                                                className="w-full h-full object-contain"
                                            />
                                        )
                                    ) : (
                                        <div className="text-slate-400 flex flex-col items-center justify-center gap-4 h-full w-full">
                                            <AlertTriangle size={48} />
                                            <p>Belge dosyası yüklenemedi.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Info & Actions */}
                                <div className="w-full lg:w-96 p-8 overflow-y-auto bg-white dark:bg-slate-900">
                                    <div className="space-y-8">
                                        {/* Modal Header (Moved to right pane) */}
                                        <div className="flex items-start justify-between pb-6 border-b border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Belge Detayı & {isSatinalma || (selectedInvoice.document_type === 'İrsaliye') ? 'Satın Alma' : 'Muhasebe'} Onayı</h3>
                                                    <p className="text-xs text-slate-500 mt-1">#{selectedInvoice.invoice_no} - {selectedInvoice.company_name}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (!isProcessing) {
                                                        setSelectedInvoice(null);
                                                    }
                                                }}
                                                className="w-8 h-8 shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                                            >
                                                <X size={20} />
                                            </button>
                                        </div>

                                        {/* Status Section */}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Mevcut Durum</h4>
                                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold
                                            ${selectedInvoice.status === 'Müdür Onaylı'
                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'}`}>
                                                <div className={`w-2 h-2 rounded-full ${selectedInvoice.status === 'Müdür Onaylı' ? 'bg-amber-500' : 'bg-emerald-500'}`}></div>
                                                {selectedInvoice.status === 'Müdür Onaylı' ? `${isSatinalma || selectedInvoice.document_type === 'İrsaliye' ? 'Satın Alma' : 'Muhasebe'} Onayı Bekliyor` : 'Onaylandı'}
                                            </div>
                                        </div>

                                        {/* Metadata Section */}
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-xs text-slate-400 mb-1">Şirket/Firma</p>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedInvoice.company_name}</p>
                                            </div>
                                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-xs text-slate-400 mb-1">Belge No / Tarih</p>
                                                <p className="font-bold text-slate-900 dark:text-white">{selectedInvoice.invoice_no} / {new Date(selectedInvoice.submission_date).toLocaleDateString('tr-TR')}</p>
                                            </div>
                                            {selectedInvoice.approval_note && (
                                                <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800 animate-in slide-in-from-top-2 duration-300">
                                                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 font-bold uppercase tracking-wider">Onay Açıklaması</p>
                                                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">{selectedInvoice.approval_note}</p>
                                                </div>
                                            )}
                                            {selectedInvoice.rejection_note && (
                                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-800 animate-in slide-in-from-top-2 duration-300">
                                                    <p className="text-xs text-red-600 dark:text-red-400 mb-1 font-bold uppercase tracking-wider">Ret Nedeni</p>
                                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium leading-relaxed">{selectedInvoice.rejection_note}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Results */}
                                        {actionStatus.message && (
                                            <div className={`p-4 rounded-2xl border animate-in zoom-in-95 duration-200 flex items-center gap-3
                                            ${actionStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                    actionStatus.type === 'error' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                                        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'}`}>
                                                {actionStatus.type === 'idle' && <Loader2 className="animate-spin shrink-0" size={18} />}
                                                {actionStatus.type === 'success' && <CheckCircle2 className="shrink-0" size={18} />}
                                                {actionStatus.type === 'error' && <AlertTriangle className="shrink-0" size={18} />}
                                                <span className="text-sm font-medium">{actionStatus.message}</span>
                                            </div>
                                        )}

                                        {/* Action Buttons (Muhasebe can edit after approval too) */}
                                        {(selectedInvoice.status === 'Müdür Onaylı' || (selectedInvoice.status === 'Onaylandı' && (isMuhasebe || isSatinalma))) && !actionStatus.message && (
                                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                {!isRejecting ? (
                                                    <div className="flex flex-col gap-3">
                                                        <button
                                                            onClick={handleApprove}
                                                            disabled={isProcessing}
                                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-hover active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                                                        >
                                                            {isProcessing ? <Loader2 className="animate-spin" size={24} /> : <CheckCircle2 size={24} />}
                                                            <span>Belgeyi Onayla</span>
                                                        </button>
                                                        <button
                                                            onClick={() => setIsRejecting(true)}
                                                            disabled={isProcessing}
                                                            className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white dark:bg-slate-900 text-red-600 border-2 border-red-500 rounded-2xl font-bold hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-[0.98] transition-all disabled:opacity-50"
                                                        >
                                                            <Trash2 size={24} />
                                                            <span>Reddet</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                                                        <div className="space-y-2">
                                                            <label className="text-sm font-bold text-slate-600 dark:text-slate-400">Red Nedeni</label>
                                                            <textarea
                                                                value={rejectNote}
                                                                onChange={(e) => setRejectNote(e.target.value)}
                                                                className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl focus:border-red-500 focus:outline-none transition-colors text-slate-900 dark:text-white"
                                                                placeholder="Lütfen reddetme sebebinizi yazın..."
                                                                rows={3}
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button
                                                                onClick={handleReject}
                                                                disabled={isProcessing || !rejectNote.trim()}
                                                                className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all disabled:opacity-50"
                                                            >
                                                                {isProcessing ? <Loader2 className="animate-spin mx-auto" size={24} /> : 'Reddet'}
                                                            </button>
                                                            <button
                                                                onClick={() => setIsRejecting(false)}
                                                                disabled={isProcessing}
                                                                className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                                            >
                                                                Vazgeç
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Action Success / Close Button */}
                                        {actionStatus.type === 'success' && (
                                            <button
                                                onClick={() => setSelectedInvoice(null)}
                                                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 dark:shadow-none"
                                            >
                                                Tamamla
                                            </button>
                                        )}

                                        <div className="pt-8 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                                <AlertTriangle size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                                    Onay verdiğinizde belgenin üzerine <strong>onay kaşeniz</strong> eklenerek sisteme kaydedilecektir. Bu işlem geri alınamaz.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}
