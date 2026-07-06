import { bootstrapReferenceData } from '../services/pythonSyncService.js';

export const syncMarketHolidays = async (req, res) => {
  try {
    const { syncMarketHolidaysFromPython } = await import(
      '../services/pythonSyncService.js'
    );
    const result = await syncMarketHolidaysFromPython();

    return res.status(200).json({
      success: true,
      message: 'Market holidays synced successfully',
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const syncIpoData = async (req, res) => {
  try {
    const { syncIpoDataFromPython } = await import(
      '../services/pythonSyncService.js'
    );
    const result = await syncIpoDataFromPython();

    return res.status(200).json({
      success: true,
      message: 'IPO data synced successfully',
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const syncReferenceData = async (req, res) => {
  try {
    const result = await bootstrapReferenceData();
    return res.status(200).json({
      success: true,
      message: 'Reference data sync completed',
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
