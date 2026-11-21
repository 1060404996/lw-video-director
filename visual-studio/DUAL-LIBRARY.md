# 双视觉库与制作候选

- LW Originals：仅保留五个自研编号，源码位于 `src/components/`，主题独立于组件。`src/catalog/manifest.json` 集中登记组件、默认参数、类型、范围与控件标签；React 注册表、参数面板和服务器校验都读取它。
- LW References：`external/catalog.json` 独立存储来源元数据，源码按 provider 分目录。Motion Prompt 240 条与 FredTalk 432 条来自固定版本官方目录，条目数量不是已安装组件数。
- `src/catalog/search.mjs` 是统一查询实现，UI 和 `GET /api/catalog?q=&library=&provider=&category=` 共用；`GET /api/production-candidates` 只返回可执行且渲染通过的条目，不限制必须选择自研来源。
- `external/THIRD_PARTY_NOTICES.md`、各 provider 的 LICENSE 和 provenance 保留作者、范围、来源版本与 SHA256。FredTalk 在线预览只表示可以看，不表示本机源码安装或素材再分发授权。会员源码不抓取、不绕过认证。

## 状态

| 状态 | 可看 | 可执行 | 制作候选 |
|---|---|---|---|
| metadata-only | 官方在线样例/视频可用时 | 否 | 否 |
| source-downloaded | 源码已下载，尚未适配验证 | 否 | 否 |
| source-adapted-verified + renderStatus passed | 本地动态 Player 与 MP4 | 是 | 是，仍需项目视觉审阅 |

本次 MP-001 获得 MIT 源码并实际适配、渲染；MP-002 按需获取固定版本代码，未适配，明确排除制作候选。其余外部条目不宣称安装。Originals 的技术质量记录在 `src/catalog/quality.json`，用户第二轮视觉验收保持 pending-user；“制作候选”只是技术可用清单，不等于最终视觉批准。

## 按需获取

```powershell
node scripts/fetch-reference.mjs MP-003
```

仅访问已登记的官方固定版本 URL，下载许可证、kit 和单条源码；不覆盖现有源码，下载后仍为不可执行。当前适配器仅 MP-001，新增已下载条目必须单独编写适配并运行真实渲染/审阅才可升级状态。网络读取设超时，Node 网络失败时仅以本机 Python urllib 代理配置重试一次。Python 来自现有项目环境，不自动安装。

获取后重启本地服务并刷新工作台同步目录。新 provider 可添加独立 metadata/source/license 目录，沿同一状态机制接入。实验分支不修改全局 Skill、既有 Python 工具或稳定视频工程。
