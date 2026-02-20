import { Router } from 'express';
import { getAllEvents, upsertEvent, deleteEvent, getEventTypes, countMatchingEmployees } from '../controllers/calendar-events.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/types', getEventTypes);           // Catálogo de tipos de evento
router.post('/count-employees', countMatchingEmployees); // Conteo de empleados por filtros
router.get('/', getAllEvents);
router.post('/', upsertEvent);                 // Upsert handles both create and update
router.delete('/:id', deleteEvent);

export default router;

