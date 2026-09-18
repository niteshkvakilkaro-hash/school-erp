import { Router } from 'express';
import * as ctrl from '../controllers/website.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadSingle } from '../utils/upload.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/', can('website.manage'), ctrl.get);
router.put('/', can('website.manage'), validate({ body: ctrl.siteSchema }), ctrl.update);

// ---- Photos (slider, gallery, logo, principal) ----
router.post('/media', can('website.manage'), uploadSingle, ctrl.uploadMedia);
router.post('/media/reorder', can('website.manage'), validate({ body: ctrl.reorderSchema }), ctrl.reorderMedia);
router.put('/media/:id', can('website.manage'), validate({ body: ctrl.mediaUpdateSchema }), ctrl.updateMedia);
router.delete('/media/:id', can('website.manage'), ctrl.removeMedia);

export default router;
