"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const config_1 = require("../config");
const router = (0, express_1.Router)();
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: "用户名和密码必填" });
    }
    const user = db_1.db
        .prepare("SELECT id, username, password_hash, role FROM users WHERE username = ?")
        .get(username);
    if (!user) {
        return res.status(401).json({ message: "用户名或密码错误" });
    }
    let passwordValid = false;
    if (!user.password_hash) {
        // 初次登录：使用默认密码 admin123，并立刻写入 hash
        if (password === "admin123") {
            const hash = bcryptjs_1.default.hashSync(password, 10);
            db_1.db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
            passwordValid = true;
        }
    }
    else {
        passwordValid = bcryptjs_1.default.compareSync(password, user.password_hash);
    }
    if (!passwordValid) {
        return res.status(401).json({ message: "用户名或密码错误" });
    }
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, config_1.jwtSecret, { expiresIn: "7d" });
    return res.json({ token, username: user.username, role: user.role });
});
exports.default = router;
