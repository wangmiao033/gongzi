"use client";

import { FormEvent, useState } from "react";

const DEFAULT_PASSWORD = "gongzi123";

const PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD && process.env.NEXT_PUBLIC_ADMIN_PASSWORD.length > 0
    ? process.env.NEXT_PUBLIC_ADMIN_PASSWORD
    : DEFAULT_PASSWORD;

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (password === PASSWORD) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("gongzi_authed", "1");
        window.location.href = "/";
      }
    } else {
      setError("密码不正确，请重试。");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white px-6 py-8 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
          工资发放后台登录
        </h1>
        <p className="mt-1 text-xs text-zinc-500">
          仅限内部使用。默认密码为
          <span className="font-mono font-semibold text-zinc-800">
            {" "}
            {DEFAULT_PASSWORD}{" "}
          </span>
          ，建议在部署时通过环境变量
          <span className="font-mono text-[11px]"> NEXT_PUBLIC_ADMIN_PASSWORD </span>
          修改。
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-zinc-600">登录密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
              autoFocus
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
          >
            进入工资后台
          </button>
        </form>
      </div>
    </div>
  );
}

