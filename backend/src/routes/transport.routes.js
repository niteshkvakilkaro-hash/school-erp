import { Router } from 'express';
import * as ctrl from '../controllers/transport.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/summary', can('transport.view'), ctrl.summary);

// ---- Vehicles ----
router.get('/vehicles', can('transport.view'), ctrl.listVehicles);
router.post('/vehicles', can('transport.manage'), validate({ body: ctrl.vehicleSchema }), ctrl.createVehicle);
router.put('/vehicles/:id', can('transport.manage'), validate({ body: ctrl.vehicleUpdateSchema }), ctrl.updateVehicle);
router.delete('/vehicles/:id', can('transport.manage'), ctrl.removeVehicle);

// ---- Routes + stops ----
router.get('/routes', can('transport.view'), ctrl.listRoutes);
router.post('/routes', can('transport.manage'), validate({ body: ctrl.routeSchema }), ctrl.createRoute);
router.put('/routes/:id', can('transport.manage'), validate({ body: ctrl.routeUpdateSchema }), ctrl.updateRoute);
router.delete('/routes/:id', can('transport.manage'), ctrl.removeRoute);
router.post('/routes/:id/stops', can('transport.manage'), validate({ body: ctrl.stopSchema }), ctrl.addStop);
router.put('/stops/:stopId', can('transport.manage'), validate({ body: ctrl.stopUpdateSchema }), ctrl.updateStop);
router.delete('/stops/:stopId', can('transport.manage'), ctrl.removeStop);

// ---- Students ----
router.get('/riders', can('transport.view'), validate({ query: ctrl.riderQuerySchema }), ctrl.listRiders);
router.post('/riders', can('transport.manage'), validate({ body: ctrl.assignSchema }), ctrl.assignStudent);
router.delete('/riders/:studentId', can('transport.manage'), ctrl.unassignStudent);

export default router;
