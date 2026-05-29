const { createClient } = require('@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function check() {
    try {
        console.log('Fetching all users from user_preferences...');
        const { data: prefs, error: prefsErr } = await supabase.from('user_preferences').select('user_id');
        if (prefsErr) console.error('Prefs err:', prefsErr);
        console.log('Prefs count:', prefs?.length, 'Users:', prefs);

        console.log('Fetching count of study_sessions...');
        const { data: sessions, error: sessErr } = await supabase.from('study_sessions').select('id, user_id, subject_id, questions_done');
        if (sessErr) console.error('Sessions err:', sessErr);
        console.log('Sessions count:', sessions?.length);
        if (sessions) {
            console.log('Sessions sample:', sessions.slice(0, 10));
        }

        console.log('Fetching count of simulados...');
        const { data: sims, error: simsErr } = await supabase.from('simulados').select('id, user_id');
        if (simsErr) console.error('Sims err:', simsErr);
        console.log('Sims count:', sims?.length);

        console.log('Fetching count of scheduled_studies...');
        const { data: sched, error: schedErr } = await supabase.from('scheduled_studies').select('id, user_id');
        if (schedErr) console.error('Sched err:', schedErr);
        console.log('Sched count:', sched?.length);

        console.log('Fetching count of concursos...');
        const { data: conc, error: concErr } = await supabase.from('concursos').select('id, user_id, name');
        if (concErr) console.error('Concursos err:', concErr);
        console.log('Concursos count:', conc?.length, conc);

    } catch (e) {
        console.error(e);
    }
}

check();
