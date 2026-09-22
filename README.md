# To-Do

A to-do list application built using a React SPA over a RESTful JSON API, written in TypeScript
on Node.js with Express. To-dos are persisted to a JSON file, so they survive restarts.

Every required action is implemented (add, list, view, update, complete, incomplete, delete),
plus all four optional enhancements (filtering, sorting, input validation, Docker), search,
and paging.

**Live:** https://todo-foci.netlify.app/ (see [Deployment](#deployment)).

```
server/   Express API: domain / application / infrastructure / http
client/   React SPA, bundled by Vite
shared/   The API contract both halves import: wire types, accepted values, field limits
```

## Running it

Requires **Node.js 20+**.

```bash
npm install
npm run dev        # API on :3000, UI on http://localhost:5173 (Vite proxies the API)
```

Production build, served from one process on one port:

```bash
npm run build
npm start          # http://localhost:3000
```

With Docker (the named volume keeps the data when the container is replaced):

```bash
docker build -t todo-app .
docker run --rm -p 3000:3000 -v todo-data:/data todo-app
```

Settings: `PORT` (default `3000`), `DATA_FILE` (default `data/todos.json`), `CLIENT_DIR` (default
`client/dist`). Relative paths resolve from the working directory, so run from the project root.

## Deployment

The app is live at **https://todo-foci.netlify.app/**, split across two hosts:

- **Frontend on Netlify.** Netlify builds the React client (`npm run build:client`) and serves
  `client/dist` from its CDN.
- **Backend on [Railway](https://railway.com).** Railway builds the API from the `Dockerfile` and
  runs it as a long-lived container, with a Railway volume mounted at `/data` so `todos.json`
  survives redeploys. Serverless hosts were ruled out because their filesystems do not persist,
  which the JSON-file store depends on.
- **Netlify proxies the API.** The client calls relative paths (`/todos`, `/health`), and Netlify
  rewrites them to the Railway service. The browser only talks to the Netlify domain, so there is
  no CORS setup and the client needs no API URL.

The API's address and the proxy rules live in the Netlify site settings (an `API_ORIGIN`
environment variable used by the build), not in the repo, so the backend URL stays private.
Both hosts deploy automatically on a push to `main`.

## Running the tests

```bash
npm test           # the whole suite, once
npm run check      # formatting, lint, type-check and tests with coverage thresholds (as CI)
```

No setup needed: server tests use an in-memory repository, and client tests stub `fetch`. CI
also builds the Docker image, starts it and smoke-tests it.

## API

Every request needs an `X-Owner-Id` header naming whose list it is (see
[Assumptions](#assumptions)). The browser creates one and keeps it in `localStorage`.

| Method   | Path          | Does                                | Success |
| -------- | ------------- | ----------------------------------- | ------- |
| `POST`   | `/todos`      | Add                                 | `201`   |
| `GET`    | `/todos`      | List (filter, sort, search, page)   | `200`   |
| `GET`    | `/todos/{id}` | View                                | `200`   |
| `PATCH`  | `/todos/{id}` | Update, complete or mark incomplete | `200`   |
| `DELETE` | `/todos/{id}` | Delete                              | `204`   |

```json
{
  "id": "6d21e92a-d5b4-4e19-bcc9-078a4978c883",
  "title": "Write README",
  "description": null,
  "dueDate": "2025-01-10",
  "isCompleted": false,
  "createdAt": "2025-01-02T18:16:09.470Z",
  "isOverdue": true
}
```

**Validation.** `title` is required, 1–200 characters after trimming. `description` is up to 2000
characters or `null`. `dueDate` must be a real `YYYY-MM-DD` date or `null`. `PATCH` changes only
the fields sent, and `null` clears one; `{ "isCompleted": true }` completes a to-do and `false`
reopens it. Unknown fields, including `id` and `createdAt`, are rejected rather than ignored.

**`GET /todos` query parameters**, all optional:

| Parameter     | Values                                     | Default     |
| ------------- | ------------------------------------------ | ----------- |
| `isCompleted` | `true`, `false`                            | either      |
| `overdue`     | `true`, `false`                            | either      |
| `sortBy`      | `createdAt`, `dueDate`, `title`            | `createdAt` |
| `order`       | `asc`, `desc`                              | `asc`       |
| `search`      | text matched against title and description | none        |
| `limit`       | 1–100                                      | every match |
| `offset`      | 0 or more                                  | `0`         |

Filters combine, and leaving one out doesn't filter on it. `isCompleted` matches the stored
field. `overdue` isn't stored: it's worked out on each request, so a to-do becomes overdue the
day after its due date without anything updating it. A to-do is overdue when it is incomplete
and its due date is before today. Sorting by due date puts undated to-dos last. The
`X-Total-Count` response header gives the number of matches across all pages.

**Errors**
share one shape, `{ "error": { "code", "message", "details"? } }`: `400`
`VALIDATION_ERROR` or `INVALID_JSON`, `404` `TODO_NOT_FOUND` or `ROUTE_NOT_FOUND`, and `500`
`INTERNAL_ERROR`, which is logged but returns no details.

## Design

### Backend architecture

```
server/src/
├── domain/           Todo type and pure rules (overdue, calendar dates). No dependencies.
├── application/      TodoService (the use cases), filtering/sorting, and the TodoRepository
│                     interface the service depends on.
├── infrastructure/   The JSON file repository.
├── http/             Express: router, Zod schemas, the error handler, static client serving.
└── server.ts         Composition root: the only file that picks concrete implementations.
```

Dependencies point inwards: `http` → `application` → `domain`, with storage plugged in at the
edge.

- **Storage sits behind an interface.** `TodoService` takes a `TodoRepository` in its
  constructor. Moving to a database is one new class and one changed line in `server.ts`, so
  the app can switch to one when it needs to scale.
- **The HTTP layer is thin.** Handlers validate, call one service method and return the result.
  Failures are thrown as typed errors, and a single error handler maps them to status codes.
- **Validation happens once, at the boundary.** Zod schemas check and normalise input
  (trimming, blank description → `null`), so the service can trust its arguments. The domain
  doesn't re-check them: HTTP is its only way in, so a second copy of the rules would only drift.
- **Updates are atomic.** The repository exposes `update(id, changes)` rather than
  `get` + `save`. The file repository runs its operations one at a time and writes through a
  temp file and a rename, so concurrent requests can't lose each other's changes and a crash
  can't leave a half-written file. A corrupt data file is refused, never overwritten.
- **The clock and id generator are injected**, so "created at" and "overdue" are deterministic
  in tests without mocking globals.
- **Business rules live on the server.** Filtering, sorting, paging and the overdue flag are all
  computed there, so the SPA and a direct API client always agree, and the client stays a thin
  view.
- **One contract for both halves.** `shared/contract.ts` holds the wire types and limits. Both
  sides compile against it, the router checks each response against it with `satisfies`, and
  ESLint stops the client importing server code.

**API choices:** `PATCH` rather than `PUT`, because updates are partial. Completion is a field
update like any other rather than its own endpoints, so a richer status later is a new field
value, not new routes.

**Client:** TanStack Query owns the server state. Each component owns the queries and writes it
uses. Rows show when a write is in flight and disable their controls. A failed write or refresh
is reported without hiding the list or losing the user's draft.

### Testing strategy

Tests mirror the source layout and check what callers can observe (return values, HTTP
responses, what's on screen), not internal calls.

1. **Unit tests** for the pure logic and for `TodoService`, run against an in-memory repository
   with a fixed clock.
2. **A repository contract suite** runs the same tests against the file repository and the
   in-memory one. That is what makes the fast in-memory version a safe stand-in elsewhere.
   The file repository also has tests of its own: persistence, concurrent writes, corrupt files.
3. **API tests** with Supertest against the real Express app: every endpoint, validation, error
   paths and paging.
4. **Component tests** with Testing Library against a stubbed `fetch`, covering every user
   action, including in-flight states and server failures.
5. **One end-to-end test** wires HTTP → service → JSON file as production does, and checks the
   data survives a restart.

CI enforces coverage thresholds (currently 99% of lines).

## Assumptions

- **Each browser has its own list, but lists aren't secured.** The owner id is client-generated
  and never checked against anything. Real accounts would derive it from a session; only the
  HTTP layer would change.
- **One server process owns the data file.** Two processes writing the same file could lose
  updates. A database fixes that, behind the existing repository interface.
- **Due dates are calendar dates.** "Overdue" is judged against the server's UTC date, so it can
  flip a few hours early or late for users far from UTC.
- **Lists stay small.** Every operation reads and writes the whole file, and search is a
  substring scan. Fine for hundreds of items, not hundreds of thousands.

## Trade-offs

- **A JSON file, not a database.** The brief allows it, and it keeps setup to `npm install`. The
  cost is the single-process limit above.
- **The list is re-read after every write**, instead of being updated optimistically. That
  costs one extra request, but the screen can never drift from the server.
- **A hand-written shared contract, not generated types.** It's simple and catches drift at
  build time, but it doesn't describe the API to anyone outside the repo; OpenAPI would.
- **No browser-driven end-to-end test.** Each layer is tested from both sides, but nothing
  drives a real browser. Playwright tests in this case would be a great addition.

## Improvements

With more time, I'd next add real authentication, a database, time-zone-aware due dates, and
undo for deletes.

### How I built this

I used a hybrid setup of Claude Code and my own architectural experience on the backend and
frontend. The focus was on making the demo robust (the `TodoRepository` seam) and scalable (an
easy swap to a database when needed), with a clear folder structure for easy navigation and
separation of concerns (business logic and requests in hooks, UI in component.tsx files),
component-scoped styling, proper validation, logging and structured error handling.
