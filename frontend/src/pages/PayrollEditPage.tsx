import { Button, Space, message } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import type { PayrollRow } from "../components/PayrollTable";
import { PayrollTable } from "../components/PayrollTable";

interface Employee {
  id: number;
  name: string;
}

export function PayrollEditPage() {
  const { id } = useParams<{ id: string }>();
  const batchId = Number(id);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [employeesRes, itemsRes] = await Promise.all([
          axios.get<Employee[]>("/api/employees", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get<any[]>(`/api/payroll/batches/${batchId}/items`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const itemsByEmployee = new Map<number, any>();
        itemsRes.data.forEach((i) => itemsByEmployee.set(i.employee_id, i));

        const combined: PayrollRow[] = employeesRes.data.map((e) => {
          const item = itemsByEmployee.get(e.id);
          return {
            employee_id: e.id,
            employee_name: e.name,
            attendance_days: item?.attendance_days ?? undefined,
            base_salary: item?.base_salary ?? undefined,
            real_salary: item?.real_salary ?? undefined,
            allowance: item?.allowance ?? undefined,
            bonus: item?.bonus ?? undefined,
            social_security_pension: item?.social_security_pension ?? undefined,
            social_security_medical: item?.social_security_medical ?? undefined,
            social_security_unemployment: item?.social_security_unemployment ?? undefined,
            housing_fund: item?.housing_fund ?? undefined,
            other_deduction: item?.other_deduction ?? undefined,
            tax: item?.tax ?? undefined,
            net_salary: item?.net_salary ?? undefined,
          };
        });

        setRows(combined);
      } catch (err) {
        console.error(err);
        message.error("加载工资表失败");
      } finally {
        setLoading(false);
      }
    };
    if (batchId) {
      load();
    }
  }, [batchId, token]);

  const handleSave = async () => {
    try {
      await axios.post(
        `/api/payroll/batches/${batchId}/items`,
        rows.map((r) => ({
          employee_id: r.employee_id,
          values: {
            attendance_days: r.attendance_days,
            base_salary: r.base_salary,
            real_salary: r.real_salary,
            allowance: r.allowance,
            bonus: r.bonus,
            social_security_pension: r.social_security_pension,
            social_security_medical: r.social_security_medical,
            social_security_unemployment: r.social_security_unemployment,
            housing_fund: r.housing_fund,
            other_deduction: r.other_deduction,
          },
        })),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      message.success("保存成功");
    } catch (err) {
      console.error(err);
      message.error("保存失败");
    }
  };

  if (!batchId) {
    return <div>无效批次ID</div>;
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={handleSave} loading={loading}>
          保存
        </Button>
      </Space>
      <PayrollTable rows={rows} onChange={setRows} />
    </div>
  );
}

