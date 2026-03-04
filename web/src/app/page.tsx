"use client";

import { useEffect, useMemo, useState } from "react";

type Employee = {
  id: number;
  name: string;
  department: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
};

type PayrollRecord = {
  id: number;
  month: string;
  employeeName: string;
  department: string;
  shouldPay: number;
  realPay: number;
  note?: string;
};

const initialEmployees: Employee[] = [
  {
    id: 1,
    name: "张三",
    department: "研发部",
    baseSalary: 15000,
    bonus: 2000,
    deduction: 500,
  },
  {
    id: 2,
    name: "李四",
    department: "产品部",
    baseSalary: 13000,
    bonus: 1500,
    deduction: 300,
  },
];

const STORAGE_KEYS = {
  employees: "gongzi_employees",
  records: "gongzi_records",
  authed: "gongzi_authed",
} as const;

export default function Home() {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [month, setMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "employees" | "records">("dashboard");

  const [newEmployee, setNewEmployee] = useState<Omit<Employee, "id">>({
    name: "",
    department: "",
    baseSalary: 0,
    bonus: 0,
    deduction: 0,
  });

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const authed = window.localStorage.getItem(STORAGE_KEYS.authed);
    if (authed !== "1") {
      window.location.href = "/login";
      return;
    }

    try {
      const storedEmployees = window.localStorage.getItem(STORAGE_KEYS.employees);
      const storedRecords = window.localStorage.getItem(STORAGE_KEYS.records);

      const parsedEmployees: Employee[] | null = storedEmployees
        ? JSON.parse(storedEmployees)
        : null;
      const parsedRecords: PayrollRecord[] | null = storedRecords
        ? JSON.parse(storedRecords)
        : null;

      if (parsedEmployees && Array.isArray(parsedEmployees)) {
        setEmployees(parsedEmployees);
        setSelectedEmployeeId(parsedEmployees[0]?.id ?? null);
      } else {
        setEmployees(initialEmployees);
        setSelectedEmployeeId(initialEmployees[0]?.id ?? null);
      }

      if (parsedRecords && Array.isArray(parsedRecords)) {
        setRecords(parsedRecords);
      }
    } catch {
      setEmployees(initialEmployees);
      setSelectedEmployeeId(initialEmployees[0]?.id ?? null);
    } finally {
      setCheckedAuth(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (employees.length === 0) return;
    window.localStorage.setItem(STORAGE_KEYS.employees, JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
  }, [records]);

  const currentMonthRecords = useMemo(
    () => records.filter((r) => r.month === month),
    [records, month]
  );

  const summary = useMemo(() => {
    const totalShouldPay = employees.reduce(
      (sum, e) => sum + e.baseSalary + e.bonus,
      0
    );
    const totalDeduction = employees.reduce((sum, e) => sum + e.deduction, 0);
    const totalRealPay = totalShouldPay - totalDeduction;

    return {
      employeeCount: employees.length,
      totalShouldPay,
      totalDeduction,
      totalRealPay,
    };
  }, [employees]);

  const handleAddEmployee = () => {
    if (!newEmployee.name || !newEmployee.department) return;

    const nextId =
      employees.length === 0
        ? 1
        : Math.max(...employees.map((e) => e.id)) + 1;

    setEmployees((prev) => [...prev, { id: nextId, ...newEmployee }]);
    setNewEmployee({
      name: "",
      department: "",
      baseSalary: 0,
      bonus: 0,
      deduction: 0,
    });
  };

  const handleCreateRecord = () => {
    if (!selectedEmployeeId) return;
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return;

    const shouldPay = employee.baseSalary + employee.bonus;
    const realPay = shouldPay - employee.deduction;

    const nextId =
      records.length === 0
        ? 1
        : Math.max(...records.map((r) => r.id)) + 1;

    setRecords((prev) => [
      ...prev,
      {
        id: nextId,
        month,
        employeeName: employee.name,
        department: employee.department,
        shouldPay,
        realPay,
        note,
      },
    ]);

    setNote("");
    setActiveTab("records");
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    });

  if (!checkedAuth) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              公司内部工资发放系统
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              仅供公司内部使用，数据保存在本机浏览器
              localStorage，可长期查看和修改，建议定期导出备份。
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-500">发放月份</label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
              />
            </div>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(STORAGE_KEYS.authed);
                  window.location.href = "/login";
                }
              }}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
            >
              退出登录
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="w-full lg:w-2/3">
            <nav className="mb-4 flex gap-2 border-b border-zinc-200 pb-2 text-sm">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`rounded-full px-3 py-1 font-medium ${
                  activeTab === "dashboard"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                本月总览
              </button>
              <button
                onClick={() => setActiveTab("employees")}
                className={`rounded-full px-3 py-1 font-medium ${
                  activeTab === "employees"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                员工与薪资
              </button>
              <button
                onClick={() => setActiveTab("records")}
                className={`rounded-full px-3 py-1 font-medium ${
                  activeTab === "records"
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                发放记录
              </button>
            </nav>

            {activeTab === "dashboard" && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">
                      本月应发员工
                    </p>
                    <p className="mt-3 text-2xl font-semibold">
                      {summary.employeeCount}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">
                      本月应发金额
                    </p>
                    <p className="mt-3 text-lg font-semibold">
                      {formatCurrency(summary.totalShouldPay)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">
                      本月扣款合计
                    </p>
                    <p className="mt-3 text-lg font-semibold text-amber-700">
                      {formatCurrency(summary.totalDeduction)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium text-zinc-500">
                      本月实发合计
                    </p>
                    <p className="mt-3 text-lg font-semibold text-emerald-700">
                      {formatCurrency(summary.totalRealPay)}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium">发放记录（{month}）</h2>
                    <span className="text-xs text-zinc-500">
                      共 {currentMonthRecords.length} 条
                    </span>
                  </div>
                  {currentMonthRecords.length === 0 ? (
                    <p className="text-sm text-zinc-500">
                      暂无当前月份的发放记录，请在右侧创建。
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="border-b border-zinc-200 bg-zinc-50">
                          <tr>
                            <th className="px-3 py-2 font-medium text-zinc-500">
                              员工
                            </th>
                            <th className="px-3 py-2 font-medium text-zinc-500">
                              部门
                            </th>
                            <th className="px-3 py-2 font-medium text-zinc-500">
                              应发
                            </th>
                            <th className="px-3 py-2 font-medium text-zinc-500">
                              实发
                            </th>
                            <th className="px-3 py-2 font-medium text-zinc-500">
                              备注
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentMonthRecords.map((r) => (
                            <tr
                              key={r.id}
                              className="border-b border-zinc-100 last:border-0"
                            >
                              <td className="px-3 py-2">{r.employeeName}</td>
                              <td className="px-3 py-2">{r.department}</td>
                              <td className="px-3 py-2">
                                {formatCurrency(r.shouldPay)}
                              </td>
                              <td className="px-3 py-2 text-emerald-700">
                                {formatCurrency(r.realPay)}
                              </td>
                              <td className="px-3 py-2 text-xs text-zinc-500">
                                {r.note || "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "employees" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-medium">员工与薪资信息</h2>
                    <span className="text-xs text-zinc-500">
                      共 {employees.length} 人
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50">
                        <tr>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            姓名
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            部门
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            基础工资
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            奖金
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            扣款
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            实发
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((e) => {
                          const shouldPay = e.baseSalary + e.bonus;
                          const realPay = shouldPay - e.deduction;
                          return (
                            <tr
                              key={e.id}
                              className="border-b border-zinc-100 last:border-0"
                            >
                              <td className="px-3 py-2">{e.name}</td>
                              <td className="px-3 py-2">{e.department}</td>
                              <td className="px-3 py-2">
                                {formatCurrency(e.baseSalary)}
                              </td>
                              <td className="px-3 py-2">
                                {formatCurrency(e.bonus)}
                              </td>
                              <td className="px-3 py-2 text-amber-700">
                                {formatCurrency(e.deduction)}
                              </td>
                              <td className="px-3 py-2 text-emerald-700">
                                {formatCurrency(realPay)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-4">
                  <h3 className="mb-3 text-sm font-medium">新增员工</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">姓名</label>
                      <input
                        type="text"
                        value={newEmployee.name}
                        onChange={(e) =>
                          setNewEmployee((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">部门</label>
                      <input
                        type="text"
                        value={newEmployee.department}
                        onChange={(e) =>
                          setNewEmployee((prev) => ({
                            ...prev,
                            department: e.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">基础工资</label>
                      <input
                        type="number"
                        value={newEmployee.baseSalary}
                        onChange={(e) =>
                          setNewEmployee((prev) => ({
                            ...prev,
                            baseSalary: Number(e.target.value || 0),
                          }))
                        }
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">奖金</label>
                      <input
                        type="number"
                        value={newEmployee.bonus}
                        onChange={(e) =>
                          setNewEmployee((prev) => ({
                            ...prev,
                            bonus: Number(e.target.value || 0),
                          }))
                        }
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-zinc-500">扣款</label>
                      <input
                        type="number"
                        value={newEmployee.deduction}
                        onChange={(e) =>
                          setNewEmployee((prev) => ({
                            ...prev,
                            deduction: Number(e.target.value || 0),
                          }))
                        }
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddEmployee}
                        className="inline-flex w-full items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800"
                      >
                        保存员工
                      </button>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-zinc-500">
                    示例环境中信息只保存在当前浏览器内存，刷新页面后会丢失。生产环境建议接数据库（如
                    MySQL / PostgreSQL）。
                  </p>
                </div>
              </div>
            )}

            {activeTab === "records" && (
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium">全部发放记录</h2>
                  <span className="text-xs text-zinc-500">
                    共 {records.length} 条
                  </span>
                </div>
                {records.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    暂无记录，请先在右侧选择员工并创建发放记录。
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50">
                        <tr>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            月份
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            员工
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            部门
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            应发
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            实发
                          </th>
                          <th className="px-3 py-2 font-medium text-zinc-500">
                            备注
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((r) => (
                          <tr
                            key={r.id}
                            className="border-b border-zinc-100 last:border-0"
                          >
                            <td className="px-3 py-2">{r.month}</td>
                            <td className="px-3 py-2">{r.employeeName}</td>
                            <td className="px-3 py-2">{r.department}</td>
                            <td className="px-3 py-2">
                              {formatCurrency(r.shouldPay)}
                            </td>
                            <td className="px-3 py-2 text-emerald-700">
                              {formatCurrency(r.realPay)}
                            </td>
                            <td className="px-3 py-2 text-xs text-zinc-500">
                              {r.note || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>

          <aside className="w-full space-y-4 lg:w-1/3">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-medium">本月发放操作</h2>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500">选择员工</label>
                  <select
                    value={selectedEmployeeId ?? ""}
                    onChange={(e) =>
                      setSelectedEmployeeId(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                  >
                    {employees.length === 0 && (
                      <option value="">暂无员工，请先新增</option>
                    )}
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}（{e.department}）
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-500">备注（可选）</label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/5"
                    placeholder="例如：已通过银行代发；包含绩效奖金等"
                  />
                </div>

                <button
                  onClick={handleCreateRecord}
                  className="inline-flex w-full items-center justify-center rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
                  disabled={employees.length === 0 || !selectedEmployeeId}
                >
                  生成发放记录
                </button>

                <p className="mt-2 text-xs text-zinc-500">
                  此处仅生成内部记录，不直接发起打款。真实发薪流程建议与财务系统或银行接口对接。
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 text-xs text-zinc-500">
              <p className="font-medium text-zinc-700">部署与权限建议</p>
              <ul className="mt-2 space-y-1 list-disc pl-4">
                <li>
                  将代码推送到 GitHub 仓库
                  后，在 Vercel 中导入该仓库并选择
                  <span className="font-semibold"> Root Directory = web</span>。
                </li>
                <li>
                  这是一个示例版本，如需正式上线，建议：
                  接入登录鉴权（如公司单点登录）、
                  使用正式数据库、
                  全量操作日志与权限管理。
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
