import { handle, ok } from "@/lib/api";
import { endSession } from "@/lib/session";

export async function POST() {
  return handle(async () => {
    await endSession();
    return ok({ signedOut: true });
  });
}
