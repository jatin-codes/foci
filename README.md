# To-Do

A to-do list application: a React single-page app over a RESTful JSON API, written in TypeScript
on Node.js with Express. To-dos are persisted to a JSON file, so they survive restarts, and each
browser gets its own list.

```
client/   React SPA, bundled by Vite
server/   Express API, layered domain / application / infrastructure / http
```

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
npm run build      # compiles the server, bundles the client
npm start          # http://localhost:3000 serves both
```

In production Express serves the built client itself, so there is one process, one port and no
CORS.

| Environment variable | Default       | Purpose                             |
| -------------------- | ------------- | ----------------------------------- |
| `PORT`               | `3000`        | Port the server listens on          |
| `CLIENT_DIR`         | `client/dist` | Where the built client is read from |

### With Docker

```bash
docker build -t todo-api .
docker run --rm -p 3000:3000 -v todo-data:/data todo-api
```

The named volume keeps your to-dos when the container is replaced.

## Running the tests

```bash
npm test           # run the whole suite once
npm run test:watch # re-run on change
npm run check      # formatting + lint + type-check + tests (what CI runs)
```

Two suites run side by side: the server's in Node, the client's in a jsdom DOM with Testing
Library. Neither needs setup — the server builds its own in-memory repository, and the client
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
| **Delete**     | `×`                                                  |
| **Search**     | Free text over title and description                 |
| **Filter**     | All / Incomplete / Completed / Overdue               |
| **Sort**       | Created, due date or title; `↑`/`↓` reverses         |

Search, filtering and sorting are applied by the API, not in the browser, so the rules live in one
place and the page cannot disagree with a direct API call. Typing in the search box is debounced,
so a request goes out once you pause rather than on every keystroke. Every action re-reads the list, so the screen
always reflects what the server holds.

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
| `GET`    | `/todos`                 | List to-dos (filterable, sortable) | `200` + array    |
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
  "createdAt": "2025-01-02T18:16:09.470Z"
}
```

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

### Searching, filtering and sorting

`GET /todos` accepts these optional query parameters:

| Parameter | Values                                      | Default     |
| --------- | ------------------------------------------- | ----------- |
| `status`  | `all`, `completed`, `incomplete`, `overdue` | `all`       |
| `sortBy`  | `createdAt`, `dueDate`, `title`             | `createdAt` |
| `order`   | `asc`, `desc`                               | `asc`       |
| `search`  | free text, up to 200 characters             | none        |

`search` is a case-insensitive substring match against **title and description**, combined with
`status` rather than replacing it. It is a find-as-you-type filter, not a search engine: accents
and word stems are not normalised.

A to-do is **overdue** when it is incomplete and its due date is before today. When sorting by
due date, to-dos without one always come last.

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
    │   ├── client.ts             the only place that calls fetch
    │   ├── owner.ts              which list this browser sees
    │   ├── queryClient.ts        cache configuration and query keys
    │   └── types.ts              the API contract, typed from the server
    ├── hooks/                hooks used by more than one component
    ├── utils/                pure helpers
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
    ├── infrastructure/   TodoRepository implementations: JSON file and in-memory.
    ├── http/             Express adapter: api/ router, shared validation, the single
    │                     error-to-response mapping, and serveClient.ts.
    ├── config.ts         Environment parsing.
    └── server.ts         Composition root – the only file that knows every concrete class.
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
  new class and changing one line in `server.ts`. The in-memory implementation is proof that the
  seam works, and it is what keeps most tests fast.
- **Time and id generation are injected too**, which makes "created at" and "overdue" behaviour
  deterministic under test without mocking globals.
- **HTTP is a thin adapter.** Route handlers validate input, call one service method and serialise
  the result. They contain no branching: failures are thrown as typed errors
  (`ValidationError`, `TodoNotFoundError`) and a single error handler maps them to status codes.
  `createApp(service)` builds the app without listening, so tests can drive it in-process.
- **Validation happens once, at the boundary** (Zod schemas in `http/schemas.ts`). The schemas also
  normalise input (trimming, blank description → `null`), so the service can trust its typed
  arguments. The allowed filter/sort values are defined once in the application layer and reused by
  the schema, so the two cannot drift apart.
- **Repository updates are atomic.** The repository exposes `update(id, changes)` rather than
  `get` + `save`, so concurrent requests such as "complete" and "rename" on the same item cannot
  overwrite each other's changes. The file repository queues its operations to guarantee this, and
  writes via a temp file + rename so a crash mid-write cannot corrupt the data. A data file that
  cannot be parsed is reported as an error rather than overwritten.
- **Server state is TanStack Query's job, not `useState`'s.** `useTodoList` declares one query -
  keyed by the filter, sort and search, so each is cached separately - and a mutation per write,
  each invalidating the list on success. That buys what a hand-rolled version kept
  having to add: every write reports whether it is in flight, stale responses are discarded
  without a manual guard, and changing a filter keeps the current list on screen
  (`keepPreviousData`) rather than blanking the page between keystrokes.
- **In-flight writes are visible.** A row with a write outstanding is dimmed, marked
  `aria-busy`, and has its controls disabled, so a slow network reads as "working" rather than
  "nothing happened" - and a second click cannot race the first.
- **The client has one seam to the network.** Only `api/client.ts` calls `fetch`; only `useTodos`
  holds list state. Components take data and callbacks as props, so they render without a server.
- **A component owns its own data, not just its markup.** `TodoList` holds the list query and
  the writes its rows offer; `NewTodoForm` holds the one that adds. Nothing is threaded down
  from the page, because the query cache is what they share — the form invalidates the list
  without knowing it exists. `App` is left composing four children and choosing what the list
  should show.
- **Components nest the way they render.** A component used by exactly one parent lives
  inside it, so `components/` lists what the page renders rather than everything that exists,
  and the path says who may use a component. Anything shared by two parents moves up to where
  both can reach it.
- **A file has to earn itself.** State management lives in a hook (`useNewTodoForm`,
  `useTodoList`) because that is the part worth reading on its own. Everything else stays in
  the component: props types, presentational fragments such as the details panel, and the
  derived values a component needs to render. `TodoFilters` has no hook because it holds no
  state, and nothing has a barrel file, because a re-export is not a boundary. Markup and behaviour are separated:
  `NewTodoForm.tsx` renders what `useNewTodoForm.ts` returns and holds no state itself, so the
  behaviour can be read - or tested - without reading JSX. A purely presentational component
  such as `TodoDetails` has no hook, because inventing one would add a file and explain nothing.
- **Styles are scoped by ownership.** `styles.css` holds design tokens and the few primitives
  more than one component uses; everything else sits next to the component that renders it.
- **Business rules stay on the server.** Filtering and sorting are query parameters, not array
  operations in the browser, so the SPA and a direct API client see identical results.
- **The API contract is typed, not duplicated.** `client/src/api/types.ts` re-exports the
  server's `Todo` as a type-only import, so the two cannot disagree; nothing from the server is
  bundled. It holds the contract and nothing else: UI copy such as the sort-field labels lives
  with the component that renders it.

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
   behavioural tests executed against _every_ `TodoRepository` implementation. This is what
   justifies using the in-memory repository as a stand-in elsewhere. The file repository
   additionally has tests for what is unique to it: persistence across instances, concurrent
   writes, directory creation and corrupted files.
3. **API integration tests** using Supertest against the real Express app: every endpoint's happy
   path, validation failures, 404s, malformed JSON and the 500 path.
4. **Component tests** driving the React app through the DOM with Testing Library — list, add,
   view, update, complete, delete, search and filter — against a stubbed `fetch`. The stub can
   hold a request open, so the in-flight state is asserted rather than assumed.
5. **One end-to-end test** wires HTTP → service → JSON file exactly as production does and
   verifies data survives an application "restart".

Tests assert on observable behaviour (return values, HTTP responses, what is on screen), not on
internal calls, so the internals can be refactored freely.

## Assumptions

- **Single user, no authentication.** The API is unauthenticated and every client sees the same
  list. Adding auth would mean a user id on the to-do and a filter in the repository, not a
  different architecture.
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
  interactive editing and filtering, but it adds a build step and a ~70 kB gzipped bundle to what
  server-rendered HTML could do with no client JavaScript at all.
- **No end-to-end browser test.** The layers are covered from both sides — Supertest against the
  real app, Testing Library against the real components — but nothing drives a real browser
  against a real server. That is the gap I would close first with more time.
