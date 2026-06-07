# Reports — Vehicle Filter Design

**Date:** 2026-06-07
**Status:** Approved

## Summary

Add a vehicle search/type-ahead filter to the Reports page alongside the existing date range filter. The vehicle filter applies to all 4 tabs (Financial, Commissions, Bookings, Vehicles) and resets when switching tabs.

## Frontend

### State

- `vehicleSearch: string` — display text in the search input (reset to `''` on tab change)
- `vehicleId: string` — selected vehicle ID used in API calls (reset to `''` on tab change)
- `vehicleList: { id: string; name: string; plate: string }[]` — fetched once on mount from `getVehicles()`

### VehicleSearch Component

Inline component rendered next to `DateFilter` in the filter bar.

- Text input with placeholder "Search vehicle…"
- Filters `vehicleList` client-side by `name` or `plate` (case-insensitive) as user types
- Shows a small dropdown list of matches below the input when text is non-empty and no vehicle is selected
- On selecting a vehicle: sets `vehicleId` + `vehicleSearch` (to vehicle name), closes dropdown
- On clearing text: resets `vehicleId` to `''`
- Dropdown closes on blur

### Tab Change Behaviour

When `setTab` is called, also reset `vehicleSearch` and `vehicleId` to `''`.

### Filter Indicator

Below the filter bar, alongside the existing date indicator, show a vehicle pill:
`Vehicle: <name>` in the same gold dot style when a vehicle is selected.

### API Calls

All 4 report loaders pass `vehicleId` alongside `from`/`to`.

### API Layer (`lib/api.ts`)

Rename `DateRange` → `ReportParams` and add `vehicleId?: string`:

```ts
type ReportParams = { from?: string; to?: string; vehicleId?: string };
```

Update all 4 `getReport*` functions to use `ReportParams`.

## Backend (`reports.routes.ts`)

All 4 routes accept a new `vehicleId` query param.

| Route | Change |
|---|---|
| `/financial` | Add `.eq('vehicle_id', vehicleId)` before grouping by month |
| `/commissions` | Add `.eq('vehicle_id', vehicleId)` to booking query |
| `/bookings` | Add `.eq('vehicle_id', vehicleId)` to booking query |
| `/vehicles` | Add `.eq('id', vehicleId)` to the vehicles query so only that vehicle is fetched and mapped |

Guard: only apply the filter when `vehicleId` is a non-empty string.

## Out of Scope

- Multi-vehicle selection
- Persisting vehicle filter across tab switches
- Server-side search (fleet size does not warrant it)
