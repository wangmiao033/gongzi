"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.get("/", (_req, res) => {
    const rows = db_1.db
        .prepare("SELECT id, name, hire_date, position, status FROM employees ORDER BY id DESC")
        .all();
    res.json(rows);
});
router.post("/", (req, res) => {
    const { name, hire_date, position, status } = req.body;
    if (!name) {
        return res.status(400).json({ message: "姓名必填" });
    }
    const result = db_1.db
        .prepare("INSERT INTO employees (name, hire_date, position, status) VALUES (@name, @hire_date, @position, @status)")
        .run({
        name,
        hire_date: hire_date !== null && hire_date !== void 0 ? hire_date : null,
        position: position !== null && position !== void 0 ? position : null,
        status: status !== null && status !== void 0 ? status : "active",
    });
    const row = db_1.db
        .prepare("SELECT id, name, hire_date, position, status FROM employees WHERE id = ?")
        .get(result.lastInsertRowid);
    res.status(201).json(row);
});
router.put("/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
        return res.status(400).json({ message: "无效的ID" });
    }
    const { name, hire_date, position, status } = req.body;
    const existing = db_1.db
        .prepare("SELECT id FROM employees WHERE id = ?")
        .get(id);
    if (!existing) {
        return res.status(404).json({ message: "员工不存在" });
    }
    db_1.db.prepare(`
      UPDATE employees
      SET name = COALESCE(@name, name),
          hire_date = COALESCE(@hire_date, hire_date),
          position = COALESCE(@position, position),
          status = COALESCE(@status, status)
      WHERE id = @id
    `).run({
        id,
        name: name !== null && name !== void 0 ? name : null,
        hire_date: hire_date !== null && hire_date !== void 0 ? hire_date : null,
        position: position !== null && position !== void 0 ? position : null,
        status: status !== null && status !== void 0 ? status : null,
    });
    const row = db_1.db
        .prepare("SELECT id, name, hire_date, position, status FROM employees WHERE id = ?")
        .get(id);
    res.json(row);
});
exports.default = router;
