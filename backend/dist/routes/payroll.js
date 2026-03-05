"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const payrollService_1 = require("../services/payrollService");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get("/batches", (_req, res) => {
    const rows = db_1.db
        .prepare("SELECT id, month, created_at FROM payroll_batches ORDER BY month DESC")
        .all();
    res.json(rows);
});
router.post("/batches", (req, res) => {
    const { month } = req.body;
    if (!month) {
        return res.status(400).json({ message: "月份必填，例如 2026-03" });
    }
    const now = new Date().toISOString();
    const result = db_1.db
        .prepare("INSERT INTO payroll_batches (month, created_at) VALUES (?, ?)")
        .run(month, now);
    const row = db_1.db
        .prepare("SELECT id, month, created_at FROM payroll_batches WHERE id = ?")
        .get(result.lastInsertRowid);
    res.status(201).json(row);
});
router.get("/batches/:id/items", (req, res) => {
    const batchId = Number(req.params.id);
    if (!Number.isInteger(batchId)) {
        return res.status(400).json({ message: "无效的批次ID" });
    }
    const rows = db_1.db
        .prepare(`
      SELECT pi.*, e.name AS employee_name
      FROM payroll_items pi
      JOIN employees e ON e.id = pi.employee_id
      WHERE pi.batch_id = ?
      ORDER BY e.id
    `)
        .all(batchId);
    res.json(rows);
});
router.post("/batches/:id/items", (req, res) => {
    const batchId = Number(req.params.id);
    if (!Number.isInteger(batchId)) {
        return res.status(400).json({ message: "无效的批次ID" });
    }
    const items = req.body;
    const tx = db_1.db.transaction(() => {
        var _a;
        db_1.db.prepare("DELETE FROM payroll_items WHERE batch_id = ?").run(batchId);
        const stmt = db_1.db.prepare(`
      INSERT INTO payroll_items (
        batch_id,
        employee_id,
        attendance_days,
        base_salary,
        real_salary,
        allowance,
        bonus,
        social_security_pension,
        social_security_medical,
        social_security_unemployment,
        housing_fund,
        other_deduction,
        tax,
        net_salary
      )
      VALUES (
        @batch_id,
        @employee_id,
        @attendance_days,
        @base_salary,
        @real_salary,
        @allowance,
        @bonus,
        @social_security_pension,
        @social_security_medical,
        @social_security_unemployment,
        @housing_fund,
        @other_deduction,
        @tax,
        @net_salary
      )
    `);
        for (const item of items) {
            const calc = (0, payrollService_1.calculateItem)(item.values);
            stmt.run({
                batch_id: batchId,
                employee_id: item.employee_id,
                attendance_days: (_a = item.values.attendance_days) !== null && _a !== void 0 ? _a : null,
                ...calc,
            });
        }
    });
    tx();
    res.json({ message: "保存成功" });
});
exports.default = router;
