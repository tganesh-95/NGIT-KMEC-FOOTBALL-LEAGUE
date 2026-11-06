# NGIT × KMEC Football League 2026

Full-stack MERN league management app for the official eight-team, 28-match first leg.

## Run locally

1. Install Node.js 18+ and MongoDB.
2. Copy `.env.example` to `.env`, set a private `ADMIN_PASSWORD_HASH` (bcrypt) or the legacy `ADMIN_PASSWORD` fallback, and adjust `MONGODB_URI` if necessary.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173` or `http://localhost:5173/admin`.

The API seeds the eight teams and 28 official fixtures on startup. When the fixture list changes, existing results and schedules are retained only for the same team pairing; outdated tournament fixtures are replaced without touching unrelated match records. Standings are calculated from completed match records on every request, so editing a result never duplicates points. Socket.IO broadcasts schedule, status and result updates to connected public pages. The admin dashboard uses an HttpOnly session cookie; all schedule, status, and result mutations are rejected unless the session was created with `ADMIN_PASSWORD`.

If MongoDB is temporarily unavailable during local development, the API logs the connection error and starts with an in-memory copy of the official teams and fixtures so the public schedule and admin login remain usable. Updates made in this fallback mode are lost when the server restarts; configure a reachable `MONGODB_URI` for persistence.

## Deploy on Render

This repository includes a [`render.yaml`](./render.yaml) Blueprint for a single Node.js web service. The build creates the Vite bundle, and Express serves it alongside the API and Socket.IO endpoint.

1. Push the repository to GitHub and create a new **Blueprint Instance** in Render.
2. Set `MONGODB_URI` to a reachable MongoDB Atlas connection string.
3. Set `ADMIN_PASSWORD_HASH` to a bcrypt hash generated with `node -e "console.log(require('bcryptjs').hashSync('change-me', 12))"`.
4. Deploy. Render supplies `PORT` automatically.

Keep `ADMIN_PASSWORD_HASH` private and do not commit a `.env` file.
