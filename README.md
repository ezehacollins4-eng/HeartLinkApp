# HeartLink — Full-stack build

HeartLink is now a deployable mobile-first dating app with a PostgreSQL/Express backend.

## Included
- Existing HeartLink UI preserved in `public/index.html`
- Real registration and login
- JWT authentication
- PostgreSQL user profiles
- Discover feed
- Likes / passes / super likes
- Mutual matching
- Persistent matches
- Persistent one-to-one messages
- Profile updates
- Image upload endpoint
- API health endpoint
- Offline/demo fallback UI remains available if the API is unavailable

## Run locally

1. Install Node.js 20+ and PostgreSQL.
2. Create a database named `heartlink`.
3. Run `schema.sql` against it.
4. Copy `.env.example` to `.env` and set `DATABASE_URL` and a strong `JWT_SECRET`.
5. Run:
   ```bash
   npm install
   npm start
   ```
6. Open `http://localhost:10000`.

## Demo
The Login button calls `/api/auth/demo`, which creates the demo account on first use:
- Email: demo@heartlink.app
- Password: demo1234

## Render deployment

Create:
- A **PostgreSQL** database.
- A **Web Service** using this repository/ZIP contents.

Build command:
```bash
npm install
```

Start command:
```bash
npm start
```

Environment variables:
```text
DATABASE_URL=<Render PostgreSQL Internal Database URL>
JWT_SECRET=<long random secret>
```

After the database is created, run the SQL in `schema.sql` once.

### Important
The included photo upload endpoint stores files on the web service filesystem. Render web-service files are not durable across redeploys unless persistent storage is configured. For production, use object storage (S3/Cloudinary/etc.) and save the resulting URL in `users.photo`.

## API
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/demo`
- `GET /api/me`
- `PUT /api/profile`
- `POST /api/profile/photo`
- `GET /api/discover`
- `POST /api/swipes`
- `GET /api/matches`
- `GET /api/matches/:id/messages`
- `POST /api/matches/:id/messages`
- `DELETE /api/matches/:id`
- `GET /api/health`

## Next production work
For a real public launch, add email verification, password reset, rate limiting, moderation/report storage, blocking, push notifications, WebSocket chat, image moderation, secure object storage, payments, and a privacy/terms flow.
