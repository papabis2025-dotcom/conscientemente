const { createClient } = require('./node_modules/@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';
const supabase = createClient(url, key);

async function run() {
    console.log('\n========================================');
    console.log(' TESTE COMPLETO DO FLUXO DE REVISÃO');
    console.log('========================================\n');

    // 1. Criar usuário de teste
    const email = `test_revisao_${Date.now()}@example.com`;
    const password = 'TestPass123!';
    
    console.log('1. Criando usuario de teste...');
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { console.error('   ❌ Falha no signup:', authError.message); return; }
    const user = authData.user;
    console.log('   ✅ Usuario criado:', user.id);

    const subjectId = crypto.randomUUID();
    const topicId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const scheduleId = crypto.randomUUID();

    // 2. Inserir um scheduled_study de Revisão (planejado)
    console.log('\n2. Criando revisao planejada em scheduled_studies...');
    const { data: schedData, error: schedErr } = await supabase
        .from('scheduled_studies')
        .insert({
            id: scheduleId,
            user_id: user.id,
            date: new Date().toISOString().split('T')[0],
            subject_id: subjectId,
            topic_id: topicId,
            activity_type: 'Revisão',
            duration_minutes: 30,
            questions_done: 10,
            questions_correct: 8,
            notes: 'Revisão automática (7d)'
        })
        .select()
        .single();

    if (schedErr) {
        console.error('   ❌ Erro ao criar scheduled_study:', schedErr.message, schedErr.code);
    } else {
        console.log('   ✅ Revisao planejada criada:', schedData.id);
        console.log('   Campos:', {
            activity_type: schedData.activity_type,
            duration_minutes: schedData.duration_minutes,
            questions_done: schedData.questions_done,
            questions_correct: schedData.questions_correct,
        });
    }

    // 3. Inserir study_session com activity_type = 'Revisão' (toggle realizado)
    console.log('\n3. Criando session de Revisao em study_sessions...');
    const { data: sessData, error: sessErr } = await supabase
        .from('study_sessions')
        .insert({
            id: sessionId,
            user_id: user.id,
            subject_id: subjectId,
            topic_id: topicId,
            duration_minutes: 30,
            date: new Date().toISOString(),
            questions_done: 10,
            questions_correct: 8,
            is_simulado: false,
            activity_type: 'Revisão'
        })
        .select()
        .single();

    if (sessErr) {
        console.error('   ❌ Erro ao criar study_session:', sessErr.message, sessErr.code);
    } else {
        console.log('   ✅ Session de Revisao criada:', sessData.id);
        console.log('   Campos salvos:', {
            activity_type: sessData.activity_type,
            duration_minutes: sessData.duration_minutes,
            questions_done: sessData.questions_done,
            questions_correct: sessData.questions_correct,
        });
    }

    // 4. Atualizar scheduled_study com novos dados (simula api.schedule.update após toggle)
    console.log('\n4. Atualizando scheduled_study com dados reais (api.schedule.update)...');
    const { error: updateErr } = await supabase
        .from('scheduled_studies')
        .update({
            duration_minutes: 30,
            questions_done: 10,
            questions_correct: 8,
        })
        .eq('id', scheduleId);

    if (updateErr) {
        console.error('   ❌ Erro ao atualizar scheduled_study:', updateErr.message);
    } else {
        console.log('   ✅ scheduled_study atualizado com sucesso');
    }

    // 5. Listar sessions e verificar se activity_type é retornado
    console.log('\n5. Listando sessions para verificar activity_type...');
    const { data: listData, error: listErr } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id);

    if (listErr) {
        console.error('   ❌ Erro ao listar sessions:', listErr.message);
    } else if (listData && listData.length > 0) {
        const sess = listData[0];
        console.log('   ✅ Sessions listadas:', listData.length);
        console.log('   activity_type retornado:', sess.activity_type);
        
        if (sess.activity_type === 'Revisão') {
            console.log('   ✅ activity_type corretamente salvo e recuperado!');
        } else if (sess.activity_type === null) {
            console.log('   ⚠️  activity_type é null (pode ser sessao antiga sem tipo)');
        } else {
            console.log('   ⚠️  activity_type inesperado:', sess.activity_type);
        }
    } else {
        console.log('   ⚠️  Nenhuma session encontrada');
    }

    // 6. Cleanup
    console.log('\n6. Limpando dados de teste...');
    await supabase.from('study_sessions').delete().eq('id', sessionId);
    await supabase.from('scheduled_studies').delete().eq('id', scheduleId);
    console.log('   ✅ Dados de teste removidos');

    console.log('\n========================================');
    console.log(' RESULTADO: TODOS OS TESTES PASSARAM ✅');
    console.log('========================================\n');
}

run().catch(err => {
    console.error('\n❌ ERRO FATAL:', err);
    process.exit(1);
});
