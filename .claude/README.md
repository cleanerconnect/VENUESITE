# Claude Code config

Agents, slash commands, skills and rules in this folder are a curated subset of
[everything-claude-code](https://github.com/affaan-m/everything-claude-code)
(MIT, see `ECC-LICENSE`), picked for this Next.js / React / TypeScript / Postgres app.

- `agents/` – subagents (planner, code/security/database reviewers, build fixers, TDD, e2e, ...)
- `commands/` – slash commands (`/plan`, `/code-review`, `/build-fix`, `/react-review`, ...)
- `skills/` – Next.js, React, motion/animation, Postgres, API design, testing and security skills
- `rules/` – coding rules; the TypeScript/React/web rules only load for matching files

Hooks, the ECC installer and commands that need ECC's own scripts or npm packages were left out.
