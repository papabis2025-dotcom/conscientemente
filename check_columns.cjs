const { createClient } = require('@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function run() {
    try {
        console.log('Testing connection and querying table structure...');
        
        // Let's do a select limit 1 on simulados to see what columns are returned
        const { data, error } = await supabase.from('simulados').select('*').limit(1);
        if (error) {
            console.error('Error selecting from simulados:', error);
        } else {
            console.log('Select successful! Data sample:', data);
        }

        // Let's try to query information_schema if public access is allowed
        const { data: schemaData, error: schemaError } = await supabase
            .rpc('get_table_schema', { table_name: 'simulados' }); // RPC if exists
        if (schemaError) {
            console.log('RPC get_table_schema not available or failed:', schemaError.message);
        } else {
            console.log('Schema info:', schemaData);
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

run();
