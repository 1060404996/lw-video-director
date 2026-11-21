# LW 外部资源适配 POC · 第一轮与第二轮兼容性扩展

状态：独立真实 MP4 技术验证通过；关键帧已查看，连续运动审片及真人听感验收尚未完成。这是 6 秒资源接入测试，不是造纸术主片。

## 隔离与已读基线

独立分支 `feature/resource-adapters-poc` 从 main `0a08171658711f331de445e28a0d9418fb30fb79` 建立，只新增本目录。没有基于、写入或合并 `feature/production-v0.3`，不改整片时间轴、TTS、样片、主工作台 UI、生产 registry 或全局 Skill，不合并 main。

已核对：main 的五个 Originals（TYPE-001、TRANS-001、CAM-001、INFO-001、LIGHT-001）、quality、registry、theme tokens、MP-001 适配器、LW References catalog/provenance 及第三方声明。MP-001 是已验证适配；MP-002 下载不等于生产适配；FredTalk 元数据/预览不授予素材使用权。

- Draft #4 `feature/skill-production-workflow`：`4d10fcd361eaf44f51b3b83f52b551232d3bd212`，以 main 为基线，制作规范、选材门禁、episode 模板和 preflight。
- Draft #5 `feature/lw-asset-engine`：`5fe4ad4214d562c4926503b5239e9cec07621289`，以 #4 为基线。assetId、权利 scopes、哈希、使用清单与 FFmpeg/PyAV 执行适配器；意图评分依赖人工准备的语义夹具。
- 本 POC 不依赖 #4/#5 合并。使用它们的来源/许可/实测分离原则；没有调用其生产时间轴或把 POC 写成生产能力。

## 运行

在本目录执行，Node 实测版本见 evidence/render.json。先安装 Python 的 `av numpy Pillow`（精确实测版本见 evidence/environment.json）。

```sh
npm ci
python generate-audio.py
npm test
npm run typecheck
npm run render -- evidence/run-01
python verify.py evidence/run-01
```

Windows 默认使用已安装 Chrome；其他平台请用 `LW_BROWSER` 指定兼容浏览器路径。输出目录内已有 MP4 时拒绝覆盖。首次安装/打包可能需要网络；实际渲染的 JSON、SVG、音频均为本地资源，无 CDN 或远程字体。

`npm audit` 本轮检查为 0 漏洞，见 evidence/test-results.txt；这不表示未来版本或其他工程没有漏洞。package-lock.json 固定依赖及 registry integrity。独立 package 避免改动主工作台的 lockfile。

## 可复用 API

入口 `src/adapters.tsx`，React 19 + Remotion 4.0.545。

| API | 参数与行为 |
|---|---|
| IconMotion | `name: droplets / paper`，`theme`、`size`、`strokeWidth`、`startFrame`、`durationFrames`、`motion: draw / reveal / pulse`。SVG 按当前帧计算，无 CSS 计时器。POC 使用 draw 和 reveal；pulse 暂仅实现，未做独立 MP4 验证。|
| StableLottie | `data` 为已经许可核验的内存 JSON；`theme`、`startFrame`、`rate>0`、`loop=false`、`size`。转换 composition fps 到 JSON fr；结尾冻结，显式 loop 才循环。使用官方 Lottie 的逐帧 seek/render 同步，Freeze 固定目标帧，无自主播放。|
| SfxEvents | 数组 `{id, assetId, startFrame, durationFrames, volume}`。只允许本地 `pulp-splash` / `paper-lift`；帧位置整数、音量 0..1。Sequence + Audio 真正混入 AAC。事件时长超过源文件不延展声音。|
| CharacterCue | 仅接口：assetId、action、startFrame、durationFrames、theme、lookDirection、lipSyncAssetId。没有角色实现、品牌图、嘴型或 TTS。|

ThemeTokens 为 `{bg, fg, accent, muted}`，可用主工作台 `resolveStyle()` 结果做结构映射。本 POC 不 import 私有主题对象。Lottie 递归重色 shape group 和内嵌预合成中命名为 `theme-accent` 的 fill 标记，accent 必须 `#RRGGBB`；原 JSON 不会被改写，不承诺任意第三方 JSON 都可自动重色。

默认测试色为青灰蓝、宣纸白；薄雾山形仅是低对比测试背景，不是主片美术方案。

## 两个造纸术音效事件

| 事件 | 素材 | MP4 入点 | 说明 |
|---|---|---|---|
| 纸浆触水 | pulp-splash | frame 30 / 1.000s | 原创程序拟音，衰减噪声 + 阻尼共振，1 秒 |
| 提起纸页 | paper-lift | frame 90 / 3.000s | 原创程序拟音，带包络的高频纸张摩擦，1.2 秒 |

两者是实际生成的 PCM WAV，再经 Remotion 混入 MP4；不是现场录音、不是第三方音效库样本，也不证明外部音频服务已接通。没有上传未知许可的音频。WAV 由公开脚本确定性生成，GitHub 只存源码、许可和哈希，验收包提供生成的实际 WAV。

## 测试与兼容性

- 实测 Windows、Node、Chrome 版本见 evidence；960×540 / 30fps / 180 帧 / H.264 + AAC / 6 秒。
- MP4 全帧解码、编码/尺寸/帧数、音频峰值、源音频对应时段的波形与 10ms RMS 包络相关性、Lottie 区域运动差异均检查，见 evidence/qa.json。
- PNG 按 0,30,60,110,170,60,30 乱序独立渲染，同一帧逐字节一致。MP4 并发 2；不承诺跨操作系统/浏览器版本逐字节相同。
- 11 项单元测试覆盖 fps 换算、rate、非零 in-point、loop、end hold、非法时序、预合成/父层缺失及循环引用、递归换色、权利声明与哈希检查。第二轮另有 60fps 真实 MP4 验证，见下文。
- JSON fixture 是本次原创 MIT 的简单纸页上提，不是从 LottieFiles 预览取得的素材。验证的是外部播放器接入及自包含 JSON 格式，尚未验证第三方复杂卡通动画。
- profile v2 接收自包含 vector shape layers、shape groups、null/parent 层以及 assets 中内嵌 vector precomps。拒绝图片、字体、文字层、外链、表达式、3D、layer effects/masks、time remap、循环引用和缺失引用；不支持 dotLottie/AE 插件、音频嵌入、远程依赖或不可信下载代码。shape 类型只接受 gr/tr/rc/el/sh/fl/st/tm，其中本轮真实渲染覆盖 gr/tr/rc/fl；其他类型尚需目标素材测试。验证器是兼容性门禁，不是任意 JSON 的安全执行环境。
- 不宣称竖屏生产整片、ASR、TTS、自动语义检索、外部音效搜索或四个品牌角色已实现。

## 后续如何接入 #5

在 #5 的资产索引登记 assetId、ownerLibrary（图标为 lw-references；原创 JSON/拟音为 lw-originals）、作者、固定来源/版本、逐项 reference/download/adapt/render/redistribute 权利、许可证据及文件哈希。安装依赖与调用本目录 API 只是适配步骤，不自动更新生产 registry。

由调用方把通过审核的 MG 渲染成片段/音频，按 #5 已有 import/compile 门禁登记并核验；下一轮再增加一个明确受信的 adapter ID 与目标画幅测试。不要把远程源码直接塞入 render，也不要凭本 POC 打开整片 capability。CharacterCue 可接未来获权的任意品牌/原创角色，须分别补素材许可、动作映射和目标帧率验收。

完整来源、署名、许可文本与限制见 THIRD_PARTY_NOTICES.md、assets-used.json、licenses/。技术 PASS 不代替用户审片、听感判断或未来商用主体的 Remotion 许可核对。

## 第二轮：为卡通素材接入准备

继续使用同一独立分支与 Draft PR #6，不开发四个品牌角色。新增原创 `assets/paper-precomp.json`，用于验证两层预合成、父子层和 shape group，不是卡通素材或主片。

```sh
node inspect-lottie.mjs assets/paper-precomp.json
node inspect-lottie.mjs assets/paper-precomp.json rights-example.json
npm run render -- evidence/compatibility-run compatibility
python verify-compatibility.py evidence/compatibility-run
```

第一条命令只读兼容性检查，没有权利声明时返回 reference-only；第二条还会核对人类准备的来源、作者、许可证、审核者、授权 scopes、实际素材/许可证据 SHA256。`rights-example.json` 只适用于本仓库原创测试文件，不能挪用于用户找到的其他动画。未知许可、缺授权或哈希不符会阻塞。

预检始终返回 `renderStatus: not-run`、`productionApproved: false`：声明通过不等于许可法律事实已被自动确认，更不等于可直接入片。CLI 不下载、复制、注册素材，不执行外部源码；5 MiB 文件、8192px 画布、64 个预合成、512 个 layer、有限嵌套/节点数的 profile 只用于限制本轮适配范围。实际渲染仍需人工核对原始权利，再用固定受信入口单独测试；不要把下载的 JSON 直接塞进主视频。

第二轮实测：800×400、60fps、240 帧、4 秒 H.264 无音轨兼容性片；30fps JSON，ip=10/op=130，2x，左侧循环、右侧末帧保持。验证循环相隔 120 输出帧像素一致、末帧保持一致、乱序重复 PNG 字节一致、非零 in-point 的图形位置正确、分组/预合成内主题换色生效。结果 `evidence/round2/compatibility-qa.json`。关键帧已查看，连续运动用户验收待审。

同时重渲染第一轮 6 秒含音轨用例，MP4 SHA256 与第一轮相同，两个音效仍通过对应检查，见 `evidence/round2/regression-qa.json`。运行环境及依赖未变，未重新声称跨平台或通用卡通兼容。素材授权检查器仅记录人类声明；它不是自动判断网页许可证的服务。
