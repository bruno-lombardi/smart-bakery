# 🥖 Ana Paula · Pães & Afeto — painel da padaria

Painel simples e bonito para a produção e venda de pães artesanais: **precificação**, **encomendas** e **fluxo de caixa**, com a identidade visual da marca (veja [`docs/identidade-visual.png`](docs/identidade-visual.png)).

- **Funciona sem internet** (PWA instalável no celular ou computador).
- **Os dados ficam só no aparelho** (IndexedDB). Não existe servidor, conta ou custo.
- **Backup** em arquivo `.json` (Ajustes → Baixar backup).

## O que tem

| Tela | Para quê |
| --- | --- |
| **Início** | Cartão da meta (anel de progresso, quantos pãezinhos faltam), jornada guiada para quem está começando, faturamento estimado, nº de encomendas, ticket médio, recebido, a receber, saldo, lucro estimado, dicas do painel, próximas entregas, lista “o que assar”, gráfico dos últimos meses e produtos campeões. |
| **Metas** | Meta de lucro mensal, plano do mês (pães por dia/semana, encomendas), caminhos por produto, simulador “e se…?” (vender mais ou mudar preços), marcos de 25/50/75/100% e conquistas. |
| **Encomendas** | Anotar pedidos (cliente, data/hora, retirada ou entrega, itens, desconto, sinal), avançar status (novo → em produção → pronto → entregue), receber pagamentos, chamar no WhatsApp. |
| **Preços** | Cadastro de insumos e receitas. Calcula custo da fornada e de cada pão (ingredientes, embalagem, gás, mão de obra), oferece 3 preços prontos (econômico, saudável, premium), mostra o preço mínimo, o lucro por hora de trabalho e avisa quando um produto está com lucro baixo, com botão “Usar” para corrigir. |
| **Caixa** | Entradas e saídas por mês, categorias, saldo. Pagamentos de encomendas entram sozinhos. |
| **Ajustes** | Valor da hora, lucro padrão, despesas gerais, meta de lucro, backup/restauração, instalação do app. |

### Primeiro acesso

O app começa com uma conversa rápida: nome, **quanto de lucro ela quer por mês** (vira a meta) e quanto vale a hora de trabalho. Depois ela cadastra os pães e o painel passa a calcular quantos faltam para a meta.

### Cardápio inicial já cadastrado

Ao terminar o onboarding, o app cadastra o cardápio da Ana Paula (pães de forma tradicional, integral multigrãos, zero glúten e de batata, torta de frango, rosca de coco e bolos gelados) com **insumos e receitas estimados** e **preços calculados para ~40% de lucro real**, usando a hora de trabalho e a margem que ela informou. Tudo vem marcado como *Estimativa*; ela confere os preços dos insumos, toca em “Está certo” (ou edita) e a marca some. Os dados ficam em `src/db/catalog.ts` e os valores são de referência de mercado, não de um fornecedor específico.

### Como a meta é calculada

```
lucro por pão     = preço − custo − despesas gerais (% do preço)
lucro médio       = média dos lucros por pão, ponderada pelo que ela mais vende (ou igual, se ainda não há vendas)
lucro garantido   = lucro das encomendas do mês (canceladas não contam)
pães que faltam   = (meta − lucro garantido) ÷ lucro médio
por dia           = pães que faltam ÷ dias restantes do mês
```

Marcos (25/50/75/100%) e conquistas são comemorados uma única vez, com mensagem e chuva de pãezinhos.

### Como o preço é calculado

```
custo da fornada  = ingredientes + embalagem × unidades + gás/energia + (minutos ÷ 60 × valor da hora)
custo de cada pão = custo da fornada ÷ unidades
preço sugerido    = custo de cada pão ÷ (1 − lucro% − despesas gerais%)
```

Lucro e despesas gerais são percentuais **do preço de venda** (se você quer ficar com 40% do preço, o cálculo já garante isso).

## Distribuição (custo zero)

O app é um site estático, publicado de graça no **GitHub Pages** pelo workflow [`deploy.yml`](.github/workflows/deploy.yml).

1. No GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Faça merge na branch `main`. O workflow roda os testes, gera o build e publica em
   `https://bruno-lombardi.github.io/smart-bakery/`.
3. Mande o link para a Ana Paula. Ela abre no celular e instala:
   - **Android (Chrome):** ⋮ → *Instalar aplicativo*.
   - **iPhone (Safari):** Compartilhar → *Adicionar à Tela de Início*.
   - **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Depois da primeira visita, tudo funciona offline. Quando você publicar uma versão nova, o painel avisa “Atualizar”.

> Outro endereço (Cloudflare Pages, Netlify)? Gere o build com `BASE_PATH=/ npm run build` e publique a pasta `dist/`.

### Cuidados com os dados locais

- Os dados vivem no navegador **daquele aparelho**: trocar de celular ou limpar os dados do navegador apaga tudo. O painel lembra de fazer backup a cada 14 dias.
- O app pede ao navegador armazenamento persistente (`navigator.storage.persist`) para não ser apagado por falta de espaço.
- No **iPhone**, o Safari pode apagar dados de sites não instalados após 7 dias sem uso. **Instalar na Tela de Início** evita isso. Oriente a instalar.

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173/smart-bakery/
npm test           # lógica de preço, caixa, encomendas e backup
npm run build && npm run preview
```

Stack: Vite · React · TypeScript · Dexie (IndexedDB) · vite-plugin-pwa (Workbox) · HashRouter (funciona em qualquer hospedagem estática, inclusive offline).

Estrutura: `src/lib` (regras puras e testadas) · `src/db` (banco, backup, ações) · `src/components` · `src/pages`.
