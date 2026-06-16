export interface DisasterMessagesApiRequest {
  apiUrl: string;
  serviceKey: string;
  numOfRows: number;
  pageNo: number;
  returnType?: "json" | "xml";
  crtDt?: string;
  rgnNm?: string;
}

export interface NormalizedDisasterMessage {
  id: string;
  region: string;
  body: string;
  issuedAt: string;
  source: string;
  emergencyLevel?: string;
  disasterType?: string;
  registeredDate?: string;
  modifiedDate?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const compactText = (value: unknown) => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
};

const pickText = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = compactText(record[key]);
    if (value) return value;
  }
  return "";
};

export const buildDisasterMessagesUrl = ({
  apiUrl,
  serviceKey,
  numOfRows,
  pageNo,
  returnType = "json",
  crtDt,
  rgnNm,
}: DisasterMessagesApiRequest) => {
  const url = new URL(apiUrl);
  url.searchParams.set("serviceKey", serviceKey);
  url.searchParams.set("numOfRows", String(numOfRows));
  url.searchParams.set("pageNo", String(pageNo));
  url.searchParams.set("returnType", returnType);
  if (crtDt) url.searchParams.set("crtDt", crtDt);
  if (rgnNm) url.searchParams.set("rgnNm", rgnNm);
  return url;
};

export const normalizeDisasterMessageItem = (
  item: Record<string, unknown>,
): NormalizedDisasterMessage | null => {
  const id = pickText(item, ["SN", "sn"]);
  const issuedAt = pickText(item, ["CRT_DT", "crtDt", "crt_dt"]);
  const body = pickText(item, ["MSG_CN", "msgCn", "msg_cn"]);
  const region = pickText(item, ["RCPTN_RGN_NM", "rcptnRgnNm", "rcptn_rgn_nm"]);

  if (!id || !issuedAt || !body || !region) return null;

  return {
    id,
    region,
    body,
    issuedAt,
    source: "MOIS-DSSP-IF-00247",
    emergencyLevel: pickText(item, ["EMRG_STEP_NM", "emrgStepNm", "emrg_step_nm"]) || undefined,
    disasterType: pickText(item, ["DST_SE_NM", "dstSeNm", "dst_se_nm"]) || undefined,
    registeredDate: pickText(item, ["REG_YMD", "regYmd", "reg_ymd"]) || undefined,
    modifiedDate: pickText(item, ["MDFCN_YMD", "mdfcnYmd", "mdfcn_ymd"]) || undefined,
  };
};

const arrayFrom = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) return [value];
  return [];
};

export const extractDisasterMessageItems = (upstream: unknown): unknown[] => {
  if (Array.isArray(upstream)) return upstream;
  if (!isRecord(upstream)) return [];

  const response = upstream.response;
  if (isRecord(response)) {
    const body = response.body;
    if (isRecord(body)) {
      const items = body.items;
      if (isRecord(items) && "item" in items) return arrayFrom(items.item);
      if ("item" in body) return arrayFrom(body.item);
    }
  }

  const body = upstream.body;
  if (isRecord(body)) {
    const items = body.items;
    if (isRecord(items) && "item" in items) return arrayFrom(items.item);
    if ("item" in body) return arrayFrom(body.item);
  }

  for (const key of ["items", "item", "data", "list", "result"]) {
    if (key in upstream) return arrayFrom(upstream[key]);
  }

  return [];
};

export const normalizeDisasterMessagesResponse = (upstream: unknown): NormalizedDisasterMessage[] =>
  extractDisasterMessageItems(upstream)
    .filter(isRecord)
    .map(normalizeDisasterMessageItem)
    .filter((message): message is NormalizedDisasterMessage => message !== null);
