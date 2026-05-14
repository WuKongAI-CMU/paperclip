# DearMe 产品经理深度研究报告

**研究日期**：2026-05-14  
**代码库路径**：`/Users/peter/dearme`（通过 `~/dearme` 与 `mdfind` 定位）  
**方法**：只读审阅 `docs/dearme/*`、`README.md`、`package.json`、`.env.example`、`ui` 路由与 DearMe 相关页面测试与策略文档；未改动产品代码。

---

## Summary

DearMe 在文档与实现上已明确定位为「单人私有 AI 增长团队」，以 Paperclip/Naive 为控制平面、OpenClaw 为设备侧通道、Polsia 为编排参考的三层架构；产品文档成熟度高于典型早期项目，但公开付费 beta 仍被文档明确卡在「真实外部渠道凭证与送达回执」上。本报告按 PM 视角结构化结论与优先级建议。

---

## 1. 产品一句话与假设

**一句话（文档原意）**  
「面向一个人的私有 AI 增长团队」：把个人的工作、声音、证据与关系网络，转化为可发布内容、真实机会（客户/工作/播客/赞助等）、可访问的个人站点、在值得时的付费广告，以及每日约 200 字的「Dear me」信函。（`docs/dearme/README.md` L3–5；`docs/dearme/INDEX.md` L9–11）

**解决谁**  
有公开职业/创作者身份、声誉与经济机会强绑定的人：顾问、独立创始人、求职中的候选人、有变现的创作者、「一人公司」等。（`docs/dearme/INDEX.md` L21–23；`docs/dearme/PRODUCT-ARCHITECTURE.md` §3 Primary Buyer）

**什么问题**  
素材分散在履历、帖子、项目、私信、GitHub 等多处；个人需要「像增长团队一样持续产出与触达」，但时间有限、不愿再运营一套复杂工具栈。（`PRODUCT-ARCHITECTURE.md` L112–115、L117–125）

**核心承诺**  
- 编排层：高自动化默认 + 对声誉/资金/外发渠道的硬审批边界。（`docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md` L16–21）  
- 体验层：「团队可见、机器隐藏」——用户主要面对 Chief of Staff 式表面，而非代理管理控制台。（`PRODUCT-ARCHITECTURE.md` L32–41）

**关键假设（需产品持续验证）**  
1. 用户愿意为「代运营式增长」付月费，且能接受 OpenClaw 设备侧 + 云端 DearMe 的分工。  
2. ≤5 分钟的「Aha」路径（身份档案 → 受众与外链清单 → 手机可访问的 `dearme.app/<handle>`）足以完成激活与付费意愿筛选。（`INDEX.md` L13–18）

---

## 2. 用户与场景

**目标用户画像（文档收敛）**  
- 顾问/教练/自由职业者：要更多合格线索与约聊。  
- 创作者/领域专家：要稳定输出与变现机会。  
- 创始人/独立开发者：要 build in public、用户与伙伴。  
- 求职者：要作品集、LinkedIn、面试叙事。  
- 时间极紧的副业者：要「周期」而非新看板。（`PRODUCT-ARCHITECTURE.md` L98–110）

**关键使用场景**  
1. **冷启动 / 首周期**：首屏证明包、私有证明页、浏览器内首五分钟进度流、静态私有站点导出用于 host smoke。（`INDEX.md` L136–139、`POLSIA-NAIVE-DEARME-CURRENT-GAP-AUDIT.md` L30–44）  
2. **日常工作台**：批量审批、审计、Live proof feed；对话主路径在 OpenClaw 所选渠道，而非本 Web UI。（`docs/dearme/README.md` L96–97；`INDEX.md` L96–97）  
3. **发布/发送/部署/花费**：经 Voice Gate、审批解析器、统一 `callOutbound()` 管道。（`docs/dearme/README.md` L48–50）

**Jobs-to-be-done（推断）**  
- *当我没时间做增长时，帮我持续把「我是谁、对谁说、证据是什么」变成可对外动作。*  
- *当我担心 AI 不像我或乱发时，在发声前给我可理解的闸门与改写回路。*（Voice Gate + soft-reject：`INDEX.md` L150–151）  
- *当我需要向自己或投资人证明「这周有进展」时，给我周报/日报式的收据，而不是原始日志。*（`PRODUCT-ARCHITECTURE.md` L127–139；`REUSE-IMPLEMENTATION-LEDGER.md` L96–111）

---

## 3. 价值主张与差异化

**相对品类的显式定位**（文档写得很清楚）  
- **不是**日记、陪伴 App、通用写作助手、代理管理后台；而是「个人品牌增长团队」。（`PRODUCT-ARCHITECTURE.md` L14–17）  
- 与「日记/待办」：核心是外化成果与机会管道，不是情绪记录或任务打勾。  
- 与「提醒」：依赖 Naive 的 heartbeat/预算/审批等运行时，而非简单通知。  
- 与「AI 伴侣」：强调多角色编排、成本归属、审批与审计，情感陪伴不是主叙事。

**差异化抓手（产品 + 技术文档一致）**  
1. **Voice fingerprint / Voice Gate**：声纹与输出一致性作为「DearMe 自有 IP」之一。（`INDEX.md` L99）  
2. **机会生命周期 + Hunter 类验证邮件**（文档承诺侧）。（`INDEX.md` L15–16、L72）  
3. **三基质整合**：OpenClaw（设备）+ Naive/Paperclip（云控制面）+ Polsia 编排参考 — 竞品较少以同一套语言把责任边界划清。（`INDEX.md` L99、`TRI-SUBSTRATE-ARCHITECTURE.md` 引用于 `README.md` 索引）

**文档清晰度**：高。北极星、教义、 shipped vs left、禁跟文档均在 `docs/dearme/README.md` 与 `INDEX.md` 层级化列出。

---

## 4. 功能地图（模块 × 成熟度）

成熟度图例：**文档** = 规格/路线图明确；**代码** = 仓库内可追踪实现；**测试** = 单测/脚本/证明门可见。

| 模块 | 能力摘要 | 文档 | 代码 | 测试/证明 |
|------|-----------|------|------|-----------|
| 角色与提示注册表 | 12 角色、`DEARME_ROLE_REGISTRY`、substrate 映射 | ✅ `INDEX.md` L27–47 | ✅ `packages/plugins/dearme-agent-prompts` | ✅ `pnpm --filter @paperclipai/dearme-agent-prompts test`（`docs/dearme/README.md` L82） |
| OpenClaw 插件 | 生成 12×SKILL、7 个外发工具接口、manifest | ✅ | ✅ `dearme-openclaw` | ✅ 19 tests（README L84） |
| AI 代理 / 函数契约 | `dm_sk_`、成本归因头、6 个 OpenAI 函数 | ✅ | ✅ `dearme-ai-proxy` | ✅ 10 tests（README L83） |
| 云端外发管道 | voice-gate → approval → OAuth → dispatch → audit | ✅ `INDEX.md` L131 | ✅ `server/src/services/dearme-*` | ✅ 多包测试（INDEX L131） |
| 渠道连接 | X PKCE、Resend/SES、Telegram/iMessage gateway 等 | ✅ README L48 | ✅ `channel_connections` schema 描述 | 部分依赖 live smoke |
| 机会 | 8 状态机 + `opportunities` 表 | ✅ | ✅ `packages/db/.../opportunities.ts` | 与业务验收绑定 |
| 语音配置持久化 | `dearme_voice_profiles` | ✅ INDEX | ✅ schema 引用 | Voice smoke / review loop |
| 首周期 / 证明序列 | `proofSequence`、`autonomyPlan`、五稿私包 | ✅ INDEX shipped | ✅ server + onboarding | `dearme:aha-proof`、`DearMeOnboarding.test.tsx` |
| 工作台 / 决策 / 品牌 OS | URL：`view=decisions` / `brand-os` / `voice` 等 | ✅ PRODUCT-ARCHITECTURE §5 | ✅ `ui/src/pages/DearMeOnboarding*`、`App.tsx` 路由 | 大规模组件测试 |
| 付费 beta | 手工账本、收据、试用闸门 | ✅ PRODUCT-ARCHITECTURE L159–164 | ✅ 测试与脚本（`dearme:paid-loop-proof` 等） | ✅ 多条 `dearme:payment-*` scripts |
| 遥测（继承 Paperclip） | 默认匿名遥测、可关闭 | ✅ 根 `README.md` L402–413 | 推断存在服务端实现 | 非 DearMe 专属 |

**注意**：`INDEX.md` L46 写明 12 条 prompt 已进运行时语料，但「各角色完整插件运行时仍部分在 ticket 层规划」。这是 PM 上的 **能力声明 vs 端到端产品化** 差距点。

---

## 5. 体验与信息架构

**路由与入口**（代码证据）  
- 公司董事会路径下：`/:companyPrefix/dearme` → `DearMeOnboarding`；`/:companyPrefix/dearme/site-preview/:handle` → `DearMeSitePreview`。（`ui/src/App.tsx` L67–68）  
- `dearme` 列入与公司前缀并列的 board route roots。（`ui/src/lib/company-routes.ts` L1–22）

**核心流程（从测试与文档推断）**  
1. 进入 `/dearme`（或带公司前缀的等价路径）→ onboarding 多视图（`view=` query + hash 锚点如 `#dearme-work-ready`）。  
2. 首周期证明卡片与浏览器可见进度流与共享 `proofSequence` 合同一致。（`INDEX.md` L138–139）  
3. 「Work Ready」「Decisions」「Voice memory」「Paid beta」等通过 navigate 串联。（`DearMeOnboarding.test.tsx` 中多处 `mockNavigate` 期望）

**明显摩擦点（产品视角）**  
1. **双表面认知负担**：主对话在 OpenClaw 渠道，Web 为「次级工作台」——若 onboarding 未极强解释，用户会困惑「到底在哪聊天」。（`INDEX.md` L96–97）  
2. **Paperclip 根 README 与 DearMe 并存**：根 `README.md` 仍以 Paperclip 为主视觉；新贡献者依赖前几行跳转到 `docs/dearme/README.md`（L1–7）。对**终端用户**无影响，对**获客/招聘**有品牌分裂感。  
3. **公司前缀路径**：`PET/dearme` 等模式对熟悉 SaaS 的用户不直观（虽对多租户数据隔离合理）。

---

## 6. 增长与留存杠杆

| 杠杆 | 已有（证据） | 缺口 |
|------|----------------|------|
| **习惯 / 每日回路** | 每日「Dear me」信、周期语言、workbench「When you come back」摘要（`REUSE-IMPLEMENTATION-LEDGER.md` L62–74） | 依赖 OpenClaw 侧实际每日触达；需验证推送/渠道疲劳 |
| **通知** | 渠道多样（Telegram、iMessage、邮件等架构描述）（`INDEX.md` L52–56） | Live 送达证明仍缺（Gap Audit） |
| **分享 / 裂变** | 个人站点 `dearme.app/<handle>`、内容管道 | 文档强调私有关卡，公开分享策略未在已读片段中展开 |
| **付费** | 手工收据 paid beta、`dearme:payment-readiness` / `paid-loop-proof`（`docs/dearme/README.md` L58–59） | 自助结账与收据同步仍被脚本门控审视 |
| **留存指标** | 「7 天零可交付物 = P0 留存 bug」（`PRODUCT-ARCHITECTURE.md` L138–139） | 需数据面板与用户级实证 |

---

## 7. 风险与依赖

**隐私与数据**  
- 身份档案、LinkedIn/GitHub、公开帖子合成等能力写在 Aha 定义中（`INDEX.md` L15）——**合规与同意**必须在产品层显性化（文档教义强调审批在发布/外发/花费处，但富集个人数据仍有 GDPR/肖像权/平台 ToS 风险）。  
- 根 README 遥测说明：默认开启、可关；声明不采 prompt/路径等（`README.md` L402–404）。DearMe 是否继承同一策略需在面向用户的隐私政策中单独承诺（仓库内未见专用 `privacy.md`/terms glob）。

**第三方与集成依赖**  
- OpenClaw（设备运行时）、X、Resend/SES、Meta、LinkedIn partner、Hunter 类验证等（`INDEX.md`、`README.md` DearMe 节）。任一凭证或 API 变更即影响「完整故事」。

**合规与声誉**  
- `AUTOMATION-RELIABILITY-COST-POLICY.md`：硬审批覆盖声誉、资金、外渠道；预算是硬停止。  
- Voice Gate + soft-reject 降低「不像我」的公关风险（`INDEX.md`）。

**技术债对产品的约束**  
- 85+ Paperclip 表继承 — 加速工程，但 UI 若暴露「org/agents/adapters」会破坏「非控制台」定位（`PRODUCT-ARCHITECTURE.md` L166–167）。  
- 多 worktree / Symphony 协调复杂度高（Gap Audit 中 122 worktrees 等数字）— 对发布节奏与「单一真相」文档是好事，对团队 onboarding 是成本。

---

## 8. 建议的下一步（产品）— P0 / P1 / P2

### P0 — 完成「可对外讲述」的最小闭环

1. **目标**：至少一条真实外部渠道的送达回执进入产品叙事（与 `POLSIA-NAIVE-DEARME-CURRENT-GAP-AUDIT.md` 一致：Telegram/iMessage/邮件/LinkedIn 等择一攻坚）。  
2. **验收标准**：真实用户在可控样本上完成一次审批后外发；工作台/Live proof feed 展示客户安全收据；`dearme:status` / release gate 对应 lane 由 blocked → ready。  
3. **需澄清**：首发渠道优先级（B2B 顾问偏 LinkedIn vs 创作者偏 X）；各国家区对 iMessage/短信的合规要求。

### P0 — 隐私与同意文案（与 Aha 数据富集对齐）

1. **目标**：首周期身份/受众合成前，用户理解采什么、存哪、可删否。  
2. **验收标准**：法律审阅过的简短同意 + 设置内撤回；与 `INDEX` 中 0–30s 体验不互相拆台（可分层：先最小集再深化）。  
3. **需澄清**：是否仅 US-first；是否存储原始第三方响应。

### P1 — 降低「双表面」摩擦

1. **目标**：新用户在 60 秒内理解「主对话在 OpenClaw，Web 用于批决策与证明」。  
2. **验收标准**： onboarding 内嵌一张流程图或必选频道连接步；支持从 Web 深链到 OpenClaw 文档/深链（若平台允许）。  
3. **需澄清**：无 OpenClaw 时的降级产品是否存在还是明确「硬依赖」。

### P1 — 付费路径产品化

1. **目标**：在手工收据跑通后，定义自助付费的 MVP（即便仅 Stripe Checkout 链接）。  
2. **验收标准**：`dearme:payment-readiness` 中「hosted checkout」相关条件可被满足或明确标为 roadmap。  
3. **需澄清**：定价是席位制、周期包还是用量；与 credits 的换算用户可理解。

### P2 — 品牌统一对外

1. **目标**：对外 landing 与根 README 的「DearMe 优先」叙事，减少 Paperclip 视觉喧宾夺主。  
2. **验收标准**：新访客 10 秒内看到 DearMe 独立价值主张。  
3. **需澄清**：开源定位 vs 商业产品是否分站。

### P2 — 留存仪表盘

1. **目标**：内部先行的「7 天交付物」健康度指标，再视情况轻量暴露给用户。  
2. **验收标准**：运营可回答：每周多少用户收到 ≥N 份可发布草稿。  
3. **需澄清**：「可交付物」的可操作定义（是否含仅私有草稿）。

---

## 证据索引（路径）

- 北极星与 Aha：`docs/dearme/INDEX.md`  
- 产品定位与表面：`docs/dearme/PRODUCT-ARCHITECTURE.md`  
- 成熟度与缺口：`docs/dearme/POLSIA-NAIVE-DEARME-CURRENT-GAP-AUDIT.md`  
- 协调落地与收据：`docs/dearme/REUSE-IMPLEMENTATION-LEDGER.md`  
- 自动化边界：`docs/dearme/AUTOMATION-RELIABILITY-COST-POLICY.md`  
- 索引与运行真相：`docs/dearme/README.md`  
- UI 路由：`ui/src/App.tsx`；公司路径：`ui/src/lib/company-routes.ts`  
- 根环境与遥测：`README.md`、`.env.example`  
- 当前分支（取样）：`git` 显示 `codex/dearme-dm-136-sample-demo-proof`

---

*本报告由研究子代理生成，仅供产品决策参考；实施前请以最新代码与协调文档为准。*
