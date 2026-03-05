import express from "express";
import cors from "cors";
import { initSchema } from "./db";
import authRoutes from "./routes/auth";
import employeeRoutes from "./routes/employees";
import payrollRoutes from "./routes/payroll";
import exportRoutes from "./routes/export";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api", exportRoutes);

function start() {
  initSchema();

  app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

start();
