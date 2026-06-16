import { z } from "zod";

import type { Shelter, ShelterStatus } from "@/lib/types";

const FLOOD_UNSAFE_KEYWORDS = ["지하", "반지하", "지하주차", "주차장", "지하철", "지하상가"];

export interface ShelterOperation {
  id: string;
  name: string;
  address: string;
  position: { lat: number; lng: number };
  capacity: number;
  status: ShelterStatus;
  underground: boolean;
  type: string;
  source: string;
  checkedAt: string | null;
}

export const shelterOperationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  address: z.string().min(1),
  position: z.object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  }),
  capacity: z.number().int().nonnegative(),
  status: z.enum(["OPERATING", "CHECK_REQUIRED", "EXCLUDED"]),
  underground: z.boolean(),
  type: z.string().min(1),
  source: z.string().min(1),
  checkedAt: z.string().nullable(),
});

const STALE_MS = 7 * 24 * 60 * 60 * 1000;

export const isShelterStatusStale = (checkedAt: string | null, now = new Date()) => {
  if (!checkedAt) return true;
  const checkedTime = new Date(checkedAt).getTime();
  if (!Number.isFinite(checkedTime)) return true;
  return now.getTime() - checkedTime > STALE_MS;
};

export const displayShelterStatus = (
  status: ShelterStatus,
  checkedAt: string | null,
  now = new Date(),
): ShelterStatus => {
  if (isShelterStatusStale(checkedAt, now)) return "CHECK_REQUIRED";
  return status;
};

export const isFloodUnsafeShelter = ({
  name,
  address,
  underground,
  type,
}: Pick<Shelter, "name" | "address" | "underground" | "type">): boolean => {
  if (underground) return true;

  const target = `${name} ${address} ${type}`;
  return FLOOD_UNSAFE_KEYWORDS.some((keyword) => target.includes(keyword));
};

export const deriveFloodShelterStatus = (shelter: Shelter): ShelterStatus => {
  if (isFloodUnsafeShelter(shelter)) return "EXCLUDED";
  return shelter.status;
};

export const toShelterOperation = (
  shelter: Shelter,
  checkedAt: string | null,
  source = "이재민 임시주거시설 데이터",
): ShelterOperation =>
  shelterOperationSchema.parse({
    ...shelter,
    checkedAt,
    source,
  });
