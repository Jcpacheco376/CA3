"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../controllers/employee.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Specific routes first to avoid ID collision
router.get('/permitted', auth_middleware_1.authMiddleware, employee_controller_1.getPermittedEmployees);
router.get('/anniversaries', auth_middleware_1.authMiddleware, employee_controller_1.getAnniversaries);
router.get('/stats', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeStats);
router.get('/birthdays', auth_middleware_1.authMiddleware, employee_controller_1.getBirthdays);
router.get('/:employeeId/photo', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeePhoto); // New endpoint for lazy loading image
router.get('/', auth_middleware_1.authMiddleware, employee_controller_1.getEmployees);
router.post('/', auth_middleware_1.authMiddleware, employee_controller_1.createEmployee);
router.put('/:employeeId', auth_middleware_1.authMiddleware, employee_controller_1.updateEmployee);
router.delete('/:employeeId', auth_middleware_1.authMiddleware, employee_controller_1.deleteEmployee);
router.get('/:employeeId/schedule-pattern', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeSchedulePattern);
router.get('/:employeeId/calendar-schedule', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeCalendarSchedule);
router.get('/:employeeId/profile', auth_middleware_1.authMiddleware, employee_controller_1.getEmployeeProfile);
exports.default = router;
