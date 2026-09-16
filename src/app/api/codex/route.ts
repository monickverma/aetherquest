import { handle, ok } from "@/lib/api";
import { loadDeeds } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const raw = new URL(request.url).searchParams.get("page");
    const page = Math.max(0, Math.min(500, Number.parseInt(raw ?? "0", 10) || 0));
    return ok({ page, ...(await loadDeeds(user.id, page)) });
  });
}
