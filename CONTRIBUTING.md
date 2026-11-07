# Contributing to QA Pilot 🛸

Thank you for your interest in contributing to QA Pilot! We welcome community contributions from testers, developers, and AI enthusiasts.

---

## 🛠️ Development Setup

### Prerequisites
- **Node.js**: >= 18.3.0
- **npm**: >= 9.0.0
- **Git**

### Installation
```bash
# 1. Fork the repo and clone your fork
git clone https://github.com/<your-username>/qa-pilot.git
cd qa-pilot

# 2. Install monorepo dependencies
npm install

# 3. Build the unified package
npm run build

# 4. Run verification and test suites
npm test
```

---

## 🌿 Branching Strategy & Git Workflow

- All development work should be done in feature or bugfix branches based on `master`:
  - `feat/your-feature-name`
  - `fix/issue-description`
  - `docs/clarify-readme`
- We follow **Conventional Commits**:
  - `feat: add support for new browser profile`
  - `fix: resolve oracle watcher websocket timeout`
  - `docs: update quickstart guide`
  - `refactor: simplify test matrix generator`
  - `chore: bump dependencies`

---

## 🧪 Testing Guidelines

Before creating a Pull Request, ensure that:
1. `npm run build` completes with zero TypeScript errors.
2. `npm test` passes all verification scenarios (CLI, Search Heuristics, Suite Management, Shared Auth Session).
3. If introducing new MCP tools or CLI options, add corresponding test scenarios in `packages/qa-pilot/src/`.

---

## 📬 Pull Request Process

1. Create a clear, descriptive PR title following conventional commit style.
2. Fill out the Pull Request template provided in `.github/PULL_REQUEST_TEMPLATE.md`.
3. Ensure automated CI checks pass.
4. Maintainers will review your PR and provide constructive feedback.

---

## 📜 Code of Conduct

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before interacting with the project community.

