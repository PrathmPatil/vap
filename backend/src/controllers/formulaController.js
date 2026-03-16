import { runFormulaEngineService } from "../services/formulaService.js";

export const runFormulaEngine = async (req, res) => {
  try {
    const result = await runFormulaEngineService();

    return res.status(200).json({
      success: true,
      data: result.data,
      message: result.message,
    });
  } catch (error) {
    console.error("Controller Error:", error);

    return res.status(500).json({
      success: false,
      message: "Formula engine failed",
      error: error.message,
    });
  }
};