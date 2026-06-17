const { createClient } = require('./node_modules/@supabase/supabase-js');
const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';
const supabase = createClient(url, key);

async function run() {
    console.log('\n=== Verificando estrutura do banco de dados ===\n');

    // 1. Verificar se a coluna activity_type existe em study_sessions
    const { data: colCheck, error: colErr } = await supabase
        .from('study_sessions')
        .select('id,activity_type')
        .limit(1);

    if (colErr && colErr.code === '42703') {
        console.log('❌ FALHOU: Coluna activity_type NAO existe em study_sessions');
        console.log('   Execute o SQL: ALTER TABLE study_sessions ADD COLUMN IF NOT EXISTS activity_type text;');
    } else if (colErr) {
        console.log('⚠️  Erro ao verificar coluna:', colErr.message);
    } else {
        console.log('✅ Coluna activity_type existe em study_sessions');
    }

    // 2. Verificar estrutura de scheduled_studies
    const { data: schedCheck, error: schedErr } = await supabase
        .from('scheduled_studies')
        .select('id,activity_type,duration_minutes,questions_done,questions_correct')
        .limit(1);

    if (schedErr) {
        console.log('❌ Erro ao verificar scheduled_studies:', schedErr.message, schedErr.code);
    } else {
        console.log('✅ scheduled_studies: activity_type, duration_minutes, questions_done, questions_correct OK');
    }

    // 3. Testar insert de sessão com activity_type
    console.log('\n=== Testando insert com activity_type ===\n');
    const testId = '00000000-0000-0000-0000-000000000001';
    
    // Limpar possível teste anterior
    await supabase.from('study_sessions').delete().eq('id', testId);

    const { data: insertData, error: insertErr } = await supabase
        .from('study_sessions')
        .insert({
            id: testId,
            user_id: '00000000-0000-0000-0000-000000000000', // fake user, will fail RLS
            subject_id: 'test',
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
        // RLS error is expected (not authenticated), but column error is not
        if (insertErr.code === '42703') {
            console.log('❌ FALHOU: Coluna activity_type causou erro 42703 no insert');
        } else if (insertErr.code === '42501' || insertErr.message?.includes('row-level security') || insertErr.message?.includes('violates')) {
            console.log('✅ Insert com activity_type: coluna aceita (bloqueado por RLS - esperado sem auth)');
        } else {
            console.log('⚠️  Insert retornou erro (pode ser RLS):', insertErr.code, insertErr.message);
        }
    } else {
        console.log('✅ Insert com activity_type bem-sucedido! Data:', insertData);
        // Limpar
        await supabase.from('study_sessions').delete().eq('id', testId);
    }

    console.log('\n=== Verificação completa ===\n');
}

run().catch(console.error);
