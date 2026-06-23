const fs = require('fs');
const path = require('path');
const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const userProfile = process.env.USERPROFILE || 'C:\\Users\\mmari';
const leveldbPath = path.join(userProfile, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');

async function run() {
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

    console.log("\n--- ALL CONCURSOS ---");
    const { data: concursos } = await supabase.from('concursos').select('*');
    concursos.forEach(c => {
        console.log(`Concurso: "${c.name}" (id: ${c.id})`);
        (c.subjects || []).forEach(s => {
            console.log(`  - Subject: "${s.name}" (id: ${s.id})`);
        });
    });

    console.log("\n--- ALL STUDY SESSIONS ---");
    const { data: sessions } = await supabase.from('study_sessions').select('*');
    console.log(`Total sessions: ${sessions?.length || 0}`);
    (sessions || []).forEach(s => {
        console.log(`  - Date: ${s.date}, SubjectId: ${s.subject_id}, TopicId: ${s.topic_id}, ActivityType: ${s.activity_type}`);
    });

    console.log("\n--- ALL SCHEDULED STUDIES (PLANNER) ---");
    const { data: sched } = await supabase.from('scheduled_studies').select('*');
    console.log(`Total scheduled: ${sched?.length || 0}`);
    (sched || []).forEach(s => {
        console.log(`  - Date: ${s.date}, SubjectId: ${s.subject_id}, TopicId: ${s.topic_id}, ActivityType: ${s.activity_type}, Notes: ${s.notes}`);
    });
}

run().catch(console.error);
