# niochess rating API (Cloudflare Worker + D1)

Authoritative Elo rating for network games. The Worker is the only writer of ratings,
and a match is rated only when **both** players report a consistent result.

## Endpoints

- `POST /claim` `{ nick, secret }` — claim a nick (first use) or verify ownership. `409` if taken.
- `POST /report` `{ matchId, nick, secret, outcome }` — `outcome` is `win` | `loss` | `draw`.
  Rated only when both sides reported and results are complementary.
- `GET /top?n=50` — leaderboard.
- `GET /me?nick=NICK` — a player's rating/stats.

Rating: start `1000`, K-factor `24`. Secrets are stored only as SHA-256 hashes.

## Deploy

```bash
cd api
npm i -g wrangler          # or: npx wrangler ...
wrangler login

wrangler d1 create niochess
# copy the printed database_id into wrangler.toml (database_id = "...")

wrangler d1 execute niochess --remote --file=./schema.sql

wrangler deploy
# prints the URL, e.g. https://niochess-api.<account>.workers.dev
```

Then put that URL into `API_BASE` at the top of `../js/rating.js` and reload the site.

## Notes

- CORS is `*` (read/report only; no cookies). Tighten to your origin if you like.
- Known limitation: two colluding players can farm rating between themselves.
  A later mitigation is to lower K for repeated pairings or require opponent variety.
