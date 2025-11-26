import { Router } from 'express';
import { requireAuth } from '../shared/middlewares/auth.js';
import * as ctrl from './controller.js';

const router = Router();

// Driver actions
router.post('/trips/start', requireAuth(['driver']), ctrl.startTrip);
router.post('/trips/:tripId/locations', requireAuth(['driver']), ctrl.postLocations);
router.patch('/trips/:tripId/targets/:targetId', requireAuth(['driver']), ctrl.patchTarget);
router.post('/trips/:tripId/end', requireAuth(['driver','admin','superadmin']), ctrl.endTrip);

// Live views
router.get('/live', requireAuth(), ctrl.live);
router.get('/live/mine', requireAuth(['parent']), ctrl.liveMine);

export default router;
