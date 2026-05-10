# CHAT: Voice fingerprinting / 同作者风格验证 (DearMe voice gate)

> Source: ChatGPT Pro / GPT-5 / Deep Research
> 我问的是: DearMe 的 voice gate / 同作者验证应该怎么实现 — embedding cosine 行不行 / 用什么模型 / 阈值怎么定 / 怎么从 100 扩到 10k 用户
> 我想得到的结论: 模型选择 (StyleDistance vs OpenAI vs LoRA) / Day-0 onboarding 怎么做 / 85% 阈值是什么意思 / 成本估算 / 代码骨架
> 跑了 2 次 (variance check) — 注意: 我之前说 4 prompt × 3 runs, 但这一份只贴出 2 次, 第 3 次没贴或没生成
> Decision input for: DM-170 (voice gate impl, 替换 dearme-voice-gate.ts 里的 deterministic stub scorer), DM-138 (onboarding 30s fingerprint)

---

## Run 1

Verdict for DearMe, May 2026

The production-grade answer is not "use cosine similarity on OpenAI/Voyage/Cohere embeddings." General embeddings are excellent at meaning similarity; DearMe needs same-author style verification. The best current design is a calibrated cascade:

1. Local style scorer: style-specific embedding model + classical stylometry features + per-user calibration against hard negatives.
2. LLM judge only for borderline cases: use the archive/style brief in context, preferably cached.
3. Generation loop: generate several drafts, rerank with the local style scorer, revise only when the score is close.

Treat your 85% / 70% thresholds as calibrated probabilities or calibrated product scores, not raw cosine scores. A raw "0.85 similarity" from any embedding model is not a reliable publishing threshold.

The strongest off-the-shelf style-embedding options I would test first are StyleDistance/styledistance, mStyleDistance for multilingual users, and STAR for authorship-style representations. StyleDistance is explicitly trained to put stylistically similar texts close while suppressing content/topic leakage, and its model card lists authorship identification/verification as a target use case.  ￼ STAR is also relevant because it trains author representations contrastively on a large public-author corpus and reports competitive zero-shot PAN-style attribution/clustering results.  ￼

⸻

Ranked recommendation

1. Day-0 onboarding: fingerprint in 30 seconds, 50–200 posts available

Fastest reliable path: build a cold-start fingerprint from:

* StyleDistance/styledistance embeddings over aggregated post chunks.
* Classical short-text features: character n-grams, punctuation, casing, emoji, hashtag/URL patterns, function-word ratios, sentence length, lexical richness.
* Hard negatives from same platform/genre/topic, not random internet text.
* Bootstrap confidence: if 50 short posts produce unstable centroids, show a low-confidence fingerprint instead of pretending it is authoritative.

For Day 0, I would not fine-tune per user. Fine-tuning is slower, operationally expensive, and easy to overfit when the user has only tweets or short LinkedIn snippets.

Practical minimums:

Archive available  Fingerprint quality  Recommendation
20–50 tweets  Weak  Allow only "draft assist"; avoid hard discard decisions.
50–120 tweets  Usable but noisy  Aggregate tweets into 80–200-word chunks; use confidence intervals.
120–300 tweets  Good for short-form style  Start applying 70/85-style thresholds after calibration.
10–20 long posts / essays  Often good  Better than hundreds of tiny posts if genre matches.
2,000–5,000+ words  Reasonable target  Classical stylometry literature often finds attribution stabilizes around this order, though the exact amount is domain-dependent.  ￼

The stylometry literature does not give one universal sample-size number. Empirical answers range from roughly 500–2,000 words in some settings to 5,000+ words in others, with short forensic/social texts requiring more caution.  ￼

Day-0 recommendation: compute a local fingerprint immediately, but expose a hidden internal confidence score. A user with 60 tweets should not receive the same gating strictness as a user with 50 blog posts.

⸻

2. Ongoing scoring before publish: cheapest reliable path

Cheapest reliable path: score every draft locally with the calibrated style scorer; call an LLM judge only for ambiguous cases.

A good cascade:

Local score  Action
>= 85 and confidence high  Accept / publish candidate.
70–85  Revise using style gaps, then rescore.
< 70 and confidence high  Discard or regenerate.
Low confidence at any score  Use LLM judge or ask for more archive.

For cost, a local SentenceTransformer style model plus classical features is usually sub-cent per score; the main cost is your CPU/GPU inference infrastructure. If you use generic API embeddings, the raw embedding cost for a 500-token draft is tiny: OpenAI text-embedding-3-large is $0.13 per million input tokens, so 500 tokens is about $0.000065.  ￼ Voyage's current embedding family is $0.02–$0.12 per million tokens depending on model, so 500 tokens is about $0.00001–$0.00006.  ￼

But again: generic semantic embeddings are not my recommended primary scorer for style.

⸻

3. Scale architecture: 100 / 1,000 / 10,000 users

100 users

Use a simple stack:

* Postgres + pgvector or Qdrant for archive chunks.
* One Python scoring service using sentence-transformers.
* One ingestion worker that normalizes posts and builds fingerprints.
* Optional Claude/OpenAI judge for borderline drafts.
* Store per-user: style centroid, feature means/stds, calibration model, style brief, representative examples.

At this stage, you can tolerate a few LLM calls per user per day.

1,000 users

Add:

* Batch ingestion queue.
* Hard-negative mining: same platform, same topic, same genre, different author.
* Per-user calibration artifacts in object storage.
* Daily/weekly fingerprint refresh.
* Score monitoring: acceptance rate, revision rate, user edits after publication.
* LLM judge only for borderline cases or high-value users.

Do not train 1,000 independent LoRAs as the default. It is operationally noisy and usually unnecessary.

10,000 users

Use:

* One global style encoder / scorer.
* Per-user lightweight calibration, not per-user base models.
* Sharded vector store.
* Feature store for stylometric statistics.
* Periodic supervised training on real DearMe outcomes: user accepted, edited, rejected, published.
* LLM judge only for samples, audits, premium users, or borderline cases.
* Per-user LoRA only for enterprise/premium/high-volume users with thousands of examples.

This is the most scalable architecture: global model + per-user fingerprint + per-user calibration.

⸻

Approach A — embedding-based stylometric similarity

Best model classes

Strongest style-first options

Model / family  Style similarity  Semantic similarity  My rating for DearMe  Notes
StyleDistance/styledistance  5/5  1–2/5  Best first test  Purpose-built style embedding; local SentenceTransformer; 0.1B parameters; trained to reduce content leakage.  ￼
mStyleDistance  4.5/5  1–2/5  Best multilingual test  Multilingual style embeddings trained with synthetic style data and contrastive learning across nine languages.  ￼
AIDA-UPM/star / STAR  4–4.5/5  1–2/5  Strong research baseline  Authorship representation model trained on 70k authors; reports strong zero-shot authorship performance.  ￼
AnnaWegmann/Style-Embedding  3.5–4/5  1–2/5  Useful older baseline  Good for style/content separation tests, but I would benchmark it behind StyleDistance.
PART-style authorship embeddings  3.5–4/5  1–2/5  Research baseline  Contrastive authorship representation idea is relevant, but less plug-and-play.  ￼

General embedding models

Model  Style similarity  Semantic similarity  Use in DearMe
OpenAI text-embedding-3-large  2/5  5/5  Great for topic/intent retrieval, weak as raw style metric.
Voyage voyage-4, voyage-4-large, voyage-4-lite  2/5  5/5  Excellent retrieval/cost options; not style-specific.
Cohere Embed v4  2/5  5/5  Strong for semantic/multimodal retrieval; not a style verifier.
Gemini embeddings  2/5  5/5  Strong multilingual semantic model; not style-specific.
BGE / E5  1.5–2/5  4–5/5  Good open retrieval baselines; fine-tune if you need style.
Generic Sentence-Transformers models  1.5–3/5  3–5/5  Depends on checkpoint; the library is useful, but most checkpoints are semantic.

OpenAI's embedding docs describe embeddings as measuring text relatedness and list text-embedding-3-large as its most capable embedding model, with MTEB-style semantic benchmark reporting. That is useful infrastructure, but it is not the same as same-author style verification.  ￼ Voyage, Cohere, and Gemini similarly position their embedding models around retrieval, classification, clustering, semantic similarity, and multimodal search rather than style verification.  ￼

Recommendation for Approach A

Use style-specific embeddings as the primary vector signal. Use generic embeddings only to:

* Find same-topic hard negatives.
* Retrieve examples for generation.
* Deduplicate archive content.
* Separate "this is about the same topic" from "this sounds like the same person."

A production DearMe score should include at least these features:

* Style embedding cosine to user centroid.
* Distance to per-user style distribution.
* Classical stylometry vector distance.
* Draft length confidence.
* Genre/platform match confidence.
* Topic leakage penalty: if semantic similarity is high but style similarity is low, do not accept.

⸻

Approach B — authorship attribution / stylometry classics

Classical stylometry is still useful, especially for short social posts. The reason is simple: short texts often do not have enough semantic or syntactic material, but they still expose dense micro-signals:

* Punctuation habits.
* Casing.
* Emoji/emoticon usage.
* Hashtag placement.
* URL behavior.
* Function-word ratios.
* Character n-grams.
* Repeated openers/closers.
* Average clause length.
* Parentheses, dashes, ellipses, bullets.
* Spacing and line-break rhythm.

Current view of classic tools

Tool / method  Production value in 2026  Notes
Character n-grams + logistic regression / SVM  High  Still a hard baseline for short text.
Function words + punctuation + casing  High  Cheap, interpretable, robust.
General Imposters / Koppel-style verification  Medium  Good idea for verification, but usually needs careful negative sampling.
Writeprints-style features  Medium  Useful feature family; many implementations are old.
JStylo / Anonymouth  Low–medium  Historically important, but dated as production infrastructure.
R stylo package  Medium  Good for experiments and literary stylometry, less ideal for a consumer SaaS backend.
StyloMetrix-style linguistic features  Medium–high  Modern feature extraction with token/POS/dependency/morphology features can pair well with LightGBM or linear models. PAN 2025 systems used feature-rich pipelines including token, POS, dependency, morphology, and LightGBM/scikit-learn components.  ￼

2024–2026 direction

The strongest practical systems are hybrids:

style transformer embeddings + classical short-text features + calibrated verification classifier

PAN 2025's generative-AI authorship-verification task is especially relevant because it tests whether a text was human-authored or generated by an LLM mimicking a specific human author. The task baselines include TF-IDF/SVM, compression-based PPMd, and neural detectors, which is a good reminder that cheap classical baselines still matter.  ￼

Are LLMs better than classical features?

Sometimes, but not always, and the benchmark matters.

Recent work shows LLMs can perform authorship verification and attribution without task-specific fine-tuning, and can provide explanations.  ￼ A 2026 social-media authorship-verification preprint reports GPT-4 at about 84.5 weighted F1 on its social-media verification setup, outperforming several classical baselines, but this should be treated as a useful signal rather than a direct DearMe guarantee.  ￼

For DearMe, I would not use LLMs as the only scorer. They are better used as:

* A borderline-case judge.
* A revision critic.
* A style-profile extractor.
* A label generator for bootstrapping, later audited against user behavior.

⸻

Approach C — fine-tuned small models per user

Option C1: Per-user small LM as discriminator

Fine-tune a small causal LM on the user archive, then score candidate drafts by negative log-likelihood or perplexity under that user model.

Real options:

* meta-llama/Llama-3.2-1B or 3B.
* Qwen/Qwen2.5-1.5B-Instruct.
* TinyLlama / Gemma-class models for experiments.
* PEFT LoRA / QLoRA via Hugging Face.

LoRA reduces trainable parameters by learning low-rank adapters rather than updating the whole model, and QLoRA combines LoRA with quantized base weights.  ￼

Pros:

* Can capture highly idiosyncratic phrasing.
* Useful for power users with thousands of examples.
* Can be used as a discriminator without exposing user text in prompts.

Cons:

* Bad cold start.
* Per-user jobs create an operational queue.
* Easy to overfit on topic, names, repeated phrases.
* Adapters become a storage and versioning burden.
* Calibration across users is hard.

Option C2: Per-user LoRA adapters at scale

This is plausible for premium users, not for all users.

For 100–1,000 users, per-user LoRA is manageable if training is asynchronous and optional. For 10,000 users, it becomes painful unless adapters are tiny, training is rare, and usage is high enough to justify it.

GPU cost is not terrifying per job, but orchestration is the problem. Modal's current GPU pricing lists L4 at $0.000222/s, A10 at $0.000306/s, and L40S at $0.000542/s, so a five-minute training job is roughly $0.07, $0.09, or $0.16 before storage, retries, evaluation, and engineering overhead.  ￼ RunPod and Replicate have similar GPU-serverless/convenience tradeoffs; Replicate is simpler but generally pricier per GPU-second.  ￼ Fly's GPU docs currently show deprecation/unavailability language, so I would not choose Fly as the default new GPU host for this workload.  ￼

Option C3: Global discriminator with user conditioning

This is what I would build after the MVP.

Train one model that receives:

* User style examples or a user style embedding.
* Candidate draft.
* Platform/genre metadata.
* Hard negatives.

Output:

* Same-author probability.
* Style-gap labels.
* Confidence.

This gives you the benefits of learned discrimination without thousands of per-user fine-tunes.

Benchmark signal

Authorial Language Models, which fine-tune causal LMs on candidate authors and compare perplexities, report strong authorship results: 83.6% macro accuracy on Blogs50 and 74.9% on CCAT50, with short-text experiments showing useful but degraded performance at very short lengths.  ￼ That supports the idea, but it does not make per-user fine-tuning the best consumer-product default.

⸻

Approach D — LLM-as-judge with archive in context

This works better than many people expect, but it is not cheap enough or stable enough to be your only gate.

Accuracy

There is no public benchmark that exactly matches:

"Given 50–200 public posts from one consumer, decide whether this new AI-drafted post sounds enough like them to publish."

Closest evidence:

* LLMs can perform authorship verification and attribution in zero-shot settings.  ￼
* A 2026 social-media authorship-verification preprint reports GPT-4 around 84.5 weighted F1 on its setup.  ￼
* LLM-as-judge research warns about biases and reliability issues, including sensitivity to style, tone, references, and evaluation setup.  ￼

So: use it, but as a second opinion, not your base scoring engine.

Cost with Anthropic prompt caching

Anthropic prompt caching is highly relevant because the user archive/style brief is reused. Anthropic states that prompt caching reduces latency and cost for repeated prompts, with cache writes priced above base input and cache reads at a discounted rate.  ￼

Using current Anthropic pricing: Claude Sonnet 4.6 is $3/M input, $3.75/M 5-minute cache write, $0.30/M cache read, and $15/M output. Claude Haiku 4.5 is $1/M input, $1.25/M 5-minute cache write, $0.10/M cache read, and $5/M output.  ￼

Assume:

* 20,000-token cached archive/style brief.
* 800-token draft/evaluation prompt.
* 300-token JSON output.

Approximate cost:

Model  First cached call  Cache-hit score
Claude Sonnet 4.6  ~$0.082  ~$0.013
Claude Haiku 4.5  ~$0.027  ~$0.0043

That is acceptable for borderline cases, not every draft at mass consumer scale.

OpenAI's current flagship pricing page also lists much cheaper cached-input options for smaller models, for example GPT-5.4-mini and GPT-5.4-nano, but model quality for style judging should be validated against your own labels before swapping them into the gate.  ￼

⸻

Approach E — commercial writing-voice products / APIs

I would separate "brand voice generation feature" from "same-author verification API."

Product  What is real  Does it solve DearMe scoring?
Writer.com  Voice profiles, brand-aligned voices, reverse-engineering a voice from examples, rewriting with a voice.  ￼  Partially. Strong enterprise writing workflow, but not a public quantitative same-author verifier.
Copy.ai  Brand Voice analyzes example content and recommends at least 300 words to generate content in a brand style.  ￼  Partially. Generation/brand voice, not author verification.
Personal.ai  Personal AI/memory product claiming a model that mirrors your voice/style.  ￼  Adjacent. More personal-agent/memory than scoring API.
Lex.page  Style Guides and Knowledge Bases; "train Lex to draft and edit in your voice."  ￼  Adjacent. Writing workflow, not public verifier.
Sudowrite  Style controls affect tone, word choice, sentence structure, and prose generation.  [oai_citation:31‡Sudowrite  Documentation](https://docs.sudowrite.com/using-sudowrite/1ow1qkGqof9rtcyGnrWUBS/style/4gqKgVVjdN6XTKo71HChqV)
Granola  AI meeting-notes/notepad product.  ￼  No.
Bluedot  AI meeting recorder, notes, transcripts, summaries.  ￼  No.
Hippo / Hippo Video  AI video/avatar/script/voice-style product.  ￼  No for writing style verification.
Daydream Writer  AI novel-writing workspace.  ￼  Adjacent generation tool, not verified scoring API.
Yourwriter  I could not verify a robust 2026 public API for quantitative writing-style verification from official sources in this pass.  Treat as unverified.

Commercial conclusion: there are many "write in your voice" features, but I do not see a strong off-the-shelf API that gives DearMe's exact required primitive:

score(candidate_text, user_archive) -> calibrated same-author style probability

You should build this core capability yourself.

⸻

Approach F — generation-side voice control

The best 2025–2026 workflow is a generate → score → revise → rescore loop.

Methods ranked

Method  Production value  Use when
System prompt + style brief  High  Always. Cheapest baseline.
Few-shot examples  High  Day 0 and ongoing. Use 3–8 highly relevant examples.
RAG over archive  Very high  Default approach. Retrieve examples by platform, genre, and intent.
Generate-N + rerank by style scorer  Very high  Best simple way to improve voice match.
Classifier-guided revision  High  Use local scorer to identify gaps, then ask LLM to revise.
Per-user LoRA  Medium  Premium/high-volume users with lots of text.
Speculative decoding / reward-guided decoding  Medium  Interesting later; more engineering complexity.
RLHF/RLAIF style reward model  Medium–high later  Only after you have enough DearMe-specific accept/edit/reject data.

A 2024 style-based RAG paper is directly relevant: it frames style-based retrieval as a way to personalize LLM outputs and finds style embeddings useful for selecting style examples.  ￼

For products like Lex, Sudowrite, Writer, and Copy.ai, the public docs point to style guides, voice profiles, examples, and rewrite workflows, not per-user LoRA internals. So the safe assumption is that production systems mostly use style instructions + examples + retrieval + editing loops, not one adapter per user.  ￼

⸻

Concrete recommended architecture

Data model

For each user:

user_id
raw_archive_items[]
normalized_chunks[]
style_embedding_centroid
style_embedding_covariance_or_variance
stylometric_feature_mean
stylometric_feature_std
calibration_model
style_brief
representative_examples_by_genre
hard_negative_set
fingerprint_confidence
last_refreshed_at

Score model

A robust score should be:

score = calibrated_model(
    style_embedding_cosine,
    style_embedding_distance,
    stylometric_distance,
    draft_length,
    platform_match,
    genre_match,
    semantic_topic_overlap,
    bootstrap_uncertainty
)

Not:

score = cosine(user_centroid, draft_embedding)

Evaluation set you should build internally

For each user:

* Positive: held-out real posts.
* Negative 1: same-topic posts from other users.
* Negative 2: same-platform posts from other users.
* Negative 3: AI drafts prompted with the user's style brief.
* Negative 4: AI drafts prompted with another user's style brief.
* Borderline: user-edited AI drafts.

Metrics:

* AUROC / AUPRC for same-author verification.
* Equal error rate.
* Calibration error.
* False accept rate at your 85 threshold.
* False reject rate at your 70 threshold.
* Human preference win rate.
* Post-publication edit distance by user.

The key metric is not academic attribution accuracy; it is:

"How often does the user accept or lightly edit the draft after the scorer says it is publishable?"

⸻

Code sketch 1 — Day-0 fingerprint with style embeddings + stylometry

Use current package versions such as sentence-transformers==5.4.1 and scikit-learn==1.8.0; those are current PyPI releases as of this 2026 pass.  ￼

```python
# pip install sentence-transformers==5.4.1 scikit-learn==1.8.0 numpy
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
FUNC_WORDS = set("""
i me my mine you your we our he she it they them a an the and but or so
because if then of in on at for with without from to by as is are was were
""".split())
def chunk_posts(posts, min_words=80, max_words=220):
    chunks, buf = [], []
    for p in posts:
        words = p.split()
        if not words:
            continue
        buf.extend(words)
        if len(buf) >= min_words:
            chunks.append(" ".join(buf[:max_words]))
            buf = buf[max_words:]
    if buf:
        chunks.append(" ".join(buf))
    return chunks
def stylometric_features(text):
    words = re.findall(r"[A-Za-z']+|[#@]\w+|[!?.,;:—-]", text)
    alpha = [w.lower() for w in words if re.search(r"[A-Za-z]", w)]
    n_words = max(len(alpha), 1)
    n_chars = max(len(text), 1)
    punct = sum(ch in "!?.,;:—-" for ch in text)
    upper = sum(ch.isupper() for ch in text)
    hashtags = len(re.findall(r"#\w+", text))
    mentions = len(re.findall(r"@\w+", text))
    urls = len(re.findall(r"https?://|www\.", text))
    emojis = len(re.findall(r"[^\w\s,.;:!?@#'\"()\-—]", text))
    func_ratio = sum(w in FUNC_WORDS for w in alpha) / n_words
    avg_word_len = np.mean([len(w) for w in alpha]) if alpha else 0.0
    return np.array([
        len(text), n_words, avg_word_len,
        punct / n_chars, upper / n_chars,
        hashtags / n_words, mentions / n_words, urls,
        emojis / n_chars, func_ratio,
        text.count("\n") / n_chars,
        text.count("...") / n_chars,
    ], dtype=np.float32)
class Day0Fingerprint:
    def __init__(self, model_name="StyleDistance/styledistance"):
        self.encoder = SentenceTransformer(model_name)
    def fit(self, user_posts, hard_negatives):
        pos = chunk_posts(user_posts)
        if len(pos) < 3:
            raise ValueError("Need at least a few aggregated chunks.")
        pos_emb = self.encoder.encode(pos, normalize_embeddings=True)
        self.centroid = pos_emb.mean(axis=0)
        self.centroid /= np.linalg.norm(self.centroid) + 1e-9
        pos_feat = np.vstack([stylometric_features(t) for t in pos])
        self.feat_mean = pos_feat.mean(axis=0)
        self.feat_std = pos_feat.std(axis=0) + 1e-6
        def row(text):
            emb = self.encoder.encode([text], normalize_embeddings=True)[0]
            feat_z = (stylometric_features(text) - self.feat_mean) / self.feat_std
            return np.r_[float(emb @ self.centroid), np.linalg.norm(emb - self.centroid), feat_z]
        X = [row(t) for t in pos] + [row(t) for t in hard_negatives]
        y = [1] * len(pos) + [0] * len(hard_negatives)
        self.clf = make_pipeline(
            StandardScaler(),
            LogisticRegression(class_weight="balanced", max_iter=1000)
        ).fit(np.vstack(X), np.array(y))
        self.n_chunks = len(pos)
        return self
    def score(self, draft):
        emb = self.encoder.encode([draft], normalize_embeddings=True)[0]
        feat_z = (stylometric_features(draft) - self.feat_mean) / self.feat_std
        x = np.r_[float(emb @ self.centroid), np.linalg.norm(emb - self.centroid), feat_z]
        return 100.0 * self.clf.predict_proba([x])[0, 1]
```

⸻

Code sketch 2 — Ongoing scoring cascade

```python
def score_draft_for_publish(user_id, draft, store, llm_judge=None):
    """
    Returns a routing decision:
    - accept
    - revise
    - discard
    - judge
    """
    fp = store.load_fingerprint(user_id)
    local_score = fp.score(draft)
    # Simple confidence proxy. In production, use bootstrap variance,
    # archive size, draft length, genre match, and calibration error.
    confidence = 1.0
    if fp.n_chunks < 8:
        confidence -= 0.35
    if len(draft.split()) < 30:
        confidence -= 0.25
    result = {
        "user_id": user_id,
        "local_score": round(local_score, 2),
        "confidence": round(confidence, 2),
    }
    if confidence < 0.65:
        if llm_judge is None:
            result["decision"] = "judge"
            result["reason"] = "low_fingerprint_confidence"
            return result
        judge = llm_judge(user_id=user_id, draft=draft)
        result.update(judge)
        return result
    if local_score >= 85:
        result["decision"] = "accept"
        result["reason"] = "high_style_match"
        return result
    if local_score < 70:
        result["decision"] = "discard"
        result["reason"] = "low_style_match"
        return result
    result["decision"] = "revise"
    result["reason"] = "borderline_style_match"
    result["revision_targets"] = store.style_gaps(user_id, draft)
    return result
```

⸻

Code sketch 3 — Generation-side voice control with RAG + reranking

```python
def draft_in_user_voice(user_id, intent, store, llm, n_candidates=6):
    """
    Generate several drafts, score them locally, then revise or regenerate.
    """
    profile = store.load_style_brief(user_id)
    # Retrieve examples by genre/platform first, topic second.
    examples = store.retrieve_style_examples(
        user_id=user_id,
        query=intent,
        k=6,
        prefer_same_platform=True,
    )
    prompt = f"""
You are drafting for this user's own account.
VOICE PROFILE:
{profile}
REPRESENTATIVE EXAMPLES:
{chr(10).join(f"- {e}" for e in examples)}
TASK:
{intent}
Write one candidate draft. Preserve the user's voice, rhythm, and formatting.
Do not merely copy phrases from the examples.
"""
    candidates = [llm.generate(prompt, temperature=0.7) for _ in range(n_candidates)]
    scored = []
    fp = store.load_fingerprint(user_id)
    for text in candidates:
        scored.append((fp.score(text), text))
    scored.sort(reverse=True, key=lambda x: x[0])
    best_score, best_text = scored[0]
    if best_score >= 85:
        return {"draft": best_text, "score": best_score, "status": "ready"}
    if best_score >= 70:
        gaps = store.style_gaps(user_id, best_text)
        revise_prompt = f"""
Revise the draft to better match the user's voice.
VOICE PROFILE:
{profile}
STYLE GAPS TO FIX:
{gaps}
DRAFT:
{best_text}
Return only the revised draft.
"""
        revised = llm.generate(revise_prompt, temperature=0.4)
        revised_score = fp.score(revised)
        return {
            "draft": revised,
            "score": revised_score,
            "status": "revised" if revised_score >= 85 else "needs_review",
        }
    return {
        "draft": best_text,
        "score": best_score,
        "status": "regenerate",
    }
```

⸻

Code sketch 4 — Borderline LLM judge with cached archive

Anthropic prompt caching is useful when the same archive/style brief is reused across many draft evaluations.  ￼

```python
import json
from anthropic import Anthropic
client = Anthropic()
def claude_style_judge(user_archive_brief, examples, draft):
    cached_context = f"""
USER STYLE BRIEF:
{user_archive_brief}
USER EXAMPLES:
{chr(10).join(examples)}
"""
    rubric = """
Score whether the draft sounds like the same author.
Focus on style, not topic agreement.
Return strict JSON:
{
  "score": 0-100,
  "same_author_likelihood": "low|medium|high",
  "main_style_mismatches": ["..."],
  "revision_instructions": ["..."]
}
"""
    msg = client.messages.create(
        model="claude-haiku-4-5",
        max_tokens=500,
        system=[
            {
                "type": "text",
                "text": cached_context,
                "cache_control": {"type": "ephemeral"},
            },
            {"type": "text", "text": rubric},
        ],
        messages=[
            {
                "role": "user",
                "content": f"Evaluate this draft:\n\n{draft}",
            }
        ],
    )
    text = msg.content[0].text
    return json.loads(text)
```

⸻

Library/model stack I would start with

Pin versions in a lockfile; current PyPI versions moved quickly in 2025–2026. The relevant current packages include sentence-transformers 5.4.1, transformers 5.8.0, peft 0.19.1, scikit-learn 1.8.0, bitsandbytes 0.49.2, accelerate 1.13.0, and trl 1.4.0.  ￼

Recommended first stack:

Style encoder:
  StyleDistance/styledistance
  mStyleDistance if multilingual
  STAR as benchmark candidate
Classical features:
  scikit-learn LogisticRegression / LinearSVC
  LightGBM optional
  char n-grams, punctuation, function words, emoji, casing
Vector/RAG:
  pgvector or Qdrant
  optional OpenAI/Voyage/Cohere/Gemini semantic embeddings for retrieval
LLM:
  Claude Haiku/Sonnet or OpenAI small/mini model for borderline judge and revision
Training later:
  transformers + peft + bitsandbytes + accelerate

⸻

What is hyped vs what works

Works in production

* Style-specific embeddings.
* Classical short-text stylometry.
* Hard-negative calibration.
* RAG examples by genre/platform.
* Generate-N + rerank.
* LLM judge for borderline cases.
* User feedback loop from edits/accepts/rejects.

Hype or risky default

* Raw semantic embedding cosine as "voice match."
* Per-user LoRA for every consumer.
* LLM judge as the only scoring source.
* One universal 85% threshold without per-user/genre calibration.
* "Brand voice" vendor features marketed as true authorship verification.
* Evaluating only against random negatives instead of same-topic/same-platform negatives.

The core product insight

DearMe's defensible capability is not "we prompt the model with your old posts."

It is:

We maintain a calibrated, continuously improving same-author style verifier, and every generated draft must pass it before publication.

That is the right technical moat.

---

## Run 2

Bottom line

For DearMe's use case, do not make a raw "85% voice match" out of a general embedding cosine score or an LLM's self-reported confidence. In 2026, the best production answer is a calibrated hybrid verifier:

Style-specific embeddings + classical stylometry + cohort impostor calibration + LLM judge only for borderline/high-value cases.

The most relevant current research artifacts are StyleDistance and STAR. StyleDistance is explicitly trained so stylistically similar text is close even when content differs, using synthetic paraphrase/style contrasts and 40 style features; its model card positions it for stylometry, authorship verification, clustering, and style-transfer evaluation.  ￼ STAR is even closer to your product problem: it learns authorship-style representations from social-media text, trained over roughly 70k authors; in its Reddit test setup, using a support base of 8 documents × 512 tokens, it reports at least 80% accuracy distinguishing authors from sets up to 1,616 authors.  ￼

Your best first version should be:

1. Day 0 fingerprint: StyleDistance or STAR embeddings over 50–200 posts, plus char/word stylometry features, calibrated against same-platform impostors.
2. Ongoing scoring: local hybrid scorer; call Claude/GPT judge only when the local score is uncertain or the draft is high-risk.
3. Generation: prompt/RAG examples + a style capsule + N-best reranking by the verifier. Fine-tune only for power users with large archives.

⸻

Ranked recommendation

1. Day 0 onboarding: fingerprint in 30 seconds, 50–200 posts

Use this pipeline:

Clean → chunk → embed with StyleDistance/STAR → compute robust centroid and dispersion → extract stylometric features → calibrate against impostors → produce a voice capsule.

For 50–200 short posts, you likely have 5k–25k tokens. That is enough for a useful consumer fingerprint, but not enough for a forensic-grade identity claim. Treat the score as a calibrated voice-fit score for drafting, not as "proof of authorship."

Practical confidence tiers:

User archive  Product interpretation
<20 posts or <2k tokens  weak; use only for qualitative style guidance
50–100 posts or 5k–10k tokens  usable for onboarding and draft reranking
100–200 posts or 10k–25k tokens  good enough for a local "revise / discard" gate
>500 posts or >50k tokens  strong enough to consider per-user LoRA or ALM-style methods

The older short-message literature is consistent with this: one Twitter stylometry study found 120 tweets per user was an important threshold after which extra tweets gave only small, non-significant gains.  ￼ STAR's 2026-style setup is more optimistic because it uses transformer representations and 512-token supports rather than individual 140/280-character posts.  ￼

Day 0 cost: essentially zero if self-hosting StyleDistance/STAR. If you also embed with OpenAI or Voyage for semantic controls, 20k tokens costs about $0.0004–$0.0026/user depending on model: OpenAI lists text-embedding-3-small at $0.02/1M tokens and text-embedding-3-large at $0.13/1M tokens; Voyage lists voyage-4-lite at $0.02/1M, voyage-4 at $0.06/1M, and voyage-4-large at $0.12/1M.  ￼

2. Ongoing scoring: cheapest reliable path

Use a local scorer first:

score = calibrated( style_embedding_score, stylometry_score, channel_match_score, length_confidence, topic_leak_penalty )

Then route:

Score band  Action
>=85  publish or pass
70–85  revise using feature deltas
<70  discard or regenerate
borderline / high-risk  LLM judge with cached style profile

Marginal cost per local score: near-zero, typically CPU/GPU amortization only.

LLM fallback cost: with Anthropic prompt caching, a cached archive/style capsule of 5k–20k tokens plus a 1k-token draft and 200–400 output tokens costs roughly:

Judge  Approx per scored draft
Claude Haiku 4.5  $0.0025–$0.005
Claude Sonnet 4.5/4.6  $0.0075–$0.015

Anthropic's pricing page lists Haiku 4.5 at $1/MTok input, $5/MTok output, Sonnet 4.x at $3/MTok input, $15/MTok output, and says prompt-cache reads are 10% of standard input price; 5-minute cache writes are 1.25× and 1-hour writes are 2×.  ￼

A realistic blended production cost is <$0.001 per score if only 10–25% of drafts go to an LLM judge, and $0.003–$0.015 per score if every draft is judged by an LLM.

3. Scale architecture

Scale  Recommended architecture
100 users  One API service, Postgres/pgvector or FAISS, local StyleDistance on CPU/GPU, scikit-learn calibrator, optional Claude fallback
1,000 users  Separate ingest workers, style-embedding service on L4/A10, feature store, cohort impostor index, async scoring queue, LLM fallback cache
10,000 users  Multi-tenant fingerprint store, sharded vector index, global calibrator + per-channel calibration, evaluator pipeline, abuse/impersonation controls, LLM judge only for high-value drafts

For hosting, Modal is easiest for bursty GPU jobs; it bills per actual compute time and lists L4 at $0.000222/s, A10 at $0.000306/s, and H100 at $0.001097/s.  ￼ RunPod Serverless is cost-effective for GPU workers and lists L4/A5000/3090 flex at $0.00019/s, L40/L40S/6000 Ada at $0.00053/s, A100 80GB at $0.00076/s, and H100 Pro at $0.00116/s.  ￼ Replicate is good for managed demos/custom model endpoints but pricier for always-on production; it lists T4 at $0.81/hr, L40S at $3.51/hr, A100 80GB at $5.04/hr, and H100 at $5.49/hr.  ￼ Fly.io GPU is not a good 2026 bet because its docs mark GPU-enabled Machines as deprecated and unavailable after August 1, while still showing legacy A10/L40S/A100 GPU rates.  ￼

⸻

Approach A — Embedding-based stylometric similarity

Best options

Model / family  Style similarity  Semantic similarity  Verdict
StyleDistance/styledistance  5/5  2/5  Best current off-the-shelf style embedding for your exact problem
AIDA-UPM/star / STAR  5/5  2/5  Strong authorship/social-media representation; very relevant
older style embeddings, e.g. AnnaWegmann/Style-Embedding  3/5  2/5  Useful baseline; not enough alone
OpenAI text-embedding-3-large  2/5  5/5  Excellent semantic embedding; weak as a style fingerprint unless debiased
Voyage voyage-4*  2/5  5/5  Great retrieval family; not style-specific
Cohere Embed v4  2/5  5/5  Strong enterprise/multimodal retrieval; not style-specific
BGE-M3  2/5  4/5  Good open-source multilingual retrieval baseline
E5 / multilingual-E5  2/5  4/5  Good instruction-style retrieval baseline; not a voice model
generic Sentence-Transformers  varies  varies  The library is good; the model choice matters

StyleDistance is the most directly aligned: it trains style embeddings to reduce content leakage, using near-exact paraphrases and controlled style variations.  ￼ STAR is also highly relevant because it was trained for writing-style/authorship representations in social media, not generic search.  ￼

General embeddings are still useful, but mainly as controls. They help detect when a candidate draft is semantically close to the user's usual topics, but they often over-reward topic similarity. Two different founders writing about "AI agents for sales teams" may be semantically close while having very different voices. OpenAI, Voyage, Cohere, BGE, and E5 are primarily retrieval/semantic systems: Cohere Embed v4, for example, advertises multimodal retrieval, 128k context, Matryoshka dimensions, and state-of-the-art retrieval categories, not authorship style.  ￼ BGE-M3 is positioned around multi-functionality, multilinguality, and multi-granularity; E5 is an instruction-oriented multilingual embedding family.  ￼

Production recommendation

Use two embedding spaces:

1. Style embedding space: StyleDistance or STAR.
2. Semantic/topic space: OpenAI/Voyage/BGE/E5.

Then compute:

voice_score = style_similarity(user, draft)
topic_penalty = semantic_similarity_to_usual_topics - style_similarity
confidence = function(num_posts, token_count, dispersion, draft_length)

This lets you catch the classic false positive: "same topic, wrong voice."

⸻

Approach B — Authorship attribution / stylometry classics

Classical stylometry still matters because it captures many details LLMs and semantic embeddings blur away: punctuation, capitalization, emoji habits, sentence length, contractions, function words, preferred discourse markers, markdown habits, and "never says" patterns.

Libraries and baselines

Tool  Use in 2026
scikit-learn char/word n-gram pipelines  Best practical production baseline
writeprints-static  Good feature template; lexical/syntactic Writeprints subset
JStylo  Historical/academic GUI baseline, not modern production SOTA
R stylo / General Impostors  Useful for verification logic and research comparison
VALLA  Benchmarking framework, not a product stack
spaCy / Stanza POS features  Useful only when texts are long enough

writeprints-static aims to reproduce the lexical/syntactic subset of the Writeprints feature set and mimics scikit-learn vectorizer APIs.  ￼ JStylo is a Drexel authorship attribution platform originally released in 2011, useful historically but not a modern production stack by itself.  ￼ The General Impostors method remains conceptually important for open-set verification because it asks whether the claimed author stays similar under feature/impostor perturbations.  ￼ VALLA is useful for standardized authorship attribution and verification benchmarking.  ￼

Are LLMs better than classical features?

For zero-shot or low-resource attribution, frontier LLMs can be very strong. A 2024/2025 authorship paper evaluated LLMs for zero-shot authorship verification and attribution and introduced a forensic-linguistic prompting method, LIP. On the Blog dataset, GPT-4 Turbo with LIP reported 84.45 weighted F1 / 86.67 micro F1 for 10-author attribution, but fell to 60.50 weighted F1 / 62.50 micro F1 for 20 authors. On email, GPT-4 Turbo with LIP reported 88.89 weighted F1 / 90.00 micro F1 for 10 authors and 77.22 weighted F1 / 80.00 micro F1 for 20 authors. The same paper warns that scale to more candidate authors remains a limitation.  ￼

For DearMe, that means:

LLMs are excellent judges and explainers, but I would not use them as the primary scoring engine.

Reasons:

1. Cost is higher than local scoring.
2. Scores are not naturally calibrated.
3. They are sensitive to prompt wording.
4. They may confuse topic, persona, and style.
5. They are vulnerable to prompt injection inside archived posts.

Use LLMs for borderline decisions, revision advice, and "why does this not sound like me?" explanations.

⸻

Approach C — Fine-tuned small models per user

This is appealing, but it is usually not the right Day 0 path.

Options

Option C1: Per-user authorial language model

Train or adapt a small LM on the user's writing and score a draft by perplexity: "How predictable is this draft under this user's language model?" A 2025 PLOS One paper proposes Authorial Language Models, fine-tuning LLMs per candidate author and assigning a query to the model with lowest perplexity; it reports that this meets or exceeds several SOTA attribution benchmarks.  ￼

Pros: elegant, directly measures author-conditioned likelihood, interpretable via token perplexity.

Cons: per-user training is expensive operationally; short archives overfit; likelihood often rewards topical/content familiarity.

Option C2: Per-user LoRA / QLoRA discriminator

Use Qwen 2.5 0.5B/1.5B, Llama 3.2 1B/3B, SmolLM, or similar. Train with:

positive = user archive chunks
negative = same-platform impostor chunks + AI drafts + paraphrased negatives
task = pair classification or contrastive scoring

Pros: can capture quirks; cheap adapters; good for power users.

Cons: not worth it for 50–200 posts; adapter management becomes annoying at 1k–10k users; cold-start is weak.

Option C3: Global verifier with user fingerprint input

Train one global model:

input: user_fingerprint + candidate_draft + channel
output: probability draft matches user voice

This is the best scalable "model" path. You are not training 10,000 models; you are training one verifier that consumes fingerprints.

Costs

For a 1B model LoRA:

Item  Rough practical estimate
Training data per user  5k–50k tokens
Training time  1–5 minutes on L4/A10 for small LoRA
GPU cost  pennies to tens of cents/user depending platform and cold starts
Adapter size  ~10–100MB depending rank/target modules
1,000 users  10–100GB adapter storage
10,000 users  operationally painful unless premium-only

Use peft for LoRA/QLoRA and trl if you train pairwise or preference-style scorers; PyPI currently lists peft 0.19.1 released Apr 16, 2026 and trl 1.4.0 released May 8, 2026.  ￼

Recommendation: do not fine-tune per user for default consumer onboarding. Fine-tune only for enterprise/premium users with large archives and high publishing volume.

⸻

Approach D — LLM-as-judge with archive in context

This works surprisingly well as a secondary judge, not as the cheapest main scorer.

Prompting pattern

Do not just ask:

Does this sound like the same author?

Ask for structured forensic features:

Compare the candidate draft to the user's archive on:
- sentence rhythm
- punctuation habits
- contractions
- first-person use
- hedging / certainty
- humor / warmth
- structure of argument
- vocabulary preferences
- things the user avoids
Return calibrated score, reasons, and revision instructions.

This aligns with the LIP result above: prompt guidance around linguistic features matters.  ￼

Accuracy

There is no public 2026 benchmark that exactly matches:

50 real user posts in context → decide whether this new AI draft sounds like the same user

The closest evidence says frontier LLMs can perform well in small-candidate authorship tasks, especially with linguistic prompting, but performance drops as candidate count grows and the setup is not the same as calibrated consumer "voice match."  ￼

Cost

Use prompt caching. Put the archive or distilled style profile in the cached prefix and pass only the candidate draft per request. Anthropic explicitly prices cache reads at 10% of normal input and notes that prompt caching pays off after one read for 5-minute cache or two reads for 1-hour cache.  ￼

Production pattern:

local_score >= 88: pass
local_score <= 65: discard/regenerate
else: LLM judge with cached style profile

⸻

Approach E — Commercial writing-voice APIs

I would not outsource your core scorer to a commercial "brand voice" tool unless they provide a calibrated authorship-verification API and audited benchmarks. I found many generation features, but very few credible verifier APIs.

Product  What it appears to offer  Verdict for DearMe
Copy.ai Brand Voice  Analyzes on-brand content and generates content aligned to brand voice; supports multiple voices for authors/audiences  Good GTM brand voice feature; not a calibrated same-author verifier
WRITER  Enterprise agent platform with team voices/style guides; April 2026 update says style-guide suggestions can be applied to AI outputs  Enterprise brand/style governance; not per-user voice fingerprint scoring
Lex.page  Style Guides that "train Lex to draft and edit in your voice"  Good workflow/product clue; not public verifier API
Sudowrite  Fiction tool; claims Story Bible/Write generate in your style/voice  Generation-side voice matching for fiction; not verifier API
Personal.ai  Memory/context/identity platform  Memory/persona platform, not writing-style clone scorer
DoppelWriter  Consumer writing voice clone; analyzes rhythm, word choice, punctuation, tone, etc.; says 3 samples minimum  Relevant product, but public claims, not benchmarked API
Hippo / HippoVideo  AI video, avatar, voice/gesture/style for video  Audio/video "voice," not writing stylometry
Bluedot  Meeting recorder/transcriber/summarizer  Not writing voice cloning
Daydream  AI shopping/search/discovery platform  Not relevant to writing voice cloning
YourWriter  I did not find a credible public API matching your described verifier  Treat as unverified

Copy.ai's Brand Voice page says it analyzes existing on-brand content and can generate new content capturing brand essence, including multiple voices for different authors or audiences.  ￼ WRITER's site and changelog emphasize on-brand enterprise work and team voices/style-guide application to AI outputs.  ￼ Lex explicitly lists Style Guides to draft and edit in your voice; Sudowrite says its Story Bible and Write features produce text in your style/voice.  ￼ Personal.ai is a memory/context/identity platform, while Hippo and Bluedot are video/meeting-note products rather than writing-style verification services.  ￼ DoppelWriter is the closest consumer product I found that explicitly markets writing voice cloning, but its public page is product marketing, not a validated API benchmark.  ￼

⸻

Approach F — Generation-side voice-controlled drafting

The winning workflow is not "generate once and score." It is:

retrieve examples → generate N candidates → score → revise with deltas → rescore → publish

Best production workflow

1. Build a voice capsule:
    * sentence length distribution
    * greeting/closing habits
    * punctuation quirks
    * favorite transitions
    * words/phrases to avoid
    * warmth/assertiveness/humor profile
    * examples of "sounds like user" and "too AI-like"
2. Retrieve 5–12 examples, not 50:
    * same channel: LinkedIn vs tweet vs blog vs email
    * similar length
    * style-prototypical, not just topic-nearest
    * deduped to avoid overfitting
3. Generate 3–8 candidates.
4. Score locally.
5. Revise with specific feature deltas:
    * "shorten openings"
    * "remove corporate abstractions"
    * "use more first-person"
    * "reduce em dashes"
    * "add one concrete anecdote"
6. Use LLM judge only if still borderline.

Prompt examples vs RAG vs LoRA vs classifier-guided decoding

Method  Use when  Pros  Cons
System prompt + style capsule  everyone  cheap, fast, explainable  may drift generic
RAG over archive  default  strong, grounded in examples  can copy topics/facts if careless
N-best reranking with style scorer  default  easy with API models; high leverage  extra generation cost
LoRA generation  power users  captures deep quirks  overfits; operationally complex
Token-level classifier-guided decoding  own inference stack only  strongest control  complex; not worth Day 0

Lex, Sudowrite, Granola, and Cursor mostly illustrate the same meta-pattern: persistent instructions, examples, user notes, style guides, or rules are injected into the model context. Lex exposes Style Guides and Knowledge Bases; Sudowrite exposes fiction-specific "in your voice" generation; Granola lets user-written notes guide AI-enhanced meeting notes; Cursor uses persistent rules/instructions for coding behavior.  ￼

⸻

Concrete implementation sketches

The current package versions I would use: sentence-transformers==5.4.1, scikit-learn==1.8.0, faiss-cpu==1.13.2, peft==0.19.1, and trl==1.4.0.  ￼

Tier 1 — Day 0 fingerprint

```python
# pip install sentence-transformers==5.4.1 scikit-learn==1.8.0 numpy
from dataclasses import dataclass
import re
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
STYLE_MODEL = "StyleDistance/styledistance"
@dataclass
class VoiceFingerprint:
    user_id: str
    centroid: np.ndarray
    spread: float
    exemplar_texts: list[str]
    char_vocab: TfidfVectorizer
    char_profile: np.ndarray
    token_count: int
def clean(text: str) -> str:
    text = re.sub(r"https?://\S+", " <URL> ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text
def chunk_posts(posts: list[str], max_chars: int = 1200) -> list[str]:
    chunks = []
    for p in map(clean, posts):
        if len(p) <= max_chars:
            chunks.append(p)
        else:
            chunks.extend(p[i:i + max_chars] for i in range(0, len(p), max_chars))
    return [c for c in chunks if len(c) >= 40]
def trimmed_centroid(X: np.ndarray, keep: float = 0.8) -> tuple[np.ndarray, float]:
    raw = X.mean(axis=0)
    raw /= np.linalg.norm(raw) + 1e-12
    sims = X @ raw
    kept = X[sims >= np.quantile(sims, 1 - keep)]
    c = kept.mean(axis=0)
    c /= np.linalg.norm(c) + 1e-12
    spread = float(np.std(kept @ c))
    return c, spread
def build_fingerprint(user_id: str, posts: list[str]) -> VoiceFingerprint:
    chunks = chunk_posts(posts)
    model = SentenceTransformer(STYLE_MODEL)
    X = model.encode(chunks, normalize_embeddings=True, batch_size=32)
    centroid, spread = trimmed_centroid(np.asarray(X))
    char_vec = TfidfVectorizer(analyzer="char", ngram_range=(2, 5), min_df=1)
    C = char_vec.fit_transform(chunks)
    char_profile = np.asarray(C.mean(axis=0)).ravel()
    sims = np.asarray(X) @ centroid
    exemplar_ids = sims.argsort()[-12:][::-1]
    token_count = sum(len(c.split()) for c in chunks)
    return VoiceFingerprint(
        user_id=user_id,
        centroid=centroid,
        spread=spread,
        exemplar_texts=[chunks[i] for i in exemplar_ids],
        char_vocab=char_vec,
        char_profile=char_profile,
        token_count=token_count,
    )
```

Tier 2 — Ongoing hybrid score

```python
# pip install sentence-transformers==5.4.1 scikit-learn==1.8.0 numpy
import math
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
STYLE_MODEL = SentenceTransformer("StyleDistance/styledistance")
def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))
def confidence_penalty(token_count: int, draft_words: int) -> float:
    if token_count < 2_000:
        return -0.20
    if token_count < 8_000:
        return -0.08
    if draft_words < 40:
        return -0.10
    return 0.0
def score_draft(draft: str, fp, impostor_centroids: np.ndarray) -> dict:
    emb = STYLE_MODEL.encode([draft], normalize_embeddings=True)[0]
    own_sim = float(emb @ fp.centroid)
    impostor_sims = impostor_centroids @ emb
    imp_mu = float(np.mean(impostor_sims))
    imp_sd = float(np.std(impostor_sims) + 1e-6)
    style_z = (own_sim - imp_mu) / imp_sd
    C = fp.char_vocab.transform([draft])
    char_sim = float(cosine_similarity(C, fp.char_profile.reshape(1, -1))[0, 0])
    words = len(draft.split())
    penalty = confidence_penalty(fp.token_count, words)
    # Fit these weights on held-out positives and impostor negatives.
    logit = 1.25 * style_z + 1.75 * char_sim - 0.35 + penalty
    score = 100 * sigmoid(logit)
    if score >= 85:
        action = "pass"
    elif score >= 70:
        action = "revise"
    else:
        action = "discard"
    return {
        "score": round(score, 1),
        "action": action,
        "style_similarity": round(own_sim, 4),
        "impostor_z": round(style_z, 2),
        "char_similarity": round(char_sim, 4),
    }
```

Tier 3 — Scale routing with LLM fallback

```python
# Pseudocode sketch: API worker + local scorer + optional LLM judge.
from dataclasses import dataclass
@dataclass
class ScoreRequest:
    user_id: str
    channel: str
    draft: str
    risk: str  # "low", "normal", "high"
def should_call_llm(local: dict, risk: str) -> bool:
    s = local["score"]
    if risk == "high":
        return True
    return 65 <= s <= 88
def revise_instruction(local: dict) -> str:
    if local["char_similarity"] < 0.35:
        return "Revise surface style: punctuation, sentence rhythm, contractions."
    if local["impostor_z"] < 1.0:
        return "Regenerate with more distinctive author habits and fewer generic phrases."
    return "Lightly revise for voice consistency."
def score_pipeline(req: ScoreRequest, stores, llm_client=None) -> dict:
    fp = stores.fingerprints.get(req.user_id)
    impostors = stores.impostor_index.sample_centroids(
        channel=req.channel,
        exclude_user=req.user_id,
        k=500,
    )
    local = score_draft(req.draft, fp, impostors)
    if not should_call_llm(local, req.risk):
        return {
            **local,
            "judge": "local",
            "revision_hint": revise_instruction(local),
        }
    style_context = stores.prompt_cache.get_or_create(
        key=f"voice:{req.user_id}:{req.channel}",
        value={
            "examples": fp.exemplar_texts[:10],
            "style_rules": stores.voice_capsules.get(req.user_id, req.channel),
        },
    )
    llm = llm_client.judge_voice(
        cached_style_context=style_context,
        candidate=req.draft,
        local_features=local,
        output_schema={
            "score": "0-100",
            "decision": "pass|revise|discard",
            "reasons": "list[str]",
            "revision_instructions": "list[str]",
        },
    )
    # Trust local model for hard rejects; use LLM mainly to resolve ambiguity.
    final_score = 0.65 * local["score"] + 0.35 * llm["score"]
    decision = "pass" if final_score >= 85 else "revise" if final_score >= 70 else "discard"
    return {
        "score": round(final_score, 1),
        "action": decision,
        "judge": "hybrid+llm",
        "local": local,
        "llm_reasons": llm["reasons"],
        "revision_instructions": llm["revision_instructions"],
    }
```

⸻

What is hyped vs what works

Works now: StyleDistance/STAR-style embeddings, char n-gram stylometry, impostor calibration, prompt-cached LLM judges, retrieval examples, N-best reranking.

Overhyped: raw semantic embedding similarity, uncalibrated LLM "confidence," "5 samples is enough" marketing claims, per-user fine-tunes for every consumer, and any commercial "brand voice" tool that does not publish verifier benchmarks.

Most important product decision: make your 85% and 70% thresholds empirical percentiles. For each user, build validation pairs:

positive: held-out user posts, lightly edited user posts, accepted user drafts
negative: same-channel impostor posts, generic AI drafts, topic-matched impostor posts

Then calibrate scores so "85%" means: "on our validation distribution, this looks more like the user than 85% of plausible alternatives," not "the model feels 85% sure.""
