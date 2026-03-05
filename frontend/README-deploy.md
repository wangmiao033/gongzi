## 部署与使用说明（Windows 单机）

### 一、环境准备

- 已安装 Node.js（建议 18+ 版本）
- 本项目目录假设为 `H:\\gongzi`

### 二、安装依赖

```bash
cd H:\gongzi\backend
npm install

cd H:\gongzi\frontend
npm install
```

### 三、构建与运行

1. 构建后端：

```bash
cd H:\gongzi\backend
npm run build
```

2. 启动后端服务器（端口默认 4000）：

```bash
cd H:\gongzi\backend
npm run dev
```

或使用构建后的版本：

```bash
npm start
```

3. 启动前端开发服务器（端口默认 5173）：

```bash
cd H:\gongzi\frontend
npm run dev
```

浏览器访问：`http://localhost:5173`

> 首次登录账号：用户名 `admin`，密码 `admin123`。登录成功后会自动为管理员账号设置加密密码。

### 四、打包前端静态文件

如果希望以后通过静态服务器（如 Nginx、IIS）部署前端：

```bash
cd H:\gongzi\frontend
npm run build
```

构建结果会输出到 `dist` 目录，将该目录配置到 Web 服务器即可。

### 五、数据存储与备份

- 所有数据保存在 SQLite 数据库文件：`H:\gongzi\data\payroll.db`
- 备份方式：定期复制整个 `data` 目录到安全位置（移动硬盘、网盘等）
- 恢复方式：停止后端进程后，用备份文件覆盖 `data\payroll.db`，再重新启动后端。

### 六、修改配置

- JWT 密钥：在启动后端前设置环境变量 `JWT_SECRET`，提高安全性。
- 税率等计算规则：在后端 `src/config.ts` 中调整，再重新构建后端。

