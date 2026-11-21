# v0.2.0-preview 发布前检查

日期：2026-11-21。版本：`package.json` 与锁文件均为 **0.2.0**，Vite 精确锁定 **7.3.8**。这是待代码审核的预览版，不自动合并 main、创建标签或正式 Release。

## 实际本机结果

- 环境：Windows，Node 24.22.1，npm 11.19.1。
- `npm ci`：成功；停止旧工作台后重试解决 Windows esbuild 文件占用。首次失败日志保留在本地验收归档。
- `npm test`：构建、7 项单元、8 项 API 测试通过；独立测试服务器正常关闭并释放端口。
- `npm audit`：0 漏洞（执行时公告库结果）。未使用强制修复。
- 待发布源码独立副本再次执行 `npm ci`、`npm test`、`npm audit`，全部成功。
- TYPE-001、TRANS-001、CAM-001、INFO-001、LIGHT-001 经真实 API 渲染、下载为 1280×720 / 30fps / 120 帧 MP4；CAM-001 使用真实 Three.js。
- 外部 MP-001 真实适配渲染、下载为 141 帧 MP4；六段视频逐帧解码，尺寸、帧数符合预期，无全黑帧且存在真实动态变化。
- 双库回归：Originals 5 条，Motion Prompt 240 条，FredTalk 432 条；可执行候选只有 5 原创与 MP-001。MP-002 和 FredTalk 未标为可执行。
- 实际 UI 检查：双库切换、中文搜索、MP-001 动态播放、FredTalk 官方视频加载通过；来源与许可独立展示。

Vite 修复依据：[官方安全公告](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7)。原 Skill、Python、LICENSE、外部来源/许可资料保持原样。

## 重复验证

```sh
cd visual-studio
npm ci
npm test
npm audit
```

视频渲染需要单独配置 Chrome/WebGL：`npm run render -- CAM-001`。快速测试不会冒充视频渲染测试；其他 OS/GPU 未完成视频验收。构建仍有 Remotion Player `use client` 忽略和大包提示。完整原始日志、视频和失败记录保存在独立验收资料中，不将生成文件或本机路径写入发布源码。

## 打包边界

仅提交源码、锁文件、原创默认场景及必要来源/许可证。排除依赖目录、缓存、导出、私人视频、密钥和未授权第三方媒体。Motion Prompt 的 MIT 源码和署名随包保留；FredTalk 仅目录元数据与声明，不含会员源码、视频或商业字体。源码目录中的 Python 媒体核验脚本是开发工具，不会覆盖仓库已有 Python 工具。
