const { createClient } = require('./node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function run() {
    console.log("--- FETCHING CONCURSOS ---");
    const { data: concursos } = await supabase.from('concursos').select('*');
    for (const c of concursos || []) {
        console.log(`Concurso: ${c.name} (${c.id})`);
        for (const s of c.subjects || []) {
            console.log(`  Subject: ${s.name} (${s.id})`);
        }
    }

    console.log("\n--- FETCHING SIMULADOS ---");
    const { data: simulados } = await supabase.from('simulados').select('*');
    console.log(JSON.stringify(simulados, null, 2));

    console.log("\n--- FETCHING STUDY SESSIONS ---");
    const { data: sessions } = await supabase.from('study_sessions').select('*');
    console.log(JSON.stringify(sessions, null, 2));

    console.log("\n--- FETCHING SCHEDULED STUDIES ---");
    const { data: sched } = await supabase.from('scheduled_studies').select('*');
    console.log(JSON.stringify(sched, null, 2));
}

run();
