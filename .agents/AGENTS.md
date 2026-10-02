# Regras do Projeto (Project Rules)

- Sempre responda em português do Brasil (pt-BR).
- Ao criar novas tabelas no Supabase (migrações SQL), sempre inclua comandos `GRANT` explícitos para as roles `anon`, `authenticated` e `service_role`, atendendo à política de segurança do Supabase.
- **Otimização de Logs e Requisições (Supabase):**
  - **Evitar salvamento a cada tecla (`onChange`)**: Em formulários e campos de texto, salvar apenas no clique de botão ("Salvar"), ao perder o foco (`onBlur`) ou com `debounce` generoso (1-2s), nunca disparando mutações na API a cada caractere.
  - **Proibido polling com `setInterval` curto**: Não criar rotinas que fiquem consultando a API do Supabase em intervalos automáticos; priorizar carregamento sob demanda do usuário ou cache local.
  - **Evitar loops de requisição em `useEffect`**: Garantir dependências estritas em hooks `useEffect` para evitar re-fetches infinitos ou desnecessários a cada re-render.
