import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1].trim(), keyMatch[1].trim());

async function run() {
    const { data, error } = await supabase.from('invoices').select('status');
    if (error) console.error(error);
    else {
        const statuses = new Set(data.map(d => d.status));
        console.log("Unique Statuses:", Array.from(statuses));
    }
}
run();
