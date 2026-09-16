import { handle, ok, readJson } from "@/lib/api";
import { renameCharacter } from "@/lib/mutations";
import { requireUser } from "@/lib/session";
import { renameCharacterSchema } from "@/lib/validation";

export async function PATCH(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const { name } = await readJson(request, renameCharacterSchema);
    return ok({ snapshot: await renameCharacter(user, name) });
  });
}
