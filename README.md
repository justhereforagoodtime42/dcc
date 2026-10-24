# Nexora

Open-source **Discord desktop client customization** — plugins, themes, and tooling for the Discord installation you already have.

Nexora is **not** a standalone chat app, a new Electron messaging client, or an official Discord product.

This repository is a **fork of [Vencord](https://github.com/Vendicated/Vencord)** with Nexora-specific plugins, documentation, and branding. See [NOTICE](./NOTICE) and [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Status

Working today:

- Vencord-based build + `pnpm nexora:install` / status / uninstall (conflict-aware)
- Nexora settings hub (Plugin Manager, Store, Theme Editor, Creator, Updates, About)
- Built-in nexoraPlugins: Declutter, Split Large Messages, Download All Attachments, Auto Jump, Theme Editor, Plugin Creator
- Host plugin map (Silent Typing, Message Logger, ClearURLs, …) without double-patching
- Local plugin registry + GitHub issue templates + Nexora CI

Still evolving: remote registry integrity/rollback, branded Go installer, deeper built-in coverage.

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
