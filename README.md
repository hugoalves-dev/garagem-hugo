# Garagem Hugo

Painel privado para acompanhar manutenção preventiva e diagnósticos do Volkswagen Fox.

## Deploy

O build empacota os arquivos de `src/` como módulos do Worker. O Worker serve a interface, encaminha `/api/*` ao Durable Object e persiste o estado e as fotos em SQLite. A migração `v1` cria a classe SQLite-backed `GarageState`.

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
