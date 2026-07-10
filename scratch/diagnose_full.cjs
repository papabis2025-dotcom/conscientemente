const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('=== DIAGNÓSTICO COMPLETO DO SUPABASE ===\n');

    // 1. Auth
    console.log('1. Verificando sessão de autenticação...');
    const { data: { session }, error: authErr } = await supabase.auth.getSession();
    if (authErr || !session) {
        console.error('ERRO: Sem sessão autenticada.', authErr?.message);
        console.log('\nPossível causa: O script roda fora do contexto do browser (sem cookie de sessão).');
        console.log('Testando acesso anônimo às tabelas...\n');
    } else {
        console.log('OK - Usuário autenticado:', session.user.email);
    }

    // 2. Testar leitura de scheduled_studies (sem auth)
    console.log('\n2. Leitura de scheduled_studies (últimos 5 registros)...');
    const { data: schedData, error: schedErr } = await supabase
        .from('scheduled_studies')
        .select('id, date, activity_type, user_id')
        .order('date', { ascending: false })
        .limit(5);
    if (schedErr) {
        console.error('ERRO ao ler scheduled_studies:', JSON.stringify(schedErr));
    } else {
        console.log(`OK - ${schedData.length} registros encontrados`);
        schedData.forEach(r => console.log(`  - ${r.date} | ${r.activity_type} | user: ${r.user_id?.substring(0,8)}...`));
    }

    // 3. Testar leitura de study_sessions
    console.log('\n3. Leitura de study_sessions (últimos 5 registros)...');
    const { data: sessData, error: sessErr } = await supabase
        .from('study_sessions')
        .select('id, date, activity_type, user_id')
        .order('date', { ascending: false })
        .limit(5);
    if (sessErr) {
        console.error('ERRO ao ler study_sessions:', JSON.stringify(sessErr));
    } else {
        console.log(`OK - ${sessData.length} registros encontrados`);
        sessData.forEach(r => console.log(`  - ${r.date} | ${r.activity_type} | user: ${r.user_id?.substring(0,8)}...`));
    }

    // 4. Verificar colunas de study_sessions
    console.log('\n4. Verificando colunas disponíveis em study_sessions...');
    const { data: colData, error: colErr } = await supabase
        .from('study_sessions')
        .select('id, subject_id, topic_id, duration_minutes, date, questions_done, questions_correct, is_simulado, activity_type, questions_link')
        .limit(1);
    if (colErr) {
        console.error('ERRO - Coluna(s) ausente(s):', JSON.stringify(colErr));
        if (colErr.code === '42703') {
            console.log('=> Existe coluna ausente em study_sessions. Verificar migrations!');
        }
    } else {
        console.log('OK - Todas as colunas esperadas existem em study_sessions');
    }

    // 5. Verificar colunas de scheduled_studies
    console.log('\n5. Verificando colunas disponíveis em scheduled_studies...');
    const { data: sColData, error: sColErr } = await supabase
        .from('scheduled_studies')
        .select('id, user_id, date, subject_id, topic_id, activity_type, notes, duration_minutes, questions_done, questions_correct, questions_link')
        .limit(1);
    if (sColErr) {
        console.error('ERRO - Coluna(s) ausente(s):', JSON.stringify(sColErr));
        if (sColErr.code === '42703') {
            console.log('=> Existe coluna ausente em scheduled_studies. Verificar migrations!');
        }
    } else {
        console.log('OK - Todas as colunas esperadas existem em scheduled_studies');
    }

    // 6. Testar se a policy RLS permite inserção (sem user_id real, vai falhar por RLS - mas vamos ver o erro)
    console.log('\n6. Testando política RLS em scheduled_studies (insert sem auth)...');
    const testId = 'diag-' + Date.now();
    const { error: insertErr } = await supabase
        .from('scheduled_studies')
        .insert({ id: testId, date: '2026-07-09', subject_id: 'test', activity_type: 'Teste', user_id: 'test-user' });
    if (insertErr) {
        if (insertErr.code === '42501' || insertErr.message?.includes('policy') || insertErr.message?.includes('RLS') || insertErr.message?.includes('row-level')) {
            console.log('OK - RLS ativo (inserção bloqueada sem autenticação válida - comportamento esperado)');
        } else if (insertErr.code === '23503') {
            console.log('OK - Foreign key constraint ativo (comportamento esperado)');
        } else {
            console.error('ERRO inesperado no insert:', JSON.stringify(insertErr));
        }
    } else {
        console.log('ATENÇÃO: Insert sem auth foi aceito! RLS pode estar desabilitado.');
        // Cleanup
        await supabase.from('scheduled_studies').delete().eq('id', testId);
    }

    console.log('\n=== FIM DO DIAGNÓSTICO ===');
}

run().catch(console.error);
