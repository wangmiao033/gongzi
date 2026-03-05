"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const auth_1 = __importDefault(require("./routes/auth"));
const employees_1 = __importDefault(require("./routes/employees"));
const payroll_1 = __importDefault(require("./routes/payroll"));
const export_1 = __importDefault(require("./routes/export"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
});
app.use("/api/auth", auth_1.default);
app.use("/api/employees", employees_1.default);
app.use("/api/payroll", payroll_1.default);
app.use("/api", export_1.default);
function start() {
    (0, db_1.initSchema)();
    app.listen(PORT, () => {
        console.log(`Backend server listening on port ${PORT}`);
    });
}
start();
