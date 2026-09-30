# cosbot

一个用 React Native（Expo）写的 **QQ 官方机器人** 客户端：在手机上手动输入内容，以**你自己的机器人账号身份**发到 QQ 群 / 好友单聊 / 频道里。

直连架构：手机 App 自己向 QQ 开放平台申请 token、连 websocket 网关、调用 REST 发消息接口，**不依赖任何后端服务器**。

---

## 它是怎么工作的

参考 [AstrBot](https://github.com/AstrBotDevs/AstrBot) 的 `astrbot/core/platform/sources/qqofficial/` 适配器和 [qq-botpy](https://pypi.org/project/qq-botpy/) 的实现，流程如下：

1. **拿 access_token**：`POST https://bots.qq.com/app/getAppAccessToken`，body 为 `{appId, clientSecret}`。token 有效期约 2 小时，代码里在过期前 60 秒自动刷新。
2. **拿网关地址**：`GET https://api.sgroup.qq.com/gateway/bot`（请求头 `Authorization: QQBot <token>` + `X-Union-Appid`），拿到 wss 地址。
3. **连网关**：建立 websocket，服务端先下发 `op:10 Hello`（含心跳间隔），客户端随即发 `op:2 Identify`（token + intents + shard），收到 `op:0 READY` 就算上线。之后按服务端给的间隔发 `op:1` 心跳，收到 `op:11` ACK。
4. **收消息**：`op:0 Dispatch` 里带事件名，常见的有
   - `GROUP_AT_MESSAGE_CREATE` — QQ 群里 @机器人
   - `C2C_MESSAGE_CREATE` — 好友单聊
   - `AT_MESSAGE_CREATE` — 频道里 @机器人
   - `DIRECT_MESSAGE_CREATE` — 频道私信
   收到的事件里带着 `group_openid` / `openid` / `channel_id` 这些**会话 id**，还有 `msg_id`。
5. **发消息**：REST 接口，按场景分四个：
   | 场景 | 接口 |
   |---|---|
   | QQ 群 | `POST /v2/groups/{group_openid}/messages` |
   | 好友单聊 | `POST /v2/users/{openid}/messages` |
   | 频道子频道 | `POST /channels/{channel_id}/messages` |
   | 频道私信 | `POST /dms/{guild_id}/messages` |

### 被动回复 vs 主动发送

这是用 QQ 官方机器人最容易踩坑的地方，代码里已做区分（聊天页顶部会显示当前处于哪种模式）：

- **被动回复**：带上对方那条消息的 `msg_id`。**5 分钟内有效**，且不受主动消息配额限制。
- **主动推送**：不带 `msg_id`。QQ 平台对主动推送有配额限制（例如频道每个子频道每日 2 条；群/单聊的主动消息也有额度限制）。超配额时接口会返回错误码，App 会把错误显示在气泡下方。

另外，**QQ 要求机器人保持 websocket 在线才能发消息**，所以 App 切后台时连接可能被系统掐掉 —— 代码里监听了 `AppState`，回到前台若发现未在线会自动重连。UI 也做了限制：未在线时发送按钮置灰并提示原因。

---

## 快速开始

### 1. 在 q.qq.com 注册机器人

1. 打开 [q.qq.com](https://q.qq.com) 登录 QQ，**必须是已通过实名认证的 QQ 号**（企业认证账号无法接入）。
2. 进入「群机器人」→ 新建机器人，填名称、简介、头像。
3. 创建成功后进入「开发设置」，拿到 **AppID** 和 **AppSecret**（AppSecret 只在创建时完整展示一次）。
4. 把机器人拉进目标 QQ 群。群里的用户需要 @机器人 才会产生事件（QQ 群机器人默认是 @ 才响应）。
5. 可以先用**沙箱环境**联调：在「开发设置」里获取沙箱配置和测试群 ID，App 设置页把「沙箱环境」开关打开即可。

> 小程序类机器人（仅支持 C2C 和群自选频道）只有部分能力；本 App 按群机器人 + 频道机器人的能力实现。

### 2. 本地跑起来

需要 Node.js 20+（**不用装 Java / Android SDK**）。

```bash
npm install
npm start      # 启动开发服务器
```

> 本项目用 **npm** 而不是 pnpm。原因：Expo/Metro 与 pnpm 的符号链接结构
> 兼容不好，早期遇到过 `Unable to resolve module expo`，换成 npm 扁平
> `node_modules` 后不再出现。
>
> **如果报 `Unable to resolve module expo` 但 `node_modules/expo` 明明存在**，
> 多半是文件权限问题（某些环境 `umask` 是 `0077`，装出来的包是 700/600 权限，
> Metro 的文件扫描会扫不到）。修复：
> ```bash
> chmod -R u+rwX,go+rX node_modules
> ```

然后用 **Expo Go** App 扫码打开（[Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779)）。真机调试建议开开发模式，Metro 更流畅。

> 注意：Expo Go 只在开发时用。想装到手机上长期使用，走下面的 CI 打包。

### 3. 在 App 里配置

打开 App → 右上角「设置」：

- 填 **AppID** 和 **AppSecret** → 点「校验凭证」验证
- 勾选要订阅的事件类型（群/单聊、频道@、频道私信）→ 改动后需重连
- 点「连接」，状态变成绿色的**在线**即成功

回到会话列表：别人 @机器人 或给你发消息后，会话会自动出现。点进去，输入内容 → **发送**，消息就以 bot 身份发出去了。

也可以点「新建会话」手动填入目标 id 发主动消息（用来给还没产生过事件的群/频道发第一条消息 —— 群里让某人先 @一次 bot，从日志里就能拿到 `group_openid`）。

---

## GitHub Actions 打包 APK

仓库里已经带好 [`.github/workflows/build-apk.yml`](.github/workflows/build-apk.yml)，用 EAS 云构建，CI 机器不需要 Android SDK。

**前置配置**

1. 注册/登录 [expo.dev](https://expo.dev) 账号。
2. 在 [expo.dev/accounts/settings/access-tokens](https://expo.dev/accounts/settings/access-tokens) 创建一个 Access Token。
3. 把项目关联到 EAS 项目（生成 `app.json` 里的 `extra.eas.projectId`）——**这步必须做**，否则 CI 里的 `eas build` 会尝试交互式登录并失败。在项目根目录跑一次：

   ```bash
   npx eas-cli@latest init
   # 按提示登录，选择组织，会自动往 app.json 写入 extra.eas.projectId
   ```

   完成后 `app.json` 里应出现：

   ```json
   "extra": { "eas": { "projectId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" } }
   ```

   把这个改动一并提交。
4. 打开 GitHub 仓库 → `Settings` → `Secrets and variables` → `Actions` → `New repository secret`：
   - Name: `EXPO_TOKEN`
   - Value: 第 2 步拿到的 token

**触发构建**

- 手动：在 `Actions` 页选 `Build Android APK` → `Run workflow`，选 `preview` 或 `production` profile。
- 打 tag：`git tag v1.0.0 && git push origin v1.0.0` 会自动用 `preview` profile 构建。

构建完成后，在 workflow 运行的 Summary/Artifacts 里下载 APK（[build-info](https://expo.dev) 对应页面可看构建历史）。

**build profile 说明**（见 `eas.json`）

| profile | 产物 | 用途 |
|---|---|---|
| `preview` | APK | 直接装手机，最常用 |
| `production` | AAB | 上架应用市场，自动递增 versionCode |
| `development` | APK（含 dev client） | 需要配合 `expo-dev-client`，日常不用 |

如果 APK 上架需要自己的签名，配置好 `android/keystore.properties` 后 EAS 会自动使用：

```
MYAPP_UPLOAD_STORE_FILE=./cosbot.keystore
MYAPP_UPLOAD_KEY_ALIAS=cosbot
MYAPP_UPLOAD_STORE_PASSWORD=...
MYAPP_UPLOAD_KEY_PASSWORD=...
```

---

## 项目结构

```
index.js                     入口（registerRootComponent）
App.tsx                      根组件 + 轻量路由（会话列表 / 新建会话 / 聊天 / 设置）
src/
  qq/
    protocol.ts              接口域名、intents 位掩码、场景类型、@ 标记与时间戳解析
    token.ts                 access_token 获取与自动刷新
    api.ts                   REST 接口封装（发消息、取网关、取频道等）
    gateway.ts               websocket 网关：identify / 心跳 / resume / 指数退避重连
  store.ts                   zustand 全局状态：配置、会话、消息历史、日志、前台重连
  ui/
    kit.tsx                  基础组件（按钮、卡片、输入框、状态徽章、主题色）
    SessionListScreen.tsx    会话列表
    ChatScreen.tsx           聊天页，输入内容以 bot 身份发送
    NewSessionScreen.tsx     手动新建会话（指定 id 发主动消息）
    SettingsScreen.tsx       凭证、Intents、连接状态、运行日志
eas.json                     EAS 构建配置
.github/workflows/           GitHub Actions 打包
```

数据持久化在 AsyncStorage（`cosbot-state-v1`）：AppID/AppSecret、会话列表、消息历史（每个会话保留最近 200 条）。**凭证只存在你自己的手机里**，不会上传到任何第三方服务器 —— 但也意味着换手机要重新填一次。

## 已知限制

- v1 只支持**纯文本**消息，不发图片/文件（QQ 富媒体需要分片上传接口）。
- 目标 id 需要先获得（群里 @一次 bot，或手动填）。
- 频道主动推送每日 2 条上限是 QQ 平台限制，代码层面无法绕过。
- App 长时间在后台时系统可能持续断连，回到前台会自动重连，但可能出现短暂延迟。

## 参考

- [AstrBot qqofficial 适配器](https://github.com/AstrBotDevs/AstrBot/blob/master/astrbot/core/platform/sources/qqofficial/qqofficial_platform_adapter.py)
- [QQ 开放平台文档](https://bot.q.qq.com/wiki/)
- [qq-botpy](https://pypi.org/project/qq-botpy/)
