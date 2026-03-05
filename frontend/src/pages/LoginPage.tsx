import { Button, Card, Form, Input, message } from "antd";
import axios from "axios";

interface LoginFormValues {
  username: string;
  password: string;
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();

  const onFinish = async (values: LoginFormValues) => {
    try {
      const res = await axios.post("/api/auth/login", values);
      const { token } = res.data;
      localStorage.setItem("token", token);
      window.location.href = "/employees";
    } catch (err) {
      console.error(err);
      message.error("登录失败，请检查用户名和密码");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card title="工资管理系统登录" style={{ width: 360 }}>
        <Form form={form} onFinish={onFinish} layout="vertical" initialValues={{ username: "admin" }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              登录
            </Button>
          </Form.Item>
          <div style={{ fontSize: 12, color: "#888" }}>首次登录默认密码：admin123</div>
        </Form>
      </Card>
    </div>
  );
}

