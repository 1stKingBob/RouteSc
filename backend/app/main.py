from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routes, simulation

app = FastAPI(
    title="TransitFlow AI API",
    description="NSW Bus Route Optimization Backend",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes.router)
app.include_router(simulation.router)


@app.get("/")
def root():
    return {
        "name": "TransitFlow AI",
        "version": "1.0.0",
        "docs": "/docs",
        "routes": "/routes",
        "simulate": "/simulate",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
