# Installing Nexora

Nexora customizes an **existing** Discord desktop install. It does not replace Discord’s login or chat servers.

## Easy install (Windows — friends / end users)

No Node, git, or pnpm needed.

1. Install [Discord desktop](https://discord.com/download) (Stable) and open it once.
2. Fully quit Discord (system tray too).
3. Open the latest release: https://github.com/justhereforagoodtime42/dcc/releases/tag/nexora-latest  
4. Download **Install-Nexora.bat** (or **Nexora-Windows.zip** and run the `.bat` inside).
5. Double-click **Install-Nexora.bat** and follow the prompts.
6. Open Discord — Nexora settings and bundled themes should be available.

### PowerShell one-liner

```powershell
irm https://github.com/justhereforagoodtime42/dcc/releases/download/nexora-latest/Install-Nexora.ps1 | iex
```

### Uninstall

Download **Uninstall-Nexora.ps1** from the same release, or:

```powershell
irm https://github.com/justhereforagoodtime42/dcc/releases/download/nexora-latest/Uninstall-Nexora.ps1 | iex
```

After Discord updates, run the installer again (or just restart Discord — one-click installs auto-check GitHub for a newer Nexora build).

Your friend’s themes in `%AppData%\Nexora\themes` are **theirs** and are not overwritten by updates.

---

## Developer install (from source)

### Prerequisites

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
pnpm nexora:status
pnpm nexora:explain
pnpm nexora:install
```

`pnpm nexora:install` wraps the upstream [Vencord Installer](https://github.com/Vencord/Installer) CLI with conflict detection. If `_app.asar` already exists, install refuses unless you pass `--force` (`pnpm nexora:install:force`) or uninstall first (`pnpm nexora:uninstall`).

Low-level aliases: `pnpm inject:stable` / `pnpm uninject:stable` (single-dash `-install` flags).

Verified: Discord Stable under `%LOCALAPPDATA%\Discord` can be patched (`app.asar` loader + `_app.asar` backup).

**Compatibility:** Do not claim a Discord release is supported until inject + launch have been verified on that build. Discord updates may undo the patch; rebuild and re-inject / `pnpm nexora:repair` after Discord updates.

### Conflicts with other mods

Nexora will not silently overwrite another Vencord-style patch without `--force`. Prefer `pnpm nexora:uninstall` then `pnpm nexora:install`, or `pnpm nexora:repair --force` when you intentionally replace the loader.

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
- Themes are CSS only; do not install “themes” that include executable code.
- Using client modifications may violate Discord’s Terms of Service.
