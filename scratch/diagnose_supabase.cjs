const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('--- TESTANDO CONEXÃO COM O SUPABASE ---');
    try {
        console.log('1. Testando leitura simples da tabela de concursos...');
        const { data, error } = await supabase.from('concursos').select('id, name').limit(1);
        if (error) {
            console.error('ERRO RETORNADO PELO SUPABASE:', JSON.stringify(error, null, 2));
        } else {
            console.log('SUCESSO! Leitura efetuada com sucesso.');
            console.log('Item de teste:', data);
        }
    } catch (e) {
        console.error('ERRO DE REDE/CONEXÃO HTTP:', e);
    }
}

run();
