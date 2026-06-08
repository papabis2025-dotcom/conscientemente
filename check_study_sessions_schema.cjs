const { createClient } = require('./node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function run() {
    // Select one row or schema info
    const { data, error } = await supabase.from('study_sessions').select('*').limit(1);
    if (error) {
        console.error('Error selecting:', error);
    } else {
        console.log('Columns in study_sessions:', data.length > 0 ? Object.keys(data[0]) : 'No rows, trying insert to see');
    }
}

run();
