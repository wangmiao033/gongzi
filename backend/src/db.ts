import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbFilePath = path.join(__dirname, "..", "..", "data", "payroll.db");

// Ensure data directory exists
const dataDir = path.dirname(dbFilePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(dbFilePath);

export function initSchema() {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'staff'))
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hire_date TEXT,
      position TEXT,
      status TEXT NOT NULL DEFAULT 'active'
    );

    CREATE TABLE IF NOT EXISTS payroll_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payroll_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      attendance_days REAL,
      base_salary REAL,
      real_salary REAL,
      allowance REAL,
      bonus REAL,
      social_security_pension REAL,
      social_security_medical REAL,
      social_security_unemployment REAL,
      housing_fund REAL,
      other_deduction REAL,
      tax REAL,
      net_salary REAL,
      FOREIGN KEY (batch_id) REFERENCES payroll_batches(id) ON DELETE CASCADE,
      FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // Ensure there is at least one admin user with default credentials
  const adminCountRow = db.prepare("SELECT COUNT(*) as count FROM users").get() as {
    count: number;
  };

  if (adminCountRow.count === 0) {
    // Default admin: admin / admin123 (password hash will be set later in auth setup)
    db.prepare(
      "INSERT INTO users (username, password_hash, role) VALUES (@username, @password_hash, @role)"
    ).run({
      username: "admin",
      password_hash: "",
      role: "admin",
    });
  }
}
