import { useEffect } from "react";
import DebtOverview from "./DebtOverview";
import PayoffCalculator from "./PayoffCalculator";
import BalanceTransferSection from "./BalanceTransferSection";
import { useDebtData } from "../../hooks/useDebtData";
import { colors, fontSizes } from "../../lib/theme";

export default function DebtTab() {
  const { overview, payoffResult, balanceTransfer, extraPayment, loading, calculating, recalculate } = useDebtData();

  useEffect(() => {
    if (overview && overview.debts.length > 0 && !payoffResult) {
      recalculate(extraPayment);
    }
  }, [overview, payoffResult, recalculate, extraPayment]);

  if (loading) {
    return <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, textAlign: "center", padding: 40 }}>Loading debt data...</p>;
  }

  if (!overview || overview.debts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <p style={{ color: colors.textSecondary, fontSize: fontSizes.small, marginBottom: 8 }}>No credit card debt found.</p>
        <p style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>Connect a bank account with credit cards to use the debt manager.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: fontSizes.small, fontWeight: 700, letterSpacing: "0.1em", color: colors.textPrimary }}>DEBT MANAGER</h3>
        <span style={{ color: colors.textTertiary, fontSize: fontSizes.caption }}>{overview.debts.length} cards</span>
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
