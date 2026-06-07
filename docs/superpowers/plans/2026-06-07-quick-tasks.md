# Quick Tasks — Persistent Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hardcoded static tasks on the admin dashboard with a Supabase-backed persistent Quick Tasks feature supporting create, toggle-done, and priority tags.

**Architecture:** New `tasks` Supabase table → new Express route file (`tasks.routes.ts`) → three API functions in `lib/api.ts` → updated Quick Tasks card in the dashboard page with inline add form and live toggle.

**Tech Stack:** Express 5, Supabase JS client, Next.js 16 / React 19, TypeScript.

---

## File Map

| File | Change |
|---|---|
| Supabase dashboard | Create `tasks` table via SQL |
| `backend/src/routes/tasks.routes.ts` | Create — GET / POST / PATCH routes |
| `backend/src/index.ts` | Register `/api/tasks` route |
| `frontend/lib/api.ts` | Add `getTasks`, `createTask`, `toggleTask` |
| `frontend/app/admin/page.tsx` | Replace static tasks with live data + add form |

---

## Task 1: Create the Supabase `tasks` table

**Files:**
- Supabase dashboard → SQL editor

- [ ] **Step 1: Run this SQL in the Supabase SQL editor**

```sql
create table tasks (
  id        uuid        primary key default gen_random_uuid(),
  title     text        not null,
  tag       text,
  tag_label text,
  done      boolean     not null default false,
  created_at timestamptz not null default now()
);
```

- [ ] **Step 2: Verify the table exists**

In Supabase dashboard → Table Editor, confirm `tasks` appears with the columns above.

---

## Task 2: Backend — `tasks.routes.ts`

**Files:**
- Create: `backend/src/routes/tasks.routes.ts`

- [ ] **Step 1: Create the file with GET, POST, PATCH**

```ts
import { Router } from 'express';
import { supabase } from '../config/supabase';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json((data || []).map((t: any) => ({
      id:       t.id,
      title:    t.title,
      tag:      t.tag,
      tagLabel: t.tag_label,
      done:     t.done,
    })));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, tag, tagLabel } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'title required' });
    const { data, error } = await supabase
      .from('tasks')
      .insert({ title: title.trim(), tag, tag_label: tagLabel, done: false })
      .select()
      .single();
    if (error) throw error;
    res.json({ id: data.id, title: data.title, tag: data.tag, tagLabel: data.tag_label, done: data.done });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('done')
      .eq('id', req.params.id)
      .single();
    if (fetchErr || !task) return res.status(404).json({ error: 'Task not found' });
    const { error } = await supabase
      .from('tasks')
      .update({ done: !task.done })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ done: !task.done });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
```

- [ ] **Step 2: Register route in `backend/src/index.ts`**

Add after the existing imports (line 10):
```ts
import taskRoutes from './routes/tasks.routes';
```

Add after the existing `app.use` registrations (after line 40):
```ts
app.use('/api/tasks', taskRoutes);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/tasks.routes.ts backend/src/index.ts
git commit -m "feat(tasks): add tasks CRUD backend routes"
```

---

## Task 3: API layer — add task functions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add three task API functions at the end of `frontend/lib/api.ts`**

```ts
// ─── Tasks ───────────────────────────────────────────────────────────────────
export const getTasks   = ()                                                          => API.get('/tasks');
export const createTask = (data: { title: string; tag: string; tagLabel: string })   => API.post('/tasks', data);
export const toggleTask = (id: string)                                                => API.patch(`/tasks/${id}`);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(tasks): add getTasks, createTask, toggleTask API functions"
```

---

## Task 4: Frontend — persistent Quick Tasks card

**Files:**
- Modify: `frontend/app/admin/page.tsx`

Apply all steps in order, then commit once at the end.

- [ ] **Step 1: Add `Task` type near the other type definitions (around line 16)**

Add after the existing types:
```ts
type Task = { id: string; title: string; tag: string; tagLabel: string; done: boolean };
```

- [ ] **Step 2: Add task imports**

Change the existing API import line from:
```ts
import { getDashboardStats, getRevenueStats, getBookings, getVehicles, getCustomers } from '@/lib/api';
```
To:
```ts
import { getDashboardStats, getRevenueStats, getBookings, getVehicles, getCustomers, getTasks, createTask, toggleTask } from '@/lib/api';
```

- [ ] **Step 3: Remove `INITIAL_TASKS` constant**

Delete lines 181–188:
```ts
// ─── Static quick tasks ───────────────────────────────────────────────────────
const INITIAL_TASKS = [
  { title: 'Renew fleet insurance',         meta: 'Due end of month',    tag: 'urgent', tagLabel: 'Urgent', done: false },
  { title: 'Schedule 1,000 km service',     meta: 'Check vehicle log',   tag: 'soon',   tagLabel: 'Soon',   done: false },
  { title: 'Follow up overdue payment',     meta: 'Outstanding invoice', tag: 'urgent', tagLabel: 'Urgent', done: false },
  { title: 'Update fleet photos',           meta: 'CMS update',          tag: 'low',    tagLabel: 'Low',    done: false },
  { title: 'Review monthly revenue report', meta: 'Finance summary',     tag: 'low',    tagLabel: 'Low',    done: false },
];
```

- [ ] **Step 4: Replace task state and add form state**

Change:
```ts
const [tasks,     setTasks]     = useState(INITIAL_TASKS);
```
To:
```ts
const [tasks,      setTasks]      = useState<Task[]>([]);
const [addingTask, setAddingTask] = useState(false);
const [newTitle,   setNewTitle]   = useState('');
const [newTag,     setNewTag]     = useState<'urgent' | 'soon' | 'low'>('soon');
```

- [ ] **Step 5: Add `getTasks` to the mount effect**

The current `Promise.allSettled` call is:
```ts
Promise.allSettled([
  getDashboardStats(), getRevenueStats(),
  getBookings({ limit: 50 }), getVehicles({ limit: 20 }), getCustomers(),
]).then(([s, r, b, v, c]) => {
  setStats(s.status === 'fulfilled' ? s.value.data : { activeBookings: 0, totalBookings: 0, totalCustomers: 0, totalVehicles: 0, monthRevenue: 0 });
  setRevenue(r.status === 'fulfilled' ? [...r.value.data].reverse() : []);
  setBookings(b.status === 'fulfilled' ? b.value.data : []);
  setVehicles(v.status === 'fulfilled' ? v.value.data : []);
  setCustomers(c.status === 'fulfilled' ? c.value.data : []);
```

Change to:
```ts
Promise.allSettled([
  getDashboardStats(), getRevenueStats(),
  getBookings({ limit: 50 }), getVehicles({ limit: 20 }), getCustomers(),
  getTasks(),
]).then(([s, r, b, v, c, tk]) => {
  setStats(s.status === 'fulfilled' ? s.value.data : { activeBookings: 0, totalBookings: 0, totalCustomers: 0, totalVehicles: 0, monthRevenue: 0 });
  setRevenue(r.status === 'fulfilled' ? [...r.value.data].reverse() : []);
  setBookings(b.status === 'fulfilled' ? b.value.data : []);
  setVehicles(v.status === 'fulfilled' ? v.value.data : []);
  setCustomers(c.status === 'fulfilled' ? c.value.data : []);
  setTasks(tk.status === 'fulfilled' ? tk.value.data : []);
```

- [ ] **Step 6: Add `handleAddTask` function**

Add this function after `handleTabChange` (or any other handler, before the `return`):
```ts
const handleAddTask = async () => {
  if (!newTitle.trim()) return;
  const tagLabels: Record<string, string> = { urgent: 'Urgent', soon: 'Soon', low: 'Low' };
  try {
    const r = await createTask({ title: newTitle.trim(), tag: newTag, tagLabel: tagLabels[newTag] });
    setTasks(prev => [...prev, r.data]);
    setNewTitle('');
    setNewTag('soon');
    setAddingTask(false);
  } catch {
    toast.error('Failed to add task');
  }
};
```

- [ ] **Step 7: Update the Quick Tasks card JSX**

Replace the entire Quick Tasks card (from `{/* Quick Tasks */}` to the closing `</div>`) with:

```tsx
{/* Quick Tasks */}
<div className="card" style={{ overflow: 'hidden' }}>
  <div className="card-head">
    <div>
      <div className="card-title">Quick Tasks</div>
      <div className="card-sub">{tasks.filter(t => !t.done).length} pending</div>
    </div>
    <button className="link" onClick={() => setAddingTask(a => !a)}>
      Add task <Plus size={12} />
    </button>
  </div>
  <div>
    {tasks.map(t => (
      <div key={t.id} className={`task ${t.done ? 'done' : ''}`}>
        <div
          className={`checkbox ${t.done ? 'checked' : ''}`}
          onClick={async () => {
            setTasks(prev => prev.map(x => x.id === t.id ? { ...x, done: !x.done } : x));
            try { await toggleTask(t.id); } catch { /* optimistic */ }
          }}
        >
          {t.done && <Check size={11} strokeWidth={2.5} />}
        </div>
        <div className="task-body">
          <div className="task-title">{t.title}</div>
          <div className="task-meta">
            {t.tag && <span className={`tag ${t.tag}`}>{t.tagLabel}</span>}
          </div>
        </div>
      </div>
    ))}
    {tasks.length === 0 && !addingTask && (
      <div style={{ padding: '1.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
        No tasks yet
      </div>
    )}
  </div>
  {addingTask && (
    <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        autoFocus
        type="text"
        className="form-input"
        placeholder="Task title…"
        value={newTitle}
        onChange={e => setNewTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') { setAddingTask(false); setNewTitle(''); setNewTag('soon'); } }}
        style={{ fontSize: '0.82rem', padding: '0.32rem 0.6rem' }}
      />
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {(['urgent', 'soon', 'low'] as const).map(tg => (
          <button
            key={tg}
            onClick={() => setNewTag(tg)}
            style={{
              padding: '0.2rem 0.6rem', borderRadius: 99, border: 'none', cursor: 'pointer',
              fontSize: '0.7rem', fontWeight: 700,
              background: newTag === tg ? 'var(--gold)' : 'var(--bg-hover)',
              color: newTag === tg ? '#000' : 'var(--text-muted)',
            }}
          >
            {tg.charAt(0).toUpperCase() + tg.slice(1)}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => { setAddingTask(false); setNewTitle(''); setNewTag('soon'); }}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleAddTask}
          disabled={!newTitle.trim()}
        >
          Save
        </button>
      </div>
    </div>
  )}
</div>
```

- [ ] **Step 8: Commit**

```bash
git add frontend/app/admin/page.tsx frontend/lib/api.ts
git commit -m "feat(tasks): persistent quick tasks with add form and toggle-done"
```

---

## Spec Coverage Check

| Spec requirement | Task |
|---|---|
| `tasks` Supabase table with all columns | Task 1 |
| `GET /tasks` ordered by `created_at asc` | Task 2 Step 1 |
| `POST /tasks` with validation | Task 2 Step 1 |
| `PATCH /tasks/:id` toggle done | Task 2 Step 1 |
| Route registered at `/api/tasks` | Task 2 Step 2 |
| `getTasks`, `createTask`, `toggleTask` in api.ts | Task 3 |
| Replace `INITIAL_TASKS` with live fetch | Task 4 Steps 3–5 |
| Inline add form with title + tag selector | Task 4 Step 7 |
| Optimistic toggle done | Task 4 Step 7 |
| "Add task" button toggles form | Task 4 Step 7 |
| Pending count reflects live state | Task 4 Step 7 |
| No delete | Omitted (out of scope) |
