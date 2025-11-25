import express from "express";
import { fetchIpoData } from "../controllers/ipoController";

const router = express.Router();


router.post("/", fetchNewsData);

export default router;
