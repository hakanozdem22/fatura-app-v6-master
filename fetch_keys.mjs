import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
    const { data, error } = await supabase.from('invoices').select('*').limit(1);
    if (error) console.error("Error:", error);
    else {
        console.log("Keys in invoice object:", Object.keys(data[0] || {}));
    }
}
run();
