import { handle, ok } from "@/lib/api";
import { loadVault } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok(await loadVault(user));
  });
}
