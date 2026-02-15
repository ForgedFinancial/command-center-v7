# Deployment — Command Center v7

## Cloudflare Pages

**Project:** `command-center-v7`
**Production URL:** https://command-center-v7.pages.dev
**Build command:** `npm run build`
**Output directory:** `dist`

## Deploy Methods

### Automatic (GitHub Integration)
- Push to `main` → production deploy (auto)
- Push to any other branch → preview deploy (auto)

### Preview Deploys
- **URL pattern:** `https://<branch>.command-center-v7.pages.dev`
- **dev branch:** `https://dev.command-center-v7.pages.dev`
- Preview URLs are generated automatically on push
- Each PR also gets a unique preview URL

### Manual Deploy (Wrangler CLI)

**Production:**
```bash
cd /home/clawd/command-center-v7
npm run build
CLOUDFLARE_API_TOKEN="<token>" \
CLOUDFLARE_ACCOUNT_ID="<account-id>" \
npx wrangler pages deploy dist \
  --project-name command-center-v7 \
  --branch main \
  --commit-dirty=true
```

**Preview (dev):**
```bash
npx wrangler pages deploy dist \
  --project-name command-center-v7 \
  --branch dev \
  --commit-dirty=true
```

## Wrangler Commands

| Command | Purpose |
|---------|---------|
| `wrangler pages deploy dist` | Deploy to Pages |
| `wrangler pages deployment list --project-name command-center-v7` | List deployments |
| `wrangler pages deployment tail --project-name command-center-v7` | Tail logs |
| `wrangler pages project list` | List projects |

## Production Deploy Checklist

1. ✅ `npm run build` — zero errors
2. ✅ `npm test` — all tests pass
3. ✅ Preview deploy verified on `dev` branch
4. ✅ Boss approval obtained through chain of command
5. ✅ Merge to `main` or manual Wrangler deploy

## Notes

- Credentials are stored securely — never commit tokens to git
- Self-signed SSL on VPS requires Cloudflare Worker proxy for frontend API calls
- Production deploys require 2-step auth (Boss approval)
