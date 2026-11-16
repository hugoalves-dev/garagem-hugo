# Garagem Hugo

Painel privado para acompanhar manutenção preventiva e diagnósticos do Volkswagen Fox.

## Deploy

O repositório usa Cloudflare Workers Static Assets. O Worker serve os arquivos de `src/`, encaminha `/api/*` ao Durable Object e persiste o estado e as fotos em SQLite. A migração `v1` cria a classe SQLite-backed `GarageState`.

O GitHub Actions valida o projeto e publica no Worker `garagem-hugo` quando há o secret `CLOUDFLARE_API_TOKEN`. Para habilitar os próximos deploys automáticos, adicione um token Cloudflare com permissão de edição de Workers em **Settings → Secrets and variables → Actions**. O workflow já conhece o Account ID; o token não fica no repositório.

O primeiro deploy deste projeto é feito pelo mantenedor da conta Cloudflare. Depois disso, cada push em `main` executa o workflow. `workflow_dispatch` permite executar o deploy manualmente.

## Acesso e dados

- O Worker deve permanecer atrás do Cloudflare Access; o código também exige uma identidade Access antes de servir a interface ou a API.
- O estado da garagem e fotos JPEG/PNG/WebP (até 5 MB após compressão) ficam no SQLite do Durable Object.
- Fotos são linhas BLOB separadas; os registros guardam somente a referência da foto.
- Não há dados pessoais do veículo versionados neste repositório. O estado inicial é genérico e deixa os itens pendentes de confirmação.
- Para migrar dados do site anterior, exporte o backup pela interface antiga e use **Importar backup** na nova. O importador envia o conteúdo para a garagem Cloudflare após autenticação.

## Desenvolvimento local

```bash
npm ci
npm run dev
```

`wrangler dev` usa o Durable Object local. Para validar o pacote de deploy:

```bash
npm run check
```
