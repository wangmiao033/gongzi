import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/batches/:id/export", (req, res) => {
  const batchId = Number(req.params.id);
  if (!Number.isInteger(batchId)) {
    return res.status(400).json({ message: "无效的批次ID" });
  }

  const batch = db
    .prepare("SELECT id, month FROM payroll_batches WHERE id = ?")
    .get(batchId) as { id: number; month: string } | undefined;

  if (!batch) {
    return res.status(404).json({ message: "批次不存在" });
  }

  const rows = db
    .prepare(
      `
      SELECT e.name,
             pi.attendance_days,
             pi.base_salary,
             pi.real_salary,
             pi.allowance,
             pi.bonus,
             pi.social_security_pension,
             pi.social_security_medical,
             pi.social_security_unemployment,
             pi.housing_fund,
             pi.other_deduction,
             pi.tax,
             pi.net_salary
      FROM payroll_items pi
      JOIN employees e ON e.id = pi.employee_id
      WHERE pi.batch_id = ?
      ORDER BY e.id
    `
    )
    .all(batchId) as any[];

  const header = [
    "姓名",
    "出勤天数",
    "基本工资",
    "实际工资",
    "补贴",
    "奖金",
    "养老",
    "医疗",
    "失业",
    "公积金",
    "其他扣款",
    "个税",
    "实发",
  ];

  const csvLines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.attendance_days,
        r.base_salary,
        r.real_salary,
        r.allowance,
        r.bonus,
        r.social_security_pension,
        r.social_security_medical,
        r.social_security_unemployment,
        r.housing_fund,
        r.other_deduction,
        r.tax,
        r.net_salary,
      ]
        .map((v) => (v ?? "").toString())
        .join(",")
    ),
  ];

  const csv = csvLines.join("\n");
  const filename = `payroll-${batch.month}.csv`;

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(filename)}"`
  );
  res.send("\uFEFF" + csv);
});

export default router;

