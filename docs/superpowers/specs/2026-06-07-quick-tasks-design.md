# Quick Tasks — Persistent Feature Design

**Date:** 2026-06-07
**Status:** Approved

## Summary

Replace the hardcoded static `INITIAL_TASKS` on the admin dashboard with a fully persistent Quick Tasks feature backed by Supabase. Tasks survive page refreshes and are shared across all admin sessions.

## Database

New Supabase table: `tasks`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `title` | `text` | NOT NULL |
| `tag` | `text` | `'urgent' \| 'soon' \| 'low'` |
| `tag_label` | `text` | `'Urgent' \| 'Soon' \| 'Low'` |
| `done` | `boolean` | default `false` |
| `created_at` | `timestamptz` | default `now()` |

Create via Supabase dashboard SQL:
```sql
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text,
  tag_label text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);
```

## Backend

New file: `backend/src/routes/tasks.routes.ts`

| Method | Path | Description |
|---|---|---|
| `GET` | `/tasks` | Return all tasks ordered by `created_at asc` |
| `POST` | `/tasks` | Create task `{ title, tag, tagLabel }` |
| `PATCH` | `/tasks/:id` | Toggle `done` on the task |

All routes use `authMiddleware`. Register at `/api/tasks` in `backend/src/index.ts`.

## API Layer

Add to `frontend/lib/api.ts`:

```ts
export const getTasks      = ()                                         => API.get('/tasks');
export const createTask    = (data: { title: string; tag: string; tagLabel: string }) => API.post('/tasks', data);
export const toggleTask    = (id: string)                               => API.patch(`/tasks/${id}`);
```

## Frontend (`app/admin/page.tsx`)

### State changes

- Remove `INITIAL_TASKS` constant
- Replace `useState(INITIAL_TASKS)` with `useState<Task[]>([])`
- Add `Task` type: `{ id: string; title: string; tag: string; tagLabel: string; done: boolean }`
- Add `addingTask: boolean` state (controls inline form visibility)
- Add `newTitle: string` and `newTag: 'urgent' | 'soon' | 'low'` state for the form

### Data loading

Fetch tasks alongside other dashboard data on mount using `getTasks()`.

### "Add task" button

Toggles `addingTask`. When `addingTask` is true, renders an inline form below the button:
- Text input for task title (auto-focused)
- Tag selector: 3 buttons — Urgent / Soon / Low (default: Soon)
- Save button: calls `createTask`, prepends returned task to `tasks` state, resets form, hides form
- Cancel: hides form, resets inputs

### Toggle done

On checkbox click: optimistically flip `done` in local state, then call `toggleTask(id)`. No rollback on error (non-critical).

## Out of Scope

- Delete tasks
- Reordering tasks
- Task assignment / multi-user
- Due dates
