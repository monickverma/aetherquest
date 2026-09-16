import { handle, ok, readJson } from "@/lib/api";
import { deleteQuest, updateQuest } from "@/lib/mutations";
import { buildSnapshot } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { updateQuestSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const input = await readJson(request, updateQuestSchema);
    await updateQuest(user, id, input);
    return ok({ snapshot: await buildSnapshot(user) });
  });
}

export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    await deleteQuest(user, id);
    return ok({ snapshot: await buildSnapshot(user) });
  });
}
