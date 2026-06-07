/**
 * cleanup_db.cjs
 * Limpa os dados corrompidos de cn_saude_activity_types no Supabase.
 * Execute: node cleanup_db.cjs
 */
const { createClient } = require('@supabase/supabase-js');

const url = 'https://osxlcwbxlbesxcrzvoyt.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zeGxjd2J4bGJlc3hjcnp2b3l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2MTk1NzUsImV4cCI6MjA4NDE5NTU3NX0.zryizdmMPpRH0EWltU_6flcOxTg80bzmCY2ArF4A1q0';

const supabase = createClient(url, key);

const ACTIVITY_TYPES_DEFAULT = JSON.stringify([
  { name: 'Corrida', color: '#10b981' },
  { name: 'Ciclismo', color: '#f59e0b' },
  { name: 'Natação', color: '#0ea5e9' },
  { name: 'Musculação', color: '#6366f1' }
]);

const MUSCLE_GROUPS_DEFAULT = JSON.stringify([
  'Peito', 'Costa', 'Ombro', 'Bíceps', 'Tríceps', 'Perna/Anterior', 'Perna/Posterior'
]);

async function cleanup() {
  console.log('🔍 Buscando registros de user_preferences...');

  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
    console.error('❌ Timeout: O servidor Supabase não respondeu em 15 segundos.');
    console.log('\n📋 Tente rodar o SQL abaixo diretamente no painel do Supabase:');
    printManualSQL();
    process.exit(1);
  }, 15000);

  try {
    const { data: rows, error } = await supabase
      .from('user_preferences')
      .select('user_id, hub_bg_image_url, hub_bg_type, hub_bg_color');

    clearTimeout(timeout);

    if (error) {
      console.error('❌ Erro ao ler user_preferences:', error.message);
      console.log('\n📋 Tente rodar o SQL abaixo diretamente no painel do Supabase:');
      printManualSQL();
      return;
    }

    if (!rows || rows.length === 0) {
      console.log('ℹ️  Nenhum registro encontrado em user_preferences.');
      return;
    }

    console.log(`✅ Encontrados ${rows.length} registros.`);

    for (const row of rows) {
      console.log(`\n🔧 Processando user_id: ${row.user_id}`);

      let payload = {};
      let settings = {};
      let payloadSize = 0;

      if (row.hub_bg_image_url) {
        payloadSize = row.hub_bg_image_url.length;
        console.log(`  📦 Tamanho atual do payload: ${(payloadSize / 1024).toFixed(1)} KB`);

        try {
          payload = JSON.parse(row.hub_bg_image_url);
          settings = payload.settings || {};
        } catch (e) {
          console.warn('  ⚠️  Payload inválido, resetando...');
        }
      }

      // Deduplicate activity types
      let activityTypes = [];
      try {
        const parsed = JSON.parse(settings.cn_saude_activity_types || 'null');
        if (Array.isArray(parsed)) {
          const map = new Map();
          parsed.forEach(item => {
            if (item && item.name) map.set(item.name.toLowerCase(), item);
          });
          activityTypes = Array.from(map.values());
          console.log(`  🏃 Tipos de atividade: ${parsed.length} → ${activityTypes.length} (após deduplicação)`);
        } else {
          activityTypes = JSON.parse(ACTIVITY_TYPES_DEFAULT);
          console.log('  🏃 Tipos de atividade: resetados para padrão');
        }
      } catch {
        activityTypes = JSON.parse(ACTIVITY_TYPES_DEFAULT);
        console.log('  🏃 Tipos de atividade: resetados para padrão (erro de parse)');
      }

      // Deduplicate muscle groups
      let muscleGroups = [];
      try {
        const parsed = JSON.parse(settings.cn_saude_muscle_groups || 'null');
        if (Array.isArray(parsed)) {
          muscleGroups = Array.from(new Set(parsed));
          console.log(`  💪 Grupos musculares: ${parsed.length} → ${muscleGroups.length} (após deduplicação)`);
        } else {
          muscleGroups = JSON.parse(MUSCLE_GROUPS_DEFAULT);
          console.log('  💪 Grupos musculares: resetados para padrão');
        }
      } catch {
        muscleGroups = JSON.parse(MUSCLE_GROUPS_DEFAULT);
        console.log('  💪 Grupos musculares: resetados para padrão (erro de parse)');
      }

      // Build cleaned settings preserving other keys
      const cleanedSettings = {
        ...settings,
        cn_saude_activity_types: JSON.stringify(activityTypes),
        cn_saude_muscle_groups: JSON.stringify(muscleGroups),
      };

      const cleanedPayload = {
        updatedAt: Date.now(),
        settings: cleanedSettings
      };

      const cleanedJson = JSON.stringify(cleanedPayload);
      console.log(`  📦 Novo tamanho do payload: ${(cleanedJson.length / 1024).toFixed(1)} KB`);

      if (payloadSize === cleanedJson.length) {
        console.log('  ✅ Nenhuma alteração necessária para este registro.');
        continue;
      }

      // Write cleaned data back
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({ hub_bg_image_url: cleanedJson })
        .eq('user_id', row.user_id);

      if (updateError) {
        console.error(`  ❌ Erro ao atualizar: ${updateError.message}`);
      } else {
        console.log(`  ✅ Registro atualizado com sucesso!`);
      }
    }

    console.log('\n🎉 Limpeza concluída! O servidor Supabase deve se recuperar em 1-2 minutos.');
  } catch (e) {
    clearTimeout(timeout);
    if (e.name === 'AbortError') return;
    console.error('❌ Erro inesperado:', e.message);
    console.log('\n📋 Tente rodar o SQL abaixo diretamente no painel do Supabase:');
    printManualSQL();
  }
}

function printManualSQL() {
  console.log(`
=== SQL PARA RODAR NO PAINEL DO SUPABASE ===

UPDATE user_preferences
SET hub_bg_image_url = jsonb_set(
  hub_bg_image_url::jsonb,
  '{settings,cn_saude_activity_types}',
  '"[{\\"name\\":\\"Corrida\\",\\"color\\":\\"#10b981\\"},{\\"name\\":\\"Ciclismo\\",\\"color\\":\\"#f59e0b\\"},{\\"name\\":\\"Natação\\",\\"color\\":\\"#0ea5e9\\"},{\\"name\\":\\"Musculação\\",\\"color\\":\\"#6366f1\\"}]"'
)::text
WHERE hub_bg_image_url IS NOT NULL;

===========================================
`);
}

cleanup();
