import { handle, ok } from "@/lib/api";
import { completeQuest, undoCompletion } from "@/lib/mutations";
import { requireUser } from "@/lib/session";

type Context = { params: Promise<{ id: string }> };

/**
 * The body is ignored on purpose. The client names a quest; the server decides
 * what completing it is worth, from the difficulty stored on the row.
 */
export async function POST(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    const result = await completeQuest(user, id);
    return ok({ ...result });
  });
}

/** Undo today's completion, returning the XP and gold. */
export async function DELETE(_request: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireUser();
    const { id } = await params;
    return ok({ snapshot: await undoCompletion(user, id) });
  });
}
