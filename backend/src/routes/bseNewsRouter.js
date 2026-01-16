import express from "express";

const router = express.Router();


router.post("/", fetchNewsData);

export default router;
