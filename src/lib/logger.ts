import { supabase } from './supabaseClient';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function logAction(userEmail: string | undefined, action: string, details?: string, _metadata?: unknown) {
    if (!userEmail) return;

    try {
        // HATA DÜZELTMESİ: 'metadata' sütunu veritabanındaki 'system_logs' tablosunda 
        // bulunmadığı için PGRST204 hatasına yol açıyordu. Sadece geçerli sütunlar gönderiliyor.
        const { error } = await supabase
            .from('system_logs')
            .insert([
                {
                    user_email: userEmail,
                    action,
                    details
                }
            ]);

        if (error) {
            console.error('Log kaydetme hatası:', error);
        }
    } catch (err) {
        console.error('Log kaydetme sırasında beklenmeyen hata:', err);
    }
}
