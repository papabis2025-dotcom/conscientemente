const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function run() {
    console.log("--- SEARCHING FOR CONCURSOS ---");
    const { data: concursos, error: cErr } = await supabase.from('concursos').select('*');
    if (cErr) {
        console.error("Error fetching concursos:", cErr);
        return;
    }

    const oabConcurso = concursos.find(c => c.name && c.name.toLowerCase().includes('oab/47') || c.name.toLowerCase().includes('oab'));
    if (!oabConcurso) {
        console.log("No concurso found matching 'oab/47' or 'oab'.");
        console.log("All concursos available:");
        concursos.forEach(c => console.log(`- ${c.name} (id: ${c.id})`));
        return;
    }

    console.log(`Found Concurso: "${oabConcurso.name}" (id: ${oabConcurso.id})`);
    
    // Get all subjects
    const subjects = oabConcurso.subjects || [];
    const subjectIds = subjects.map(s => s.id);
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    console.log(`Subjects: ${subjects.map(s => s.name).join(', ')}`);

    console.log("\n--- FETCHING PENDING SCHEDULED STUDIES (PLANNER) ---");
    const { data: sched, error: sErr } = await supabase.from('scheduled_studies').select('*');
    if (sErr) {
        console.error("Error fetching scheduled studies:", sErr);
        return;
    }

    // Filter scheduled studies belonging to the oabConcurso subjects
    const oabSched = sched.filter(s => subjectIds.includes(s.subjectId));
    
    console.log(`Found ${oabSched.length} scheduled activities total for this concurso.`);

    console.log("\n--- PENDING ACTIVITIES (status: 'planejado') ---");
    const pending = oabSched.filter(s => s.status === 'planejado');
    if (pending.length === 0) {
        console.log("No pending activities found.");
    } else {
        pending.forEach(p => {
            const subject = subjectMap.get(p.subjectId);
            const subjectName = subject ? subject.name : 'Unknown';
            let topicName = 'Geral';
            if (p.topicId && subject) {
                const topic = (subject.topics || []).find(t => t.id === p.topicId);
                if (topic) topicName = topic.title;
            }
            console.log(`- ID: ${p.id}`);
            console.log(`  Date: ${p.date}`);
            console.log(`  Activity: ${p.activityType}`);
            console.log(`  Subject: ${subjectName}`);
            console.log(`  Topic: ${topicName}`);
            console.log(`  Notes: ${p.notes}`);
            console.log(`-----------------------------------`);
        });
    }

    console.log("\n--- COMPLETED ACTIVITIES (status: 'realizado') ---");
    const completed = oabSched.filter(s => s.status === 'realizado');
    if (completed.length === 0) {
        console.log("No completed activities found.");
    } else {
        completed.forEach(p => {
            const subject = subjectMap.get(p.subjectId);
            const subjectName = subject ? subject.name : 'Unknown';
            let topicName = 'Geral';
            if (p.topicId && subject) {
                const topic = (subject.topics || []).find(t => t.id === p.topicId);
                if (topic) topicName = topic.title;
            }
            console.log(`- ID: ${p.id}`);
            console.log(`  Date: ${p.date}`);
            console.log(`  Activity: ${p.activityType}`);
            console.log(`  Subject: ${subjectName}`);
            console.log(`  Topic: ${topicName}`);
            console.log(`  Notes: ${p.notes}`);
            console.log(`-----------------------------------`);
        });
    }
}

run();
