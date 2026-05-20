# Kien Comic Arena

This project is already structured to run as a public website:

- Express serves the HTML, JS, CSS, images, and audio files.
- The frontend uses the current site origin for API requests.
- In-game live updates use WebSockets on the same host.
- Player data, matchmaking, missions, and news are stored in MongoDB.

## Deploy On Render

The repository includes [`render.yaml`](/home/kienevil1/Kien-Naruto-Arena/render.yaml), so the shortest path is Render.

1. Push this repo to GitHub.
2. Create a new Blueprint on Render and point it at the repo.
3. Set the required environment variables:
`MONGODB_URI`
`JWT_SECRET`
4. Optionally set `CORS_ORIGIN=https://your-domain.com` if you want to restrict cross-origin requests to your custom domain.
5. Deploy.

After deploy, your game will be available on the generated `onrender.com` URL. You can then attach your own domain.

## Required Environment Variables

- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: Secret used to sign login sessions.

## Optional Environment Variables

- `MONGODB_DB`
- `MONGODB_USERS_COLLECTION`
- `MONGODB_MATCHES_COLLECTION`
- `MONGODB_APP_STATE_COLLECTION`
- `MONGODB_NEWS_POSTS_COLLECTION`
- `JWT_EXPIRY`
- `SESSION_COOKIE_NAME`
- `SESSION_MAX_AGE_MS`
- `CORS_ORIGIN`
- `ENABLE_BATTLE_BOTS`

## Local Run

```bash
npm install
npm start
```

The server will fail fast if `MONGODB_URI` or `JWT_SECRET` are missing.
