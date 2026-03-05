import { Button, Space, Table, message } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface PayrollBatch {
  id: number;
  month: string;
  created_at: string;
}

export function PayrollBatchListPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PayrollBatch[]>([]);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get<PayrollBatch[]>("/api/payroll/batches", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      message.error("加载工资批次失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const createBatch = async () => {
    const month = prompt("请输入月份，例如 2026-03");
    if (!month) return;
    try {
      const res = await axios.post<PayrollBatch>(
        "/api/payroll/batches",
        { month },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      message.success("创建成功");
      navigate(`/payroll/${res.data.id}`);
    } catch (err) {
      console.error(err);
      message.error("创建失败");
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={createBatch}>
          新建工资批次
        </Button>
        <Button onClick={fetchData}>刷新</Button>
      </Space>
      <Table<PayrollBatch>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "ID", dataIndex: "id", width: 60 },
          { title: "月份", dataIndex: "month" },
          { title: "创建时间", dataIndex: "created_at" },
          {
            title: "操作",
            render: (_, record) => (
              <Button type="link" onClick={() => navigate(`/payroll/${record.id}`)}>
                编辑
              </Button>
            ),
          },
        ]}
      />
    </>
  );
}

