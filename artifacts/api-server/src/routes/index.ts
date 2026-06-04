import { Router, type IRouter } from "express";
import healthRouter from "./health";
import collageRouter from "./collage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(collageRouter);

export default router;
