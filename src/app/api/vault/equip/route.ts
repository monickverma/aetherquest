import { handle, ok, readJson } from "@/lib/api";
import { equipItem } from "@/lib/mutations";
import { loadVault } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { equipSchema } from "@/lib/validation";

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { slot, itemId } = await readJson(request, equipSchema);
    const snapshot = await equipItem(user, slot, itemId);
    return ok({ snapshot, vault: await loadVault(user) });
  });
}
