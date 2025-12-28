import express from "express";

import { signUp, login, me } from "../controllers/auth.controller";
import { auth } from "../middlewares/auth.middleware";

const router = express.Router();

router.post("/signup", signUp);
router.post("/login", login);
router.get("/me", auth, me);

export default router;
