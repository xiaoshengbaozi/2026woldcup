# VPS Deployment

This backend is a single Bun service that provides:

- `GET /admin` operations dashboard
- `GET /api/health`
- `GET /api/status`
- `GET /api/snapshot`
- `GET /api/markets`
- `GET /api/match-lines`
- `GET /api/football/fixtures`
- `GET /api/football/fixtures/rounds`
- `GET /api/football/fixtures/statistics`
- `GET /api/football/fixtures/lineups`
- `GET /api/football/fixtures/events`
- `GET /api/football/fixtures/players`
- `GET /api/football/fixtures/headtohead`
- `GET /api/football/players`
- `GET /api/football/players/topscorers`
- `GET /api/football/players/topassists`
- `GET /api/football/players/topyellowcards`
- `GET /api/football/players/topredcards`
- `GET /api/football/standings`
- `GET /api/football/injuries`
- `GET /api/football/teams`
- `GET /api/football/leagues`
- `GET /api/football/coachs`
- `GET /api/football/predictions`
- `GET /api/football/odds`
- `GET /api/football/odds/live`
- `GET /api/worldcup/fixtures`
- `GET /api/worldcup/live`
- `GET /api/worldcup/rounds`
- `GET /api/worldcup/standings`
- `GET /api/worldcup/match-detail?fixture=:fixtureId`
- `GET /api/history/:countryCode?from=&to=`
- `WS /` frontend realtime feed

## First Deploy

```bash
sudo mkdir -p /opt/2026woldcup
sudo chown -R "$USER":"$USER" /opt/2026woldcup
git clone <your-repo-url> /opt/2026woldcup
cd /opt/2026woldcup/backend
cp .env.example .env
bun install --production
bun run build
```

Install systemd service:

```bash
sudo cp deploy/worldcup-market-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now worldcup-market-backend
```

Install Nginx reverse proxy:

```bash
sudo cp deploy/nginx-worldcup-market.conf /etc/nginx/sites-available/worldcup-market
sudo ln -s /etc/nginx/sites-available/worldcup-market /etc/nginx/sites-enabled/worldcup-market
sudo nginx -t
sudo systemctl reload nginx
```

Point Cloudflare DNS to your VPS, then issue TLS with your preferred tool, such as Certbot.

## Frontend Env

Set these in Cloudflare Pages:

```bash
NEXT_PUBLIC_MARKET_API_URL=https://api.your-domain.com
NEXT_PUBLIC_MARKET_WS_URL=wss://api.your-domain.com
```

Then rebuild the Pages project.

For backend CORS, `CORS_ORIGIN` supports a comma-separated allowlist:

```bash
CORS_ORIGIN=https://your-domain.pages.dev,https://preview.your-domain.pages.dev
```

## API-Football Env

Set the API-SPORTS key on the backend only:

```bash
API_FOOTBALL_KEY=your_api_sports_key
API_FOOTBALL_HOST=https://v3.football.api-sports.io
API_FOOTBALL_CACHE_TTL_MS=30000
```

The gateway keeps the key off the static frontend and forwards only allowlisted endpoints under `/api/football/*`.
Example:

```bash
curl "https://api.your-domain.com/api/football/fixtures?league=1&season=2026"
```

Use `/api/football/leagues?search=world%20cup` to confirm the upstream league id before hard-coding tournament queries.

For frontend-ready Chinese data, use the normalized World Cup endpoints:

```bash
curl "https://api.your-domain.com/api/worldcup/fixtures?league=1&season=2026"
curl "https://api.your-domain.com/api/worldcup/live?league=1&season=2026"
curl "https://api.your-domain.com/api/worldcup/rounds?league=1&season=2026"
curl "https://api.your-domain.com/api/worldcup/standings?league=1&season=2026"
curl "https://api.your-domain.com/api/worldcup/match-detail?fixture=855736"
```

## Update Deploy

After pushing changes:

```bash
cd /opt/2026woldcup/backend
chmod +x deploy/update-backend.sh
./deploy/update-backend.sh
```

Or from anywhere:

```bash
APP_DIR=/opt/2026woldcup SERVICE=worldcup-market-backend /opt/2026woldcup/backend/deploy/update-backend.sh
```

## Useful Commands

```bash
systemctl status worldcup-market-backend
journalctl -u worldcup-market-backend -f
curl https://api.your-domain.com/api/health
curl https://api.your-domain.com/api/status
```
