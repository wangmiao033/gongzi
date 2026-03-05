import { Layout, Menu } from "antd";
import { Content, Header } from "antd/es/layout/layout";
import { Link, Outlet, useLocation } from "react-router-dom";

const items = [
  { key: "/employees", label: <Link to="/employees">员工管理</Link> },
  { key: "/payroll", label: <Link to="/payroll">工资批次</Link> },
];

export function AppLayout() {
  const location = useLocation();
  const selectedKey =
    items.find((item) => location.pathname.startsWith(item.key))?.key ?? "/employees";

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ display: "flex", alignItems: "center" }}>
        <div style={{ color: "#fff", fontWeight: 600, marginRight: 32 }}>工资管理系统</div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[selectedKey]}
          items={items}
          style={{ flex: 1 }}
        />
      </Header>
      <Content style={{ padding: 24 }}>
        <Outlet />
      </Content>
    </Layout>
  );
}

