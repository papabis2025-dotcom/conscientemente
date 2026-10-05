# Função Gemini

Esta Edge Function mantém a credencial do Gemini fora do bundle e do armazenamento do navegador. Ela aceita somente usuários autenticados e quatro ações com payloads validados: geração de plano, leitura de edital, explicação de tópico e leitura de imagem de simulado. A função SQL `consume_gemini_quota()` limita cada usuário a 30 chamadas por hora de forma atômica e persistente.

> Se uma chave já foi publicada como `VITE_GOOGLE_GENAI_KEY` ou salva pelo frontend, revogue-a e gere outra no Google AI Studio. Retirar a chave do código não torna segura uma credencial que já foi exposta.

## Configuração

Defina o segredo no projeto Supabase (nunca use o prefixo `VITE_` para esta chave):

```sh
supabase secrets set GOOGLE_GENAI_KEY="sua-chave"
```

Configurações opcionais:

```sh
supabase secrets set GEMINI_MODEL="gemini-3.8-flash"
supabase secrets set ALLOWED_ORIGINS="https://seu-dominio.com,https://www.seu-dominio.com"
```

`GEMINI_MODEL` é opcional; o padrão é `gemini-3.8-flash`, modelo multimodal estável. Sem `ALLOWED_ORIGINS`, a função responde com CORS `*`. Em produção, configure explicitamente os domínios do frontend. `SUPABASE_URL` e `SUPABASE_ANON_KEY` são fornecidos automaticamente pelo ambiente das Edge Functions.

## Deploy

Primeiro aplique a migração que cria o controle de cota:

```sh
supabase db push
```

Depois publique a função:

```sh
supabase functions deploy gemini
```

Mantenha a verificação JWT habilitada (comportamento padrão). A função também valida explicitamente o token com `auth.getUser` e falha sem chamar o Gemini caso não consiga consumir a cota no banco.
