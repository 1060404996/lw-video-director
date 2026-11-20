# AI 视频导演与专业剪辑师

这是一个面向 Codex 的视频分析与制作辅助 Skill。它用于拆解经授权的参考视频、整理可核查的镜头与音频证据、规划分镜和动效，并对原创组件及视频导出进行基础技术检查。

- **GitHub 仓库名：** `lw-video-director`
- **Skill 标识：** `ai-video-director`
- **主要语言：** 中文
- **默认模式：** 学习分析；只有用户明确要求制作时才进入制作流程。

## 能做什么

- 清点本地视频文件，记录媒体流信息与 SHA256 去重结果。
- 按时间抽取预览帧，生成时间索引。
- 发现硬切、渐变和屏幕运动的候选时间点，供人工复核。
- 测量混合音轨的 RMS、低能量窗口、采样峰值，以及可用时的 EBU R128 响度信息。
- 根据受众、叙事和视觉层级规划分镜、镜头运动、转场、字幕与音画关系。
- 用原创图形渲染卡片阵列、条形图和屏幕过渡的最小技术样例。
- 检查视频流、帧解码、首尾帧亮度、帧间隔和音视频时长差异。

**边界：** 镜头检测结果只是候选，不是精确剪辑点；混合音轨低能量不等于人声停顿；元数据检查不能代替人工观看成片。该 Skill 不会仅凭参考视频推断作者使用了什么软件，也不会把可运行代码自动视为视觉验收通过。

## 安装

### Windows（PowerShell）

先确保已安装 Git，然后执行：

```powershell
New-Item -ItemType Directory -Force "$HOME\.codex\skills" | Out-Null
git clone https://github.com/wangzhijian0403/lw-video-director.git "$HOME\.codex\skills\ai-video-director"
```

如果目标目录 `$HOME\.codex\skills\ai-video-director` 已经存在，请先备份或移走旧目录，再执行克隆，避免覆盖本机已有版本。

### macOS / Linux

```bash
mkdir -p ~/.codex/skills
git clone https://github.com/wangzhijian0403/lw-video-director.git ~/.codex/skills/ai-video-director
```

安装后重新打开 Codex 或新建会话，然后通过 Skill 标识调用：

```text
$ai-video-director
```

## 安装 Python 依赖

建议使用独立虚拟环境。进入克隆后的 Skill 目录后执行：

```bash
python -m venv .venv
```

Windows PowerShell 激活：

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

macOS / Linux 激活：

```bash
source .venv/bin/activate
python -m pip install -r requirements.txt
```

脚本使用 FFmpeg 进行音频解码、视频编码或响度测量。它会先查找系统 PATH 中的 `ffmpeg`，再尝试使用 `imageio-ffmpeg` 提供的可执行文件；若两者均不可用，请安装 FFmpeg 并配置 PATH。

## 脚本用法

在 Skill 根目录运行。所有输出路径应指向独立的项目工作目录，不要覆盖原始素材。

### 1. 清点媒体文件

```bash
python scripts/inspect_media.py "D:/video-project/source" --output "D:/video-project/work/media-inventory.json"
```

### 2. 抽取预览帧

```bash
python scripts/extract_frames.py "D:/video-project/source/reference.mp4" --out-dir "D:/video-project/work/frames" --interval 2
```

### 3. 生成镜头变化候选

```bash
python scripts/detect_shot_candidates.py "D:/video-project/source/reference.mp4" --output "D:/video-project/work/shot-candidates.json" --interval 0.25
```

该脚本还会在 JSON 报告旁写入 CSV 采样数据。候选必须人工确认。

### 4. 分析混合音轨

```bash
python scripts/analyze_audio.py "D:/video-project/source/reference.mp4" --output "D:/video-project/work/audio-report.json"
```

### 5. 验证导出文件

```bash
python scripts/validate_export.py "D:/video-project/output/final.mp4" --output "D:/video-project/work/export-report.json" --require-audio
```

可按需增加 `--expect-width`、`--expect-height` 和 `--expect-fps`。

### 6. 渲染原创 2D 技术样例

```bash
python scripts/render_components.py --output "D:/video-project/work/component-proof.mp4" --width 640 --height 360 --fps 30
```

每个脚本都支持 `--help`，查看参数说明。

## 项目结构

```text
lw-video-director/
├── SKILL.md
├── README.md
├── requirements.txt
├── agents/
│   └── openai.yaml
├── references/
│   ├── audio-and-subtitles.md
│   ├── case-index.md
│   ├── cinematography-and-story.md
│   ├── motion-and-transitions.md
│   ├── study-method.md
│   └── workflow-and-qa.md
└── scripts/
    ├── analyze_audio.py
    ├── common.py
    ├── detect_shot_candidates.py
    ├── extract_frames.py
    ├── inspect_media.py
    ├── render_components.py
    └── validate_export.py
```

## 使用原则与素材权利

- 只分析用户有权使用的本地素材；原始视频只读，分析结果写入独立目录。
- 不要把原始视频、音频、关键帧、客户素材、私人报告或导出成片提交到公共仓库。
- 参考作品只提炼结构与通用技法，不复制独特角色、品牌素材、音乐或整段脚本。
- 案例结论应标明证据等级、来源、时间点、方法和误差；未知信息保持待确认。
- 用户明确要求制作后再进入成片制作；发布或公开素材需另行确认授权。

## 许可证

本项目采用 [MIT License](LICENSE)。

Copyright (c) 2026 wangzhijian0403

MIT 允许使用、复制、修改、合并、发布、分发、再许可及销售本项目软件，但再分发时须保留版权声明和许可证文本。软件按“现状”提供，不附带任何明示或默示担保。

该许可证仅适用于仓库中由项目作者提供且有权授权的项目内容；第三方依赖、商标、参考视频、音乐、图片及其他外部素材仍受各自权利和许可约束。

## 案例资料说明

`references/case-index.md` 收录的是交接记录中的观察与待核实事项，不代表本仓库重新完成了全部原片复核。原始视频和逐帧证据不包含在仓库中。
