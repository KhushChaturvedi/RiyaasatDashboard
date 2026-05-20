from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import upload, sales, sync, footfall

app = FastAPI(title="Riyaasat Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
    "http://localhost:3000",
    "https://riyaasat-dashboard.vercel.app",
    "https://*.vercel.app",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(sales.router)
app.include_router(sync.router)
app.include_router(footfall.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "Riyaasat Dashboard API"}
