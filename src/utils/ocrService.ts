import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Vite ortamı için pdfjs worker'ını ?url ile statik asset olarak içe aktarıyoruz.
// Bu sayede Electron (file:// protokolü) üzerinde sorunsuz çalışır.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface InvoiceExtractedData {
    invoice_no: string | null;
    submission_date: string | null;
    amount: number | null;
    company_name: string | null;
    raw_text?: string;
}

export const extractInvoiceData = async (file: File): Promise<InvoiceExtractedData> => {
    let extractedText = '';

    if (file.type.includes('pdf')) {
        extractedText = await extractTextFromPDF(file);
        // Eğer pdf okunamadıysa (sadece resimden oluşuyorsa), render edip tesseract'a göndermek bir opsiyon ama
        // basitleştirmek adına şimdilik tesseract'a sadece resimleri yönlendiriyoruz.
    } else if (file.type.includes('image')) {
        extractedText = await extractTextFromImage(file);
    } else {
        throw new Error('Desteklenmeyen dosya türü (Sadece PDF, JPG, PNG).');
    }

    console.log("OCR Çıktısı:", extractedText);
    return parseInvoiceText(extractedText);
};

// Resim dosyasından metin çıkarma
const extractTextFromImage = async (file: File): Promise<string> => {
    try {
        const result = await Tesseract.recognize(
            file,
            'tur+eng', // Türkçe ve İngilizce dillerini yükle
            { logger: m => console.log(m) }
        );
        return result.data.text;
    } catch (error) {
        console.error("Tesseract Hatası:", error);
        throw new Error("Görüntüden metin okunamadı.");
    }
};

// Metin içerikli PDF dosyasından metin çıkarma
const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();

            let pageText = '';
            let lastY = -1;
            for (const item of textContent.items) {
                if ('str' in item && 'transform' in item) {
                    const textItem = item as { str: string, transform: number[] };
                    const str = textItem.str;
                    const y = textItem.transform[5];

                    if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                        pageText += '\n'; // Y ekseninde değişim varsa yeni satır
                    } else if (lastY !== -1) {
                        pageText += ' '; // Aynı satırdaysa boşluk koy
                    }
                    pageText += str;
                    lastY = y;
                }
            }

            // PDF'den gelen metin içindeki dev boşlukları temizleyelim
            const cleanedPageText = pageText.replace(/\s+/g, ' ').trim();

            // Eğer sayfada dijital metin varsa ve bu metin bir faturaya benziyorsa onu kullan
            // (Bazen taranmış PDF'lerde gizli birkaç karakter olur, 15 karakterden uzun olsa bile faturaya benzemez)
            const looksLikeInvoice = /(fatura|tarih|toplam|ödenecek|tl|kdv|vkn|tckn|\d{4})/i.test(cleanedPageText);

            if (cleanedPageText.length > 30 && looksLikeInvoice) {
                fullText += cleanedPageText + '\n';
            } else {
                // Sayfada metin yoksa veya faturaya benzemiyorsa (Taranmış PDF ise), sayfayı canvas'a çiz ve Tesseract ile oku
                console.log(`Sayfa ${i} taranmış belge gibi görünüyor, OCR başlatılıyor...`);
                const viewport = page.getViewport({ scale: 2.0 }); // OCR kalitesini artırmak için ölçek
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport: viewport, canvas: canvas } as any).promise;

                    // Canvas'ı doğrudan Tesseract'a gönder
                    const result = await Tesseract.recognize(canvas, 'tur+eng');
                    fullText += result.data.text + '\n';
                }
            }
        }

        return fullText;
    } catch (error) {
        console.error("PDF İşleme Hatası (Worker veya Text):", error);
        throw new Error("PDF'den metin okunamadı.");
    }
};

// Çıkarılan metinden fatura parçalarını Parse ETME (Regex)
const parseInvoiceText = (text: string): InvoiceExtractedData => {
    console.log("--- OCR METNİ BAŞLANGICI ---");
    console.log(text);
    console.log("--- OCR METNİ BİTİŞİ ---");

    // 1. Şirket / Firma Adı Tahmini
    let companyName = null;

    // Satırları temizle ve çok kısa olanları filtrele
    const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 4);

    // Klasik şirket ünvanı uzantılarını arıyoruz (LTD, A.Ş., TİC vb.)
    const companyKeywordsRegex = /(LTD|L[Iİ]M[Iİ]TED|A\.?Ş|A[SŞ]|ANON[Iİ]M|T[Iİ]C|T[Iİ]CARET|SAN|SANAY[Iİ]|ŞT[Iİ]|Ş[Iİ]RKET[Iİ]|ORTAKLI[GĞ]I)/i;

    // Fatura alıcısı/müşteri bilgilerini filtrelemek için katı kural
    const invalidCompanyRegex = /fatura|tarih|toplam|vkn|tckn|vergi|say[ıi]n|m[üu]şteri|al[ıi]c[ıi]|adres/i;

    for (const line of lines) {
        // Eğer satırda "Sayın", "Adres" gibi kelimeler varsa BU SATIRI ASLA ŞİRKET KABUL ETME
        if (invalidCompanyRegex.test(line)) {
            continue;
        }

        if (companyKeywordsRegex.test(line)) {
            companyName = line;
            break;
        }
    }

    // Eğer klasik ünvan bulamazsak ve geçerli şirket ismi adayı arıyorsak
    if (!companyName && lines.length > 0) {
        for (const line of lines) {
            if (!invalidCompanyRegex.test(line) && line.length > 5 && line.length < 100) {
                // Sadece harf ve boşluk içeren (örn: "HAKAN OZDEM" gibi isimler de şirket olabilir ama "1234123" olamaz)
                // En ez 2 kelimeden oluşmasını tercih et (Şirket/Ad Soyad genelde 2 kelimedir)
                companyName = line;
                break;
            }
        }
    }

    // Başındaki kalan etiketleri veya T.C. temizle
    if (companyName) {
        companyName = companyName.replace(/^(?:Firma|Al[ıi]c[ıi]|T\.C\.)\s*[:;-]?\s*/i, '');

        // Şirket ünvanlarının sonunu yakala (A.Ş. LTD vb) ve ondan sonrasını KES:
        // Örn: "... TİCARET A.Ş. Atatürk Mah..." -> "... TİCARET A.Ş."
        const suffixesRegex = /(A\.?Ş|ANON[Iİ]M\s*Ş[Iİ]RKET[Iİ]|LTD|L[Iİ]M[Iİ]TED\s*Ş[Iİ]RKET[Iİ])\.?/i;
        const suffixMatch = companyName.match(suffixesRegex);

        if (suffixMatch && suffixMatch.index !== undefined) {
            // Sonekin bittiği indeksi bul (başlangıç indeksi + sonekin uzunluğu)
            const cutoffIndex = suffixMatch.index + suffixMatch[0].length;
            companyName = companyName.substring(0, cutoffIndex).trim();
        } else {
            // Sonek (A.Ş vs) yoksa, eski mantıkla adresi kesmeye devam et
            const addressKeywordsList = /(mah\.|mahallesi|sok\.|sokak|cad\.|cadde|bulvar|bulvar\u0131|bulvari|no\s*:|kat\s*:|ilçe|belediye|v\.d\.|vergi\s?dairesi|vkn|tckn|tel\s*:|telefon|fax)/i;
            const addressMatch = companyName.match(addressKeywordsList);
            if (addressMatch && addressMatch.index !== undefined) {
                companyName = companyName.substring(0, addressMatch.index).trim();
            }
        }

        // Eğer hala virgül, tire veya dik çizgi ile ayrılmış eklentiler varsa sadece ilk parçayı al
        // (Çoğu durumda "Örnek A.Ş., Atatürk Mah..." şeklinde yazılır)
        companyName = companyName.split(/[,|]/)[0].trim();

        // Fazla tire varsa temizle
        companyName = companyName.replace(/-\s*$/, '').trim();

        if (companyName.length > 100) companyName = companyName.substring(0, 100) + '...';
    }

    // 2. Fatura No: (Örn: INV-1234123, E-Fatura No: ABC2023000000001 vb.)
    const invoiceNoRegex = /(?:Fatura\s*No|Invoice\s*No|FATURA\s*N[O|UMARASI])[^\w]*([A-Z0-9-]{6,20})/i;
    const invoiceNoMatch = text.match(invoiceNoRegex);
    const invoiceNo = invoiceNoMatch ? invoiceNoMatch[1].trim() : null;

    // 2. Tarih: (Örn: 12.04.2023, 12/04/2023, 2023-04-12)
    const dateRegex = /\b(\d{2}[./-]\d{2}[./-]\d{4}|\d{4}[./-]\d{2}[./-]\d{2})\b/;
    const dateMatch = text.match(dateRegex);
    let date = null;
    if (dateMatch) {
        // Veritabanı YYYY-MM-DD istiyorsa format çevirisi yapılabilir
        const rawDate = dateMatch[1];
        if (rawDate.includes('.') || rawDate.includes('/')) {
            const parts = rawDate.replace(/\./g, '/').split('/');
            if (parts[0].length === 2 && parts[2].length === 4) { // DD/MM/YYYY
                date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (parts[0].length === 4) { // YYYY/MM/DD
                date = rawDate.replace(/\//g, '-');
            } else {
                date = rawDate; // Fallback
            }
        } else {
            date = rawDate;
        }
    }

    // 3. Tutar (Toplam Tutar / Ödenecek Tutar / Genel Toplam vb.)
    // Daha esnek olması için sadece "Toplam" kelimesini ve yanındaki rakamı ararız.
    const amountRegex = /(?:Toplam|Ödenecek\s*Tutar|Genel\s*Toplam|Tutar|Total|Yek[uü]n)[^\d]*(\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{2}))/i;
    const amountMatch = text.match(amountRegex);
    let amount = null;
    if (amountMatch) {
        let rawAmount = amountMatch[1].replace(/\s+/g, ''); // İçindeki olası boşlukları (örn: 1 250.50) sil
        // 1.250,50 -> 1250.50
        // 1,250.50 -> 1250.50
        // Sonraki karakter virgül mü nokta mı tespit edip çevirelim.
        if (rawAmount.includes(',') && rawAmount.includes('.')) {
            // Hem nokta hem virgul var: 1.250,50 veya 1,250.50
            if (rawAmount.lastIndexOf(',') > rawAmount.lastIndexOf('.')) {
                // TL formatı: 1.250,50 -> binlikleri sil, virgülü nokta yap
                rawAmount = rawAmount.replace(/\./g, '').replace(',', '.');
            } else {
                // USD formatı: 1,250.50 -> binlikleri sil
                rawAmount = rawAmount.replace(/,/g, '');
            }
        } else if (rawAmount.includes(',')) {
            // Sadece virgül var: 1250,50
            rawAmount = rawAmount.replace(',', '.');
        } // Sadece nokta varsa, zaten ondalık olabilir veya binlik. Eğer virgülden sonra 2 hane varsa ondalıktır diyoruz ama şimdilik doğrudan parseFloat.

        const parsedAmount = parseFloat(rawAmount.replace(/[^0-9.]/g, ''));
        if (!isNaN(parsedAmount)) {
            amount = parsedAmount;
        }
    }

    return {
        company_name: companyName,
        invoice_no: invoiceNo,
        submission_date: date,
        amount: amount,
        raw_text: text
    };
};
