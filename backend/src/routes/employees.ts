import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", (_req, res) => {
  const rows = db
    .prepare("SELECT id, name, hire_date, position, status FROM employees ORDER BY id DESC")
    .all();
  res.json(rows);
});

router.post("/", (req, res) => {
  const { name, hire_date, position, status } = req.body as {
    name?: string;
    hire_date?: string;
    position?: string;
    status?: string;
  };

  if (!name) {
    return res.status(400).json({ message: "姓名必填" });
  }

  const result = db
    .prepare(
      "INSERT INTO employees (name, hire_date, position, status) VALUES (@name, @hire_date, @position, @status)"
    )
    .run({
      name,
      hire_date: hire_date ?? null,
      position: position ?? null,
      status: status ?? "active",
    });

  const row = db
    .prepare("SELECT id, name, hire_date, position, status FROM employees WHERE id = ?")
    .get(result.lastInsertRowid) as unknown;

  res.status(201).json(row);
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ message: "无效的ID" });
  }

  const { name, hire_date, position, status } = req.body as {
    name?: string;
    hire_date?: string;
    position?: string;
    status?: string;
  };

  const existing = db
    .prepare("SELECT id FROM employees WHERE id = ?")
    .get(id) as { id: number } | undefined;
  if (!existing) {
    return res.status(404).json({ message: "员工不存在" });
  }

  db.prepare(
    `
      UPDATE employees
      SET name = COALESCE(@name, name),
          hire_date = COALESCE(@hire_date, hire_date),
          position = COALESCE(@position, position),
          status = COALESCE(@status, status)
      WHERE id = @id
    `
  ).run({
    id,
    name: name ?? null,
    hire_date: hire_date ?? null,
    position: position ?? null,
    status: status ?? null,
  });

  const row = db
    .prepare("SELECT id, name, hire_date, position, status FROM employees WHERE id = ?")
    .get(id) as unknown;

  res.json(row);
});

export default router;

