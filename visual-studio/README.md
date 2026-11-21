# LW Visual Studio — MVP 0.2

LW Video Director 的独立实验工作台。保留 React/TypeScript、Vite、Remotion Player/Renderer、Three.js、SVG/Canvas 架构，Originals 仍只有五个组件。根目录 Skill、Python 分析工具和既有 MG 工程未修改。第二轮视觉验收暂评分 88 分；0.2.0 已完成本地发布前检查，当前作为 GitHub PR 预览版等待代码审核，不自动合并或创建正式 Release。

## 安装与运行

推荐 Node.js 24 LTS；使用 Node.js 22 时需 22.14+。视频渲染需要 Chrome 及可用 WebGL。本次在 Windows 10.0.26200、Node 24.22.1 上验证。准确依赖由 package-lock.json 锁定：React 19.2.0、TypeScript 5.9.3、Vite 7.3.8、Remotion/Player/Three 4.0.545、Three.js 0.180.0、React Three Fiber 9.4.0。

```powershell
cd visual-studio
npm ci
npm run dev
```

打开 http://127.0.0.1:4173 。仅监听本机。Windows 默认使用标准位置 Chrome，可用 `LW_BROWSER` 覆盖路径。系统字体影响中英文效果，本次中文验证使用本机微软雅黑/宋体；没有捆绑商业字体文件。

## Originals

选择五个原创组件之一；调整入场/停留/退场、内容、主题和该组件的其他参数，再播放或拖动时间轴。总时长是三个阶段之和。

| 编号 | 0.2 实现 | 特殊输入 |
|---|---|---|
| TYPE-001 | 中文/长文本自适应排版、分行揭示、主题节奏 | 标题最多 160 字符，副标题最多 180 |
| TRANS-001 | 两个真实画面的主题化遮罩交接 | PNG/JPEG/WebP，每张 ≤3MB；contain/cover；默认使用当前主题的原创 SVG 场景 |
| CAM-001 | 真实 3D 相机缓动、PBR、程序环境反射、光照、深度景深 | 半径、环绕、缩放、环境光、金属度、粗糙度、焦平面、光圈；极端缩放自动增加实际半径避免裁切 |
| INFO-001 | 正负数据共用标尺，条形/数字同步 | 1–6 项 JSON `[{"label":"北区","value":46.5}]`、单位和来源；默认仍明确标注为演示数据 |
| LIGHT-001 | 帧驱动扫描、锁定停留、退场，主题化网格和材质 | 中文标题、光强和独立时序 |

“导出 MP4”生成真实 H.264、1280×720、30fps、无音轨视频，完成后提供下载链接。上传图片仅发送给本机服务，无外部上传。当前转场接收静态画面，不提供双视频流/音轨交接。

## References

切换 References 使用同一搜索框；再按 Motion Prompt/FredTalk 与类别筛选。官方目录是检索元数据，不是已安装数量。每个条目独立显示来源、官方链接、许可、本地状态、渲染状态与制作候选资格。

- Motion Prompt：固定版本 240 条；MP-001 已保存 MIT 源码并完成参数适配、动态 Player 和真实 MP4 渲染。可调播放速度与缩放，保留作者署名和原作品配色。
- MP-002：按需获取已测试，只有源码，未适配/渲染，不能进入制作候选。
- FredTalk：432 条官方目录记录；可播放官方 URL 提供的视频，保持 metadata-only/non-executable。没有抓取会员源码，没有把视频或品牌素材当作可执行源工程。

按需获取公开 MIT 条目：`node scripts/fetch-reference.mjs MP-003`。下载不会自动执行或升级状态；需要独立适配、渲染和审阅。其他来源接口、许可范围与来源哈希见 [双库说明](DUAL-LIBRARY.md)、[第三方声明](external/THIRD_PARTY_NOTICES.md)。

## 开发结构与验证

`src/catalog/manifest.json` 集中定义参数标签、类型、范围、默认值、可编辑字段与五组件元数据；UI/React 注册表/服务端校验均复用。只需另绑定 React 实现，不再向服务端另加编号白名单。`src/catalog/search.mjs` 统一服务两库检索和技术制作候选；未完成条目保持隔离。主题规范见 [Style Engine](STYLE-ENGINE.md)。

```powershell
npm run build
npm test  # 自动管理独立测试服务器，无需预先启动工作台
npm run render -- CAM-001
$env:LW_REVIEW_DIR='test-results/v02-r3'
node tests/verify-v02.mjs
node tests/custom-inputs.mjs
python -B tests/audit-v02.py # 需要原项目已有 PyAV/NumPy/Pillow
```

验证脚本输出为可再生成产物，请使用新的输出目录保护既有审阅证据。0.1 原始素材、0.2 视频、15 张主题组合帧、极端参数/输入测试、截图和失败记录已另行归档，本次发布前摘要见 [RELEASE-CHECKS.md](RELEASE-CHECKS.md)；历史完整日志/失败记录保存在独立本地验收资料中，不打包进源码。

## 当前边界

技术检查不替代发布授权。没有增加新的原创组件；没有云渲染、多轨、音频、项目持久化。任务状态保存在本地进程内，服务重启后不恢复。主题依赖本机字体，其他 OS/GPU 尚未验证。Three.js 基础色受真实光照/材质影响，不能要求最终每个像素等于 HEX。所有主题/组件有定点渲染检查，未穷举所有参数组合。预览/导出同帧做过视觉对照，3D 界面导出与独立渲染哈希一致，但未宣称所有组合逐像素一致。

视频在循环播放时回到首帧，包含退场，未承诺无缝循环。完整构建仍有 Remotion Player `use client` 提示和约 1.93MB 初始 JS 体积提示，不影响本地构建成功；尚未做代码拆分或跨设备性能基准。Remotion 商业使用按其官方许可确认适用条件。


## 最终验收修复：可重复测试

要求 Node.js 22.14+（或兼容新版）、npm。全新克隆后进入 visual-studio：

```sh
npm ci
npm test
```

`npm test` 依次生产构建、纯单元测试、API 集成测试，不需要预先运行开发服务器。`npm run test:unit` 不启动服务器；`npm run test:api` 自动启动独立随机端口服务器、运行 tests/api、关闭该进程，失败时返回非零。测试服务器禁用 HMR，不占用开发工作台的端口；启动超时 30 秒、测试超时 60 秒、关闭超时 10 秒。日志直接输出至终端，可重定向保存。

三主题真实视频需要独立的 Chrome/Remotion 渲染环境（与前述快速自动测试区分）：

```sh
node tests/render-transition-themes.mjs test-results/theme-transitions
```

输出目录若已有同名 MP4 将拒绝覆盖。六张原创 SVG 为默认主题演示场景，仅 sample:before/after 随主题解析；用户上传的 PNG/JPEG/WebP 保持原始输入。遮罩进度、形状、双画面交接及适配核心逻辑保持不变。

预览工具栏「适应窗口」放大工作区，「标准布局」返回；「全屏预览」使用浏览器全屏 API，Esc 退出。各模式共享同一 Player、播放/暂停、逐帧按钮与时间轴。参数控制在窄屏和扩展模式下通过抽屉访问。画面保持 16:9，小屏可滚动；工作台配色独立于动画主题，采用黑灰白和暖橙点缀。


## 0.2.0 发布前安全复查（2026-11-21）

Vite 从 7.2.2 升级并精确锁定至兼容的 7.3.8，package-lock.json 同步更新。该版本覆盖本次审计发现的风险；修复版本依据官方公告：https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7 。实际 npm ci、npm test、npm audit 已执行；15 项快速测试通过，审计 0 漏洞（仅代表执行时 npm 公告数据库结果）。五个原创组件和 MP-001 均经实际 API 渲染/下载回归。

发布应使用此目录 package.json 的 0.2.0 版本和现有锁文件，不使用旧验收快照。根仓库的通用媒体/JSON 忽略规则由本目录 .gitignore 对必要源码文件显式豁免；依赖、构建产物、缓存、exports 和旧测试输出继续排除。全部外部来源、许可和本地可执行状态保存在 external/，不得遗漏。
