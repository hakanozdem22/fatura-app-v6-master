// @ts-nocheck
export default function PdfReportGenerationDashboardTwo() {
  return (
    <>

      <header className="z-10 flex flex-col gap-4 border-b border-slate-200 bg-white px-8 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Rapor Oluşturma</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Onaylanan faturaları inceleyin ve özetleri dışa aktarın.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <button className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-all">Manuel Dışa Aktar</button>
            <button className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-primary shadow-sm dark:bg-slate-700 dark:text-white transition-all">Otomasyon</button>
          </div>
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-[#0b0f17]">
        <div className="mx-auto flex max-w-6xl gap-8">
          <div className="w-full max-w-2xl space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-primary dark:bg-blue-900/20 dark:text-blue-400">
                    <span className="material-symbols-outlined text-2xl">autorenew</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Otomatik Aylık Raporları Etkinleştir</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Belirli bir zamanlamaya göre otomatik rapor oluşturun ve gönderin.</p>
                  </div>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input checked="" className="peer sr-only" type="checkbox" />
                  <div className="peer h-7 w-12 rounded-full bg-slate-200 after:absolute after:left-[2px] after:top-[2px] after:h-6 after:w-6 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:border-gray-600 dark:bg-slate-700 dark:peer-focus:ring-blue-800"></div>
                </label>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h4 className="mb-6 text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-400">tune</span> Yapılandırma
              </h4>
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Alıcılar</label>
                  <div className="relative">
                    <select className="w-full rounded-lg border-slate-300 bg-white py-2.5 pl-3 pr-10 text-sm focus:border-primary focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white" multiple="">
                      <option selected="" value="managers">Yöneticiler (3 seçili)</option>
                      <option selected="" value="accounts">Muhasebe Departmanı (Tümü)</option>
                      <option value="staff">Personel Üyeleri</option>
                      <option value="exec">Yönetim Ekibi</option>
                    </select>
                    <div className="absolute right-3 top-3 pointer-events-none">
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">unfold_more</span>
                    </div>
                    <p className="mt-1.5 text-xs text-slate-500">Birden fazla grup seçmek için Ctrl/Cmd tuşuna basılı tutun.</p>
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Zamanlama Sıklığı</label>
                  <div className="grid grid-cols-3 gap-3">
                    <label className="cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-[:checked]:border-primary has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-primary dark:border-slate-700 dark:hover:bg-slate-800 dark:has-[:checked]:bg-blue-900/20">
                      <input className="sr-only" name="schedule" type="radio" value="1st" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Her Ay</span>
                        <span className="font-bold text-slate-900 dark:text-white">1. Gün</span>
                      </div>
                    </label>
                    <label className="cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-[:checked]:border-primary has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-primary dark:border-slate-700 dark:hover:bg-slate-800 dark:has-[:checked]:bg-blue-900/20">
                      <input className="sr-only" name="schedule" type="radio" value="15th" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Her Ay</span>
                        <span className="font-bold text-slate-900 dark:text-white">15. Gün</span>
                      </div>
                    </label>
                    <label className="cursor-pointer rounded-lg border border-slate-200 p-3 hover:bg-slate-50 has-[:checked]:border-primary has-[:checked]:bg-blue-50 has-[:checked]:ring-1 has-[:checked]:ring-primary dark:border-slate-700 dark:hover:bg-slate-800 dark:has-[:checked]:bg-blue-900/20">
                      <input checked="" className="sr-only" name="schedule" type="radio" value="last" />
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Her Ay</span>
                        <span className="font-bold text-slate-900 dark:text-white">Son Gün</span>
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">Rapora Dahil Et</label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <input checked="" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700" type="checkbox" />
                      <div className="flex flex-1 items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                          <span className="material-symbols-outlined text-[18px]">check_circle</span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Onaylanan Faturalar</p>
                          <p className="text-xs text-slate-500">İşlendi ve ödeme için onaylandı</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <input className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700" type="checkbox" />
                      <div className="flex flex-1 items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          <span className="material-symbols-outlined text-[18px]">cancel</span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Reddedilen Faturalar</p>
                          <p className="text-xs text-slate-500">Reddedildi veya inceleme için işaretlendi</p>
                        </div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <input checked="" className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary dark:border-slate-600 dark:bg-slate-700" type="checkbox" />
                      <div className="flex flex-1 items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                          <span className="material-symbols-outlined text-[18px]">bar_chart</span>
                        </span>
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">Özet İstatistikleri</p>
                          <p className="text-xs text-slate-500">Özet grafikler ve genel dağılımlar</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end gap-3 border-t border-slate-100 pt-6 dark:border-slate-800">
                <button className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800">Değişiklikleri Sil</button>
                <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover shadow-sm">
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  Yapılandırmayı Kaydet
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="sticky top-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">E-posta Şablonu Önizlemesi</h3>
                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                  Canlı Önizleme
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-800 dark:bg-slate-900">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-12">Gönderen:</span>
                    <span className="text-xs text-slate-900 dark:text-white">FaturaAPP Otomasyon &lt;no-reply@faturaapp.com&gt;</span>
                  </div>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-12">Alıcı:</span>
                    <span className="text-xs text-slate-900 dark:text-white">finance-managers@company.com; accounts@company.com</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500 w-12">Konu:</span>
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">Aylık Gider Raporu - [Mevcut Ay]</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="mb-6">
                    <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Merhaba Takım,</p>
                    <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">İşte <strong>Ekim 2023</strong> ayı otomatikleştirilmiş gider raporunuz. Bu rapor, fatura döngüsündeki tüm onaylanmış faturaları ve özet istatistikleri içerir.</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">Ayrıntılı dökümler için lütfen ekteki PDF belgesini inceleyiniz.</p>
                  </div>
                  <div className="mb-6 flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-red-100 text-red-600">
                      <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">Gider_Raporu_Ekim_2023.pdf</p>
                      <p className="text-xs text-slate-500">2.4 MB • Otomatik Oluşturuldu</p>
                    </div>
                    <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <span className="material-symbols-outlined text-[20px]">download</span>
                    </button>
                  </div>
                  <div className="mt-8 border-t border-slate-100 pt-6 text-center dark:border-slate-800">
                    <p className="text-xs text-slate-400">
                      FaturaAPP uygulamasında otomatik olarak rapor alacak şekilde ayarlandığı için bu e-postayı alıyorsunuz.
                      <a className="text-primary hover:underline" href="#">Tercihleri yönet</a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
  );
}
