import { handle, ok, readJson } from "@/lib/api";
import { createQuest } from "@/lib/mutations";
import { buildSnapshot } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { createQuestSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({ snapshot: await buildSnapshot(user) });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const user = await requireUser();
    const input = await readJson(request, createQuestSchema);
    const quest = await createQuest(user, input);
    return ok({ questId: quest.id, snapshot: await buildSnapshot(user) }, 201);
  });
}
