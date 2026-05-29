<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project workflow

- Do not run tests, lint, builds, type checks, or browser verification unless explicitly asked. The user handles verification.
- Use `nvm` for Node and `pnpm` for package management.
- Before running project commands, load nvm and select the project Node version, for example:

```bash
source ~/.nvm/nvm.sh
nvm use 24.11.1
pnpm dev
```
