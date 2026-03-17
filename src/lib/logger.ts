import { supabase } from './supabaseClient';

export async function logAction(userEmail: string | undefined, action: string, details?: string, metadata?: any) {
    if (!userEmail) return;

    try {
        const { error } = await supabase
            .from('system_logs')
            .insert([
                {
                    user_email: userEmail,
                    action,
                    details,
                    metadata: metadata ? JSON.stringify(metadata) : null
                }
            ]);

        if (error) {
            console.error('Log kaydetme hatası:', error);
        }
    } catch (err) {
        console.error('Log kaydetme sırasında beklenmeyen hata:', err);
    }
}
