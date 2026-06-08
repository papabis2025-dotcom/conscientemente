const { createClient } = require('@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

async function run() {
    try {
        console.log('Logging in/Signing up a test user...');
        const email = `test_${Date.now()}@example.com`;
        const password = 'password123';
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password
        });
        
        if (authError) {
            console.error('Sign up failed:', authError);
            return;
        }
        
        const user = authData.user;
        console.log('Logged in as user:', user.id);

        console.log('Attempting to insert a mock simulado without duration...');
        const mockSimulado = {
            id: 'd9b15b3c-23fb-4d1a-8bb7-d86b5aba07ad', // valid uuid format
            user_id: user.id,
            name: 'Simulado Teste',
            date: '2026-06-07',
            total_questions: 10,
            results: [{ subjectId: 'd9b15b3c-23fb-4d1a-8bb7-d86b5aba07ae', done: 10, correct: 8 }]
        };

        const { data, error } = await supabase.from('simulados').insert(mockSimulado).select().single();
        if (error) {
            console.error('Insert failed! Error detail:', JSON.stringify(error, null, 2));
        } else {
            console.log('Insert successful! Columns returned:', Object.keys(data));
            console.log('Data:', data);
        }

        // Clean up the inserted simulado
        if (data) {
            console.log('Cleaning up inserted simulado...');
            await supabase.from('simulados').delete().eq('id', data.id);
        }

    } catch (e) {
        console.error('Unexpected error:', e);
    }
}

run();
