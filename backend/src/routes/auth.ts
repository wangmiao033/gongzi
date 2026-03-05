import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { jwtSecret } from "../config";

const router = Router();

router.post("/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username || !password) {
    return res.status(400).json({ message: "用户名和密码必填" });
  }

  const user = db
    .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
    .get(username) as { id: number; username: string; password_hash: string; role: string } | undefined;

  if (!user) {
    return res.status(401).json({ message: "用户名或密码错误" });
  }

  let passwordValid = false;

  if (!user.password_hash) {
    // 初次登录：使用默认密码 admin123，并立刻写入 hash
    if (password === "admin123") {
      const hash = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
      passwordValid = true;
    }
  } else {
    passwordValid = bcrypt.compareSync(password, user.password_hash);
  }

  if (!passwordValid) {
    return res.status(401).json({ message: "用户名或密码错误" });
  }

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, { expiresIn: "7d" });
  return res.json({ token, username: user.username, role: user.role });
});

export default router;

