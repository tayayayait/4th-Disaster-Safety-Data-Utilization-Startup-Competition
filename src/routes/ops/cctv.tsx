import { createFileRoute } from "@tanstack/react-router";

import { FieldCctv } from "@/components/field/FieldCctv";

export const Route = createFileRoute("/ops/cctv")({
  head: () => ({
    meta: [{ title: "전국 CCTV | 현장정보" }],
  }),
  component: FieldCctv,
});
