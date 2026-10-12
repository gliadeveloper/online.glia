import { normalizeBlockNoteWrite } from "@/lib/media/normalize-blocknote";
export async function POST(request: Request) {
  return Response.json(await normalizeBlockNoteWrite(await request.json()));
}
