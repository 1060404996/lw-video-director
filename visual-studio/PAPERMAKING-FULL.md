# 造纸术全片 · 第二轮交付（mist-blue-paper 主题 + 四道工序可连续观看样片）

本轮范围就是用户给的 A–F 六项。下面每一节都写「做到了什么 / 证据在哪 / 没做到什么」，未验证的一律不进结论。

---

## 1. 结论先行

- 有一条 **27.267 秒、1920×1080、30fps、可从头看到尾** 的真实成片：`exports/papermaking-full-27s.mp4`（5 镜，口播 + 字幕 + 41 条音效，四道工序走完「捣」「抄」两道新镜头）。
- 新主题 **`mist-blue-paper`** 已落地为可配置主题（色板 + 半透纸面 + 分层视差青山背景），换主题只改 `meta.theme` 与 `meta.backdrop`，镜头组件不用动。
- 两处新桥接 **intoMortar / intoScoop** 沿用 V3 的「纤维形态连续转场」语言：同一个纤维体从上一镜的结束状态荡进下一镜的主体，不做整段交叉溶解。
- 11 秒 V3 基准的三镜（PAPER-001 / MATERIAL-001 / SOAK-001）**构图、运动、文字节奏、桥接点未改**，只做了主题色迁移与背景替换。
- 外部组件库只交付 **统一参数接口 + 四态清单**，六类里仅「音效事件映射」到已验证态；Lottie / 角色骨骼 / 第三方卡片仍是未接入，不许当已实现宣传。

---

## 2. 成片参数与产物

| 项 | 值 |
| --- | --- |
| 文件 | `visual-studio/exports/papermaking-full-27s.mp4` |
| 时长 | 27.267 s（818 帧 @30fps，ffprobe 报 27.300，差 1 帧级封装余量） |
| 画幅 / 帧率 | 1920×1080 / 30fps / h264 |
| 音轨 | AAC 48 kHz 立体声，渲染后 `loudnorm` 归一到 −16 LUFS |
| 体积 / 码率 | 6.96 MB / ≈2.04 Mbps |
| sha256 | `0410BB46333465DB6A9D19A0FF31FD8DE875ED3614D6998D63EEE351396E3F42`（同 `qa-papermaking/sha.txt`） |
| 渲染耗时 | 182 s（本机 i5-9300H / 16G / GTX1650，Chrome 软件合成） |

渲染命令（可复现）：

```
cd visual-studio
npx tsc --noEmit
node scripts/direct.mjs projects/papermaking-full/project.json --out exports/papermaking-full-27s.mp4
```

---

## 3. 主题 `mist-blue-paper`（A）

色板落在 `src/components/papermaking/palette.ts` 的 `MIST`，主题壳落在 `src/styles/themes.ts`：

| 用途 | 值 |
| --- | --- |
| 背景 `bg` | `#E8EEF0` |
| 纸面 / 宣纸白 `paperHi` | `#F8F7F2`（纸面以 `#F8F7F2` 派生半透层） |
| 青灰 `panel` / 山脊中调 | `#CBD9DF` |
| 深青蓝 `fg` / 墨 | `#193447` |
| 辅助青蓝 `muted` | `#537B87` |
| 铜色 `accent` | `#B78456` |

配套的三件事：

1. **半透纸面** `paperBackdrop(pal, theme)`：mist 下返回「radial + linear」双层纸面，字区（左上）实、右下与下缘逐步透，青山才能从纸底透出来；archive 主题仍返回实心纸。
2. **分层视差青山** `src/components/backdrop/MistMountains.tsx`：4 道正弦叠加山脊（depth 0.18 → 0.9，远山几乎不动、近山跟得多）+ 5 条漂移雾带 + 细颗粒；只在 `meta.backdrop === 'mist-mountains'` 时于 scenes 之前渲染，**不铺整张参考图**。
3. **可配置入口**：`meta.theme` / `meta.backdrop` / `meta.backdropParallax` / `meta.backdropHaze` 四个字段，任意工程可用，不写死在本主题内。

已知限制：在 1920 画布上，`contentScale`（让画面避开字幕条）把场景内容缩到约 80% 宽，左右各约 15% 露出的是背景层而不是纸面，视觉上像「一张纸放在雾里」；山脊在纸面最实的区域几乎看不见。按「克制」的设计取向保留，但如果要更强的青绿山水存在感，需要改纸面遮罩曲线或让青山参与 `contentScale`，属于下一轮的事。

---

## 4. 五镜结构（B）

| 镜 | 组件 | 编号 | 时间轴 | 时长 | 口播实测 | 转场 | 纤维桥 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| s01 | 纤维成纸 + 标题 | PAPER-001 | 0.000–3.933 | 3.933 s | 3.744 s | cut | — |
| s02 | 四原料标本 | MATERIAL-001 | 3.433–8.033 | 4.600 s | 3.888 s | fade 0.5 | toMaterials 0.70 s |
| s03 | 水槽剖面浸泡 | SOAK-001 | 7.533–11.633 | 4.100 s | 3.408 s | fade 0.5 | intoVat 0.60 s |
| s04 | 石臼舂捣 | POUND-001（新） | 11.033–18.367 | 7.333 s | 6.528 s | fade 0.6 | intoMortar 0.60 s |
| s05 | 竹帘抄纸 | SCOOP-001（新） | 17.767–27.267 | 9.500 s | 8.688 s | fade 0.6 | intoScoop 0.65 s |

时间重叠 = 转场时长的一半（`prevOverlap` 15/15/18/18 帧），不是硬叠 0.5 s，所以字幕起点与口播起点对得上。

**两个新镜头的视觉表达目的（按要求逐个写明）**

- **s04 石臼舂捣**：要解释「捣不是敲一下，是把纤维束反复打断」。所以画面只有三件事——杵的起落、臼的受压、浆里的纤维变短；七次循环里杵的抬升高度、臼体压缩、浆点飞溅、涟漪、纤维长度全部同一个节拍驱动，右侧只留三行标注（石臼 / 木杵 / 浆细度）和一个随落下进位的 HIT 计数，不铺任何信息图表。
- **s05 竹帘抄纸**：要解释「一抄就是一层纸膜，厚薄全靠手」。动作链是「斜插入水 → 荡匀 → 起帘 → 成膜 → 滴水」，帘子在水下被水色压暗、起帘后膜上纤维沿帘向排布，避免做成「一块白板浮在水上」。

**桥接点**（V3 语言，未改）：

- `toMaterials`：纸面纤维收束成束，落进四件标本的纤维拖尾。
- `intoVat`：束纤维沉入水槽，化成水里悬浮的单根纤维。
- `intoMortar`（新）：水槽里的纤维被带出，从左侧荡进臼口，落进浆面。
- `intoScoop`（新）：石臼浆面里的纤维从臼口荡出，横落到竹帘水面。

---

## 5. 原稿与音频资产索引（C）

### 5.1 唯一原稿

| 文件 | 说明 |
| --- | --- |
| `projects/papermaking-full/approved-script.md` | 用户定稿原文的规范化存档（11 段逐字 + 事实核对 + 改动记录 + 使用约定） |
| `projects/papermaking-full/approved-script.json` | 同一份原稿的机读版，`meta.scriptFile` 指向它 |
| 母本出处 | `C:\...\paper-making\papermaking-package-horizontal\papermaking-script-full.md`（用户 2026-11-21 定稿，唯一 approved 来源） |

原稿第 11 段评论钩子「一张纸，四道工序，两千年没变过。Codex 画的，怎么样？我这些视频，都是剪辑 skill 帮我自动剪的。有需要的评论区留言哦！」按约定原样保留，本轮**未进片**（全片只走到第三道工序）。

### 5.2 音频资产

| 文件 | 时长 | 文本 | 进片 |
| --- | --- | --- | --- |
| `assets/vo-full-source.mp3` | 83.664 s | 母版（用户提供的整条录音） | **否** |
| `assets/vo-s01.mp3` | 3.744 s | 两千年前，一张纸，要经过四道工序。 | s01 |
| `assets/vo-s02.mp3` | 3.888 s | 原料就四样，树皮、麻头、破布、渔网。 | s02 |
| `assets/vo-s03.mp3` | 3.408 s | 第一道，泡。泡到一撕就碎。 | s03 |
| `assets/vo-s04.mp3` | 6.528 s | 第二道，捣。捣成浆，捣得越细，纸越平。捣不细，纸上全是疙瘩，写字都费劲。 | s04 |
| `assets/vo-s05.mp3` | 8.688 s | 第三道，抄。竹帘往水槽里一抄，捞起来，就是一层薄薄的纸膜。厚了写不动，薄了会破，全凭手感。 | s05 |

每条配音旁的 `vo-sNN.json` 是侧车：`text / voice / engine / rate / duration / chunks / synthesizedAt`。

**生成参数**：本机配音服务 `http://127.0.0.1:7788`，引擎 `qwen`，音色「老王3.0_紧凑版」（私有音色 id，只写本机工程与侧车，不入库、不上公网），`rate = 1`，单 chunk 合成。

**母版与逐镜的关系（未解，必须如实说明）**：`vo-full-source.mp3` 83.664 s 是整条录音，silencedetect（noise −34 dB / d 0.35 s）只在 51.454 / 58.226 / 59.740 / 62.242 / 70.348 s 检出 5 个长停顿，切不出 11 段，所以本轮时间轴一律用逐镜 TTS，母版仅作为素材存档。全片以「逐镜 TTS」为准。

**逐句 WAV 没做**：现有最细粒度是「逐镜」（5 条），不是「逐句」。要做逐句必须按句重配或接 ASR 切分，本轮没做，也不拿 SRT 时间码假装逐句音频。

---

## 6. 字幕时间码（8 条，各 2 行）

| # | 入 → 出 | 文本 |
| --- | --- | --- |
| 1 | 00:00.000 → 00:03.794 | 两千年前，一张纸，／要经过四道工序。 |
| 2 | 00:03.933 → 00:07.871 | 原料就四样，树皮、麻头、／破布、渔网。 |
| 3 | 00:08.033 → 00:11.491 | 第一道，泡。／泡到一撕就碎。 |
| 4 | 00:11.633 → 00:15.055 | 第二道，捣。捣成浆，／捣得越细，纸越平。 |
| 5 | 00:15.105 → 00:18.211 | 捣不细，纸上全是疙瘩，／写字都费劲。 |
| 6 | 00:18.367 → 00:21.229 | 第三道，抄。／竹帘往水槽里一抄， |
| 7 | 00:21.279 → 00:23.948 | 捞起来，／就是一层薄薄的纸膜。 |
| 8 | 00:23.998 → 00:27.105 | 厚了写不动，薄了会破，／全凭手感。 |

导出件：`build/papermaking-full/subtitles.srt`（标准 SRT，可直接导入剪映 `import-srt`）。

断行口径：`breakCaption` 判 `fitsTwo`（两行装得下才放一条），装不下按标点重排、按字数比例分时长。曾误用 `breakCaption().length > 2` 当溢出判据（该函数永远 ≤2 行，会把整段并成 1 条），已改为逐块判定。

---

## 7. 新增通用组件清单（可复用，不是只给这一条片子）

| 组件 / 模块 | 路径 | 通用性 | 状态 |
| --- | --- | --- | --- |
| `paperPalette()` / `paperBackdrop()` | `src/components/papermaking/palette.ts` | 纸艺主题色板 + 半透纸面，任何纸/纤维题材可用 | 已渲染验证 |
| `MistMountains` | `src/components/backdrop/MistMountains.tsx` | 分层视差 + 雾带背景，`theme/parallax/haze/grain` 四个参数 | 已渲染验证 |
| `FiberBridge` | `src/components/papermaking/FiberBridge.tsx` | 纤维形态连续转场，`kind` 扩到 4 种（`toMaterials / intoVat / intoMortar / intoScoop`），每种配 streaks / 拖尾封顶 / water 阈值 / 光柱 | 已渲染验证（4 种都用过） |
| `POUND-001` 石臼舂捣 | `src/components/papermaking/PoundMortar.tsx` | 舂捣类动作镜头（杵—臼—浆循环，`hits` 可调） | 已渲染验证 |
| `SCOOP-001` 竹帘抄纸 | `src/components/papermaking/SheetScoop.tsx` | 抄纸 / 捞纸 / 起帘成膜 | 已渲染验证 |
| `splitSceneCues()` | `src/project/timeline.mjs` | 长句自动拆成 ≤2 行字幕并按比例分配时长 | 已渲染验证（8 条全 2 行无截断） |
| 音效合成 `make-sfx.mjs` | `scripts/make-sfx.mjs` | 代码合成音效库，`--only` 增量、`--skip-stats` 不重算统计；修掉 `fiber_rustle`/`pulp_fold` 的 O(n²) 包络重建 | 已渲染验证（24 条，peak −14 dBFS） |
| 素材同步 `syncAsset` | `scripts/direct.mjs` | 把工程引用的本地图/音复制进 `public/projects/<slug>/` 并改写路径；本轮补上 `params.materials[]`，修掉「渲完才发现 404 破图」 | 已渲染验证 |

**下一个不同主题的视频怎么复用**：改 `meta.slug / theme / backdrop` → 换 `palette.ts` 里一套色板（或新增主题）→ 镜头 id 仍从 catalog 挑 → 口播走 `narration_tts.mjs` 逐镜合成 → `direct.mjs` 出片。组件不带主题硬编码色（三既有镜 55 处硬编码色已迁到 `pal.*`）。

---

## 8. 外部组件接口层（D）

- 合同：`src/components/external/contract.ts`（`ExternalSlot` / `ExternalAdapter` / `assertSlot` / `pickRenderable` / 四态标签）。
- 清单：`production/external-adapters.json`。
- 安全区：`x 102–1178 / y 60–580`，越界 `assertSlot` 直接抛错；每个槽必须给 `fallbackComponent`，外部组件挂了不许黑屏；`pickRenderable` 只放行 `verified` 及以上，`declared / wired` 一律不渲染。

| 能力 | 适配器 | 状态 | 说明 |
| --- | --- | --- | --- |
| SVG 图形动画 | inline-svg-react | 未接入 | 本仓镜头本身就是内联 SVG，可直接吃 slot；外部库的动画节拍必须换成 `useCurrentFrame` 驱动 |
| Lottie | lottie-web | 未接入 | 方案定了：canvas 渲染器 + 手动 seek，不走自带时钟；json 需 <800 KB |
| 图像分层 | layered-png-parallax | 已接入 | 当前山体是程序生成矢量；换成位图分层时 slot 与视差参数不变，未出帧 |
| 动态卡片 | mg-card-inline | 已接入 | 走既有 infographics；外部 H5 卡进来要剥掉自带阴影/圆角/字体 |
| 角色动画 | none | 未接入 | 优先 2D 剪影 + 局部摆动；形象权与版权未确认，不进公共仓 |
| 音效事件映射 | sfx-timeline | 已渲染验证 | `project.json` 的 `sfx[{name, at, gain}]` 即事件映射，音效名必须在 `public/sfx/manifest.json` 里，lint 会拦 |

`licensed` 一栏为空：本轮没有任何外部素材完成授权结清，不写「具备发布许可」。

---

## 9. 渲染日志与 QA

- 日志：`logs/render-full.log`（首轮，含 4 张素材 404）、`logs/render-full-2.log`（修路径后）、`logs/render-full-3.log`（终版，含 `loudnorm` 结果）。
- 抽帧：`qa-papermaking/v2-*.png`（成片直抽）、`fix*-*.png`（单帧复核）。
- 已核验：
  - `npx tsc --noEmit` 0 错（`tsc1..tsc5.txt` 全空）；
  - lint 通过：5 场景 / 27.267 s / 字幕 8 条 0 warn / 音效 41 个；
  - ffprobe：1920×1080 / 30fps / h264 + aac 48k 立体声 / 27.30 s；
  - 抽帧复核：s01 标题层叠、s02 四标本（修 404 后正常）、s03 水槽剖面、s04 杵臼与浆、s05 入水与起帘成膜，字幕均压在条内、未遮主体；
  - 音频归一：`loudnorm` 到 −16 LUFS（首次渲完未归一，本轮已加）。
- 首轮真出的问题（留档）：`params.materials[].src` 没走 `syncAsset`，成片里四张标本是 404 破图——**截图看不出来，渲完整条才发现**。这是本轮最有价值的一次 QA 教训：截图过关 ≠ 成片过关，必须从 mp4 反抽帧。

---

## 10. 未完成 / 未验证（不许含糊）

1. **全片没做完**：按 11 段原稿，只做到第 3 段（第三道工序）。晒纸、蔡伦与时间线、竹简与纸对比、传播路线、结尾评论钩子五段未开始，hook 段是否独立成镜前置也未定。
2. **镜头数与 bridges 尚未按 11 段重划**：现在 5 镜是「四道工序」的压缩读法，不是最终分镜表。
3. **s01–s03 沿用 V3 已验收的压缩读法口播**（文字未改写），与完整原稿逐句版有偏差，已在 `approved-script.md` 登记 TODO：全片扩写版要按整句重配。
4. **逐句 WAV 未做**（见 5.2）；母版 83.664 s 与逐镜 TTS 合计的关系未验证，全片以逐镜为准。
5. **外部组件仅到「接口 + 四态清单」**：Lottie、角色骨骼、第三方卡片库都没有真实接入，也没有一条外部素材完成授权结清。
6. **视觉仍需返修**：s04 臼体偏「一块蓝色塑料」，s05 水槽偏「玻璃缸」、帘子起帘后像悬空贴片，山脊在纸面实区近乎不可见；V3 继承的约 15% 左右留白（`contentScale` 副作用）与渐变带状痕迹仍在。
7. **只验过 16:9**：9:16 竖屏构图与安全区未实渲。
8. **没有平台自动发布、没有「搬运去重」**，导出与发布都留给人在剪映/平台侧完成（按项目规则第 10 条）。

---

## 11. 与 V3 基准的关系（可回溯）

- V3 成片：`exports/papermaking-v3-11s.mp4`，sha256 `A9ADF7B1…4060F`，提交 `7bdfbbb`（`feature/production-v0.3`）。
- 本轮：V3 三镜的组件代码仅做「主题色迁移 + 背景替身」，**分镜节奏、文字层级、两处 FiberBridge 参数、wipe 7% 羽化、拖尾封顶（横 110 px / 竖 58 px）均未改**。
- 新增两镜 + 两个新桥接 kind + 主题 + 接口层，全部在 `feature/production-v0.3` 之后的新分支上，未动 `main`，未合并 PR #4 / #5。
