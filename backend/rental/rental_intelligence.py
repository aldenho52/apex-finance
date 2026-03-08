"""
APEX - Rental Property Intelligence Module
Real P&L, market data, sell vs. hold modeling, tax optimization alerts.
"""

import os
import httpx
import logging
from datetime import datetime, timedelta
from supabase import Client
import anthropic

logger = logging.getLogger(__name__)

RENTCAST_API_KEY = os.getenv("RENTCAST_API_KEY")
ZILLOW_API_KEY = os.getenv("ZILLOW_API_KEY")


# ─── Property Model (flat columns from Postgres) ─────────────────────────────

class RentalProperty:
    def __init__(self, data: dict):
        self.property_id = str(data["id"])
        self.user_id = data["user_id"]
        self.address = data["address"]
        self.purchase_price = data["purchase_price"]
        self.purchase_date = data["purchase_date"]
        self.current_value = data.get("current_value") or data["purchase_price"]

        # Flat mortgage columns (no nesting)
        self.mortgage_balance = data["mortgage_balance"]
        self.mortgage_rate = data["mortgage_rate"]
        self.mortgage_payment = data["mortgage_monthly_payment"]
        self.mortgage_remaining_months = data.get("mortgage_remaining_months", 360)

        # Income
        self.monthly_rent = data["monthly_rent"]
        self.lease_end_date = data.get("lease_end_date")

        # Expenses
        self.insurance_monthly = data.get("insurance_monthly", 0) or 0
        self.property_tax_monthly = data.get("property_tax_monthly", 0) or 0
        self.hoa_monthly = data.get("hoa_monthly", 0) or 0
        self.mgmt_fee_pct = data.get("management_fee_pct", 0) or 0
        self.maintenance_reserve_pct = data.get("maintenance_reserve_pct", 0.01) or 0.01

        # Tax
        self.depreciation_years = 27.5
        self.land_value_pct = data.get("land_value_pct", 0.2) or 0.2


# ─── Mortgage Amortization ────────────────────────────────────────────────────

def get_monthly_pni_split(balance: float, rate: float, payment: float) -> tuple[float, float]:
    monthly_rate = rate / 100 / 12
    interest = round(balance * monthly_rate, 2)
    principal = round(payment - interest, 2)
    return principal, interest


# ─── Monthly P&L Calculation ──────────────────────────────────────────────────

def calculate_monthly_pnl(prop: RentalProperty, owner_income: float = 100000) -> dict:
    principal, interest = get_monthly_pni_split(
        prop.mortgage_balance, prop.mortgage_rate, prop.mortgage_payment
    )

    mgmt_fee = prop.monthly_rent * prop.mgmt_fee_pct / 100
    maintenance_reserve = prop.purchase_price * prop.maintenance_reserve_pct / 12

    total_expenses = (
        prop.mortgage_payment +
        prop.insurance_monthly +
        prop.property_tax_monthly +
        prop.hoa_monthly +
        mgmt_fee +
        maintenance_reserve
    )

    cash_flow = prop.monthly_rent - total_expenses

    depreciable_basis = prop.purchase_price * (1 - prop.land_value_pct)
    annual_depreciation = depreciable_basis / prop.depreciation_years
    monthly_depreciation = annual_depreciation / 12

    if owner_income > 243725:
        marginal_rate = 0.35
    elif owner_income > 191950:
        marginal_rate = 0.32
    elif owner_income > 100525:
        marginal_rate = 0.24
    elif owner_income > 41775:
        marginal_rate = 0.22
    else:
        marginal_rate = 0.12
    monthly_tax_savings = monthly_depreciation * marginal_rate

    effective_monthly_cost = cash_flow + monthly_tax_savings

    equity = prop.current_value - prop.mortgage_balance

    return {
        "gross_rent": prop.monthly_rent,
        "mortgage_total": prop.mortgage_payment,
        "mortgage_principal": principal,
        "mortgage_interest": interest,
        "insurance": prop.insurance_monthly,
        "property_tax": prop.property_tax_monthly,
        "hoa": prop.hoa_monthly,
        "management_fee": round(mgmt_fee, 2),
        "maintenance_reserve": round(maintenance_reserve, 2),
        "total_expenses": round(total_expenses, 2),
        "cash_flow": round(cash_flow, 2),
        "monthly_depreciation": round(monthly_depreciation, 2),
        "monthly_tax_savings": round(monthly_tax_savings, 2),
        "effective_cost": round(effective_monthly_cost, 2),
        "equity": round(equity, 2),
        "equity_buildup_this_month": round(principal, 2),
    }


# ─── Market Data Fetching ─────────────────────────────────────────────────────

async def get_market_rent_estimate(address: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://api.rentcast.io/v1/avm/rent/long-term",
            params={"address": address},
            headers={"X-Api-Key": RENTCAST_API_KEY},
            timeout=10
        )
        data = resp.json()
        return {
            "estimate": data.get("rent"),
            "rent_range_low": data.get("rentRangeLow"),
            "rent_range_high": data.get("rentRangeHigh"),
            "last_updated": datetime.utcnow().isoformat(),
        }


async def get_property_valuation(address: str) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch",
            params={"location": address},
            headers={
                "X-RapidAPI-Key": ZILLOW_API_KEY,
                "X-RapidAPI-Host": "zillow-com1.p.rapidapi.com"
            },
            timeout=10
        )
        data = resp.json()
        properties = data.get("props", [])
        if properties:
            return {
                "zestimate": properties[0].get("zestimate"),
                "appreciation_1yr": properties[0].get("hdpData", {}).get("homeInfo", {}).get("priceChange"),
            }
        return {}


# ─── Sell vs. Hold Model ──────────────────────────────────────────────────────

def sell_vs_hold_analysis(prop: RentalProperty, pnl: dict, market_data: dict) -> dict:
    sale_price = market_data.get("zestimate") or prop.current_value
    selling_costs = sale_price * 0.06
    capital_gains_basis = prop.purchase_price
    capital_gain = sale_price - capital_gains_basis - selling_costs
    cap_gains_tax = max(0, capital_gain * 0.15)

    purchase_date = prop.purchase_date
    if isinstance(purchase_date, str):
        purchase_date = datetime.fromisoformat(purchase_date.replace("Z", "+00:00")).replace(tzinfo=None)
    years_held = (datetime.now() - purchase_date).days / 365
    accumulated_depreciation = (prop.purchase_price * 0.8 / 27.5) * years_held
    depreciation_recapture = accumulated_depreciation * 0.25

    net_proceeds = sale_price - prop.mortgage_balance - selling_costs - cap_gains_tax - depreciation_recapture
    annual_return_if_invested = net_proceeds * 0.07

    annual_cash_flow = pnl["cash_flow"] * 12
    annual_tax_savings = pnl["monthly_tax_savings"] * 12
    annual_appreciation = (market_data.get("appreciation_1yr", 3.0) / 100) * prop.current_value
    annual_equity_buildup = pnl["equity_buildup_this_month"] * 12

    total_annual_return_holding = (
        annual_cash_flow + annual_tax_savings + annual_appreciation + annual_equity_buildup
    )

    annual_delta = total_annual_return_holding - annual_return_if_invested

    if annual_delta > 3000:
        verdict = "HOLD"
        verdict_reason = f"Holding generates ${annual_delta:,.0f}/yr more than selling and investing proceeds."
    elif annual_delta < -5000:
        verdict = "SELL"
        verdict_reason = f"Selling and investing proceeds outperforms holding by ${abs(annual_delta):,.0f}/yr."
    else:
        verdict = "MONITOR"
        verdict_reason = f"Close call — ${abs(annual_delta):,.0f}/yr difference. Watch market conditions."

    return {
        "verdict": verdict,
        "verdict_reason": verdict_reason,
        "sale_scenario": {
            "estimated_sale_price": round(sale_price),
            "selling_costs": round(selling_costs),
            "cap_gains_tax": round(cap_gains_tax),
            "depreciation_recapture": round(depreciation_recapture),
            "net_proceeds": round(net_proceeds),
            "annual_return_if_invested": round(annual_return_if_invested),
        },
        "hold_scenario": {
            "annual_cash_flow": round(annual_cash_flow),
            "annual_tax_savings": round(annual_tax_savings),
            "annual_appreciation": round(annual_appreciation),
            "annual_equity_buildup": round(annual_equity_buildup),
            "total_annual_return": round(total_annual_return_holding),
        },
        "annual_delta": round(annual_delta),
        "last_updated": datetime.utcnow().isoformat(),
    }


# ─── AI-Powered Analysis Narrative ───────────────────────────────────────────

async def generate_rental_narrative(
    prop: RentalProperty, pnl: dict, market_data: dict, analysis: dict
) -> str:
    client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""
You are a real estate financial advisor analyzing a rental property.

Property: {prop.address}
Purchase price: ${prop.purchase_price:,}
Current value: ${market_data.get('zestimate', prop.current_value):,}
Monthly rent collected: ${prop.monthly_rent}
Market rent estimate: ${market_data.get('estimate', 'unknown')}

Monthly P&L:
- Cash flow: ${pnl['cash_flow']:,.0f}/mo
- After tax benefit (depreciation): ${pnl['effective_cost']:,.0f}/mo
- Equity this month: +${pnl['equity_buildup_this_month']}/mo

Sell vs Hold verdict: {analysis['verdict']}
Reason: {analysis['verdict_reason']}

Write a 3-4 sentence plain English summary of this property's financial performance.
Be direct. Include the most important insight and one actionable recommendation.
Do NOT use bullet points. Write in a conversational tone as a trusted advisor would.
"""

    response = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    return response.content[0].text


# ─── Rent Optimization Alert ──────────────────────────────────────────────────

async def check_rent_optimization(prop: RentalProperty, market_data: dict):
    market_rent = market_data.get("estimate")
    if not market_rent:
        return None

    if prop.monthly_rent < market_rent * 0.92:
        gap = market_rent - prop.monthly_rent
        annual_gap = gap * 12
        return {
            "type": "rent_below_market",
            "severity": "warning",
            "title": "Rent Below Market",
            "message": (
                f"Market rent for comparable properties near {prop.address} is "
                f"${market_rent:,.0f}/mo. You're charging ${prop.monthly_rent:,}. "
                f"That's ${gap:.0f}/mo or ${annual_gap:,.0f}/yr you're leaving on the table. "
                f"Raise at your next lease renewal."
            ),
        }
    return None


# ─── Tax Reminders ────────────────────────────────────────────────────────────

def get_rental_tax_reminders(pnl: dict, owner_income: float) -> list[dict]:
    reminders = []
    today = datetime.now()

    if today.month == 3:
        reminders.append({
            "type": "estimated_tax",
            "severity": "warning",
            "title": "Q1 Estimated Tax Due April 15",
            "message": (
                f"Your rental generates ${pnl['monthly_depreciation'] * 3:,.0f} in depreciation "
                f"deductions for Q1. Make sure this is factored into your estimated tax payment. "
                f"Your annual depreciation shield is worth ~${pnl['monthly_tax_savings'] * 12:,.0f} in tax savings."
            )
        })

    if owner_income > 150000:
        reminders.append({
            "type": "passive_loss_limit",
            "severity": "info",
            "title": "Passive Activity Loss Limit",
            "message": (
                f"At ${owner_income:,} income, your rental losses may be subject to the "
                f"$25,000 passive activity loss cap (which phases out above $100K). "
                f"Consult your CPA about a cost segregation study to accelerate depreciation "
                f"and potentially unlock more deductions this year."
            )
        })

    return reminders


# ─── Monthly Report Job ──────────────────────────────────────────────────────

async def run_monthly_rental_report(sb: Client):
    resp = sb.table("properties").select("*").eq("active", True).execute()
    properties = resp.data or []

    for prop_data in properties:
        try:
            prop = RentalProperty(prop_data)

            # Fetch market data
            market_data = await get_market_rent_estimate(prop.address)
            valuation = await get_property_valuation(prop.address)
            market_data.update(valuation)

            # Update property value
            if valuation.get("zestimate"):
                sb.table("properties").update(
                    {"current_value": valuation["zestimate"]}
                ).eq("id", prop_data["id"]).execute()
                prop.current_value = valuation["zestimate"]

            # Get owner income from profile
            profile_resp = sb.table("users_profile").select("owner_income").eq("id", prop.user_id).limit(1).execute()
            owner_income = profile_resp.data[0]["owner_income"] if profile_resp.data else 100000

            # Calculate P&L and analysis
            pnl = calculate_monthly_pnl(prop, owner_income=owner_income)
            analysis = sell_vs_hold_analysis(prop, pnl, market_data)
            narrative = await generate_rental_narrative(prop, pnl, market_data, analysis)

            # Store report
            sb.table("rental_reports").insert({
                "property_id": str(prop_data["id"]),
                "user_id": prop.user_id,
                "month": datetime.utcnow().strftime("%Y-%m"),
                "pnl": pnl,
                "market_data": market_data,
                "analysis": analysis,
                "narrative": narrative,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()

            # Generate alerts
            rent_alert = await check_rent_optimization(prop, market_data)
            tax_alerts = get_rental_tax_reminders(pnl, owner_income)

            all_alerts = [a for a in [rent_alert] + tax_alerts if a]
            for alert in all_alerts:
                sb.table("alerts").insert({
                    "user_id": prop.user_id,
                    "property_id": str(prop_data["id"]),
                    **alert,
                    "created_at": datetime.utcnow().isoformat(),
                    "acknowledged": False,
                }).execute()

            logger.info(f"Rental report generated for {prop.address}")

        except Exception as e:
            logger.error(f"Rental report failed for {prop_data.get('address')}: {e}")
