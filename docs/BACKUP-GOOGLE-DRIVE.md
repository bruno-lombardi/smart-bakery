# Backup automático no Google Drive — configuração (uma vez só)

O app já vem pronto. Falta apenas **criar o "app" no Google Cloud** e colar o ID dele no GitHub. É grátis e leva uns 10 minutos.
Sem isso, o cartão do Google Drive fica escondido e o app usa só pasta do computador e backup manual.

> Os nomes dos menus do Google mudam de tempos em tempos. Se algo estiver com outro nome, procure o equivalente.

## 1. Criar o projeto e ativar a API
1. Acesse <https://console.cloud.google.com/> com a sua conta Google.
2. **Novo projeto** → nome `paes-e-afeto` → Criar.
3. Menu **APIs e serviços → Biblioteca** → procure **Google Drive API** → **Ativar**.

## 2. Tela de consentimento (Google Auth Platform)
1. **APIs e serviços → Tela de consentimento OAuth** (ou "Google Auth Platform") → Começar.
2. Nome do app: `Ana Paula – Pães & Afeto`. E-mail de suporte: o seu.
3. Público-alvo: **Externo**.
4. **Acesso a dados → Adicionar escopos** → marque só este:
   `https://www.googleapis.com/auth/drive.file`
   (o app só enxerga os arquivos que ele mesmo cria; não é um escopo "sensível" nem "restrito").
5. **Branding**: link da política de privacidade → `https://bruno-lombardi.github.io/smart-bakery/privacidade.html`.
   Se o Google reclamar de domínio `github.io`, deixe os links opcionais em branco.
6. **Público-alvo → Publicar app** (status "Em produção").
   - Enquanto o app estiver em **"Teste"**, só entram contas listadas como *usuários de teste*. Se preferir não publicar, adicione a conta da Ana Paula (e a sua) em *Usuários de teste*.
   - Em produção, o Google *pode* mostrar uma tela de "app não verificado". Para escopos não sensíveis isso costuma não acontecer, mas **eu não consegui confirmar na documentação**. Se aparecer: *Avançado → Continuar* funciona; ou conclua a verificação de marca.

## 3. Criar o ID do cliente
1. **Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web**.
2. **Origens JavaScript autorizadas**:
   - `https://bruno-lombardi.github.io`
   - `http://localhost:5173` (para testar no seu computador)
3. Não precisa de "URIs de redirecionamento". Criar → copie o **ID do cliente** (termina em `.apps.googleusercontent.com`).
   O ID do cliente é público (vai dentro do site); **não** use nem guarde o "segredo".

## 4. Colocar o ID no GitHub
1. No repositório: **Settings → Secrets and variables → Actions → aba Variables → New repository variable**.
2. Nome: `VITE_GOOGLE_CLIENT_ID` · Valor: o ID copiado.
3. Rode o workflow de novo (Actions → *Testar e publicar* → *Run workflow*, ou um novo push na `main`).

Para testar localmente: crie `.env.local` com `VITE_GOOGLE_CLIENT_ID=seu-id` e rode `npm run dev`.

## Como o backup funciona (e o que NÃO é automático)

- A cada mudança nos dados, em até ~2 minutos, o app salva uma cópia **no arquivo do dia** (`paes-e-afeto-backup-AAAA-MM-DD.json`) na pasta **Pães & Afeto – Backups** do Drive dela. Guarda os últimos 30 dias. Se nada mudou desde o último envio, não envia nada.
- Também tenta ao abrir o app, ao voltar para ele e a cada 15 minutos.
- **O Google, no navegador, só entrega "chaves" de 1 hora** e não existe renovação garantida sem um toque dela. O app tenta renovar sem janela; se o Google exigir, o backup fica *pendente* em silêncio. Só avisa quando passa de **1 dia** sem salvar, com um botão **Salvar agora** (um toque).
- Na prática: ela usa o painel normalmente e, de vez em quando, aparece o aviso para tocar uma vez.
- Se o backup tiver que ser 100% sem toque nenhum, precisaríamos de um pequeno servidor (ex.: Cloudflare Worker, gratuito) guardando uma credencial de renovação. Dá para fazer depois; hoje não existe nenhum servidor.

## Outras camadas
- **Pasta do computador** (Chrome/Edge no PC): escolhe uma pasta; se for a do *Google Drive para computador*, sobe para o Drive sozinha, sem login nenhum.
- **Manual**: *Enviar cópia* (celular: Drive/WhatsApp/e-mail) e *Baixar arquivo*.
- **Restaurar**: do Drive (lista os backups por dia) ou de um arquivo. Funciona também em um aparelho novo.

## Pontos não confirmados
- O login do Google **não foi testado com contas reais** (só com um Google/Drive simulado nos testes). Teste ligando o backup com uma conta sua antes de passar para a Ana Paula.
- Em celulares, o login do Google em um app **instalado** (PWA) pode se comportar diferente do navegador, principalmente no iPhone. Se der problema, os backups manuais continuam funcionando.
