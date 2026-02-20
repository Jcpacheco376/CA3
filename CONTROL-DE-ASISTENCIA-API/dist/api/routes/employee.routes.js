"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../controllers/employee.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Specific routes first to avoid ID collision
router.get('/stats', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeStats);
router.get('/:employeeId/photo', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeePhoto); // New endpoint for lazy loading image
router.get('/', auth_middleware_1.authMiddleware, employee_controller_1.getEmployees);
router.post('/', auth_middleware_1.authMiddleware, employee_controller_1.createEmployee);
router.put('/:employeeId', auth_middleware_1.authMiddleware, employee_controller_1.updateEmployee);
router.delete('/:employeeId', auth_middleware_1.authMiddleware, employee_controller_1.deleteEmployee);
router.get('/:employeeId', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeProfile); // Order matters: specific routes first
router.get('/:employeeId/profile', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeProfile);
exports.default = router;
