import { Router } from "express";
import { BalanceSheet, CashFlow, Companies, CompanyFinancials, ProfitLoss, QuarterlyResults, Ratios, Shareholding, UnknownSection } from "../models/index.js";

const router = Router();

router.get("/:symbol", async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = {};

    data.balanceSheet = await BalanceSheet.findAll({ where: { symbol } });
    data.cashFlow = await CashFlow.findAll({ where: { symbol } });
    data.companies = await Companies.findAll({ where: { symbol } });
    data.companyFinancials = await CompanyFinancials.findAll({ where: { symbol } });
    data.ratios = await Ratios.findAll({ where: { symbol } });
    data.unknownSection = await UnknownSection.findAll({ where: { symbol } });
    data.profitLoss = await ProfitLoss.findAll({ where: { symbol } });
    data.quarterlyResults = await QuarterlyResults.findAll({ where: { symbol } });
    data.shareholding = await Shareholding.findAll({ where: { symbol } });

    res.json({ success: true, symbol, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

export default router;
