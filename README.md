# wotd

A small local-first word of the day deck built with Next.js, pnpm, and `localStorage`.

## Development

```bash
source ~/.nvm/nvm.sh
nvm use 24.11.1
pnpm dev
```

Open `http://localhost:3000`.

## Checks

```bash
pnpm lint
pnpm build
```

## Cloudflare Pages

```bash
cp cloudflare.env.example cloudflare.env
make cf-login
make cf-project
make cf-deploy
make cf-domain
```

```bash
make cf-deploy
```

```bash
make cf-domain DOMAIN=wotd.example.com
```

Create the DNS record yourself:

```text
CNAME wotd -> the Pages hostname shown by cf-deploy
```

## Todo

- [ ] nicer colors
- [ ] linked words
- [ ] word forms
- [ ] antonyms / hypernyms / hyponyms
- [ ] translations?
