import { screenerDataServices } from "../services/screenerServices.js";

// screenerDataController
export const screenerDataController = async (req, res) => {
  const symbol = req.params.symbol;
  try {
    const data = await screenerDataServices(symbol);
    res.json({success: true, data});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
