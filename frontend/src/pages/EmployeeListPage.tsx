import { Button, Form, Input, Modal, Select, Space, Table, message } from "antd";
import axios from "axios";
import { useEffect, useState } from "react";

interface Employee {
  id: number;
  name: string;
  hire_date?: string;
  position?: string;
  status: string;
}

export function EmployeeListPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Employee[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form] = Form.useForm<Employee>();

  const token = localStorage.getItem("token");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get<Employee[]>("/api/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      message.error("加载员工列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (record: Employee) => {
    setEditing(record);
    form.setFieldsValue(record);
    setModalOpen(true);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await axios.put(`/api/employees/${editing.id}`, values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("更新成功");
      } else {
        await axios.post("/api/employees", values, {
          headers: { Authorization: `Bearer ${token}` },
        });
        message.success("创建成功");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      if ((err as any).errorFields) return;
      console.error(err);
      message.error("保存失败");
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" onClick={openCreate}>
          新增员工
        </Button>
        <Button onClick={fetchData}>刷新</Button>
      </Space>
      <Table<Employee>
        rowKey="id"
        loading={loading}
        dataSource={data}
        columns={[
          { title: "ID", dataIndex: "id", width: 60 },
          { title: "姓名", dataIndex: "name" },
          { title: "入职时间", dataIndex: "hire_date" },
          { title: "岗位/工种", dataIndex: "position" },
          { title: "状态", dataIndex: "status" },
          {
            title: "操作",
            render: (_, record) => (
              <Button type="link" onClick={() => openEdit(record)}>
                编辑
              </Button>
            ),
          },
        ]}
      />

      <Modal
        title={editing ? "编辑员工" : "新增员工"}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="姓名" rules={[{ required: true, message: "请输入姓名" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="hire_date" label="入职时间">
            <Input placeholder="例如 2023-05-01" />
          </Form.Item>
          <Form.Item name="position" label="岗位/工种">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="状态" initialValue="active">
            <Select
              options={[
                { label: "在职", value: "active" },
                { label: "离职", value: "inactive" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

