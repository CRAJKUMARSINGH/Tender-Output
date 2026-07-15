import { Router, type IRouter } from "express";
import healthRouter from "./health";
import contractorsRouter from "./contractors";
import nitSessionsRouter from "./nit-sessions";
import parseRouter from "./parse";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(contractorsRouter);
router.use(nitSessionsRouter);
router.use(parseRouter);
router.use(documentsRouter);

export default router;
