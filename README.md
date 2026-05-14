# Roamly

Travel planning app. Create trips, drop pins on a map, browse nearby points of interest, and track your itinerary — all stored locally in the browser.

## Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v3
- shadcn/ui (Radix UI)
- React Router v7
- React Leaflet + Leaflet
- Overpass API (OpenStreetMap POI queries)

## Features

- Dashboard with trip cards and a mini calendar widget
- Per-trip detail view with an interactive map
- Geocoding to search and pin destinations
- Nearby POI discovery (restaurants, cafes, museums, parks, etc.) via Overpass API
- `.ics` calendar import — pull in trips from exported calendar files
- Activity icons tied to trip categories
- All data persists in `localStorage` — no backend, no account required

## Getting started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Other commands

```bash
npm run build    # tsc + Vite production build
npm run preview  # preview the production build locally
npm run lint     # ESLint
```

## Notes

POI lookups hit the public Overpass API — no API key needed, but requests are rate-limited by the endpoint. Geocoding uses a free public service.
