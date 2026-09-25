import { readContentRecord } from "@/lib/cms/content-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await readContentRecord();
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
