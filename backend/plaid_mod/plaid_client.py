"""
APEX - Plaid Integration Module
Handles account connection, transaction sync, and balance aggregation
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.transactions_get_request import TransactionsGetRequest
from plaid.model.transactions_get_request_options import TransactionsGetRequestOptions
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.liabilities_get_request import LiabilitiesGetRequest
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# ─── Plaid Client Setup ────────────────────────────────────────────────────────

def get_plaid_client():
    config = plaid.Configuration(
        host=plaid.Environment.Sandbox,  # Change to Production for live data
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID"),
            "secret": os.getenv("PLAID_SECRET"),
        }
    )
    api_client = plaid.ApiClient(config)
    return plaid_api.PlaidApi(api_client)


# ─── Models ────────────────────────────────────────────────────────────────────

class Account(BaseModel):
    plaid_account_id: str
    user_id: str
    name: str
    official_name: Optional[str]
    type: str          # checking, savings, credit, investment, loan
    subtype: str
    balance_current: float
    balance_available: Optional[float]
    balance_limit: Optional[float]   # for credit cards
    currency: str = "USD"
    institution_id: str
    institution_name: str
    last_synced: datetime


class Transaction(BaseModel):
    plaid_transaction_id: str
    account_id: str
    user_id: str
    amount: float          # positive = debit, negative = credit
    date: str
    name: str              # merchant name
    merchant_name: Optional[str]
    category: list[str]
    pending: bool
    is_recurring: Optional[bool]
    recurring_frequency: Optional[str]  # weekly, monthly, annually


class CreditCardDetail(BaseModel):
    account_id: str
    apr: float
    penalty_apr: Optional[float]
    minimum_payment: float
    next_payment_due_date: str
    last_statement_balance: float
    last_payment_amount: Optional[float]
    last_payment_date: Optional[str]


# ─── Link Token (Frontend uses this to launch Plaid Link) ─────────────────────

async def create_link_token(user_id: str) -> str:
    client = get_plaid_client()
    
    request = LinkTokenCreateRequest(
        products=[
            Products("transactions"),
            Products("liabilities"),    # for credit card APR data
            Products("investments"),
        ],
        client_name="APEX Finance OS",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        webhook="https://your-domain.com/api/plaid/webhook",
    )
    
    response = client.link_token_create(request)
    return response["link_token"]


# ─── Exchange Public Token (after user completes Plaid Link) ──────────────────

async def exchange_public_token(user_id: str, public_token: str, db: AsyncIOMotorClient) -> dict:
    client = get_plaid_client()
    
    exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
    exchange_response = client.item_public_token_exchange(exchange_request)
    
    access_token = exchange_response["access_token"]
    item_id = exchange_response["item_id"]
    
    # Store access token securely (encrypt in production!)
    await db.plaid_items.insert_one({
        "user_id": user_id,
        "item_id": item_id,
        "access_token": access_token,  # TODO: encrypt with KMS
        "created_at": datetime.utcnow(),
        "institution_id": None,  # populate via /institutions/get
    })
    
    logger.info(f"Linked Plaid item {item_id} for user {user_id}")
    return {"item_id": item_id, "status": "connected"}


# ─── Sync Accounts ─────────────────────────────────────────────────────────────

async def sync_accounts(user_id: str, access_token: str, db: AsyncIOMotorClient):
    client = get_plaid_client()
    
    # Get accounts
    accounts_request = AccountsGetRequest(access_token=access_token)
    accounts_response = client.accounts_get(accounts_request)
    
    accounts = []
    for acct in accounts_response["accounts"]:
        account_doc = {
            "plaid_account_id": acct["account_id"],
            "user_id": user_id,
            "name": acct["name"],
            "official_name": acct.get("official_name"),
            "type": acct["type"],
            "subtype": acct["subtype"],
            "balance_current": acct["balances"]["current"],
            "balance_available": acct["balances"].get("available"),
            "balance_limit": acct["balances"].get("limit"),
            "currency": acct["balances"].get("iso_currency_code", "USD"),
            "last_synced": datetime.utcnow(),
        }
        
        # Upsert account
        await db.accounts.update_one(
            {"plaid_account_id": acct["account_id"], "user_id": user_id},
            {"$set": account_doc},
            upsert=True
        )
        accounts.append(account_doc)
    
    # Get liabilities for credit cards (APR, due dates, minimum payments)
    try:
        liabilities_request = LiabilitiesGetRequest(access_token=access_token)
        liabilities_response = client.liabilities_get(liabilities_request)
        
        for cc in liabilities_response.get("liabilities", {}).get("credit", []):
            await db.credit_card_details.update_one(
                {"account_id": cc["account_id"]},
                {"$set": {
                    "account_id": cc["account_id"],
                    "minimum_payment": cc.get("minimum_payment_amount"),
                    "next_payment_due_date": cc.get("next_payment_due_date"),
                    "last_statement_balance": cc.get("last_statement_balance"),
                    "last_payment_amount": cc.get("last_payment_amount"),
                    "last_payment_date": cc.get("last_payment_date"),
                    "aprs": cc.get("aprs", []),   # includes purchase APR, penalty APR
                }},
                upsert=True
            )
    except Exception as e:
        logger.warning(f"Could not fetch liabilities: {e}")
    
    logger.info(f"Synced {len(accounts)} accounts for user {user_id}")
    return accounts


# ─── Sync Transactions ─────────────────────────────────────────────────────────

async def sync_transactions(
    user_id: str,
    access_token: str,
    db: AsyncIOMotorClient,
    days_back: int = 90
):
    client = get_plaid_client()
    
    start_date = (datetime.now() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    end_date = datetime.now().strftime("%Y-%m-%d")
    
    options = TransactionsGetRequestOptions(count=500)
    request = TransactionsGetRequest(
        access_token=access_token,
        start_date=start_date,
        end_date=end_date,
        options=options
    )
    
    response = client.transactions_get(request)
    transactions = response["transactions"]
    total = response["total_transactions"]
    
    # Paginate if needed
    while len(transactions) < total:
        options = TransactionsGetRequestOptions(offset=len(transactions), count=500)
        request = TransactionsGetRequest(
            access_token=access_token,
            start_date=start_date,
            end_date=end_date,
            options=options
        )
        response = client.transactions_get(request)
        transactions.extend(response["transactions"])
    
    # Upsert all transactions
    ops = []
    for txn in transactions:
        doc = {
            "plaid_transaction_id": txn["transaction_id"],
            "account_id": txn["account_id"],
            "user_id": user_id,
            "amount": txn["amount"],
            "date": txn["date"],
            "name": txn["name"],
            "merchant_name": txn.get("merchant_name"),
            "category": txn.get("category", []),
            "category_id": txn.get("category_id"),
            "pending": txn["pending"],
            "payment_channel": txn.get("payment_channel"),
        }
        ops.append({
            "filter": {"plaid_transaction_id": txn["transaction_id"]},
            "update": {"$set": doc},
            "upsert": True
        })
    
    if ops:
        for op in ops:
            await db.transactions.update_one(op["filter"], op["update"], upsert=op["upsert"])
    
    logger.info(f"Synced {len(transactions)} transactions for user {user_id}")
    return len(transactions)


# ─── Recurring Transaction Detection ──────────────────────────────────────────

async def detect_recurring_charges(user_id: str, db: AsyncIOMotorClient) -> list[dict]:
    """
    Find all recurring charges — subscriptions, memberships, fees.
    Returns list with amount, merchant, frequency, and last_seen.
    """
    pipeline = [
        {"$match": {"user_id": user_id, "amount": {"$gt": 0}}},
        {"$group": {
            "_id": "$merchant_name",
            "count": {"$sum": 1},
            "amounts": {"$push": "$amount"},
            "dates": {"$push": "$date"},
            "avg_amount": {"$avg": "$amount"},
        }},
        {"$match": {"count": {"$gte": 2}}},  # at least 2 occurrences
        {"$sort": {"avg_amount": -1}},
    ]
    
    cursor = db.transactions.aggregate(pipeline)
    recurring = []
    
    async for doc in cursor:
        amounts = doc["amounts"]
        # Detect amount increases
        if len(amounts) >= 2:
            latest = sorted(zip(doc["dates"], amounts))[-1][1]
            previous = sorted(zip(doc["dates"], amounts))[-2][1]
            increased = latest > previous
            increase_amount = round(latest - previous, 2) if increased else 0
        else:
            increased = False
            increase_amount = 0
        
        recurring.append({
            "merchant": doc["_id"],
            "monthly_amount": round(doc["avg_amount"], 2),
            "annual_cost": round(doc["avg_amount"] * 12, 2),
            "occurrences": doc["count"],
            "price_increased": increased,
            "increase_amount": increase_amount,
            "increase_annual": round(increase_amount * 12, 2),
        })
    
    return recurring
