# Garagem Hugo

Painel privado para acompanhar manutenção preventiva e diagnósticos do Volkswagen Fox.

## Deploy

O build gera o HTML e o CSS para o Worker e os módulos JavaScript versionados para Workers Static Assets. O Worker serve a interface e os módulos no mesmo hostname, encaminha `/api/*` ao Durable Object e persiste o estado e as fotos em SQLite. A migração `v1` cria a classe SQLite-backed `GarageState`.

O Worker está conectado ao repositório pelo Cloudflare Workers Builds. Em cada push para `main`, a Cloudflare executa `npm run build` e publica com `npx wrangler deploy`; o código de build e o deploy ficam na Cloudflare. Builds de preview estão desativados.

## Acesso e dados

- O hostname de produção fica atrás do Cloudflare Access com uma política reutilizável de login; URLs de preview do Worker ficam desativadas.
- O estado da garagem e fotos JPEG/PNG/WebP (até 5 MB após compressão) ficam no SQLite do Durable Object.
- Fotos são linhas BLOB separadas; os registros guardam somente a referência da foto.
- Não há dados pessoais do veículo versionados neste repositório. O estado inicial é genérico e deixa os itens pendentes de confirmação.
- Para migrar dados do site anterior, exporte o backup pela interface antiga e use **Importar backup** na nova. O importador envia o conteúdo para a garagem Cloudflare após autenticação.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

`npm run dev` empacota a interface e inicia o Worker com o Durable Object local. Para validar o pacote de deploy:

```bash
npm run check
```

O deploy local é opcional. Em produção, os pushes em `main` são publicados pelo Workers Builds.


## Veículo 3D

Abra **Veículo 3D** na navegação. Arraste para orbitar, use a roda do mouse ou a pinça para aproximar e arraste com o botão secundário ou com dois dedos para deslocar a câmera. O catálogo também permite buscar e selecionar pelo teclado. O painel da peça usa os mesmos formulários de inspeções, serviços, fotos e lembretes usados no restante da garagem.

- `src/vehicle/catalog.js` define os IDs persistentes, o sistema da garagem, os modos, a hierarquia e o mapeamento de malhas.
- `src/vehicle/model.js` gera a geometria do Fox no navegador. `scene.js` cuida da câmera, seleção, dobradiças, materiais e desenho sob demanda.
- `src/vehicle/view.js` e `panel.js` implementam o catálogo e o painel em pt-BR. O catálogo funciona sem WebGL. Equipamentos marcados com **?** exigem confirmação no carro.
- Registros e lembretes usam o campo opcional `componentId`. SQLite, sincronização, armazenamento local e backups v1 transportam o campo junto com os dados existentes. Registros antigos ficam com o vínculo vazio até uma edição explícita.
- Em `status.js`, a ordem é problema ativo, prazo ou quilometragem atingidos, agendamento, pendência, melhoria, inspeção aprovada e condição desconhecida. Uma inspeção ou um serviço com resultado aprovado resolve somente o problema escolhido no campo **Problema resolvido**. Abra um registro reprovado e use **Registrar resolução** para preencher esse vínculo. O dashboard e o 3D usam a mesma regra. As falhas resolvidas continuam no histórico, e o vínculo pode ser corrigido editando a resolução. As datas da garagem seguem o fuso de São Paulo.

### Modelo e licenças

Modelo procedural original, sem malhas, texturas ou imagens de terceiros distribuídas no app. A referência visual é uma fotografia da carroceria brasileira de primeira geração. A versão Sportline é uma referência para o contorno dos faróis, a grade e o perfil da carroceria. Rodas, bancos, interior, dobradiças, suportes, cofre, escapamento, suspensão, freios e posições de sensores são simplificados. O seletor **Carroceria** permite configurar duas ou quatro portas laterais e salva a escolha no estado sincronizado e no backup. Até a confirmação, o modelo usa uma prévia de quatro portas. Na variante de duas portas, as portas dianteiras são mais longas e os vidros laterais traseiros são fixos. A presença de alarme, rádio, alto-falantes, tomada e compressor deve ser confirmada no carro. O modelo é ilustrativo e não é uma referência técnica da Volkswagen.

- Foto de referência da dianteira, Maxi-Napo-99, CC BY-SA 4.0. [Volkswagen Fox 1.6 Sportline 2007](https://commons.wikimedia.org/wiki/File:2007_Volkswagen_Fox_1.6_Sportline.jpg)
- Three.js e OrbitControls, licença MIT. [Licença do Three.js](https://github.com/mrdoob/three.js/blob/r183/LICENSE)

### Substituir ou melhorar o modelo

1. Preserve os IDs de `catalog.js`. Atualize o mapeamento de malhas quando nomes ou agrupamentos mudarem.
2. Modele usando metros, Y para cima e a dianteira em +Z. Separe as peças selecionáveis e mantenha vidros, espelhos e limpadores nos pivôs correspondentes. Use fotografias e identificação da versão do carro para conferir dimensões, disposição e opcionais.
3. Para migrar para GLB, exporte a partir da ferramenta de modelagem, versione o arquivo otimizado e copie-o para `dist/static/assets` durante o build. Carregue com `GLTFLoader` a partir de `scene.js` e mapeie os nós pelo registro. Preserve os IDs das peças e mantenha a geração de malhas ou a exportação do GLB fora do Worker.
4. Rode os testes do catálogo, a validação de malhas e o teste de navegação, além do dry-run do Wrangler.

### Verificação local

```bash
npm ci
npm run check
npx playwright-core install chromium
npm run test:browser
```

O teste de navegador abre uma instância temporária e isolada do Wrangler com SQLite local. Use `CHROMIUM_PATH` para apontar para um Chromium já instalado e `GARAGE_SCREENSHOT_DIR` para salvar capturas. O teste cobre seleção no modelo, modos, ações do catálogo, criação de registros e lembretes, sincronização, fotos, exportação, restauração e fallback sem WebGL.

Os bundles são servidos por Workers Static Assets. O Worker roda primeiro em todas as rotas, inclusive os assets, para preservar a configuração de entrada. Essas chamadas contam para a cota de requisições do Workers Free. A configuração mantém o hostname atual, as URLs de preview desativadas e o Cloudflare Access existente. O dry-run local valida o pacote, e a política de acesso do hostname é administrada na Cloudflare. [Limites do Workers](https://developers.cloudflare.com/workers/platform/limits/) · [Cobrança e limites de Static Assets](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
