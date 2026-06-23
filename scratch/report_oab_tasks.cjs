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

    const { data: concursos } = await supabase.from('concursos').select('*');
    const oabConcurso = concursos.find(c => c.name && (c.name.toLowerCase().includes('oab/47') || c.name.toLowerCase().includes('oab')));
    if (!oabConcurso) {
        console.error("No OAB/47 concurso found.");
        return;
    }

    const subjects = oabConcurso.subjects || [];
    const subjectIds = subjects.map(s => s.id);
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    const { data: sched } = await supabase.from('scheduled_studies').select('*');
    const oabSched = sched.filter(s => subjectIds.includes(s.subject_id));
    const pending = oabSched.filter(s => s.status === 'planejado' || !s.status);

    const report = [];
    pending.forEach(p => {
        const subject = subjectMap.get(p.subject_id);
        const subjectName = subject ? subject.name : 'Desconhecida';
        let topicName = 'Geral';
        if (p.topic_id && subject) {
            const topic = (subject.topics || []).find(t => t.id === p.topic_id);
            if (topic) topicName = topic.title;
        }

        // Determine if it was automatic or manual
        let origin = 'Manual (Adicionada pelo usuário)';
        if (p.activity_type === 'Revisão' && p.notes && p.notes.includes('Revisão automática')) {
            origin = 'Automática (Gerada pelas sessões de estudo)';
        }

        report.push({
            date: p.date.split('T')[0],
            activityType: p.activity_type,
            subjectName,
            topicName,
            notes: p.notes || '—',
            origin,
            createdAt: p.created_at
        });
    });

    // Sort report by date
    report.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(JSON.stringify(report, null, 2));
}

run().catch(console.error);
