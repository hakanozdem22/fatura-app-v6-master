import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hbgbjvpdlipoudcdpjkg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZ2JqdnBkbGlwb3VkY2RwamtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTQ5ODUsImV4cCI6MjA4NzM3MDk4NX0.ey4I59EgtYu-4LaPEfMUP5BFv83QnvEPd992b8DhMUA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
    const { data: logs, error } = await supabase.from('system_logs').select('*');
    if (error) {
        console.error("Fetch Error:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("No logs found.");
        return;
    }

    const nullActions = logs.filter(l => !l.action);
    const nullEmails = logs.filter(l => !l.user_email);
    const nullDates = logs.filter(l => !l.created_at);

    console.log(`Total logs: ${logs.length}`);
    console.log(`Logs with null action: ${nullActions.length}`);
    console.log(`Logs with null user_email: ${nullEmails.length}`);
    console.log(`Logs with null created_at: ${nullDates.length}`);

    if (nullActions.length > 0) console.log("Example null action:", nullActions[0]);
    if (nullEmails.length > 0) console.log("Example null email:", nullEmails[0]);
}

checkDatabase();
