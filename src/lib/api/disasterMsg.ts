import { z } from "zod";

import type { DisasterMessage } from "./types";

const disasterMessageSchema = z.object({
  id: z.string().min(1),
  region: z.string().min(1),
  body: z.string().min(1),
  issuedAt: z.string().min(1),
  source: z.string().min(1),
  emergencyLevel: z.string().optional(),
  disasterType: z.string().optional(),
  registeredDate: z.string().optional(),
  modifiedDate: z.string().optional(),
});

const disasterMessagesResponseSchema = z.object({
  messages: z.array(disasterMessageSchema),
});

const moisDisasterMessageItemSchema = z.object({
  SN: z.union([z.string(), z.number()]),
  CRT_DT: z.string().min(1),
  MSG_CN: z.string().min(1),
  RCPTN_RGN_NM: z.string().min(1),
  EMRG_STEP_NM: z.string().optional(),
  DST_SE_NM: z.string().optional(),
  REG_YMD: z.string().optional(),
  MDFCN_YMD: z.string().optional(),
});

export const normalizeMoisDisasterMessage = (
  item: z.infer<typeof moisDisasterMessageItemSchema>,
): DisasterMessage => ({
  id: String(item.SN),
  region: item.RCPTN_RGN_NM,
  body: item.MSG_CN,
  issuedAt: item.CRT_DT,
  source: "MOIS-DSSP-IF-00247",
  emergencyLevel: item.EMRG_STEP_NM,
  disasterType: item.DST_SE_NM,
  registeredDate: item.REG_YMD,
  modifiedDate: item.MDFCN_YMD,
});

export const parseMoisDisasterMessage = (data: unknown): DisasterMessage =>
  normalizeMoisDisasterMessage(moisDisasterMessageItemSchema.parse(data));

export const parseDisasterMessages = (data: unknown): DisasterMessage[] =>
  disasterMessagesResponseSchema.parse(data).messages;

export const disasterMessagesSchema = z.array(disasterMessageSchema);
