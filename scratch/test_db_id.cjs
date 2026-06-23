const { createClient } = require('../node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';
const supabase = createClient(url, key);

async function run() {
    console.log('Testing custom ID insertion in study_sessions...');
    
    const email = `test_id_${Date.now()}@example.com`;
    const password = 'TestPass123!';
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
        console.error('Sign up failed:', authError.message);
        return;
    }
    const user = authData.user;
    console.log('Signed up temporary user:', user.id);

    // Generate a unique test ID
    const testId = crypto.randomUUID();
    
    // Insert with custom ID
    const { data: inserted, error: insertErr } = await supabase
        .from('study_sessions')
        .insert({
            id: testId,
            user_id: user.id,
            subject_id: crypto.randomUUID(),
            duration_minutes: 30,
            date: new Date().toISOString(),
            questions_done: 10,
            questions_correct: 8,
            is_simulado: false,
            activity_type: 'Revisão'
        })
        .select()
        .single();
        
    if (insertErr) {
        console.log('Insert error:', insertErr);
    } else {
        console.log('Inserted successfully! ID returned:', inserted.id);
        console.log('Does it match our custom ID?', inserted.id === testId ? 'YES! ✅' : 'NO! ❌');
    }
    
    // Clean up
    await supabase.from('study_sessions').delete().eq('id', testId);
}

run().catch(console.error);
