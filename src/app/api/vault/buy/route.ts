import { z } from "zod";

import { handle, ok, readJson } from "@/lib/api";
import { buyItem } from "@/lib/mutations";
import { loadVault } from "@/lib/queries";
import { requireUser } from "@/lib/session";

const buySchema = z.object({ itemId: z.string().trim().min(1).max(80) });

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { itemId } = await readJson(request, buySchema);
    const { item, snapshot } = await buyItem(user, itemId);
    return ok({
      purchased: { id: item.id, name: item.name, kind: item.kind, rarity: item.rarity },
      snapshot,
      vault: await loadVault(user),
    });
  });
}
