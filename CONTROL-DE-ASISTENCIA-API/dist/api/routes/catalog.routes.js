"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catalog_controller_1 = require("../controllers/catalog.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Departamentos
router.get('/departamentos', auth_middleware_1.authMiddleware, catalog_controller_1.getDepartamentos);
router.get('/departamentos/management', auth_middleware_1.authMiddleware, catalog_controller_1.getDepartamentosManagement);
router.post('/departamentos', auth_middleware_1.authMiddleware, catalog_controller_1.saveDepartamento);
// Grupos Nomina
router.get('/grupos-nomina', auth_middleware_1.authMiddleware, catalog_controller_1.getGruposNomina);
router.get('/grupos-nomina/management', auth_middleware_1.authMiddleware, catalog_controller_1.getGruposNominaManagement);
router.post('/grupos-nomina', auth_middleware_1.authMiddleware, catalog_controller_1.saveGrupoNomina);
// Estatus Asistencia
router.get('/attendance-statuses', auth_middleware_1.authMiddleware, catalog_controller_1.getAttendanceStatuses);
router.get('/attendance-statuses/management', auth_middleware_1.authMiddleware, catalog_controller_1.getAttendanceStatusesManagement);
router.post('/attendance-statuses', auth_middleware_1.authMiddleware, catalog_controller_1.upsertAttendanceStatus);
// Horarios
router.get('/schedules', auth_middleware_1.authMiddleware, catalog_controller_1.getSchedulesCatalog);
router.post('/schedules', auth_middleware_1.authMiddleware, catalog_controller_1.upsertScheduleCatalog);
router.delete('/schedules/:horarioId', auth_middleware_1.authMiddleware, catalog_controller_1.deleteScheduleCatalog);
// Puestos ---
router.get('/puestos', auth_middleware_1.authMiddleware, catalog_controller_1.getPuestos);
router.get('/puestos/management', auth_middleware_1.authMiddleware, catalog_controller_1.getPuestosManagement);
router.post('/puestos', auth_middleware_1.authMiddleware, catalog_controller_1.savePuesto);
// Establecimientos ---
router.get('/establecimientos', auth_middleware_1.authMiddleware, catalog_controller_1.getEstablecimientos);
router.get('/establecimientos/management', auth_middleware_1.authMiddleware, catalog_controller_1.getEstablecimientosManagement);
router.post('/establecimientos', auth_middleware_1.authMiddleware, catalog_controller_1.saveEstablecimiento);
exports.default = router;
