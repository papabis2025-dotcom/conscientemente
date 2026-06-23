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

    // Let's try querying financas_imposto_renda
    console.log("Trying to query 'financas_imposto_renda'...");
    const { data: irData, error: irError } = await supabase.from('financas_imposto_renda').select('*').limit(1);
    if (irError) {
        console.log("Error querying 'financas_imposto_renda':", irError.message, irError.code);
    } else {
        console.log("Table 'financas_imposto_renda' exists! Sample:", irData);
    }

    // Let's try querying user_preferences column names or schema
    console.log("Trying to query 'user_preferences'...");
    const { data: prefData, error: prefError } = await supabase.from('user_preferences').select('*').limit(1);
    if (prefError) {
        console.log("Error querying 'user_preferences':", prefError.message);
    } else {
        console.log("Columns in user_preferences:", Object.keys(prefData[0] || {}));
    }
}

run().catch(console.error);
