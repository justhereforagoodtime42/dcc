# Nexora

Open-source **Discord desktop client customization** — plugins, themes, and tooling for the Discord installation you already have.

Nexora is **not** a standalone chat app, a new Electron messaging client, or an official Discord product.

This repository is a **fork of [Vencord](https://github.com/Vendicated/Vencord)** with Nexora-specific plugins, documentation, and branding. See [NOTICE](./NOTICE) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Status (Stage 1)

Working toward:

- Vencord-based build and inject/uninject workflow
- Nexora documentation and architecture decision record
- Nexora identity settings panel inside Discord
- Separated `src/nexoraPlugins/` tree for Nexora features

Not complete yet: Nexora-branded installer UX, full built-in plugin suite, theme studio, plugin store, plugin creator, community registry automation.

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

Details: [docs/INSTALLATION.md](./docs/INSTALLATION.md).

## Repository layout (Nexora additions)

```
docs/                 Architecture and contributor guides
src/nexoraPlugins/    Nexora-specific plugins
NOTICE                Attribution for Vencord / Equicord reference
assets/nexora/        Nexora branding placeholders
```

Upstream Vencord layout (`src/plugins`, `scripts`, installer hooks, etc.) is preserved for mergeability.

## Remotes

- **origin:** https://github.com/justhereforagoodtime42/dcc
- **upstream:** https://github.com/Vendicated/Vencord

## Disclaimer

Discord is a trademark of Discord Inc. Mention of Discord is for descriptivity only.

**Using client modifications may violate [Discord’s Terms of Service](https://discord.com/terms/).** Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) and [SECURITY.md](./SECURITY.md). Do not use abusive plugins. Nexora never asks for your Discord password or user token.

## License

GPL-3.0-or-later — see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
