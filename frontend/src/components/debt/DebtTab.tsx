import { useEffect } from "react";
import DebtOverview from "./DebtOverview";
import PayoffCalculator from "./PayoffCalculator";
import BalanceTransferSection from "./BalanceTransferSection";
import { useDebtData } from "../../hooks/useDebtData";

export default function DebtTab() {
  const { overview, payoffResult, balanceTransfer, extraPayment, loading, calculating, recalculate } = useDebtData();

  // Auto-calculate on first load if we have debt
  useEffect(() => {
    if (overview && overview.debts.length > 0 && !payoffResult) {
      recalculate(extraPayment);
    }
  }, [overview, payoffResult, recalculate, extraPayment]);

  if (loading) {
    return <p style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: 40 }}>Loading debt data...</p>;
  }

  if (!overview || overview.debts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: "#9ca3af", fontSize: 12, marginBottom: 8 }}>No credit card debt found.</p>
        <p style={{ color: "#6b7280", fontSize: 11 }}>Connect a bank account with credit cards to use the debt manager.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "white" }}>DEBT MANAGER</h3>
        <span style={{ color: "#9ca3af", fontSize: 11 }}>{overview.debts.length} cards</span>
      </div>

      <DebtOverview overview={overview} />
      <PayoffCalculator
        extraPayment={extraPayment}
        payoffResult={payoffResult}
        calculating={calculating}
        onCalculate={recalculate}
      />
      <BalanceTransferSection data={balanceTransfer} />
    </div>
  );
}
