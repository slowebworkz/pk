# Security Policy

## Supported Versions

Praxis Kit ships as a single published package,
[`praxis-kit`](https://www.npmjs.com/package/praxis-kit), on npm. Only the latest published major
version receives security fixes.

| Version | Supported          |
| ------- | ------------------ |
| 4.x     | :white_check_mark: |
| < 4.0   | :x:                |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report it privately using one of the following:

- **Preferred:**
  [GitHub Security Advisories](https://github.com/slowebworkz/praxis-kit/security/advisories/new)
  for this repository — this keeps the report private until a fix is released.
- **Email:** [slowebworkz@gmail.com](mailto:slowebworkz@gmail.com)

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce, or a minimal repro repository/snippet.
- The affected package version(s) and adapter(s) (React, Preact, Vue, Solid, Svelte, Lit, Web), if
  applicable.

You should expect an initial response within **5 business days**. If the issue is confirmed, a fix
will be prioritized and a coordinated disclosure timeline will be agreed on before any public
details are shared. Credit will be given in the release notes unless you'd prefer to remain
anonymous.

## Scope

Praxis Kit is a framework-neutral component library that resolves props, ARIA attributes, and class
names, and renders polymorphic elements across several framework adapters. Security-relevant areas
include (but aren't limited to):

- Unsanitized prop/attribute passthrough that could enable DOM-based XSS.
- Generation of unsafe DOM attributes or event handlers.
- Violations of HTML semantics that could enable spoofing, privilege confusion, or other
  security-sensitive behavior.
- Supply-chain concerns in the published package or its dependencies.

Plain accessibility defects (incorrect role, missing `aria-labelledby`, wrong implicit role, focus
order issues, etc.) are not security vulnerabilities on their own — please file those as a regular
GitHub issue instead. Reports should describe the affected adapter(s) where known, as behavior may
differ across framework integrations.

Issues limited to example apps (`examples/*`) or internal tooling (`tooling/*`, `qa/*`) that never
ship in the published package are lower priority but still welcome.
