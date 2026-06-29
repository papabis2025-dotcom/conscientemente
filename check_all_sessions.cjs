const { createClient } = require('@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function check() {
    try {
        console.log('Fetching all study_sessions...');
        const { data, error } = await supabase
            .from('study_sessions')
            .select('*');
        
        if (error) {
            console.error('Error fetching sessions:', error);
            return;
        }

        console.log('Total sessions:', data.length);
        const hasQuestions = data.filter(d => (d.questions_done !== null || d.questions_correct !== null));
        console.log('Sessions with questions data:', hasQuestions.length);
        
        hasQuestions.forEach(d => {
            const done = d.questions_done;
            const correct = d.questions_correct;
            const ratio = done > 0 ? (correct / done) : 0;
            if (ratio > 1 || correct > done) {
                console.log('ANOMALY in session:', d);
            }
        });
        
        console.log('Finished checking.');

    } catch (e) {
        console.error(e);
    }
}

check();
