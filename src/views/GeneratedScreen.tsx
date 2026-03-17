// @ts-nocheck
export default function GeneratedScreen() {
  return (
    <>

      {/*  BEGIN: SecurityIcon  */}
      <div className="mb-6 flex justify-center">
        <div className="p-4 bg-red-500/10 rounded-full border border-red-500/20">
          {/*  SVG Red Padlock  */}
          <svg className="w-16 h-16 text-security-danger" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {/*  END: SecurityIcon  */}
      {/*  BEGIN: WarningContent  */}
      <section data-purpose="warning-message">
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">
          Hesap Geçici Olarak Kilitlendi
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Çok sayıda başarısız giriş denemesi ve şüpheli aktivite nedeniyle, hassas verilerinizi korumak amacıyla erişiminiz sınırlandırılmıştır.
        </p>
        {/*  Lock Duration Alert  */}
        <div className="bg-slate-900/50 border border-security-border rounded-custom p-4 mb-8">
          <span className="block text-xs uppercase tracking-widest text-slate-500 font-semibold mb-1">Kalan Kilit Süresi</span>
          <span className="text-3xl font-mono font-bold text-red-400" id="countdown">29:59</span>
        </div>
      </section>
      {/*  END: WarningContent  */}
      {/*  BEGIN: ActionButtons  */}
      <section className="space-y-3" data-purpose="recovery-actions">
        <button className="w-full bg-primary hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-custom transition-all duration-200 shadow-lg shadow-primary/20" type="button">
          Güvenli Kurtarmayı Başlat
        </button>
        <button className="w-full bg-transparent hover:bg-slate-700/50 border border-security-border text-slate-300 font-medium py-3 px-4 rounded-custom transition-all duration-200" type="button">
          Sistem Yöneticisiyle İletişime Geç
        </button>
      </section>
      {/*  END: ActionButtons  */}
      {/*  BEGIN: FooterAudit  */}
      <footer className="mt-10 pt-6 border-t border-security-border/50" data-purpose="audit-information">
        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
            Olay Kaydedildi
          </div>
          <div>
            Ref: <span className="text-slate-400">ERR_AUTH_LOCKED_8824X</span>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-slate-600 italic">
          IP Adresi: 192.168.1.104 | Zaman Damgası: 2023-10-27 14:42:01 UTC
        </p>
      </footer>
      {/*  END: FooterAudit  */}

    </>
  );
}
