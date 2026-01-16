import { AnnouncementsModel } from "../models/index.js";
import { getAnnouncementsService } from "../services/announcementsService.js";


export const getAnnouncementsController = async (req, res) => {
  try {
    // Pass model + query params to service
    const result = await getAnnouncementsService(AnnouncementsModel, req.query);

    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error("❌ Error in getAnnouncementsController:", error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
