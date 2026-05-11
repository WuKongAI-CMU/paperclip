import { Router } from "express";
import { z } from "zod";
import type { Db } from "@paperclipai/db";
import {
  VOICE_GATE_ARTIFACT_KINDS,
  VOICE_GATE_PATH,
  type VoiceGateScoreRequest,
} from "@paperclipai/dearme-ai-proxy";
import { requireDearMeApiKey } from "../middleware/dearme-api-key-auth.js";
import { validate } from "../middleware/validate.js";
import {
  dearMeVoiceGateService,
  type DearMeVoiceGateService,
  type DearMeVoiceProfileStore,
  type DearMeVoiceSemanticScorer,
} from "../services/dearme-voice-gate.js";

const voiceGateScoreRequestSchema = z.object({
  fingerprintId: z.string().trim().min(1).max(256),
  text: z.string().min(1).max(50_000),
  kind: z.enum(VOICE_GATE_ARTIFACT_KINDS),
  minScore: z.number().int().min(0).max(100).optional(),
}).strict();

export function dearMeVoiceGateRoutes(db: Db, options: {
  voiceGate?: DearMeVoiceGateService;
  profileStore?: DearMeVoiceProfileStore;
  semanticScorer?: DearMeVoiceSemanticScorer | null;
} = {}) {
  const router = Router();
  const voiceGate = options.voiceGate ?? dearMeVoiceGateService({
    profileStore: options.profileStore,
    semanticScorer: options.semanticScorer ?? undefined,
  });

  router.post(
    VOICE_GATE_PATH,
    requireDearMeApiKey(db),
    validate(voiceGateScoreRequestSchema),
    async (req, res) => {
      const result = await voiceGate.scoreVoice(req.body as VoiceGateScoreRequest);
      res.json(result);
    },
  );

  return router;
}
