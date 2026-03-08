"""
APEX - Plaid Integration Module
Handles account connection, transaction sync, and balance aggregation.
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
from supabase import Client

logger = logging.getLogger(__name__)


# ─── Plaid Client Setup ──────────────────────────────────────────────────────

def get_plaid_client():
    env_map = {
        "sandbox": plaid.Environment.Sandbox,
        "development": plaid.Environment.Sandbox,  # v27 SDK removed Development; use Sandbox
        "production": plaid.Environment.Production,
    }
    config = plaid.Configuration(
        host=env_map.get(os.getenv("PLAID_ENV", "sandbox"), plaid.Environment.Sandbox),
        api_key={
            "clientId": os.getenv("PLAID_CLIENT_ID"),
            "secret": os.getenv("PLAID_SECRET"),
        }
    )
    api_client = plaid.ApiClient(config)
    return plaid_api.PlaidApi(api_client)


# ─── Link Token ───────────────────────────────────────────────────────────────

async def create_link_token(user_id: str) -> str:
    client = get_plaid_client()

    request = LinkTokenCreateRequest(
        products=[
            Products("transactions"),
            Products("liabilities"),
            Products("investments"),
        ],
        client_name="APEX Finance OS",
        country_codes=[CountryCode("US")],
        language="en",
        user=LinkTokenCreateRequestUser(client_user_id=user_id),
        webhook=os.getenv("PLAID_WEBHOOK_URL", "http://localhost:8000/api/plaid/webhook"),
    )

    response = client.link_token_create(request)
    return response["link_token"]


# ─── Exchange Public Token ────────────────────────────────────────────────────

async def exchange_public_token(user_id: str, public_token: str, sb: Client) -> dict:
    client = get_plaid_client()

    exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
    exchange_response = client.item_public_token_exchange(exchange_request)

    access_token = exchange_response["access_token"]
    item_id = exchange_response["item_id"]

    sb.table("plaid_items").insert({
        "user_id": user_id,
        "item_id": item_id,
        "access_token": access_token,
        "institution_id": None,
        "created_at": datetime.utcnow().isoformat(),
    }).execute()

    logger.info(f"Linked Plaid item {item_id} for user {user_id}")
    return {"item_id": item_id, "status": "connected"}


# ─── Sync Accounts ────────────────────────────────────────────────────────────

async def sync_accounts(user_id: str, access_token: str, sb: Client):
    client = get_plaid_client()

    accounts_request = AccountsGetRequest(access_token=access_token)
    accounts_response = client.accounts_get(accounts_request)

    accounts = []
    for acct in accounts_response["accounts"]:
        account_doc = {
            "plaid_account_id": acct["account_id"],
            "user_id": user_id,
            "name": acct["name"],
            "official_name": acct.get("official_name"),
            "type": str(acct["type"]),
            "subtype": str(acct["subtype"]) if acct.get("subtype") else None,
            "balance_current": acct["balances"]["current"],
            "balance_available": acct["balances"].get("available"),
            "balance_limit": acct["balances"].get("limit"),
            "currency": acct["balances"].get("iso_currency_code", "USD"),
            "last_synced": datetime.utcnow().isoformat(),
        }

        sb.table("accounts").upsert(
            account_doc,
            on_conflict="plaid_account_id,user_id"
        ).execute()
        accounts.append(account_doc)

    # Get liabilities for credit cards
    try:
        liabilities_request = LiabilitiesGetRequest(access_token=access_token)
        liabilities_response = client.liabilities_get(liabilities_request)

        for cc in liabilities_response.get("liabilities", {}).get("credit", []):
            # Convert APR objects to plain dicts
            raw_aprs = cc.get("aprs", [])
            aprs = [
                {
                    "apr": float(a.get("apr_percentage", 0)),
                    "type": str(a.get("apr_type", "unknown")),
                }
                for a in raw_aprs
            ] if raw_aprs else []

            sb.table("credit_card_details").upsert({
                "account_id": cc["account_id"],
                "minimum_payment": cc.get("minimum_payment_amount"),
                "next_payment_due_date": str(cc["next_payment_due_date"]) if cc.get("next_payment_due_date") else None,
                "last_statement_balance": cc.get("last_statement_balance"),
                "last_payment_amount": cc.get("last_payment_amount"),
                "last_payment_date": str(cc["last_payment_date"]) if cc.get("last_payment_date") else None,
                "aprs": aprs,
            }, on_conflict="account_id").execute()
    except Exception as e:
        logger.warning(f"Could not fetch liabilities: {e}")

    logger.info(f"Synced {len(accounts)} accounts for user {user_id}")
    return accounts


# ─── Sync Transactions ────────────────────────────────────────────────────────

async def sync_transactions(
    user_id: str,
    access_token: str,
    sb: Client,
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
    for txn in transactions:
        doc = {
            "plaid_transaction_id": txn["transaction_id"],
            "account_id": txn["account_id"],
            "user_id": user_id,
            "amount": txn["amount"],
            "date": str(txn["date"]),
            "name": txn["name"],
            "merchant_name": txn.get("merchant_name"),
            "category": [str(c) for c in txn.get("category", [])],
            "category_id": txn.get("category_id"),
            "pending": txn["pending"],
            "payment_channel": str(txn["payment_channel"]) if txn.get("payment_channel") else None,
        }
        sb.table("transactions").upsert(
            doc,
            on_conflict="plaid_transaction_id"
        ).execute()

    logger.info(f"Synced {len(transactions)} transactions for user {user_id}")
    return len(transactions)


# ─── Recurring Transaction Detection ─────────────────────────────────────────

async def detect_recurring_charges(user_id: str, sb: Client) -> list[dict]:
    """Find all recurring charges via Postgres function."""
    resp = sb.rpc("detect_recurring_charges", {"p_user_id": user_id}).execute()
    return resp.data or []
