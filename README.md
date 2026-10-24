# Nexora

Open-source **Discord desktop client customization** — plugins, themes, and tooling for the Discord installation you already have.

Nexora is **not** a standalone chat app, a new Electron messaging client, or an official Discord product.

This repository is a **fork of [Vencord](https://github.com/Vendicated/Vencord)** with Nexora-specific plugins and branding.

## Requirements

- Node.js ≥ 22
- pnpm 11.9.0
- git
- An installed Discord desktop client (Stable / PTB / Canary)

## Quick start

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm inject
```

Uninstall:

```bash
pnpm uninject
```

Full steps: [docs/INSTALLATION.md](./docs/INSTALLATION.md).

## Remotes

- **origin:** https://github.com/justhereforagoodtime42/dcc
- **upstream:** https://github.com/Vendicated/Vencord

## Disclaimer

Discord is a trademark of Discord Inc. Mention of Discord is for descriptivity only.

**Using client modifications may violate [Discord’s Terms of Service](https://discord.com/terms/).** Do not use abusive plugins. Nexora never asks for your Discord password or user token.

## License

GPL-3.0-or-later — see [LICENSE](./LICENSE).
