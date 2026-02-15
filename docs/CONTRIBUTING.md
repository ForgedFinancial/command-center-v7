# Contributing — Command Center v7

## Branch Strategy

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production | Cloudflare Pages (auto-deploy) |
| `dev` | Integration / staging | Cloudflare Preview URL |
| `feature/<name>` | New features | — |
| `hotfix/<name>` | Urgent production fixes | — |

## Workflow

### Features
```bash
git checkout dev
git pull origin dev
git checkout -b feature/my-feature
# ... work ...
git push -u origin feature/my-feature
# Open PR → dev
# After merge to dev, verify preview deploy
# When ready: PR dev → main (requires Boss approval)
```

### Hotfixes
```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-fix
# ... fix ...
git push -u origin hotfix/critical-fix
# Open PR → main (requires Boss approval)
# After merge to main, also merge to dev:
git checkout dev && git merge main && git push origin dev
```

## Commit Messages

Format: `type: description`

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`

## Branch Protection (Recommended)

These require admin to enable on GitHub:

- **main**: Require PR reviews, no direct push, require status checks
- **dev**: Require PR reviews (recommended but optional for rapid iteration)

## Production Deploys

Production deploys (merge to `main`) require Boss's approval through the chain of command. No exceptions.
