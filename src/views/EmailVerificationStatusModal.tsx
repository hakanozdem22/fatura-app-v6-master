// @ts-nocheck
export default function EmailVerificationStatusModal() {
    return (
        <>

            <div className="flex h-screen w-full bg-white dark:bg-slate-900 overflow-hidden relative">
                {/*  Sidebar  */}
                <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between h-full">
                    <div className="flex flex-col gap-4 p-4">
                        <div className="flex gap-3 items-center mb-6">
                            <div className="bg-center bg-no-repeat bg-cover rounded-full h-10 w-10 bg-primary" data-alt="SecureInvoice Logo with abstract shield pattern" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDFB6Z_sh7_EgL7P7Wny1m_ghT8LP69TQ4uOSZQJl9pULisDw7ejXabAFKrqS2V07ig_MO5any3cSbkINSuzg7Hq6qZuZ2xSkeqpDoKpoeRx1aer6pWOchorXnieSt96FBFikzsa5FJdA_7y54mxk_OqMeEbun7RGTEEbgDFRW_-0TUlEvzdo3kn6qxTv0v3HnJK81lH9uZrLSjWF5q5YI2AUq0XvXI2kdjTCQsVhvIi9o6PY_EzJCV-MZb0_M2hlWJTkRm3XswPSzY")' }}></div>
                            <div className="flex flex-col">
                                <h1 className="text-slate-900 dark:text-white text-base font-bold leading-normal">Fatura Yöneticisi</h1>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-normal leading-normal">Yönetici Paneli</p>
                            </div>
                        </div>
                        <nav className="flex flex-col gap-1">
                            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
                                <span className="material-symbols-outlined text-slate-500">pie_chart</span>
                                <span className="text-sm font-medium">Gösterge Paneli</span>
                            </a>
                            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
                                <span className="material-symbols-outlined text-slate-500">receipt_long</span>
                                <span className="text-sm font-medium">Faturalar</span>
                            </a>
                            <a className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 text-primary dark:text-primary" href="#">
                                <span className="material-symbols-outlined text-primary fill-1">group</span>
                                <span className="text-sm font-medium">Alıcılar</span>
                            </a>
                            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
                                <span className="material-symbols-outlined text-slate-500">description</span>
                                <span className="text-sm font-medium">Raporlar</span>
                            </a>
                            <a className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" href="#">
                                <span className="material-symbols-outlined text-slate-500">settings</span>
                                <span className="text-sm font-medium">Ayarlar</span>
                            </a>
                        </nav>
                    </div>
                    <div className="p-4 border-t border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-8 w-8 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">JD</div>
                            <div className="flex flex-col">
                                <span className="text-sm font-medium text-slate-900 dark:text-white">John Doe</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">Yönetici</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/*  Main Content Area  */}
                <div className="flex-1 flex flex-col h-full overflow-hidden bg-background-light dark:bg-slate-950 relative">
                    {/*  Header  */}
                    <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-shrink-0">
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Alıcı Yönetimi</h2>
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                                <input className="pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-primary" placeholder="Alıcı ara..." type="text" />
                            </div>
                            <button className="bg-primary hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">add</span>
                                Yeni Alıcı Ekle
                            </button>
                        </div>
                    </header>
                    {/*  Table Content (Blurred/Dimmed Background Context)  */}
                    <div className="flex-1 overflow-auto p-8">
                        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 uppercase">
                                        <th className="px-6 py-4 font-semibold">Alıcı Adı</th>
                                        <th className="px-6 py-4 font-semibold">E-posta</th>
                                        <th className="px-6 py-4 font-semibold">Durum</th>
                                        <th className="px-6 py-4 font-semibold">Son Fatura</th>
                                        <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-slate-700 dark:text-slate-300">
                                    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Acme Corp Ltd.</td>
                                        <td className="px-6 py-4">billing@acme-corp.com</td>
                                        <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Onaylandı</span></td>
                                        <td className="px-6 py-4">24 Eki 2023</td>
                                        <td className="px-6 py-4 text-right"><span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-600">more_vert</span></td>
                                    </tr>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Globex Inc.</td>
                                        <td className="px-6 py-4">finance@globex.io</td>
                                        <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Onaylandı</span></td>
                                        <td className="px-6 py-4">20 Eki 2023</td>
                                        <td className="px-6 py-4 text-right"><span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-600">more_vert</span></td>
                                    </tr>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">Stark Industries</td>
                                        <td className="px-6 py-4">tony@stark.com</td>
                                        <td className="px-6 py-4"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">Bekliyor</span></td>
                                        <td className="px-6 py-4 text-slate-400">-</td>
                                        <td className="px-6 py-4 text-right"><span className="material-symbols-outlined text-slate-400 cursor-pointer hover:text-slate-600">more_vert</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    {/*  MODAL OVERLAY  */}
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] transition-opacity duration-300">
                        {/*  Modal Content  */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            {/*  Modal Header  */}
                            <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">E-posta Adresini Doğrula</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Stark Industries için güvenli faturalamayı ayarlayın</p>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>
                            {/*  Progress Stepper  */}
                            <div className="bg-slate-50 dark:bg-slate-950 px-8 py-6 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between relative">
                                    {/*  Line Background  */}
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-slate-200 dark:bg-slate-800 -z-0"></div>
                                    {/*  Step 1: Completed  */}
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-sm font-bold">check</span>
                                        </div>
                                        <span className="text-xs font-medium text-green-600 dark:text-green-500 absolute -bottom-6 w-38 text-center" style={{ width: '120px' }}>Alıcı Eklendi</span>
                                    </div>
                                    {/*  Step 2: Active  */}
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md ring-4 ring-primary/20">
                                            <span className="text-xs font-bold">2</span>
                                        </div>
                                        <span className="text-xs font-bold text-primary absolute -bottom-6 w-38 text-center" style={{ width: '120px' }}>E-posta Doğrula</span>
                                    </div>
                                    {/*  Step 3: Pending  */}
                                    <div className="relative z-10 flex flex-col items-center gap-2">
                                        <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 text-slate-400 flex items-center justify-center">
                                            <span className="text-xs font-bold">3</span>
                                        </div>
                                        <span className="text-xs font-medium text-slate-400 dark:text-slate-500 absolute -bottom-6 w-32 text-center">Onay</span>
                                    </div>
                                </div>
                                <div className="h-4"></div> {/*  Spacer for absolute text  */}
                            </div>
                            {/*  Modal Body  */}
                            <div className="p-8 overflow-y-auto">
                                {/*  Status Alert  */}
                                <div className="flex flex-col items-center justify-center text-center mb-8">
                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 rounded-full mb-4">
                                        <span className="relative flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
                                        </span>
                                        <span className="text-sm font-semibold text-orange-700 dark:text-orange-400">Doğrulama Bekleniyor</span>
                                    </div>
                                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                                        tony@stark.com
                                    </h4>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                                        Bu adrese güvenli bir bağlantı gönderdik. Alıcının faturaları alabilmesi için e-posta adresini onaylaması gerekir.
                                    </p>
                                    <button className="mt-4 text-sm font-semibold text-primary hover:text-blue-700 flex items-center gap-1.5 transition-colors">
                                        <span className="material-symbols-outlined text-[18px]">refresh</span>
                                        Doğrulama Bağlantısını Tekrar Gönder
                                    </button>
                                </div>
                                {/*  Visual Aid  */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6 border border-slate-100 dark:border-slate-800">
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 text-center">Alıcının Görünümü</p>
                                    {/*  Mock Email Interface  */}
                                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 max-w-md mx-auto overflow-hidden">
                                        {/*  Email Header  */}
                                        <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-sm">shield</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-900 dark:text-white">Fatura Sistemi</span>
                                                <span className="text-[10px] text-slate-500">Alıcı: tony@stark.com</span>
                                            </div>
                                        </div>
                                        {/*  Email Body  */}
                                        <div className="p-6 text-center">
                                            <h5 className="text-sm font-bold text-slate-900 dark:text-white mb-2">E-posta adresinizi onaylayın</h5>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                                                Stark Industries için fatura temsilcisi olarak eklendiniz. Güvenli belgelere erişmek için lütfen e-postanızı doğrulayın.
                                            </p>
                                            <div className="inline-block px-4 py-2 bg-primary text-white text-xs font-bold rounded cursor-default select-none shadow-sm">
                                                E-postamı Doğrula
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                                <div className="h-2 w-3/4 bg-slate-100 dark:bg-slate-800 rounded mx-auto mb-2"></div>
                                                <div className="h-2 w-1/2 bg-slate-100 dark:bg-slate-800 rounded mx-auto"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/*  Modal Footer  */}
                            <div className="px-8 py-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
                                <button className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-sm font-medium px-4 py-2">
                                    Kurulumu İptal Et
                                </button>
                                <div className="flex gap-3">
                                    <button className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm">
                                        Kapat
                                    </button>
                                    <button className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-sm font-medium cursor-not-allowed flex items-center gap-2" disabled={true}>
                                        Devam Et
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </>
    );
}
