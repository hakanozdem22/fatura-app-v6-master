import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hbgbjvpdlipoudcdpjkg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZ2JqdnBkbGlwb3VkY2RwamtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTQ5ODUsImV4cCI6MjA4NzM3MDk4NX0.ey4I59EgtYu-4LaPEfMUP5BFv83QnvEPd992b8DhMUA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogs() {
    console.log('Fetching from system_logs...');
    const { data: logs, error: fetchError } = await supabase.from('system_logs').select('*').limit(5);
    console.log('Fetch error:', fetchError);

    console.log('Inserting into system_logs with metadata...');
    const { error: insertError } = await supabase.from('system_logs').insert([
        {
            user_email: 'test@example.com',
            action: 'Test action',
            details: 'Test details',
            metadata: JSON.stringify({ test: 'test' })
        }
    ]);
    console.log('Insert error with metadata:', insertError);

    console.log('Inserting into system_logs WITHOUT metadata...');
    const { error: insertErrorNoMeta } = await supabase.from('system_logs').insert([
        {
            user_email: 'test@example.com',
            action: 'Test action',
            details: 'Test details'
        }
    ]);
    console.log('Insert error no meta:', insertErrorNoMeta);
}

testLogs();
