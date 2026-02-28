"""
APEX - Main FastAPI Application
Finance + Health OS
"""

import os
import asyncio
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from plaid_mod.plaid_client import create_link_token, exchange_public_token, sync_accounts, sync_transactions
from alerts.alert_engine import run_nightly_alert_job, evaluate_payment_alerts
from rental.rental_intelligence import run_monthly_rental_report
from ai.assistant import chat, generate_daily_brief, classify_carnivore


# ─── Database ─────────────────────────────────────────────────────────────────

db_client: AsyncIOMotorClient = None

async def get_db():
    return db_client.apex


# ─── Scheduler (Nightly Jobs) ─────────────────────────────────────────────────

scheduler = AsyncIOScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_client
    db_client = AsyncIOMotorClient(os.getenv("MONGODB_URI"))
    
    # Nightly alert job — 8pm every day
    scheduler.add_job(
        lambda: asyncio.create_task(run_nightly_alert_job(db_client.apex)),
        "cron", hour=20, minute=0
    )
    
    # Monthly rental report — 1st of each month
    scheduler.add_job(
        lambda: asyncio.create_task(run_monthly_rental_report(db_client.apex)),
        "cron", day=1, hour=6, minute=0
    )
    
    scheduler.start()
    yield
    
    scheduler.shutdown()
    db_client.close()


app = FastAPI(title="APEX Finance + Health OS", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Plaid Routes ─────────────────────────────────────────────────────────────

@app.post("/api/plaid/link-token")
async def get_link_token(user_id: str, db=Depends(get_db)):
    token = await create_link_token(user_id)
    return {"link_token": token}


class ExchangeTokenRequest(BaseModel):
    user_id: str
    public_token: str

@app.post("/api/plaid/exchange")
async def exchange_token(body: ExchangeTokenRequest, background_tasks: BackgroundTasks, db=Depends(get_db)):
    result = await exchange_public_token(body.user_id, body.public_token, db)
    # Kick off initial sync in background
    background_tasks.add_task(initial_sync, body.user_id, result["item_id"], db)
    return result


async def initial_sync(user_id: str, item_id: str, db):
    item = await db.plaid_items.find_one({"item_id": item_id})
    if item:
        await sync_accounts(user_id, item["access_token"], db)
        await sync_transactions(user_id, item["access_token"], db, days_back=90)


@app.post("/api/plaid/sync/{user_id}")
async def manual_sync(user_id: str, background_tasks: BackgroundTasks, db=Depends(get_db)):
    items = await db.plaid_items.find({"user_id": user_id}).to_list(None)
    for item in items:
        background_tasks.add_task(sync_accounts, user_id, item["access_token"], db)
        background_tasks.add_task(sync_transactions, user_id, item["access_token"], db)
    return {"status": "sync_started", "items": len(items)}


# ─── Account Routes ───────────────────────────────────────────────────────────

@app.get("/api/accounts/{user_id}")
async def get_accounts(user_id: str, db=Depends(get_db)):
    accounts = await db.accounts.find({"user_id": user_id}).to_list(None)
    # Calculate net worth
    net_worth = sum(
        a["balance_current"] if a["type"] in ["checking", "savings", "investment"]
        else -abs(a["balance_current"])
        for a in accounts
    )
    return {"accounts": accounts, "net_worth": round(net_worth, 2)}


# ─── Alert Routes ─────────────────────────────────────────────────────────────

@app.get("/api/alerts/{user_id}")
async def get_alerts(user_id: str, db=Depends(get_db)):
    alerts = await db.alerts.find(
        {"user_id": user_id, "acknowledged": False}
    ).sort("severity", 1).to_list(None)
    return {"alerts": alerts, "critical_count": sum(1 for a in alerts if a["severity"] == "critical")}


@app.post("/api/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: str, db=Depends(get_db)):
    from bson import ObjectId
    await db.alerts.update_one(
        {"_id": ObjectId(alert_id)},
        {"$set": {"acknowledged": True, "acknowledged_at": datetime.utcnow()}}
    )
    return {"status": "acknowledged"}


@app.post("/api/alerts/run-now/{user_id}")
async def run_alerts_now(user_id: str, db=Depends(get_db)):
    """Manually trigger alert evaluation for a user."""
    alerts = await evaluate_payment_alerts(user_id, db)
    return {"alerts_generated": len(alerts)}


# ─── Rental Routes ────────────────────────────────────────────────────────────

@app.get("/api/rental/{user_id}")
async def get_rental_summary(user_id: str, db=Depends(get_db)):
    report = await db.rental_reports.find_one(
        {"user_id": user_id}, sort=[("created_at", -1)]
    )
    if not report:
        raise HTTPException(404, "No rental report found. Run monthly job first.")
    return report


@app.post("/api/rental/refresh/{user_id}")
async def refresh_rental_report(user_id: str, background_tasks: BackgroundTasks, db=Depends(get_db)):
    background_tasks.add_task(run_monthly_rental_report, db)
    return {"status": "refresh_started"}


# ─── AI Chat Routes ───────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    user_id: str
    message: str
    conversation_id: str = None

@app.post("/api/chat")
async def chat_endpoint(body: ChatRequest, db=Depends(get_db)):
    # Load conversation history
    history = []
    if body.conversation_id:
        docs = await db.conversations.find(
            {"user_id": body.user_id}
        ).sort("timestamp", 1).limit(20).to_list(None)
        history = [{"role": d["role"], "content": d["content"]} for d in docs]
    
    reply = await chat(body.user_id, body.message, history, db)
    return {"reply": reply}


@app.get("/api/daily-brief/{user_id}")
async def get_daily_brief(user_id: str, db=Depends(get_db)):
    brief = await generate_daily_brief(user_id, db)
    return {"brief": brief, "date": datetime.now().strftime("%A, %B %d")}


# ─── Carnivore Routes ─────────────────────────────────────────────────────────

@app.get("/api/carnivore/classify")
async def classify_food(food: str):
    result = await classify_carnivore(food)
    return result


class FoodLogEntry(BaseModel):
    user_id: str
    food: str
    protein_g: float
    fat_g: float
    calories: int = None
    meal_type: str = "meal"  # meal, snack

@app.post("/api/carnivore/log")
async def log_food(entry: FoodLogEntry, db=Depends(get_db)):
    today = datetime.now().strftime("%Y-%m-%d")
    await db.food_logs.update_one(
        {"user_id": entry.user_id, "date": today},
        {
            "$push": {"meals": entry.dict()},
            "$inc": {"total_protein": entry.protein_g, "total_fat": entry.fat_g}
        },
        upsert=True
    )
    return {"status": "logged"}


@app.get("/api/carnivore/today/{user_id}")
async def get_today_log(user_id: str, db=Depends(get_db)):
    today = datetime.now().strftime("%Y-%m-%d")
    log = await db.food_logs.find_one({"user_id": user_id, "date": today})
    return log or {"total_protein": 0, "total_fat": 0, "meals": []}


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "operational", "time": datetime.utcnow().isoformat()}
