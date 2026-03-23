import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hbgbjvpdlipoudcdpjkg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhiZ2JqdnBkbGlwb3VkY2RwamtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE3OTQ5ODUsImV4cCI6MjA4NzM3MDk4NX0.ey4I59EgtYu-4LaPEfMUP5BFv83QnvEPd992b8DhMUA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMissingColumn() {
    const { error } = await supabase.from('system_logs').insert([
        {
            user_email: 'test@example.com',
            action: 'Test action',
            details: 'Test details',
            metadata: null
        }
    ]);

    if (error) {
        console.error("ERROR ENCOUNTERED:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("SUCCESS! No error.");
    }
}

testMissingColumn();
