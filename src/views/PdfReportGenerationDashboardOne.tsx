// @ts-nocheck
export default function PdfReportGenerationDashboardOne() {
  return (
    <>

      {/*  Header & Filters  */}
      <header className="z-10 flex flex-col gap-4 border-b border-slate-200 bg-white px-8 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rapor Oluşturma</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Onaylanan faturaları inceleyin ve özetleri dışa aktarın.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/*  Date Range  */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            <div className="relative">
              <input className="border-none bg-transparent py-1.5 pl-3 pr-1 text-sm text-slate-600 focus:ring-0 dark:text-slate-300" type="date" value="2023-10-01" />
            </div>
            <span className="text-slate-400 px-1">-</span>
            <div className="relative">
              <input className="border-none bg-transparent py-1.5 pl-1 pr-3 text-sm text-slate-600 focus:ring-0 dark:text-slate-300" type="date" value="2023-10-31" />
            </div>
          </div>
          {/*  Category Dropdown  */}
          <div className="relative min-w-[160px]">
            <select className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-600 focus:border-primary focus:ring-1 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <option>Tüm Kategoriler</option>
              <option>Ofis Malzemeleri</option>
              <option>Seyahat</option>
              <option>Yazılım</option>
            </select>
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </span>
          </div>
          <button className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 dark:bg-primary/20 dark:text-primary-400 dark:hover:bg-primary/30 transition-colors">
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span className="hidden sm:inline">Önizlemeyi Güncelle</span>
          </button>
        </div>
      </header>
      {/*  Main Workspace (PDF Preview Area)  */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-100 dark:bg-[#0b0f17]">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {/*  Action Toolbar  */}
          <div className="flex items-center justify-between rounded-xl bg-white p-2 shadow-sm dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center px-4">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Önizleme: <span className="text-slate-900 dark:text-white">Aylik_Rapor_Ekim_2023.pdf</span></span>
            </div>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                <span className="material-symbols-outlined text-[18px]">print</span>
                Yazdır
              </button>
              <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                PDF İndir
              </button>
            </div>
          </div>
          {/*  PDF Paper Simulation  */}
          <div className="relative mx-auto w-full max-w-[210mm] min-h-[297mm] origin-top bg-white p-[20mm] shadow-lg ring-1 ring-black/5 dark:bg-white dark:ring-white/10">
            {/*  Paper Header  */}
            <div className="mb-10 flex items-start justify-between border-b border-slate-200 pb-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-8 w-8 rounded bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-[20px]">description</span>
                  </div>
                  <span className="text-xl font-bold text-slate-900">Invoicely</span>
                </div>
                <p className="text-sm text-slate-500">
                  123 Business Park Drive<br />
                  Suite 400<br />
                  San Francisco, CA 94107
                </p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Gider Raporu</h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Rapor No: #RPT-2023-10-A</p>
                <p className="text-sm text-slate-500">Oluşturulma Tarihi: 31 Eki, 2023</p>
              </div>
            </div>
            {/*  Report Meta  */}
            <div className="mb-8 grid grid-cols-2 gap-8">
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Rapor Dönemi</h3>
                <p className="text-sm font-medium text-slate-900">01 Eki, 2023 — 31 Eki, 2023</p>
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Onaylayan</h3>
                <p className="text-sm font-medium text-slate-900">Alex Morgan (Finans Yöneticisi)</p>
              </div>
            </div>
            {/*  Data Table  */}
            <div className="mb-8">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pl-2">Fatura No</th>
                    <th className="pb-3">Tedarikçi</th>
                    <th className="pb-3">Tarih</th>
                    <th className="pb-3 text-right">Tutar</th>
                    <th className="pb-3 text-right">Vergi (10%)</th>
                    <th className="pb-3 pr-2 text-right">Toplam</th>
                  </tr>
                </thead>
                <tbody className="text-slate-700">
                  <tr className="border-b border-slate-50">
                    <td className="py-3 pl-2 font-medium">#INV-001</td>
                    <td className="py-3">Acme Supplies Co.</td>
                    <td className="py-3">02 Eki, 2023</td>
                    <td className="py-3 text-right">$450.00</td>
                    <td className="py-3 text-right">$45.00</td>
                    <td className="py-3 pr-2 text-right font-medium">$495.00</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-3 pl-2 font-medium">#INV-002</td>
                    <td className="py-3">Tech Solutions Inc.</td>
                    <td className="py-3">05 Eki, 2023</td>
                    <td className="py-3 text-right">$1,200.00</td>
                    <td className="py-3 text-right">$120.00</td>
                    <td className="py-3 pr-2 text-right font-medium">$1,320.00</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-3 pl-2 font-medium">#INV-005</td>
                    <td className="py-3">Global Travel Agency</td>
                    <td className="py-3">12 Eki, 2023</td>
                    <td className="py-3 text-right">$850.00</td>
                    <td className="py-3 text-right">$85.00</td>
                    <td className="py-3 pr-2 text-right font-medium">$935.00</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-3 pl-2 font-medium">#INV-008</td>
                    <td className="py-3">Office Depot</td>
                    <td className="py-3">15 Eki, 2023</td>
                    <td className="py-3 text-right">$125.50</td>
                    <td className="py-3 text-right">$12.55</td>
                    <td className="py-3 pr-2 text-right font-medium">$138.05</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-3 pl-2 font-medium">#INV-012</td>
                    <td className="py-3">Cloud Server Hosting</td>
                    <td className="py-3">20 Eki, 2023</td>
                    <td className="py-3 text-right">$200.00</td>
                    <td className="py-3 text-right">$20.00</td>
                    <td className="py-3 pr-2 text-right font-medium">$220.00</td>
                  </tr>
                  <tr className="border-b border-slate-50">
                    <td className="py-3 pl-2 font-medium">#INV-015</td>
                    <td className="py-3">Marketing Partners</td>
                    <td className="py-3">28 Eki, 2023</td>
                    <td className="py-3 text-right">$3,500.00</td>
                    <td className="py-3 text-right">$350.00</td>
                    <td className="py-3 pr-2 text-right font-medium">$3,850.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
            {/*  Summary Section  */}
            <div className="flex justify-end">
              <div className="w-1/2 rounded-lg bg-slate-50 p-4 ring-1 ring-slate-100">
                <div className="flex justify-between py-1 text-sm text-slate-600">
                  <span>Ara Toplam</span>
                  <span>$6,325.50</span>
                </div>
                <div className="flex justify-between py-1 text-sm text-slate-600">
                  <span>Toplam Vergi (10%)</span>
                  <span>$632.55</span>
                </div>
                <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-primary">
                  <span>Genel Toplam</span>
                  <span>$6,958.05</span>
                </div>
              </div>
            </div>
            {/*  Footer  */}
            <div className="absolute bottom-[20mm] left-[20mm] right-[20mm] border-t border-slate-200 pt-4 text-center">
              <p className="text-xs text-slate-400">Bu belge FaturaAPP tarafından otomatik olarak oluşturulmuştur. Sorularınız için lütfen finance@faturaapp.com ile iletişime geçin.</p>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
