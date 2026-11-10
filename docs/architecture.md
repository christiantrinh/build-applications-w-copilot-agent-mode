# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

- Presentation tier decision: Keep the route-level React components thin and data-driven, using the shared API client and explicit loading, empty, and error states so each section reflects backend data and accessibility requirements without adding auth or extra routing behavior.
- Logic tier decision: Implement the Express API in a small service-backed route layer under `octofit-tracker/backend/src` that validates input, normalizes IDs, and returns structured JSON with deliberate 4xx responses rather than unhandled cast errors.
- Data tier decision: Use Mongoose schemas for `User`, `Team`, `Activity`, and `Workout` with required fields, defaults, and seed reconciliation so the API contract and demo data remain consistent.
- Activity tracking approach: Accept `userId`, `teamId`, `type`, and `minutes`; validate object IDs and required values, verify the referenced user/team exist, and persist typed ObjectIds with computed `points` and `occurredAt` values.
- Team management approach: Require a `name` and `mascot`, default `members` to an empty array, preserve submitted member IDs, and return the populated team shape in list and creation responses.
- Leaderboard approach: Aggregate team totals from activity points, sort descending, and assign a 1-based rank so the ranking order matches the contract and UI expectations.
- Workout suggestions approach: Match a user by email, prefer workout focus based on the user’s goal or recent activity, and include a clear explanatory reason for the recommendation.

## Test plan

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend` — verifies required schema validation and idempotent seed behavior across users, teams, activities, and workouts.
- API command: `npm run test:api --prefix octofit-tracker/backend` — verifies `/api/activities`, `/api/teams`, `/api/leaderboard`, and `/api/workouts/suggestions/:userEmail` against the contract.
- Frontend command: `npm test --prefix octofit-tracker/frontend` — verifies loading, empty, error, and success states with accessible UI output for all route sections.
- Backend build command: `npm run build --prefix octofit-tracker/backend` — checks TypeScript validity after the data and logic-layer fixes.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend` — checks the React app compiles cleanly after the component state and API wiring are complete.
- Verified result: the current project passes the backend tests, frontend tests, and both TypeScript production builds.
