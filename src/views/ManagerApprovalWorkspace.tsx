import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Loader2, CheckCircle2, AlertCircle, XCircle, Search, X, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { logAction } from '../lib/logger';

import { PDFDocument } from 'pdf-lib';
import { v4 as uuidv4 } from 'uuid';

interface Invoice {
  id: string;
  invoice_no: string;
  company_name?: string;
  submission_date: string;
  amount: number;
  status: string;
  file_url?: string;
  document_type?: string;
  assigned_manager_id?: string;
  user_id?: string;
  created_at?: string;
  approved_at?: string;
  uploader?: {
    full_name: string;
    avatar_url?: string;
  };
}

export default function ManagerApprovalWorkspace() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: 'idle' | 'success' | 'error', message: string }>({ type: 'idle', message: '' });
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, profile } = useAuth();
  const [rejectNote, setRejectNote] = useState('');
  const [allManagers, setAllManagers] = useState<{ id: string, full_name: string }[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardingInvoice, setForwardingInvoice] = useState<Invoice | null>(null);
  const [selectedForwardManagerId, setSelectedForwardManagerId] = useState('');
  const [zoom, setZoom] = useState(1); // v7.2.4: Zum seviyesi

  const fetchPendingInvoices = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // Loglarda olduğu gibi ayrı ayrı çekip mapleyelim (Join bazen sorun çıkarabiliyor)
      const statuses = profile?.role === 'manager' ? ['Bekliyor', 'Yönetici Onaylı'] : ['Bekliyor'];

      const fetchInvoicesPromise = supabase
        .from('invoices')
        .select('*')
        .in('status', statuses)
        .order('created_at', { ascending: false });

      const fetchUsersPromise = supabase.from('users').select('id, full_name, avatar_url');

      const [invoicesResponse, usersResponse] = await Promise.all([fetchInvoicesPromise, fetchUsersPromise]);

      if (invoicesResponse.error) {
        console.error("Fatura çekme hatası:", invoicesResponse.error);
        return;
      }

      const invoicesData = invoicesResponse.data || [];
      const usersData = usersResponse.data || [];

      // Kullanıcı haritası oluştur
      const userMap: Record<string, { full_name: string, avatar_url?: string }> = {};
      usersData.forEach(u => {
        userMap[u.id] = { full_name: u.full_name, avatar_url: u.avatar_url };
      });

      // Rol-bazlı filtreleme
      let filteredData = invoicesData;
      if (profile?.role === 'manager' || profile?.role === 'yonetici') {
        filteredData = invoicesData.filter(inv => inv.assigned_manager_id === user.id);
      }

      // Veriyi uploader bilgisiyle birleştir
      const normalizedData = filteredData.map(inv => ({
        ...inv,
        uploader: userMap[inv.user_id] || null
      }));

      setInvoices(normalizedData);
    } catch (err) {
      console.error("Beklenmeyen hata:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, profile?.role]);

  useEffect(() => {
    fetchPendingInvoices();
  }, [fetchPendingInvoices]);

  const handleApprove = async () => {
    if (!selectedInvoice || isProcessing) return;
    setIsProcessing(true);
    try {
      let finalFileUrl = selectedInvoice.file_url;

      // Eğer kullanıcının (yöneticinin) onay kaşesi varsa, damgala
      const isPdf = selectedInvoice.file_url?.toLowerCase().includes('.pdf');
      const { data: userProfile } = user ? await supabase.from('users').select('approval_stamp_url').eq('id', user.id).single() : { data: null };
      const stampUrl = userProfile?.approval_stamp_url || profile?.approval_stamp_url;

      if (stampUrl && selectedInvoice.file_url) {
        if (isPdf) {
          setActionStatus({ type: 'idle', message: 'Onay kaşesi ekleniyor (PDF)...' });
          try {
            const existingPdfBytes = await fetch(selectedInvoice.file_url).then(res => res.arrayBuffer());
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
              let safeX = Math.max(0, width - stampWidth - paddingX); // Default: Right (Manager)
              if (profile?.role === 'yonetici') {
                safeX = (width - stampWidth) / 2; // Center (Yonetici)
              }
              const safeY = paddingY;
              firstPage.drawImage(stampImage, {
                x: safeX,
                y: safeY,
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
            if (uploadError) throw new Error("Onaylı PDF yüklenemedi: " + uploadError.message);
            const { data: { publicUrl } } = supabase.storage
              .from('invoices-pdfs')
              .getPublicUrl(`stamped/${newFileName}`);
            finalFileUrl = publicUrl;
          } catch (pdfError) {
            console.error("Onay Kaşesi Hatası (PDF):", pdfError);
            setActionStatus({ type: 'error', message: 'PDF damgalanamadı: ' + (pdfError instanceof Error ? pdfError.message : 'Bilinmeyen hata') });
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
              loadImage(selectedInvoice.file_url),
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
              const paddingX = bgImg.width * 0.05;
              const paddingY = bgImg.height * 0.05;

              let x = bgImg.width - sWidth - paddingX; // Right (Manager)

              if (profile?.role === 'yonetici') {
                x = (bgImg.width - sWidth) / 2; // Center (Yonetici)
              }

              const y = bgImg.height - sHeight - paddingY;
              ctx.drawImage(stampImg, x, y, sWidth, sHeight);
              const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
              const newFileName = `approved_${uuidv4()}.jpg`;
              const { error: uploadError } = await supabase.storage
                .from('invoices-pdfs')
                .upload(`stamped/${newFileName}`, blob, { contentType: 'image/jpeg' });
              if (uploadError) throw uploadError;
              const { data: { publicUrl } } = supabase.storage.from('invoices-pdfs').getPublicUrl(`stamped/${newFileName}`);
              finalFileUrl = publicUrl;
            }
          } catch (imgError) {
            console.error("Onay Kaşesi Hatası (Görsel):", imgError);
            setActionStatus({ type: 'error', message: 'Görsel damgalanamadı.' });
            setIsProcessing(false);
            return;
          }
        }
      }

      const isYonetici = profile?.role === 'yonetici';
      const newStatus = isYonetici ? 'Yönetici Onaylı' : 'Müdür Onaylı';

      const { error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          file_url: finalFileUrl,
          approved_by: user?.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      if (isYonetici) {
        // Yöneticiler için yönlendirme modalını aç
        setForwardingInvoice(selectedInvoice);
        setShowForwardModal(true);
        // Tüm müdürleri çek
        const { data: managersData } = await supabase.from('users').select('id, full_name').eq('role', 'manager').eq('status', 'active');
        setAllManagers(managersData || []);
      }

      if (isYonetici) {
        setActionStatus({ type: 'success', message: `Belge #${selectedInvoice.invoice_no} onaylandı. Lütfen üst onaya (Müdür) yönlendiriniz.` });
      } else {
        setActionStatus({ type: 'success', message: `Belge #${selectedInvoice.invoice_no} onaylandı. ${selectedInvoice.document_type === 'İrsaliye' ? 'Satın Alma' : 'Muhasebe'} birimine yönlendirildi.` });
      }

      await logAction(
        user?.email,
        'Belge Onaylama',
        `${selectedInvoice.document_type || 'Belge'} #${selectedInvoice.invoice_no} onaylandı`,
        undefined
      );



      setSelectedInvoice(null);
      await fetchPendingInvoices();
    } catch (error: unknown) {
      console.error('Onay hatası:', error);
      const err = error as { message?: string };
      let errorMessage = err?.message || 'Belge onaylanırken bir hata oluştu.';
      if (errorMessage.includes('column') && errorMessage.includes('approved_at')) {
        errorMessage = 'Veritabanında "approved_at" sütunu eksik. Lütfen SQL kodunu çalıştırın.';
      }
      setActionStatus({ type: 'error', message: errorMessage });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 4000);
    }
  };

  const handleReject = async () => {
    if (!selectedInvoice || isProcessing) return;
    setIsProcessing(true);
    try {
      let finalFileUrl = selectedInvoice.file_url;
      const { data: userProfile } = user ? await supabase.from('users').select('rejection_stamp_url').eq('id', user.id).single() : { data: null };
      const stampUrl = userProfile?.rejection_stamp_url || profile?.rejection_stamp_url;

      if (stampUrl && selectedInvoice.file_url) {
        const isPdf = selectedInvoice.file_url.toLowerCase().includes('.pdf');

        if (isPdf) {
          setActionStatus({ type: 'idle', message: 'Ret kaşesi ekleniyor (PDF)...' });
          try {
            const existingPdfBytes = await fetch(selectedInvoice.file_url).then(res => res.arrayBuffer());
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
              // stampImage.scale exists in most versions of pdf-lib but let's be safe
              const stampWidth = stampImage.width * scaleFactor;
              const stampHeight = stampImage.height * scaleFactor;
              const paddingX = 40;
              const paddingY = 40;
              let safeX = Math.max(0, width - stampWidth - paddingX); // Default: Right (Manager)
              if (profile?.role === 'yonetici') {
                safeX = (width - stampWidth) / 2; // Center (Yonetici)
              }
              const safeY = paddingY;
              firstPage.drawImage(stampImage, {
                x: safeX,
                y: safeY,
                width: stampWidth,
                height: stampHeight,
              });
            }
            const pdfBytes = await pdfDoc.save();
            const newFileName = `rejected_${uuidv4()}.pdf`;
            const pdfBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            const { error: uploadError } = await supabase.storage
              .from('invoices-pdfs')
              .upload(`stamped/${newFileName}`, pdfBlob, {
                contentType: 'application/pdf',
              });
            if (uploadError) throw new Error("Redli PDF yüklenemedi: " + uploadError.message);
            const { data: { publicUrl } } = supabase.storage
              .from('invoices-pdfs')
              .getPublicUrl(`stamped/${newFileName}`);
            finalFileUrl = publicUrl;
          } catch (pdfError) {
            console.error("Ret Kaşesi Hatası (PDF):", pdfError);
            setActionStatus({ type: 'error', message: 'PDF damgalanamadı.' });
            setIsProcessing(false);
            return;
          }
        } else {
          // GÖRSEL DAMGALAMA
          setActionStatus({ type: 'idle', message: 'Ret kaşesi ekleniyor (Görsel)...' });
          try {
            const loadImage = (url: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = url;
            });

            const [bgImg, stampImg] = await Promise.all([
              loadImage(selectedInvoice.file_url),
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
              const x = bgImg.width - sWidth - (bgImg.width * 0.05);
              const y = bgImg.height - sHeight - (bgImg.height * 0.05);

              ctx.drawImage(stampImg, x, y, sWidth, sHeight);
              const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9));
              const newFileName = `rejected_${uuidv4()}.jpg`;

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
            console.error("Ret Kaşesi Hatası (Görsel):", imgError);
            setActionStatus({ type: 'error', message: 'Görsel damgalanamadı.' });
            setIsProcessing(false);
            return;
          }
        }
      }

      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'Reddedildi',
          file_url: finalFileUrl,
          rejection_note: rejectNote,
          rejected_by_id: user?.id
        })
        .eq('id', selectedInvoice.id);

      if (error) throw error;

      setActionStatus({ type: 'success', message: `Belge #${selectedInvoice.invoice_no} reddedildi.` });

      await logAction(
        user?.email,
        'Belge Reddetme',
        `${selectedInvoice.document_type || 'Belge'} #${selectedInvoice.invoice_no} reddedildi. Not: ${rejectNote || 'Belirtilmedi'}`,
        undefined
      );



      setRejectNote('');
      setSelectedInvoice(null);
      await fetchPendingInvoices();
    } catch (error) {
      console.error('Red hatası:', error);
      setActionStatus({ type: 'error', message: 'Belge reddedilirken bir hata oluştu.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 4000);
    }
  };

  const filteredInvoices = invoices.filter(invoice =>
    invoice.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.invoice_no?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingFaturas = filteredInvoices.filter(inv => inv.document_type !== 'İrsaliye');
  const pendingIrsaliyes = filteredInvoices.filter(inv => inv.document_type === 'İrsaliye');

  const handleForwardToManager = async () => {
    if (!forwardingInvoice || !selectedForwardManagerId) return;
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          assigned_manager_id: selectedForwardManagerId
        })
        .eq('id', forwardingInvoice.id);

      if (error) throw error;

      setActionStatus({ type: 'success', message: 'Belge başarıyla müdüre yönlendirildi.' });

      await logAction(
        user?.email,
        'Yönetici Onay ve Yönlendirme',
        `#${forwardingInvoice.invoice_no} onaylandı ve müdüre yönlendirildi.`,
        undefined
      );



      setShowForwardModal(false);
      setForwardingInvoice(null);
      setSelectedForwardManagerId('');
      await fetchPendingInvoices();
    } catch (error) {
      console.error('Yönlendirme hatası:', error);
      setActionStatus({ type: 'error', message: 'Yönlendirme sırasında hata oluştu.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setActionStatus({ type: 'idle', message: '' }), 4000);
    }
  };

  const renderTable = (data: Invoice[], title: string, emptyMessage: string, typeLabel: 'Fatura' | 'İrsaliye' = 'Fatura') => {
    const activeColSpan = 7;

    return (
      <div className="mb-2">
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4 px-1">{title}</h3>
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Şirket/Firma</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Belge Tipi</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">{typeLabel} No</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">{typeLabel} Tarihi</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Yükleme Tarihi</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">Durum</th>
                  <th className="px-6 py-4 font-semibold text-slate-900 dark:text-white text-center">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={activeColSpan} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex justify-center items-center gap-2">
                        <Loader2 className="animate-spin" size={24} /> Veriler yükleniyor...
                      </div>
                    </td>
                  </tr>
                ) : data.length === 0 ? (
                  <tr>
                    <td colSpan={activeColSpan} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <CheckCircle2 size={40} className="text-emerald-400/50 mb-3" />
                        <p className="text-slate-500 font-medium">
                          {emptyMessage}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((invoice) => (
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
                      <td className="px-6 py-4 font-medium text-slate-500 dark:text-slate-400 text-center">{invoice.invoice_no}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-center">
                        {new Date(invoice.submission_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white text-center">
                        {new Date(invoice.created_at || invoice.submission_date).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          {invoice.status === 'Yönetici Onaylı' ? 'Onaylandı (Yönetici)' : 'Onay Bekliyor'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {invoice.file_url && (
                            <a href={invoice.file_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="Dosyayı Gör">
                              <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </a>
                          )}
                          <button
                            onClick={() => { setSelectedInvoice(invoice); setRejectNote(''); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 rounded-lg transition-colors"
                            title="İncele ve Onayla/Reddet"
                          >
                            <span className="material-symbols-outlined text-[18px]">rate_review</span>
                            İncele
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
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-8">
      {/* Header */}
      <header className="flex flex-col gap-1">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Onay Bekleyen Belgeler</h2>
        <p className="text-slate-500 dark:text-slate-400">Bekleyen belgeleri inceleyin, onaylayın veya reddedin.</p>
      </header>

      {/* Toolbar */}
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
          {/* Status Message */}
          {actionStatus.message && (
            <div className={`text-sm px-4 py-2 rounded-lg flex items-center gap-2 transition-all
              ${actionStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                : actionStatus.type === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                  : 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'}`}>
              {actionStatus.type === 'success' ? <CheckCircle2 size={16} /> : actionStatus.type === 'error' ? <AlertCircle size={16} /> : <Loader2 className="animate-spin" size={16} />}
              {actionStatus.message}
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800/50">
            <Clock size={18} />
            <span className="font-medium text-sm">Toplam {invoices.length} Onay Bekleyen Belge</span>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="flex flex-col gap-8">
        {renderTable(pendingFaturas, "Onay Bekleyen Faturalar", "Bekleyen fatura bulunmuyor.", 'Fatura')}
        {renderTable(pendingIrsaliyes, "Onay Bekleyen İrsaliyeler", "Bekleyen irsaliye bulunmuyor.", 'İrsaliye')}
      </div>

      {/* Detail Modal - Geliştirilmiş (v7.2.4) */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-0 sm:p-4">
          <div className="w-full max-w-6xl h-full sm:h-[95vh] flex flex-col rounded-none sm:rounded-2xl bg-[#0f172a] shadow-2xl border border-slate-800 overflow-hidden text-white/90">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/50 bg-[#0f172a]/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <span className="material-symbols-outlined text-blue-400">description</span>
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight leading-none">
                    {selectedInvoice.company_name || 'Belge Önizleme'}
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    {selectedInvoice.invoice_no} | {selectedInvoice.document_type}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Zum Kontrolleri */}
                <div className="flex items-center gap-2 bg-slate-800/50 p-1 px-3 rounded-xl border border-slate-700">
                  <button
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))}
                    className="p-1 hover:text-white text-slate-400 transition-colors"
                    title="Küçült"
                  >
                    <span className="material-symbols-outlined">zoom_out</span>
                  </button>
                  <span className="text-xs font-mono w-12 text-center text-slate-300">%{Math.round(zoom * 100)}</span>
                  <button
                    onClick={() => setZoom(prev => Math.min(3, prev + 0.25))}
                    className="p-1 hover:text-white text-slate-400 transition-colors"
                    title="Büyüt"
                  >
                    <span className="material-symbols-outlined">zoom_in</span>
                  </button>
                  <div className="w-[1px] h-4 bg-slate-700 mx-1"></div>
                  <button
                    onClick={() => setZoom(1)}
                    className="text-[10px] font-bold text-slate-500 hover:text-white uppercase tracking-tighter"
                  >
                    Sıfırla
                  </button>
                </div>

                <div className="w-[1px] h-6 bg-slate-700 mx-2"></div>
                <button
                  onClick={() => { setSelectedInvoice(null); setZoom(1); }}
                  className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Orta Kısım: Belge Önizleme (Kaydırılabilir ve Zumlanabilir) */}
            <div className="flex-1 bg-slate-950 relative overflow-auto flex flex-col items-center justify-start p-8">
              <div
                className="transition-transform duration-200 ease-out origin-top shadow-inner"
                style={{ transform: `scale(${zoom})`, minWidth: '100%', display: 'flex', justifyContent: 'center' }}
              >
                <div className="w-full max-w-5xl bg-white shadow-2xl rounded-sm overflow-hidden border border-slate-800">
                  {selectedInvoice.file_url ? (
                    selectedInvoice.file_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                      <img
                        src={selectedInvoice.file_url}
                        alt="Belge"
                        className="w-full h-auto block"
                      />
                    ) : (
                      <iframe
                        src={selectedInvoice.file_url}
                        className="w-full h-screen min-h-[1200px] border-none"
                        title="PDF Önizleme"
                      />
                    )
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-500 min-h-[600px] bg-[#0f172a]">
                      <span className="material-symbols-outlined text-6xl mb-3">description</span>
                      <p className="text-sm">Belge önizlemesi yüklenemedi.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Alt Kısım: Aksiyon Barı (Footer) */}
            <div className="p-4 px-8 bg-[#0f172a] border-t border-slate-800 flex flex-col sm:flex-row items-center gap-6 shadow-2xl">
              <div className="flex-1 w-full sm:w-auto">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Red Notu / Açıklama</span>
                </div>
                <input
                  type="text"
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  placeholder="Belgeyi reddedecekseniz nedenini buraya yazabilirsiniz..."
                  className="w-full bg-[#1e293b]/50 border border-slate-700/50 p-2.5 px-4 rounded-xl text-sm font-medium text-white outline-none focus:ring-2 focus:ring-red-500/30 transition-all border-l-4 border-l-slate-600 focus:border-l-red-500"
                />
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={handleReject}
                  disabled={isProcessing}
                  className="px-8 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 rounded-2xl font-black text-sm flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      <XCircle size={20} />
                      REDDET
                    </>
                  )}
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="px-12 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm flex items-center gap-3 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                      <CheckCircle2 size={20} />
                      ONAYLA
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forward to Manager Modal (Yöneticiler için) */}
      {showForwardModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/80 backdrop-blur-md p-4">
          <div className="bg-[#0f172a] w-full max-w-md rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
            <div className="p-6">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                <span className="material-symbols-outlined text-blue-500 text-3xl">forward_to_inbox</span>
              </div>
              <h3 className="text-xl font-bold text-center text-white mb-2">Müdüre Yönlendir</h3>
              <p className="text-slate-400 text-center text-sm mb-6">Belge onayınızdan geçti. Şimdi nihai onay için bir müdür seçiniz.</p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Üst Onaylayıcı (Müdür)</label>
                  <select
                    value={selectedForwardManagerId}
                    onChange={(e) => setSelectedForwardManagerId(e.target.value)}
                    className="w-full bg-[#1e293b] border border-slate-700 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/50"
                  >
                    <option value="">Seçiniz...</option>
                    {allManagers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-900/50 flex gap-3">
              <button
                onClick={() => { setShowForwardModal(false); setForwardingInvoice(null); }}
                className="flex-1 py-3 text-slate-400 font-bold text-sm hover:text-white transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleForwardToManager}
                disabled={!selectedForwardManagerId || isProcessing}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all"
              >
                {isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Yönlendir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
