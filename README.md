# Jornal da Duda

Aplicacao web para criancas publicarem noticias com persistencia em banco de dados SQLite.

## Requisitos

- Node.js 18+ (recomendado: Node.js 22)

## Como rodar

```bash
npm install
npm start
```

Acesse no navegador:

- http://localhost:3000

## Banco de dados

- O banco e criado automaticamente em: `data/jornal.db`
- Tabela principal: `noticias`

## API disponivel

- `GET /api/news` - lista noticias
- `POST /api/news` - cria noticia
- `PATCH /api/news/:id/like` - adiciona 1 curtida
- `DELETE /api/news/:id` - remove noticia
