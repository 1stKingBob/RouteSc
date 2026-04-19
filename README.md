# RouteScout — Smart Bus Route Optimization Dashboard

A production-quality, full-stack transport intelligence platform for NSW bus route analysis, simulation, and optimization.

---

## Quick Start

### Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Backend (FastAPI) — Optional

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs at http://localhost:8000/docs

---

## Features

| Feature | Description |
|---|---|
| Interactive Map | Dark CartoDB tiles · route paths · demand-colored stops |
| Simulation Engine | Add/remove stops · adjust frequency · real-time metric updates |
| Impact Metrics | Route time · wait time · passenger load · efficiency score |
| Popularity Index | Animated circular progress ring · component breakdown |
| AI Insights | Route-specific recommendations with impact metrics |
| Scenario Comparison | Radar + bar charts · before/after delta cards |
| Scroll Animations | Framer Motion `whileInView` across all sections |

---

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Framer Motion, React Leaflet, Recharts, Zustand
- **Map Tiles**: CartoDB Dark (no API key required)
- **Backend**: FastAPI, Pydantic v2
- **Data**: Structured mock data mirroring NSW Open Transport Data schema

---

## Data

Routes included:
- **370** Coogee → Glebe via Newtown
- **380** Circular Quay → Bondi Beach
- **333** CBD → Bondi Junction Express
- **440** Circular Quay → Leichhardt

Data structure is compatible with [NSW Open Transport Data](https://opendata.transport.nsw.gov.au/data/dataset/transport-routes).

---

## Folder Structure

```
transitflow-ai/
├── frontend/
│   └── src/
│       ├── app/           # Next.js App Router
│       ├── components/
│       │   ├── map/       # MapView (Leaflet)
│       │   ├── dashboard/ # All panel components
│       │   ├── layout/    # Header
│       │   └── ui/        # GlassCard, AnimatedCounter, Skeleton
│       ├── lib/           # mockData, calculations, utils
│       ├── store/         # Zustand global state
│       └── types/         # TypeScript interfaces
└── backend/
    └── app/
        ├── routers/       # FastAPI route handlers
        ├── models/        # Pydantic schemas
        └── services/      # Business logic
```
