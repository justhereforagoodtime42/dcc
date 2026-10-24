# Security Policy

## Reporting a vulnerability

Please open a **private** security advisory on GitHub if available, or email the repository maintainers via a GitHub security contact on [justhereforagoodtime42/dcc](https://github.com/justhereforagoodtime42/dcc).

Do **not** file public issues that include exploit details for unfixed vulnerabilities.

Include:

- Affected Nexora / upstream Vencord commit or version
- Discord channel/build if relevant
- Reproduction steps
- Impact (token theft, RCE, data exfiltration, etc.)

## Hard rules

- Never collect Discord passwords or user authentication tokens
- No undisclosed telemetry; no silent upload of messages, settings, or logs
- Themes must not execute JavaScript
- Plugin packages must be validated (paths, size, manifest, integrity) before install
- Do not bypass Discord authentication or server-side access controls

## Client modification risk

Nexora patches the Discord desktop client. That activity may violate Discord’s Terms of Service. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## Upstream

Security issues that originate in unmodified Vencord code should also be reported upstream when appropriate: https://github.com/Vendicated/Vencord
