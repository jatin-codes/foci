# To-Do

A to-do list application: a React single-page app over a RESTful JSON API, written in TypeScript
on Node.js with Express. To-dos are persisted to a JSON file, so they survive restarts, and each
browser gets its own list.

```
client/   React SPA, bundled by Vite
server/   Express API, layered domain / application / infrastructure / http
shared/   The API contract both halves import: wire types, accepted values, field limits
```

## Highlights

- **Layered server with one seam to storage.** Domain → application → HTTP, with the JSON file
  plugged in behind a `TodoRepository` interface. Swapping in a database is one new class and
  one changed line. [Architecture](#architecture)
- **One repository test suite, run against the real repository and its test double**, so the
  fast in-memory stand-in is trustworthy. [Testing strategy](#testing-strategy)
- **Safe file storage.** Queued atomic updates, temp-file-and-rename writes, and a corrupt data
  file is refused rather than overwritten.
- **One contract for both halves.** `shared/contract.ts` is checked against every response at
  compile time, and ESLint stops the client importing server code.
- **Business rules live on the server.** Filtering, sorting, paging and the overdue rule all run
  there; the client only renders.
- **Visible failure and in-flight states.** Busy rows are disabled and marked `aria-busy`;
  a failed write is reported without hiding the list or losing a draft.
- **Fully checked in CI.** Formatting, lint, type-check, 198 tests with a coverage gate (99% of
  lines covered), a production build, and a
  Docker image that is built, started and smoke-tested.

Known gaps and next steps are in [Areas for improvement](#areas-for-improvement).

## Getting started

Requires **Node.js 20 or newer**.

```bash
npm install
npm run dev
```

That runs both halves: Express on `:3000` and Vite on `:5173`. **Open
<http://localhost:5173>** — Vite serves the UI with hot reload and proxies `/todos` and
`/health` through to Express, so the browser sees one origin.

Run them separately with `npm run dev:server` and `npm run dev:client` if you prefer.

### Production

```bash
npm run build      # bundles the server and the client (both with Vite)
npm start          # http://localhost:3000 serves both
```

In production Express serves the built client itself, so there is one process, one port and no
CORS.

| Environment variable | Default           | Purpose                             |
| -------------------- | ----------------- | ----------------------------------- |
| `PORT`               | `3000`            | Port the server listens on          |
| `DATA_FILE`          | `data/todos.json` | Where to-dos are stored             |
| `CLIENT_DIR`         | `client/dist`     | Where the built client is read from |

Relative paths resolve against the working directory, so run `npm start` from the project root.
The server logs one line per request, and on `SIGTERM` it finishes the requests in flight before
exiting.

### With Docker

```bash
docker build -t todo-api .
docker run --rm -p 3000:3000 -v todo-data:/data todo-api
```

The named volume keeps your to-dos when the container is replaced.

## Running the tests

```bash
npm test              # run the whole suite once
npm run test:watch    # re-run on change
npm run test:coverage # run once and enforce the coverage thresholds
npm run check         # formatting + lint + type-check + coverage (what CI runs, plus a Docker build)
```

Two suites run side by side: the server's in Node, the client's in a jsdom DOM with Testing
Library. Neither needs setup — the server tests use an in-memory repository, and the client
stubs `fetch`.

## The app

Every operation is available from the page:

| Action         | How                                                  |
| -------------- | ---------------------------------------------------- |
| **Add**        | The form at the top; `+ Add a description` for notes |
| **List**       | Title, due date and completion state on each row     |
| **View**       | Click a to-do to expand its full details             |
| **Update**     | `Edit` opens title, description and due date         |
| **Complete**   | The checkbox                                         |
| **Incomplete** | The checkbox again                                   |
| **Delete**     | `×`, then `Delete` to confirm (`Keep` backs out)     |
| **Search**     | Free text over title and description                 |
| **Filter**     | All / Incomplete / Completed / Overdue               |
| **Sort**       | Created, due date or title; `↑`/`↓` reverses         |

Search, filtering and sorting are applied by the API, not in the browser, so the rules live in one
place and the page cannot disagree with a direct API call. Typing in the search box is debounced,
so a request goes out once you pause rather than on every keystroke. Every action re-reads the
list, so the screen always reflects what the server holds.

## API

All request and response bodies are JSON. Every request must carry an **`X-Owner-Id`** header
naming whose list it is for; a request without one is rejected with `400`. The browser generates
an id on first load and keeps it in `localStorage`, so each browser sees only its own to-dos.

> This scopes data; it does not protect it. The id is supplied by the client and never checked
> against a secret, so anyone who knows another id can read that list. See
> [Assumptions](#assumptions).

| Method   | Path                     | Description                        | Success          |
| -------- | ------------------------ | ---------------------------------- | ---------------- |
| `POST`   | `/todos`                 | Add a to-do                        | `201` + the item |
| `GET`    | `/todos`                 | List to-dos (filter, sort, page)   | `200` + array    |
| `GET`    | `/todos/{id}`            | View one to-do                     | `200` + the item |
| `PATCH`  | `/todos/{id}`            | Update title, description, dueDate | `200` + the item |
| `POST`   | `/todos/{id}/complete`   | Mark as completed                  | `200` + the item |
| `POST`   | `/todos/{id}/incomplete` | Mark as not completed              | `200` + the item |
| `DELETE` | `/todos/{id}`            | Delete a to-do                     | `204`            |
| `GET`    | `/health`                | Liveness check                     | `200`            |

### The to-do resource

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

`isOverdue` is worked out by the server on every read and never stored, so clients do not need
their own copy of the rule or a clock that agrees with the server's.

### Request bodies

| Field         | `POST /todos` | `PATCH /todos/{id}` | Rules                                           |
| ------------- | ------------- | ------------------- | ----------------------------------------------- |
| `title`       | required      | optional            | string, 1–200 characters after trimming         |
| `description` | optional      | optional            | string up to 2000 characters, or `null`         |
| `dueDate`     | optional      | optional            | a real calendar date as `YYYY-MM-DD`, or `null` |

- `PATCH` changes only the fields you send; send `null` to clear `description` or `dueDate`.
  At least one field is required.
- Unknown fields are rejected rather than silently ignored. That includes `isCompleted`, `id` and
  `createdAt`: completion has its own endpoints, and the other two are read-only.

### Searching, filtering, sorting and paging

`GET /todos` accepts these optional query parameters:

| Parameter | Values                                      | Default     |
| --------- | ------------------------------------------- | ----------- |
| `status`  | `all`, `incomplete`, `completed`, `overdue` | `all`       |
| `sortBy`  | `createdAt`, `dueDate`, `title`             | `createdAt` |
| `order`   | `asc`, `desc`                               | `asc`       |
| `search`  | free text, up to 200 characters             | none        |
| `limit`   | a whole number from 1 to 100                | every match |
| `offset`  | a whole number, 0 or more                   | `0`         |

`search` is a case-insensitive substring match against **title and description**, combined with
`status` rather than replacing it. It is a find-as-you-type filter, not a search engine: accents
and word stems are not normalised.

A to-do is **overdue** when it is incomplete and its due date is before today. When sorting by
due date, to-dos without one always come last. Titles sort as people read them: case and
accents are ignored, and "Task 2" comes before "Task 10".

Paging applies after filtering and sorting. Every response carries **`X-Total-Count`**, the number
of to-dos that matched across all pages. Leaving `limit` out returns every match, which is what
the web page does.

### Errors

Every error has the same shape; validation errors list each problem under `details`:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [{ "path": "title", "message": "title must not be empty" }]
  }
}
```

| Status | Code               | When                                                  |
| ------ | ------------------ | ----------------------------------------------------- |
| `400`  | `VALIDATION_ERROR` | Body or query parameters break the rules above        |
| `400`  | `INVALID_JSON`     | The body is not parseable JSON                        |
| `404`  | `TODO_NOT_FOUND`   | No to-do has that id                                  |
| `404`  | `ROUTE_NOT_FOUND`  | Unknown path                                          |
| `500`  | `INTERNAL_ERROR`   | Unexpected failure (details are logged, not returned) |

### Example session

```bash
curl -X POST localhost:3000/todos -H 'Content-Type: application/json' \
  -d '{"title": "Write README", "dueDate": "2025-01-10"}'

curl 'localhost:3000/todos?status=overdue&sortBy=dueDate'
curl 'localhost:3000/todos?search=milk'
curl -i 'localhost:3000/todos?sortBy=title&limit=20&offset=20'   # page 2; see X-Total-Count
curl -X PATCH localhost:3000/todos/<id> -H 'Content-Type: application/json' \
  -d '{"description": "Cover design and trade-offs", "dueDate": null}'
curl -X POST localhost:3000/todos/<id>/complete
curl -X DELETE localhost:3000/todos/<id>
```

## Design

### Architecture

```
client/
└── src/
    ├── main.tsx              entry point
    ├── App.tsx               composes the page and nothing else
    ├── useApp.ts             what the controls above the list have chosen
    ├── styles.css            design tokens and shared primitives only
    ├── api/                  the network boundary
    │   ├── http.ts               the only place that calls fetch; names this browser's list
    │   ├── queryClient.ts        cache configuration and query keys
    │   └── types.ts              the contract from shared/, plus the client's request types
    ├── hooks/                hooks used by more than one component
    └── components/           nested the way the page renders them
        ├── NewTodoForm/          .tsx, .css, and a hook for its state
        ├── SearchBar/
        ├── TodoFilters/          no hook: it holds no state
        └── TodoList/
            └── TodoItem/         rendered only by TodoList, so it lives inside it

server/
└── src/
    ├── domain/           Todo type and pure rules (isOverdue, calendar dates). No dependencies.
    ├── application/      TodoService (the use cases), list filtering/sorting, and the
    │                     TodoRepository interface the service depends on.
    ├── infrastructure/   The JSON file TodoRepository.
    ├── http/             Express adapter: api/ router, shared validation, the single
    │                     error-to-response mapping, request logging and serveClient.ts.
    ├── config.ts         Environment parsing.
    └── server.ts         Composition root – the only file that knows every concrete class.

shared/
└── contract.ts           What travels over HTTP: the to-do resource, list query, accepted
                          filter/sort values, field limits and header names. No dependencies.
```

On the server, dependencies point inwards only: `http` → `application` → `domain`, with
`infrastructure` plugged in at the edge.

- **Every use case names its owner.** `TodoService` and `TodoRepository` take an `ownerId`
  rather than holding one, so a single service instance serves every caller and a request can
  never inherit the previous request's identity. The repository contract requires that another
  owner's id be indistinguishable from an id that does not exist — so a wrong owner reads as
  `404`, never as someone else's to-do — and the contract suite holds every implementation to
  that.
- **The service depends on an interface, not on storage.** `TodoService` receives a
  `TodoRepository` through its constructor. Swapping the JSON file for a database means writing one
  new class and changing one line in `server.ts`. The tests already plug in a second,
  in-memory implementation, which is both proof that the seam works and what keeps them fast.
  It lives with the tests, not in `src/`, because production never uses it.
- **Time and id generation are injected too**, which makes "created at" and "overdue" behaviour
  deterministic under test without mocking globals.
- **HTTP is a thin adapter.** Route handlers validate input, call one service method and serialise
  the result. They contain no branching: failures are thrown as typed errors
  (`ValidationError`, `TodoNotFoundError`) and a single error handler maps them to status codes.
  `createApp(service)` builds the app without listening, so tests can drive it in-process.
- **Validation happens once, at the boundary** (Zod schemas in `http/schemas.ts`). The schemas also
  normalise input (trimming, blank description → `null`), so the service can trust its typed
  arguments. The allowed filter/sort values and field limits come from `shared/contract.ts`, so the
  schema, the use cases and the client cannot drift apart.
- **Repository updates are atomic.** The repository exposes `update(id, changes)` rather than
  `get` + `save`, so concurrent requests such as "complete" and "rename" on the same item cannot
  overwrite each other's changes. The file repository queues its operations to guarantee this, and
  writes via a temp file + rename so a crash mid-write cannot corrupt the data. A data file that
  cannot be parsed, or holds records that are not to-dos, is reported as an error rather than
  overwritten.
- **Server state is TanStack Query's job, not `useState`'s.** `useTodoList` declares one query -
  keyed by the filter, sort and search, so each is cached separately - and a mutation per write,
  each invalidating the list on success. That buys what a hand-rolled version kept
  having to add: every write reports whether it is in flight, stale responses are discarded
  without a manual guard, and changing a filter keeps the current list on screen
  (`keepPreviousData`) rather than blanking the page between keystrokes.
- **In-flight writes are visible.** A row with a write outstanding is dimmed, marked
  `aria-busy`, and has its controls disabled, so a slow network reads as "working" rather than
  "nothing happened" - and a second click cannot race the first.
- **The client has one seam to the network.** Only `send()` in `api/http.ts` calls `fetch`, so
  the owner header, JSON handling and error parsing live in one place. Each hook states its own
  endpoints through it: the calls sit next to the query or mutation that uses them.
- **A component owns its own data, not just its markup.** `TodoList` holds the list query and
  the writes its rows offer; `NewTodoForm` holds the one that adds. Nothing is threaded down
  from the page, because the query cache is what they share — the form invalidates the list
  without knowing it exists. `App` is left composing four children and choosing what the list
  should show.
- **Components nest the way they render.** A component used by exactly one parent lives
  inside it, so `components/` lists what the page renders rather than everything that exists,
  and the path says who may use a component. Anything shared by two parents moves up to where
  both can reach it.
- **Imports say where they reach.** A file in the same folder is imported relatively
  (`./useTodoList.js`); anything else goes through an alias for its top-level folder
  (`@api`, `@components`, `@hooks`, `@shared`), so no import climbs with `../`. ESLint enforces
  it, and the aliases are declared once in `client/vite.config.ts` and mirrored in
  `client/tsconfig.json`.
- **A file has to earn itself.** State management lives in a hook (`useNewTodoForm`,
  `useTodoList`) because that is the part worth reading on its own. Everything else stays in
  the component: props types, presentational fragments such as the details panel, and the
  derived values a component needs to render. `TodoFilters` has no hook because it holds no
  state, and nothing has a barrel file, because a re-export is not a boundary.
- **Styles are scoped by ownership.** `styles.css` holds design tokens and the few primitives
  more than one component uses; everything else sits next to the component that renders it.
- **Business rules stay on the server.** Searching, filtering, sorting and the overdue rule all
  run there: the list arrives filtered and each to-do says whether it is overdue, so the SPA and a
  direct API client see identical results and the browser holds no copy of the rules.
- **One contract, imported by both halves.** `shared/contract.ts` defines what travels over HTTP:
  the to-do resource, the list query, the accepted values, the field limits and the header names.
  It is plain types and constants, so importing it couples neither half to the other's code.
  ESLint enforces the boundaries: the client may not import `server/`, the server may not import
  `client/`, and `shared/` may import nothing. The router checks every response body against the
  contract with `satisfies`, so changing what the server sends without changing the contract is a
  compile error. UI copy such as the sort-field labels stays with the component that renders it.
- **A failed write does not hide the list.** A load failure replaces the list, because there is
  nothing to show; a failed add, edit, toggle or delete is reported above it, and the next write
  clears it. A failed save leaves the form open with the draft intact, so nothing is retyped.

### API decisions

- **`PATCH` for updates instead of `PUT`.** The requirement is to modify _some of_ title,
  description and due date, which is a partial update; `PUT` semantics would require the client to
  resend the entire resource.
- **`POST /todos/{id}/complete` and `/incomplete`** mirror the two required actions directly and
  are idempotent. Keeping completion out of `PATCH` gives each operation one obvious way to do it.
- Optional fields are always present in responses as `null` rather than omitted, so clients see a
  stable shape.

### Testing strategy

Tests are organised as a pyramid, mirroring the source layout under `server/tests/` and
`client/tests/`:

1. **Unit tests** for the pure logic: date validation, the overdue rule, filtering/sorting, config
   parsing, and `TodoService` (run against the in-memory repository with a fixed clock).
2. **A repository contract suite** (`server/tests/support/todoRepositoryContract.ts`): one set of
   behavioural tests run against the file repository and the in-memory test double alike. This
   is what justifies using the double as a stand-in elsewhere. The file repository
   additionally has tests for what is unique to it: persistence across instances, concurrent
   writes, directory creation and corrupted files.
3. **API integration tests** using Supertest against the real Express app: every endpoint's happy
   path, validation failures, paging, 404s, malformed JSON, the 500 path and request logging,
   plus serving the built client without it ever answering for an API path.
4. **Component tests** driving the React app through the DOM with Testing Library — list, add,
   view, update, cancel, complete, delete (and backing out of it), search, filter and sort —
   against a stubbed `fetch`. The stub can hold a request open, so the in-flight state is
   asserted rather than assumed, and can fail reads and writes, so what the user sees after a
   server error is tested too.
5. **One end-to-end test** wires HTTP → service → JSON file exactly as production does and
   verifies data survives an application "restart".

Coverage is enforced in CI (`vitest.config.ts` holds the thresholds). The two entry points,
`server.ts` and `main.tsx`, only wire things together and are left out; the Docker smoke test
runs the server's for real.

Tests assert on observable behaviour (return values, HTTP responses, what is on screen), not on
internal calls, so the internals can be refactored freely.

## Assumptions

- **Lists are separated, not secured.** Each browser generates an id, keeps it in
  `localStorage` and sends it as `X-Owner-Id`; the repository filters by it, so one browser never
  sees another's to-dos. Nothing authenticates that header - anyone who knows an id can ask for
  that list, and clearing site data loses it. Real accounts would derive the owner from an
  authenticated session; only the HTTP layer would change.
- **Owners are opaque strings, and the server invents none of them.** The API takes whatever
  id it is given rather than issuing one, which keeps the server stateless about identity and
  makes the tests trivial to write. It also means a client that loses its id starts empty.
- **One server process owns the data file.** The file repository serialises its own operations, so
  concurrent HTTP requests are safe; two processes pointed at the same file are not. A database
  would be the answer, and the repository seam is where it goes.
- **Dates are calendar dates, not instants.** `dueDate` is a plain `YYYY-MM-DD` with no time zone,
  and "overdue" compares it against the server's UTC date. A user in UTC−5 sees an item turn
  overdue a few hours early. Acceptable for a to-do list; wrong for anything scheduling-sensitive.
- **The to-do list stays small.** The whole file is read and written on every operation, and
  search, filtering and sorting happen in memory. Fine for hundreds of items, wrong for hundreds
  of thousands - at which point search wants an index, not a substring scan.
- **`isCompleted`, `id` and `createdAt` are not user-editable.** Completion has its own endpoints;
  the other two are server-owned. `PATCH` rejects them rather than ignoring them.

## Trade-offs

- **A JSON file rather than a database.** The brief allows it and it keeps the project runnable
  with `npm install && npm run dev`. The cost is the concurrency limit above. The
  `TodoRepository` interface exists precisely so this is a contained change.
- **A full read-modify-write per operation.** Simple and obviously correct, and it makes the
  file the single source of truth rather than a cache that can drift. It would be the first thing
  to change under load.
- **Search, filtering and sorting on the server, not in the browser.** Costs a round trip per
  change; buys one implementation of the rules instead of two that can disagree. Search is
  debounced client-side so the cost is per pause, not per keystroke.
- **Substring search rather than an index.** Matches the data volume the rest of the design
  assumes. It cannot rank results or match stems, and it scans every to-do.
- **Re-reading the list after every write** instead of patching it locally or updating
  optimistically. One extra request per action, in exchange for a UI that cannot drift from the
  server. Optimistic updates would hide that latency, at the cost of a rollback path for every
  write — worth it under real latency, not at this size.
- **A data-fetching library rather than hand-rolled `useState`.** TanStack Query adds a
  dependency to an otherwise small client. It replaced code I had already written twice: a
  manual race guard and a manual refetch after every write, neither of which covered per-write
  pending state or caching.
- **React for an interface this simple.** The brief lists SPA as an option and it earns the
  interactive editing and filtering, but it adds a build step and a ~80 kB gzipped bundle to what
  server-rendered HTML could do with no client JavaScript at all.
- **A shared contract module rather than generated types.** `shared/` is one hand-written file
  both halves compile against, which is simple and catches drift at build time. It does not
  describe the API to anyone outside this repository; an OpenAPI document would.
- **The server is bundled with Vite rather than compiled with `tsc`.** `tsc` would mirror the
  directory tree, nesting the output under `server/dist/server/src/` so it could reach `shared/`.
  Bundling folds the contract into one `server/dist/server.js` and reuses a tool the client
  already needs. `tsc` still type-checks; it just no longer emits.
- **A confirmation step rather than undo for deletes.** Two clicks instead of one, but no
  soft-delete state on the server. Undo is the friendlier pattern; see below.

## Areas for improvement

Roughly in the order I would take them on:

- **An end-to-end browser test.** The layers are covered from both sides — Supertest against the
  real app, Testing Library against the real components — but nothing drives a real browser
  against a real server. A handful of Playwright tests (add, complete, edit, delete, filter)
  would close that gap and catch wiring faults such as the Vite proxy or the production static
  serving.
- **Real authentication.** `X-Owner-Id` separates lists but secures nothing. Deriving the owner
  from a session or token is a change to the HTTP layer only.
- **A database.** SQLite or Postgres behind the existing `TodoRepository` interface would lift the
  single-process limit, drop the whole-file read and write per operation, and move filtering,
  sorting and paging into queries.
- **Time zones.** Overdue is judged against the server's UTC date. The client could send its
  time zone, or the server could store a due instant rather than a calendar date.
- **Paging in the UI.** The API pages; the web page still asks for every match. Infinite scroll
  or a "Load more" button is a client-only change.
- **Undo instead of a delete confirmation**, and optimistic updates for the other writes, which
  would hide network latency at the cost of a rollback path per write.
- **Conflicting edits across tabs.** The last write wins. An `ETag` / `If-Match` check on `PATCH`
  would detect a stale edit instead of silently overwriting it.
- **An OpenAPI description** generated from the Zod schemas, for API consumers outside this repo
  and for runtime validation of responses on the client, which currently trusts the JSON it
  receives.
- **Operational hardening.** Structured JSON logs with request ids, metrics, rate limiting and
  security headers (for example with `helmet`) would all be expected before running this for
  real users.
- **An automated accessibility check** (axe) in the component tests.
