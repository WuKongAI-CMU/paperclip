import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  DM_PROXY_HEADERS,
  isDearMeApiKey,
  VOICE_GATE_ARTIFACT_KINDS,
  VOICE_GATE_PATH,
  type VoiceGateScoreRequest,
} from "@paperclipai/dearme-ai-proxy";
import { unauthorized } from "../errors.js";
import { validate } from "../middleware/validate.js";
import {
  dearMeVoiceGateService,
  type DearMeVoiceGateService,
  type DearMeVoiceProfileStore,
} from "../services/dearme-voice-gate.js";

const voiceGateScoreRequestSchema = z.object({
  fingerprintId: z.string().trim().min(1).max(256),
  text: z.string().min(1).max(50_000),
  kind: z.enum(VOICE_GATE_ARTIFACT_KINDS),
  minScore: z.number().int().min(0).max(100).optional(),
}).strict();

function bearerTokenFromAuthorizationHeader(rawHeader: string | undefined): string | null {
  if (!rawHeader) return null;
  const [scheme, token, extra] = rawHeader.trim().split(/\s+/);
  if (scheme?.toLowerCase() !== "bearer" || !token || extra) return null;
  return token;
}

function requireDearMeApiKey(req: Request, _res: Response, next: NextFunction) {
  const token = bearerTokenFromAuthorizationHeader(req.get(DM_PROXY_HEADERS.authorization));
  if (!token || !isDearMeApiKey(token)) {
    throw unauthorized("DearMe API key required");
  }
  next();
}

export function dearMeVoiceGateRoutes(options: {
  voiceGate?: DearMeVoiceGateService;
  profileStore?: DearMeVoiceProfileStore;
} = {}) {
  const router = Router();
  const voiceGate = options.voiceGate ?? dearMeVoiceGateService({
    profileStore: options.profileStore,
  });

  router.post(
    VOICE_GATE_PATH,
    requireDearMeApiKey,
    validate(voiceGateScoreRequestSchema),
    async (req, res) => {
      const result = await voiceGate.scoreVoice(req.body as VoiceGateScoreRequest);
      res.json(result);
    },
  );

  return router;
}
