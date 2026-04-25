/**
 * Shared input parser for Ahona quick-reply create / update. Lives
 * outside route.ts so both the POST collection handler and the PATCH
 * /[id] handler share validation.
 */

export type QuickReplyInput = {
  parentId: string | null;
  displayOrder: number;
  surface: "PUBLIC" | "PORTAL" | "BOTH";
  labelEn: string;
  labelBn: string;
  responseEn: string;
  responseBn: string;
  isContactCard: boolean;
  isPublished: boolean;
};

const ALLOWED_SURFACES = new Set(["PUBLIC", "PORTAL", "BOTH"]);

export function parseQuickReply(
  body: Record<string, unknown>,
): QuickReplyInput | { error: string } {
  const labelEn = str(body.labelEn);
  const labelBn = str(body.labelBn);
  if (!labelEn || !labelBn) {
    return { error: "labelEn and labelBn are required" };
  }

  const surface = str(body.surface).toUpperCase() || "BOTH";
  if (!ALLOWED_SURFACES.has(surface)) {
    return {
      error: `surface must be one of: ${[...ALLOWED_SURFACES].join(", ")}`,
    };
  }

  const isContactCard = !!body.isContactCard;
  const responseEn = str(body.responseEn);
  const responseBn = str(body.responseBn);
  if (!isContactCard && (!responseEn || !responseBn)) {
    return {
      error:
        "responseEn and responseBn are required unless this node is a contact card",
    };
  }

  // parentId: null or a string. Accept "" as null.
  const parentRaw = body.parentId;
  const parentId =
    typeof parentRaw === "string" && parentRaw.trim() !== ""
      ? parentRaw.trim()
      : null;

  return {
    parentId,
    displayOrder: intOrZero(body.displayOrder),
    surface: surface as "PUBLIC" | "PORTAL" | "BOTH",
    labelEn,
    labelBn,
    responseEn,
    responseBn,
    isContactCard,
    isPublished: body.isPublished == null ? true : !!body.isPublished,
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function intOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
