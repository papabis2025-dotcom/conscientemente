const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const userProfile = process.env.USERPROFILE || 'C:\\Users\\mmari';
const leveldbPath = path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');

async function findSessionAndRun() {
    const files = fs.readdirSync(leveldbPath);
    let sessionData = null;

    for (const file of files) {
        if (file.endsWith('.ldb') || file.endsWith('.log')) {
            const fullPath = path.join(leveldbPath, file);
            try {
                const content = fs.readFileSync(fullPath);
                let index = content.indexOf('sb-osxlcwbxlbesxcrzvoyt-auth-token');
                while (index !== -1) {
                    const sliced = content.slice(index, index + 80000);
                    const str = sliced.toString('utf8');
                    const startIdx = str.indexOf('{');
                    if (startIdx !== -1) {
                        let pos = str.indexOf('}', startIdx);
                        while (pos !== -1) {
                            const candidate = str.substring(startIdx, pos + 1);
                            try {
                                const parsed = JSON.parse(candidate);
                                if (parsed.access_token && parsed.user) {
                                    sessionData = parsed;
                                    break;
                                }
                            } catch (e) {}
                            pos = str.indexOf('}', pos + 1);
                        }
                    }
                    index = content.indexOf('sb-osxlcwbxlbesxcrzvoyt-auth-token', index + 1);
                }
            } catch (e) {}
        }
    }

    if (!sessionData) {
        console.error("No valid session found.");
        return;
    }

    const supabase = createClient(url, key);
    await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token
    });

    console.log("Logged in as:", sessionData.user.email);

    const { data: concursos } = await supabase.from('concursos').select('*');
    const oabConcurso = concursos.find(c => c.name && (c.name.toLowerCase().includes('oab/47') || c.name.toLowerCase().includes('oab')));
    if (!oabConcurso) {
        console.log("No OAB concurso found.");
        return;
    }

    console.log(`Concurso: "${oabConcurso.name}" (id: ${oabConcurso.id})`);
    const subjects = oabConcurso.subjects || [];
    const subjectIds = subjects.map(s => s.id);
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    console.log("OAB/47 Subject IDs:", subjectIds);

    const { data: sched } = await supabase.from('scheduled_studies').select('*');
    console.log("Total scheduled studies:", sched.length);
    
    // Check if any subject_id from sched exists in OAB/47 subjects
    const oabSched = sched.filter(s => subjectIds.includes(s.subject_id));
    console.log("Filtered OAB scheduled studies count:", oabSched.length);

    if (oabSched.length === 0) {
        console.log("First 10 scheduled studies subject_ids in DB:");
        sched.slice(0, 10).forEach(s => {
            console.log(`- Date: ${s.date}, SubjectId: ${s.subject_id}, ActivityType: ${s.activity_type}, Notes: ${s.notes}`);
        });
    } else {
        oabSched.forEach(p => {
            const subject = subjectMap.get(p.subject_id);
            const subjectName = subject ? subject.name : 'Unknown';
            let topicName = 'Geral';
            if (p.topic_id && subject) {
                const topic = (subject.topics || []).find(t => t.id === p.topic_id);
                if (topic) topicName = topic.title;
            }
            console.log(`- [${p.date}] ${p.activity_type} - ${subjectName} -> ${topicName} (status: ${p.status || 'planejado'})`);
            console.log(`  Notes: ${p.notes}`);
            console.log(`  Created At: ${p.created_at}`);
        });
    }
}

findSessionAndRun().catch(console.error);
