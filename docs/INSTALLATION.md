# Installing Nexora

Nexora customizes an **existing** Discord desktop install. It does not replace Discord’s login or chat servers.

## Prerequisites

- [git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) **≥ 22**
- [pnpm](https://pnpm.io/) **11.9.0** (see `packageManager` in `package.json`)

```bash
git --version
node --version
pnpm --version
```

## Clone

```bash
git clone https://github.com/justhereforagoodtime42/dcc.git
cd dcc
```

Optional upstream remote for merges:

```bash
git remote add upstream https://github.com/Vendicated/Vencord.git
```

## Build

```bash
pnpm install --frozen-lockfile
pnpm build
```

Development build (Patch Helper and related tools):

```bash
pnpm build --dev
```

## Inject into Discord Desktop

Close Discord completely, then:

```bash
pnpm build
pnpm inject:stable
```

`pnpm inject` / `pnpm inject:stable` run the upstream [Vencord Installer](https://github.com/Vencord/Installer) CLI against this repository’s `dist/` (via `VENCORD_USER_DATA_DIR`). Use single-dash flags (`-install`, `-branch stable`); double-dash `--install` opens the interactive menu instead.

Verified on this machine (Stage 1): Discord Stable under `%LOCALAPPDATA%\Discord` (app-1.0.9262) patched successfully — `app.asar` replaced, original kept as `_app.asar`.

**Compatibility:** Do not claim a Discord release is supported until inject + launch have been verified on that build. Discord updates may undo the patch; rebuild and re-inject after Discord updates.

### Conflicts with other mods

If another client modification already patched `app.asar`, do not silently overwrite it. Prefer uninstalling the other mod first, or use the installer’s repair/uninstall flows. Nexora-branded conflict messaging is planned for a later stage; Stage 1 documents honest reuse of the upstream injector.

## Uninstall

```bash
pnpm uninject:stable
```

Or `pnpm uninject` (installer `-uninstall`). This restores the original `app.asar` from `_app.asar` where possible. It must not delete unrelated user files (documents, downloads, etc.).

Stage 1 note: inject was verified; leave the patch in place for manual Discord launch testing of the Nexora settings entry, or uninstall with the commands above when finished.

## Verify build without injecting

```bash
pnpm testTsc
pnpm lint
```

Full upstream test script also builds standalone and generates plugin JSON:

```bash
pnpm test
```

## Security notes

- Never enter Discord passwords or tokens into Nexora tools.
- Review [SECURITY.md](../SECURITY.md) and [ARCHITECTURE.md](./ARCHITECTURE.md) for ToS and distribution risks.
- Themes are CSS only; do not install “themes” that include executable code.
