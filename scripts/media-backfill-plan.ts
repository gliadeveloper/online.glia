import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildBackfillPlan } from "./media-audit/backfill-plan";

async function main() {
  const { values } = parseArgs({ options: { help: { type: "boolean" }, config: { type: "string" }, snapshot: { type: "string" }, inventory: { type: "string" }, out: { type: "string" } } });
  if (values.help) {
    console.log("기존 자산 등록 사전 명세 (오프라인 전용, DB/R2 변경 없음)\n사용법: npm run media:backfill-plan -- --config config.json --snapshot snapshot.json --inventory inventory.json --out /secure/new-directory"); return;
  }
  if (!values.config || !values.snapshot || !values.inventory || !values.out) throw new Error("INPUT_REQUIRED");
  const read = async (file: string) => {
    if ((await fs.stat(file)).size > 128 * 1024 * 1024) throw new Error("INPUT_TOO_LARGE");
    return JSON.parse(await fs.readFile(file, "utf8"));
  };
  const plan = buildBackfillPlan(await read(values.snapshot), await read(values.inventory), await read(values.config));
  const out = path.resolve(values.out);
  await fs.mkdir(path.dirname(out), { recursive: true, mode: 0o700 });
  await fs.mkdir(out, { mode: 0o700 });
  const write = (name: string, value: unknown) => fs.writeFile(path.join(out, name), JSON.stringify(value, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  await write("plan.private.json", plan);
  await write("manifest.json", { complete: true, inputs: plan.inputs, applyAllowed: false, deletionAuthorized: false });
  console.log(JSON.stringify({ ...plan.summary, applyAllowed: false, deletionAuthorized: false }));
}
main().catch(() => { console.error("기존 자산 사전 명세 생성 실패: 입력·설정 지문·목록 완결성·새 출력 경로를 확인하세요."); process.exitCode = 1; });
