# 学习分析与案例记录

1. 对用户授权的每个本地文件记录路径、SHA256、容器、视频/音频流、时长、尺寸、帧率；同哈希只计一次。源文件只读。检查作者归属与来源是否有独立证据。
2. 用 `inspect_media.py`、`extract_frames.py`、`detect_shot_candidates.py`、`analyze_audio.py` 建立可复核证据。开头可密采样、全片可稀采样；记录实际间隔与阈值。硬切、叠化、闪白、界面内部变化、快速运动、推镜是不同现象，候选需人工确认。
3. 按时间轴记录景别、构图、视觉层次、镜头动机、叙事作用、字幕、声画关系、转场。ASR 可用且授权时才转写，保留时间码与术语核查；未知写 `null`。
4. 对动画写可见起止状态、空间关系、遮挡、模糊、运动轨迹与替代实现。代码、缓动和三维工具不能仅凭成片确证。
5. 输出 Markdown 案例及 JSON/CSV 时间轴。字段可含 `case_id, source_filename, sha256, creator_claim, creator_verified, source_url, duration_s, aspect_ratio, fps, method, limitations, shot_id, start_s, end_s, frame_refs, narration_or_asr_ref, visual_description, composition, camera_motion, transition, subtitle, audio_event, inferred_implementation, alternative, evidence_level, validation_status`。时间点、帧号和证据引用保持一致。
6. 项目知识库保留日期、原报告与变更记录；新结论附验证输出。作者覆盖目标是每人至少三部不同作品，缺失时直报缺口。

本次交接包的缺失证据和素材对应见 [案例索引](case-index.md)。