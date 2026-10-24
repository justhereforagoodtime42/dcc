# Releasing Nexora

## Stage 1

This repository is bootstrapped from Vencord. There is no formal Nexora binary release pipeline yet.

Until a Nexora-branded installer ships:

1. Tag only after `pnpm build` and `pnpm testTsc` succeed
2. Document the upstream Vencord commit / version forked from (`NOTICE`, git history)
3. Ship corresponding source under GPL-3.0-or-later
4. List tested Discord channels; do not claim untested compatibility

## Later

- Reproducible builds
- Installer artifacts
- Plugin registry versioning
- Upstream merge notes in release notes
