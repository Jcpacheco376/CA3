"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/api/routes/index.ts
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const catalog_routes_1 = __importDefault(require("./catalog.routes"));
const attendance_routes_1 = __importDefault(require("./attendance.routes"));
const employee_routes_1 = __importDefault(require("./employee.routes"));
const schedule_routes_1 = __importDefault(require("./schedule.routes"));
const report_routes_1 = __importDefault(require("./report.routes"));
const incidents_routes_1 = __importDefault(require("./incidents.routes"));
const payroll_routes_1 = __importDefault(require("./payroll.routes"));
const router = (0, express_1.Router)();
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/roles', role_routes_1.default);
router.use('/catalogs', catalog_routes_1.default);
router.use('/attendance', attendance_routes_1.default);
router.use('/employees', employee_routes_1.default);
router.use('/schedules', schedule_routes_1.default);
router.use('/reports', report_routes_1.default);
router.use('/incidents', incidents_routes_1.default);
router.use('/payroll', payroll_routes_1.default);
exports.default = router;
