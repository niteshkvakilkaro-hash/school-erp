import { Router } from 'express';
import * as ctrl from '../controllers/library.controller.js';
import { authenticate, resolveTenant, requireTenant, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();
router.use(authenticate, resolveTenant, requireTenant);

router.get('/summary', can('library.view'), ctrl.summary);
router.get('/categories', can('library.view'), ctrl.categories);

// ---- Books ----
router.get('/books', can('library.view'), validate({ query: ctrl.bookQuerySchema }), ctrl.listBooks);
router.post('/books', can('library.manage'), validate({ body: ctrl.bookSchema }), ctrl.createBook);
router.put('/books/:id', can('library.manage'), validate({ body: ctrl.bookUpdateSchema }), ctrl.updateBook);
router.delete('/books/:id', can('library.manage'), ctrl.removeBook);

// ---- Issue / return ----
router.get('/issues', can('library.view'), validate({ query: ctrl.issueQuerySchema }), ctrl.listIssues);
router.post('/issues', can('library.issue'), validate({ body: ctrl.issueSchema }), ctrl.issue);
router.post('/issues/:id/return', can('library.issue'), validate({ body: ctrl.returnSchema }), ctrl.returnBook);
router.post('/issues/:id/fine-paid', can('library.issue'), ctrl.markFinePaid);

export default router;
