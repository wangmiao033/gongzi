import { InputNumber, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

export interface PayrollRow {
  employee_id: number;
  employee_name: string;
  attendance_days?: number;
  base_salary?: number;
  real_salary?: number;
  allowance?: number;
  bonus?: number;
  social_security_pension?: number;
  social_security_medical?: number;
  social_security_unemployment?: number;
  housing_fund?: number;
  other_deduction?: number;
  tax?: number;
  net_salary?: number;
}

export interface PayrollTableProps {
  rows: PayrollRow[];
  onChange: (rows: PayrollRow[]) => void;
}

export function PayrollTable({ rows, onChange }: PayrollTableProps) {
  const updateCell = (id: number, key: keyof PayrollRow, value: number | null) => {
    const next = rows.map((row) =>
      row.employee_id === id
        ? {
            ...row,
            [key]: value ?? undefined,
          }
        : row
    );
    onChange(next);
  };

  const numberCol = (key: keyof PayrollRow, title: string): ColumnsType<PayrollRow>[number] => ({
    title,
    dataIndex: key,
    render: (value, record) => (
      <InputNumber
        value={value as number | undefined}
        onChange={(val) => updateCell(record.employee_id, key, val as number | null)}
        style={{ width: "100%" }}
      />
    ),
  });

  const columns: ColumnsType<PayrollRow> = [
    { title: "员工", dataIndex: "employee_name", fixed: "left", width: 120 },
    numberCol("attendance_days", "出勤天数"),
    numberCol("base_salary", "基本工资"),
    numberCol("real_salary", "实际工资"),
    numberCol("allowance", "补贴"),
    numberCol("bonus", "奖金"),
    numberCol("social_security_pension", "养老"),
    numberCol("social_security_medical", "医疗"),
    numberCol("social_security_unemployment", "失业"),
    numberCol("housing_fund", "公积金"),
    numberCol("other_deduction", "其他扣款"),
    numberCol("tax", "个税(如需手动调整)"),
    {
      title: "实发",
      dataIndex: "net_salary",
      render: (value) => value ?? "",
      fixed: "right",
    },
  ];

  const summaryRow = () => {
    const sum = (key: keyof PayrollRow) =>
      rows.reduce((acc, row) => acc + (Number(row[key]) || 0), 0);

    return (
      <Table.Summary fixed>
        <Table.Summary.Row>
          <Table.Summary.Cell index={0}>合计</Table.Summary.Cell>
          <Table.Summary.Cell index={1}>{sum("attendance_days")}</Table.Summary.Cell>
          <Table.Summary.Cell index={2}>{sum("base_salary")}</Table.Summary.Cell>
          <Table.Summary.Cell index={3}>{sum("real_salary")}</Table.Summary.Cell>
          <Table.Summary.Cell index={4}>{sum("allowance")}</Table.Summary.Cell>
          <Table.Summary.Cell index={5}>{sum("bonus")}</Table.Summary.Cell>
          <Table.Summary.Cell index={6}>{sum("social_security_pension")}</Table.Summary.Cell>
          <Table.Summary.Cell index={7}>{sum("social_security_medical")}</Table.Summary.Cell>
          <Table.Summary.Cell index={8}>{sum("social_security_unemployment")}</Table.Summary.Cell>
          <Table.Summary.Cell index={9}>{sum("housing_fund")}</Table.Summary.Cell>
          <Table.Summary.Cell index={10}>{sum("other_deduction")}</Table.Summary.Cell>
          <Table.Summary.Cell index={11}>{sum("tax")}</Table.Summary.Cell>
          <Table.Summary.Cell index={12}>{sum("net_salary")}</Table.Summary.Cell>
        </Table.Summary.Row>
      </Table.Summary>
    );
  };

  return (
    <Table<PayrollRow>
      rowKey="employee_id"
      dataSource={rows}
      columns={columns}
      pagination={false}
      scroll={{ x: 1200 }}
      summary={summaryRow}
    />
  );
}

