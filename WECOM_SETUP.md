# 企业微信考勤配置

本项目通过 Vercel 服务端函数连接企业微信。CorpID 与打卡应用 Secret 不会发送到浏览器，也不能写入仓库。

## 企业微信后台

1. 进入企业微信管理后台的“应用管理”，准备一个自建应用。
2. 在“打卡 → API → 可调用接口的应用”中加入该自建应用。
3. 确认应用可见范围包含需要同步考勤的员工。
4. 记录企业 CorpID，并在后台查看该自建应用的 Secret。不要把 Secret 发到聊天或提交到 GitHub。

## Vercel 环境变量

在 `gongzi` 项目的 Settings → Environment Variables 中添加：

- `WECOM_CORP_ID`：企业 CorpID
- `WECOM_CHECKIN_SECRET`：被允许调用打卡接口的自建应用 Secret

两项均勾选 Production、Preview、Development，保存后重新部署一次。

## 员工映射和同步

1. 在工资系统“员工档案 → 编辑”中填写企业微信 UserID。UserID 必须与企业微信后台完全一致，不是姓名、手机号或邮箱。
2. 进入需要核算的工资月份，点击“同步企业微信考勤”。
3. 核对预览中的出勤、请假、旷工和迟到数据。
4. 勾选需要导入的员工，确认后才会写入当月工资表。

已归档或已发放的工资不会被考勤同步覆盖。

## Koyeb 免费中转（可选）

Koyeb 只负责从固定区域出口调用企业微信。浏览器仍然先访问 Vercel API，Vercel 完成工资账号鉴权后再调用 Koyeb，因此企业微信 Secret 不会出现在网页中。

Koyeb 服务的 Root directory 使用：

```text
relay
```

Builder 选择 Buildpack，启动命令保持默认的 `npm start`。

在 Koyeb Secret / Environment variables 中配置：

- `WECOM_CORP_ID`
- `WECOM_CHECKIN_SECRET`
- `WECOM_RELAY_TOKEN`（至少 32 位随机字符串）

部署成功后，先访问 `/health`，再使用受保护的 `/diagnostics/egress-ip` 查询当前出口 IP，并按企业微信后台要求配置可信 IP。

在 Vercel 中增加：

- `WECOM_RELAY_URL`：Koyeb 服务的 HTTPS 地址，不带末尾斜杠
- `WECOM_RELAY_TOKEN`：与 Koyeb 完全相同的随机令牌

未配置 `WECOM_RELAY_URL` 时，Vercel 会继续使用原来的直连方式，方便在中转服务验收前安全回退。
