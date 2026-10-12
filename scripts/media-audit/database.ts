import type { Client, QueryResult } from "pg";
import { configHash, inspectSource } from "./references";
import type { Asset, AuditConfig, File, Snapshot, Usage } from "./types";

// Enumerated content-bearing fields only: never SELECT * or export user credentials.
export const SOURCE_FIELDS: Record<string, string[]> = {
  contents: ["body", "url", "metadata"],
  coaching_sessions: ["bodyMarkdown", "bodyMetadata", "summary"],
  lesson_materials: ["objectKey"],
  courses: ["description", "thumbnailUrl"], modules: ["description"], lessons: ["description"],
  products: ["description", "descriptionMetadata"],
  coaching_offerings: ["description"], coaching_offering_session_templates: ["summary"],
  posts: ["bodyMarkdown", "excerpt"], post_comments: ["bodyMarkdown"],
  discussions: ["body"], discussion_replies: ["body"], lesson_notes: ["body"],
  coaching_session_logs: ["body"], coaching_session_messages: ["bodyMarkdown"],
  profiles: ["avatarUrl", "bio", "headline", "website"],
  organizations: ["description", "logoUrl"], categories: ["description"],
  signup_drafts: ["avatarUrl"], identities: ["providerAvatarUrl"],
  quizzes: ["description"], questions: ["prompt", "explanation"], question_options: ["label"],
  assignments: ["description"], submissions: ["content", "fileUrl", "feedback"],
  reviews: ["comment"], quiz_answers: ["answerText"],
  forms: ["description"], form_questions: ["prompt", "description", "metadata"],
  form_options: ["label", "value"], form_answers: ["textValue"],
};
const EXCLUDED_TABLES = ["auth_sessions", "audit_logs", "idempotency_keys", "_prisma_migrations"];
const MEDIA_TABLES = ["media_assets", "media_files", "media_usages", "media_uploads", "media_deletion_jobs"];
const quote = (value: string) => '"' + value.replaceAll('"', '""') + '"';

/** Caller supplies a dedicated, connected client; no app singleton or dotenv. */
export async function readSnapshot(client: Client, config: AuditConfig, limits = { pageSize: 500, maxRows: 200000, maxBytes: 128 * 1024 * 1024 }): Promise<Snapshot> {
  if (![limits.pageSize, limits.maxRows, limits.maxBytes].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error("INVALID_SCAN_LIMIT");
  const startedAt = new Date().toISOString();
  await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  try {
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL idle_in_transaction_session_timeout = '30s'");
    const info = (await client.query("SELECT txid_current_snapshot()::text AS snapshot, current_setting('transaction_read_only') AS readonly")).rows[0];
    if (info.readonly !== "on") throw new Error("READ_ONLY_TRANSACTION_REQUIRED");
    const schema = (await client.query<{ table_name: string; column_name: string; data_type: string }>(
      "SELECT table_name,column_name,data_type FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position",
    )).rows;
    const columns = new Map<string, Set<string>>();
    for (const row of schema) {
      if (!columns.has(row.table_name)) columns.set(row.table_name, new Set());
      columns.get(row.table_name)!.add(row.column_name);
    }
    const mediaCount = MEDIA_TABLES.filter(table => columns.has(table)).length;
    const result: Snapshot = {
      version: 1, startedAt, finishedAt: "", databaseSnapshot: info.snapshot, configHash: configHash(config),
      mediaSchema: mediaCount === 0 ? "ABSENT" : mediaCount === MEDIA_TABLES.length ? "PRESENT" : "PARTIAL",
      sources: [], assets: [], files: [], usages: [], contexts: { lessons: [], sessions: [] },
      coverage: { scanned: [], excludedTables: EXCLUDED_TABLES, unknownColumns: [] }, issues: [],
    };
    const rlsTables = await client.query<{ relname: string }>("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relrowsecurity");
    for (const row of rlsTables.rows) {
      if (SOURCE_FIELDS[row.relname] || MEDIA_TABLES.includes(row.relname)) result.issues.push({ code: "RLS_VISIBILITY_REVIEW_REQUIRED", source: row.relname });
    }
    let totalRows = 0, totalBytes = 0;
    async function rows<T>(table: string, selected: string[], visit: (row: T) => Promise<void>) {
      let after: string | null = null;
      let count = 0;
      while (true) {
        const page: QueryResult<Record<string, unknown>> = await client.query(
          `SELECT ${selected.map(quote).join(",")} FROM public.${quote(table)} WHERE ($1::text IS NULL OR id::text > $1) ORDER BY id::text LIMIT $2`,
          [after, limits.pageSize],
        );
        for (const row of page.rows) {
          totalRows++; count++; totalBytes += Buffer.byteLength(JSON.stringify(row));
          if (totalRows > limits.maxRows || totalBytes > limits.maxBytes || Date.now() - Date.parse(startedAt) > 120000) throw new Error("DATABASE_SCAN_LIMIT");
          await visit(row as T);
        }
        if (page.rows.length < limits.pageSize) break;
        after = String(page.rows.at(-1)!.id);
      }
      result.coverage.scanned.push({ table, columns: selected, rows: count });
    }
    // Identity contexts are suggestions about current editors, not ownership proof.
    const courseEditors = new Map<string, string>();
    await rows<{ id: string; instructorId: string }>("courses", ["id", "instructorId"], async row => { courseEditors.set(row.id, row.instructorId); });
    const moduleCourses = new Map<string, string>();
    await rows<{ id: string; courseId: string }>("modules", ["id", "courseId"], async row => { moduleCourses.set(row.id, row.courseId); });
    await rows<{ id: string; moduleId: string }>("lessons", ["id", "moduleId"], async row => {
      const courseId = moduleCourses.get(row.moduleId)!;
      result.contexts.lessons.push({ id: row.id, courseId, editorId: courseEditors.get(courseId)! });
    });
    const lessons = new Map(result.contexts.lessons.map(row => [row.id, row]));
    for (const [table, fields] of Object.entries(SOURCE_FIELDS)) {
      if (!columns.has(table) || fields.some(field => !columns.get(table)!.has(field))) {
        result.issues.push({ code: "SOURCE_SCHEMA_MISSING", source: table });
        continue;
      }
      const contextFields = table === "contents" ? ["lessonId"] : table === "coaching_sessions" ? ["coachId"] : [];
      await rows<Record<string, unknown>>(table, ["id", ...fields, ...contextFields], async row => {
        const id = String(row.id);
        const source = `${table}:${id}`;
        if (table === "contents") {
          const editor = lessons.get(String(row.lessonId))?.editorId;
          result.sources.push(await inspectSource(source, { body: row.body as string | null, url: row.url as string | null, metadata: row.metadata }, config, result.issues, { contentId: id }, editor ? [editor] : []));
        } else if (table === "coaching_sessions") {
          result.contexts.sessions.push({ id, editorId: String(row.coachId) });
          result.sources.push(await inspectSource(source, { body: row.bodyMarkdown as string | null, metadata: row.bodyMetadata }, config, result.issues, { coachingSessionId: id }, [String(row.coachId)]));
          if (row.summary) result.sources.push(await inspectSource(`${source}:summary`, { body: row.summary as string }, config, result.issues));
        } else {
          for (const field of fields) {
            const value = row[field];
            if (value === null || value === undefined) continue;
            const sourceField = `${source}:${field}`;
            const body = typeof value === "string" ? { body: value, url: value } : { metadata: value };
            const inspected = await inspectSource(sourceField, body, config, result.issues, undefined, [], value);
            if (table === "lesson_materials" && field === "objectKey") {
              inspected.groups.push([{ key: String(value) }]);
              inspected.possibleKeys = inspected.possibleKeys.filter(key => key !== value);
            }
            result.sources.push(inspected);
          }
        }
      });
    }
    if (result.mediaSchema === "PRESENT") {
      await rows<Record<string, unknown>>("media_assets", ["id", "scope", "owner_user_id", "layout", "library_status", "storage_status", "retention_hold"], async r => {
        result.assets.push({ id: r.id, scope: r.scope, ownerUserId: r.owner_user_id, layout: r.layout, libraryStatus: r.library_status, storageStatus: r.storage_status, retentionHold: r.retention_hold !== null } as Asset);
      });
      await rows<Record<string, unknown>>("media_files", ["id", "asset_id", "bucket", "object_key", "url_key", "status", "role", "byte_size", "verified_at"], async r => {
        result.files.push({ id: r.id, assetId: r.asset_id, bucket: r.bucket, objectKey: r.object_key, urlKey: r.url_key, status: r.status, role: r.role, byteSize: r.byte_size === null ? null : String(r.byte_size), verified: r.verified_at !== null } as File);
      });
      await rows<Record<string, unknown>>("media_usages", ["id", "asset_id", "content_id", "coaching_session_id", "occurrence_count"], async r => {
        result.usages.push({ assetId: r.asset_id, contentId: r.content_id, coachingSessionId: r.coaching_session_id, occurrenceCount: r.occurrence_count } as Usage);
      });
    } else if (result.mediaSchema === "PARTIAL") result.issues.push({ code: "PARTIAL_MEDIA_SCHEMA" });
    for (const column of schema) {
      if (EXCLUDED_TABLES.includes(column.table_name) || MEDIA_TABLES.includes(column.table_name)) continue;
      if (!/text|character|json/i.test(column.data_type)) continue;
      if (/(?:url|body|metadata|content|description|attachment|objectkey|thumbnail|avatar|prompt|feedback|textvalue)/i.test(column.column_name) && !SOURCE_FIELDS[column.table_name]?.includes(column.column_name)) {
        result.coverage.unknownColumns.push(`${column.table_name}.${column.column_name}`);
      }
    }
    if (result.coverage.unknownColumns.length) result.issues.push({ code: "SOURCE_COVERAGE_REVIEW_REQUIRED" });
    result.finishedAt = new Date().toISOString();
    await client.query("ROLLBACK");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
