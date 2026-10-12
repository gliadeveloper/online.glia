-- Additive media foundation. No backfill, R2 I/O, or deletion worker is enabled.
-- Policy: docs/media-asset-database-design.md section 10.
-- Keep the partial indexes and deferred constraints when editing future migrations.
BEGIN;

CREATE TABLE media_assets (
  id text PRIMARY KEY,
  scope text NOT NULL CHECK (scope IN ('SHARED','PERSONAL','UNCLASSIFIED')),
  owner_user_id text REFERENCES users(id) ON DELETE RESTRICT,
  created_by_id text REFERENCES users(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('IMAGE','VIDEO','AUDIO')),
  original_name text NOT NULL,
  layout text NOT NULL CHECK (layout IN ('CANONICAL','LEGACY')),
  library_status text NOT NULL DEFAULT 'ACTIVE' CHECK (library_status IN ('ACTIVE','TRASHED')),
  storage_status text NOT NULL DEFAULT 'PENDING'
    CHECK (storage_status IN ('PENDING','READY','ABANDONED','DELETING','DELETED')),
  retention_hold text,
  trashed_at timestamptz,
  trash_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_owner_chk CHECK (
    (scope = 'PERSONAL' AND owner_user_id IS NOT NULL)
    OR (scope = 'SHARED' AND owner_user_id IS NULL)
    OR (scope = 'UNCLASSIFIED' AND owner_user_id IS NULL AND layout = 'LEGACY')),
  CONSTRAINT media_assets_state_chk CHECK (
    (library_status = 'ACTIVE' AND storage_status IN ('PENDING','READY','ABANDONED'))
    OR (library_status = 'TRASHED' AND storage_status IN ('READY','DELETING','DELETED'))),
  CONSTRAINT media_assets_trash_chk CHECK (
    (library_status = 'ACTIVE' AND trashed_at IS NULL AND trash_expires_at IS NULL)
    OR (library_status = 'TRASHED' AND trashed_at IS NOT NULL
        AND trash_expires_at IS NOT NULL AND trash_expires_at >= trashed_at))
);

CREATE TABLE media_files (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  role text NOT NULL CHECK (role IN ('ORIGINAL','THUMBNAIL','PLAYBACK')),
  bucket text NOT NULL,
  object_key text NOT NULL,
  url_key text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','READY','RETIRED','DELETED')),
  is_current boolean NOT NULL DEFAULT false,
  mime_type text,
  byte_size bigint,
  sha256 text,
  etag text,
  width integer CHECK (width IS NULL OR width > 0),
  height integer CHECK (height IS NULL OR height > 0),
  duration_ms bigint CHECK (duration_ms IS NULL OR duration_ms >= 0),
  metadata_checked_at timestamptz,
  verified_at timestamptz,
  cleanup_requested_at timestamptz,
  next_sweep_at timestamptz,
  last_absence_observed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key),
  UNIQUE (url_key),
  CONSTRAINT media_files_verified_chk CHECK (
    (verified_at IS NULL AND sha256 IS NULL AND byte_size IS NULL AND mime_type IS NULL)
    OR (verified_at IS NOT NULL AND metadata_checked_at IS NOT NULL
        AND mime_type IS NOT NULL AND byte_size IS NOT NULL AND byte_size > 0
        AND sha256 IS NOT NULL AND sha256 ~ '^[0-9a-f]{64}$')),
  CONSTRAINT media_files_ready_chk CHECK (status <> 'READY' OR verified_at IS NOT NULL),
  CONSTRAINT media_files_current_chk CHECK (
    NOT is_current OR (role IN ('THUMBNAIL','PLAYBACK') AND status = 'READY')),
  CONSTRAINT media_files_cleanup_chk CHECK (
    (status IN ('RETIRED','DELETED') AND cleanup_requested_at IS NOT NULL AND next_sweep_at IS NOT NULL)
    OR (status IN ('PENDING','READY') AND cleanup_requested_at IS NULL AND next_sweep_at IS NULL)),
  CONSTRAINT media_files_deleted_chk CHECK (status <> 'DELETED' OR last_absence_observed_at IS NOT NULL)
);
CREATE UNIQUE INDEX media_files_original_uidx ON media_files(asset_id) WHERE role = 'ORIGINAL';
CREATE UNIQUE INDEX media_files_current_uidx ON media_files(asset_id, role) WHERE is_current;
CREATE INDEX media_files_asset_idx ON media_files(asset_id);
CREATE INDEX media_files_sweep_idx ON media_files(next_sweep_at) WHERE status IN ('RETIRED','DELETED');

CREATE TABLE media_usages (
  id text PRIMARY KEY,
  asset_id text NOT NULL REFERENCES media_assets(id) ON DELETE RESTRICT,
  content_id text REFERENCES contents(id) ON DELETE RESTRICT,
  coaching_session_id text REFERENCES coaching_sessions(id) ON DELETE RESTRICT,
  occurrence_count integer NOT NULL CHECK (occurrence_count > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(content_id, coaching_session_id) = 1)
);
CREATE UNIQUE INDEX media_usages_content_uidx ON media_usages(asset_id, content_id) WHERE content_id IS NOT NULL;
CREATE UNIQUE INDEX media_usages_coaching_uidx ON media_usages(asset_id, coaching_session_id) WHERE coaching_session_id IS NOT NULL;
CREATE INDEX media_usages_content_idx ON media_usages(content_id);
CREATE INDEX media_usages_coaching_idx ON media_usages(coaching_session_id);
CREATE INDEX media_usages_asset_idx ON media_usages(asset_id);

CREATE TABLE media_uploads (
  id text PRIMARY KEY,
  file_id text NOT NULL UNIQUE REFERENCES media_files(id) ON DELETE RESTRICT,
  requested_by_id text REFERENCES users(id) ON DELETE SET NULL,
  source_kind text NOT NULL CHECK (source_kind IN ('CLIENT','DERIVATION')),
  recipe jsonb,
  staging_object_key text NOT NULL UNIQUE,
  expected_mime_type text NOT NULL,
  expected_byte_size bigint CHECK (expected_byte_size IS NULL OR expected_byte_size > 0),
  upload_expires_at timestamptz NOT NULL,
  deadline_at timestamptz NOT NULL,
  phase text NOT NULL DEFAULT 'ISSUED'
    CHECK (phase IN ('ISSUED','VALIDATING','PROMOTING','COMPLETED','ABANDONED')),
  source_etag text,
  validated_at timestamptz,
  lease_token text,
  lease_expires_at timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  completed_at timestamptz,
  abandoned_at timestamptz,
  staging_cleanup_due_at timestamptz,
  staging_last_absent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (upload_expires_at <= deadline_at),
  CHECK (source_kind <> 'CLIENT' OR expected_byte_size IS NOT NULL),
  CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL)),
  CHECK (lease_token IS NULL OR phase IN ('VALIDATING','PROMOTING')),
  CHECK ((phase = 'COMPLETED') = (completed_at IS NOT NULL)),
  CHECK ((phase = 'ABANDONED') = (abandoned_at IS NOT NULL)),
  CHECK (phase NOT IN ('PROMOTING','COMPLETED') OR (source_etag IS NOT NULL AND validated_at IS NOT NULL)),
  CHECK ((phase IN ('COMPLETED','ABANDONED')) = (staging_cleanup_due_at IS NOT NULL))
);
CREATE INDEX media_uploads_due_idx ON media_uploads(next_attempt_at) WHERE phase IN ('ISSUED','VALIDATING','PROMOTING');
CREATE INDEX media_uploads_lease_idx ON media_uploads(lease_expires_at) WHERE phase IN ('VALIDATING','PROMOTING');
CREATE INDEX media_uploads_staging_idx ON media_uploads(staging_cleanup_due_at) WHERE phase IN ('COMPLETED','ABANDONED');

CREATE TABLE media_deletion_jobs (
  id text PRIMARY KEY,
  asset_id text NOT NULL UNIQUE REFERENCES media_assets(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED','RUNNING','RETRY','CANCELLED','SUCCEEDED')),
  requested_by_id text REFERENCES users(id) ON DELETE SET NULL,
  next_attempt_at timestamptz NOT NULL,
  lease_token text,
  lease_expires_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((lease_token IS NULL) = (lease_expires_at IS NULL)),
  CHECK ((status = 'RUNNING') = (lease_token IS NOT NULL)),
  CHECK ((status = 'SUCCEEDED') = (completed_at IS NOT NULL))
);
CREATE INDEX media_deletion_jobs_due_idx ON media_deletion_jobs(status, next_attempt_at);
CREATE INDEX media_deletion_jobs_lease_idx ON media_deletion_jobs(lease_expires_at) WHERE status = 'RUNNING';
CREATE INDEX media_assets_library_idx ON media_assets(owner_user_id, library_status, storage_status, created_at DESC);
CREATE INDEX media_assets_shared_idx ON media_assets(scope, library_status, storage_status, kind, created_at DESC);
CREATE INDEX media_assets_trash_idx ON media_assets(trash_expires_at)
  WHERE library_status = 'TRASHED' AND storage_status = 'READY' AND scope <> 'UNCLASSIFIED' AND retention_hold IS NULL;

CREATE FUNCTION media_guard_asset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'media asset tombstones must be retained'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.storage_status <> 'PENDING' THEN RAISE EXCEPTION 'asset must start PENDING'; END IF;
    RETURN NEW;
  END IF;
  IF ROW(NEW.id, NEW.kind, NEW.layout) IS DISTINCT FROM ROW(OLD.id, OLD.kind, OLD.layout) THEN
    RAISE EXCEPTION 'immutable asset identity';
  END IF;
  IF ROW(NEW.scope, NEW.owner_user_id) IS DISTINCT FROM ROW(OLD.scope, OLD.owner_user_id)
     AND NOT (OLD.scope = 'UNCLASSIFIED' AND NEW.scope IN ('SHARED','PERSONAL')
              AND OLD.storage_status = 'READY' AND NEW.storage_status = 'READY') THEN
    RAISE EXCEPTION 'only one-time legacy classification is allowed';
  END IF;
  IF NEW.retention_hold IS DISTINCT FROM OLD.retention_hold AND OLD.storage_status IN ('DELETING','DELETED') THEN
    RAISE EXCEPTION 'cannot change hold after deletion claim';
  END IF;
  IF NEW.storage_status IS DISTINCT FROM OLD.storage_status AND NOT (
    (OLD.storage_status = 'PENDING' AND NEW.storage_status IN ('READY','ABANDONED')) OR
    (OLD.storage_status = 'READY' AND NEW.storage_status = 'DELETING') OR
    (OLD.storage_status = 'DELETING' AND NEW.storage_status = 'DELETED')) THEN
    RAISE EXCEPTION 'invalid asset transition';
  END IF;
  IF NEW.storage_status = 'DELETING' AND OLD.storage_status <> 'DELETING' THEN
    IF OLD.library_status <> 'TRASHED' OR NEW.library_status <> 'TRASHED'
       OR OLD.trash_expires_at > clock_timestamp() OR NEW.retention_hold IS NOT NULL
       OR NEW.scope = 'UNCLASSIFIED'
       OR EXISTS (SELECT 1 FROM media_usages WHERE asset_id = NEW.id) THEN
      RAISE EXCEPTION 'asset not eligible for deletion';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_asset_guard BEFORE INSERT OR UPDATE OR DELETE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION media_guard_asset();

CREATE FUNCTION media_guard_file() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a media_assets%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'media file tombstones must be retained'; END IF;
  SELECT * INTO STRICT a FROM media_assets WHERE id = NEW.asset_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'PENDING' OR
       (NEW.role = 'ORIGINAL' AND a.storage_status <> 'PENDING') OR
       (NEW.role <> 'ORIGINAL' AND a.storage_status <> 'READY') THEN
      RAISE EXCEPTION 'file must start PENDING on an eligible asset';
    END IF;
  ELSE
    IF ROW(NEW.id, NEW.asset_id, NEW.role, NEW.bucket, NEW.object_key, NEW.url_key)
       IS DISTINCT FROM ROW(OLD.id, OLD.asset_id, OLD.role, OLD.bucket, OLD.object_key, OLD.url_key) THEN
      RAISE EXCEPTION 'immutable file identity';
    END IF;
    IF OLD.verified_at IS NOT NULL AND ROW(NEW.mime_type, NEW.byte_size, NEW.sha256, NEW.verified_at, NEW.metadata_checked_at)
       IS DISTINCT FROM ROW(OLD.mime_type, OLD.byte_size, OLD.sha256, OLD.verified_at, OLD.metadata_checked_at) THEN
      RAISE EXCEPTION 'verified file content is immutable';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'PENDING' AND NEW.status IN ('READY','RETIRED')) OR
      (OLD.status = 'READY' AND NEW.status = 'RETIRED') OR
      (OLD.status = 'RETIRED' AND NEW.status = 'DELETED')) THEN
      RAISE EXCEPTION 'invalid file transition';
    END IF;
  END IF;
  IF NEW.status = 'READY' AND a.storage_status NOT IN ('PENDING','READY') THEN
    RAISE EXCEPTION 'closed asset cannot publish files';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_file_guard BEFORE INSERT OR UPDATE OR DELETE ON media_files
  FOR EACH ROW EXECUTE FUNCTION media_guard_file();

CREATE FUNCTION media_guard_usage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text; st text;
BEGIN
  IF TG_OP = 'DELETE' THEN target := OLD.asset_id; ELSE target := NEW.asset_id; END IF;
  SELECT storage_status INTO STRICT st FROM media_assets WHERE id = target FOR UPDATE;
  IF TG_OP = 'UPDATE' AND ROW(NEW.id, NEW.asset_id, NEW.content_id, NEW.coaching_session_id)
     IS DISTINCT FROM ROW(OLD.id, OLD.asset_id, OLD.content_id, OLD.coaching_session_id) THEN
    RAISE EXCEPTION 'replace usage via delete and insert';
  END IF;
  IF TG_OP <> 'DELETE' AND st <> 'READY' THEN RAISE EXCEPTION 'usage requires READY asset'; END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER media_usage_guard BEFORE INSERT OR UPDATE OR DELETE ON media_usages
  FOR EACH ROW EXECUTE FUNCTION media_guard_usage();

CREATE FUNCTION media_guard_upload() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a media_assets%ROWTYPE; f media_files%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'preparation history must be retained'; END IF;
  SELECT ma.* INTO STRICT a FROM media_assets ma JOIN media_files mf ON mf.asset_id = ma.id
    WHERE mf.id = NEW.file_id FOR UPDATE OF ma;
  SELECT * INTO STRICT f FROM media_files WHERE id = NEW.file_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.phase <> 'ISSUED' THEN RAISE EXCEPTION 'preparation must start ISSUED'; END IF;
  ELSE
    IF ROW(NEW.id, NEW.file_id, NEW.source_kind, NEW.staging_object_key, NEW.upload_expires_at, NEW.deadline_at,
           NEW.expected_mime_type, NEW.expected_byte_size, NEW.recipe)
       IS DISTINCT FROM ROW(OLD.id, OLD.file_id, OLD.source_kind, OLD.staging_object_key, OLD.upload_expires_at, OLD.deadline_at,
           OLD.expected_mime_type, OLD.expected_byte_size, OLD.recipe) THEN
      RAISE EXCEPTION 'immutable preparation identity';
    END IF;
    IF OLD.source_etag IS NOT NULL AND ROW(NEW.source_etag, NEW.validated_at)
       IS DISTINCT FROM ROW(OLD.source_etag, OLD.validated_at) THEN
      RAISE EXCEPTION 'validated source is immutable';
    END IF;
    IF NEW.phase IS DISTINCT FROM OLD.phase AND NOT (
      (OLD.phase = 'ISSUED' AND NEW.phase IN ('VALIDATING','ABANDONED')) OR
      (OLD.phase = 'VALIDATING' AND NEW.phase IN ('PROMOTING','ABANDONED')) OR
      (OLD.phase = 'PROMOTING' AND NEW.phase IN ('COMPLETED','ABANDONED'))) THEN
      RAISE EXCEPTION 'invalid preparation transition';
    END IF;
  END IF;
  IF NEW.phase IN ('ISSUED','VALIDATING','PROMOTING')
     OR (TG_OP = 'UPDATE' AND OLD.phase <> 'COMPLETED' AND NEW.phase = 'COMPLETED') THEN
    IF f.status <> 'PENDING' OR
       (f.role = 'ORIGINAL' AND a.storage_status <> 'PENDING') OR
       (f.role <> 'ORIGINAL' AND a.storage_status <> 'READY') THEN
      RAISE EXCEPTION 'preparation target no longer eligible';
    END IF;
  END IF;
  IF NEW.phase IN ('VALIDATING','PROMOTING','COMPLETED')
     AND (TG_OP = 'INSERT' OR NEW.phase IS DISTINCT FROM OLD.phase)
     AND NEW.deadline_at <= clock_timestamp() THEN
    RAISE EXCEPTION 'preparation deadline elapsed';
  END IF;
  IF NEW.phase IN ('PROMOTING','COMPLETED') AND f.verified_at IS NULL THEN
    RAISE EXCEPTION 'promotion requires pinned verification';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_upload_guard BEFORE INSERT OR UPDATE OR DELETE ON media_uploads
  FOR EACH ROW EXECUTE FUNCTION media_guard_upload();

CREATE FUNCTION media_guard_deletion_job() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a media_assets%ROWTYPE;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'deletion history must be retained'; END IF;
  SELECT * INTO STRICT a FROM media_assets WHERE id = NEW.asset_id FOR UPDATE;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'SCHEDULED' THEN RAISE EXCEPTION 'deletion must start SCHEDULED'; END IF;
  ELSE
    IF ROW(NEW.id, NEW.asset_id) IS DISTINCT FROM ROW(OLD.id, OLD.asset_id) THEN
      RAISE EXCEPTION 'immutable deletion identity';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
      (OLD.status = 'SCHEDULED' AND NEW.status IN ('RUNNING','CANCELLED')) OR
      (OLD.status = 'RUNNING' AND NEW.status IN ('RETRY','SUCCEEDED')) OR
      (OLD.status = 'RETRY' AND NEW.status = 'RUNNING') OR
      (OLD.status = 'CANCELLED' AND NEW.status = 'SCHEDULED')) THEN
      RAISE EXCEPTION 'invalid deletion job transition';
    END IF;
  END IF;
  IF (NEW.status = 'SCHEDULED' AND (a.storage_status <> 'READY' OR a.library_status <> 'TRASHED'
      OR a.scope = 'UNCLASSIFIED' OR a.retention_hold IS NOT NULL
      OR EXISTS (SELECT 1 FROM media_usages WHERE asset_id = a.id))) OR
     (NEW.status IN ('RUNNING','RETRY') AND a.storage_status <> 'DELETING') OR
     (NEW.status = 'SUCCEEDED' AND a.storage_status <> 'DELETED') THEN
    RAISE EXCEPTION 'deletion job does not match asset';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER media_deletion_job_guard BEFORE INSERT OR UPDATE OR DELETE ON media_deletion_jobs
  FOR EACH ROW EXECUTE FUNCTION media_guard_deletion_job();

CREATE FUNCTION media_assert_asset(target text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE a media_assets%ROWTYPE; original_state text; originals bigint; deletion_state text;
BEGIN
  SELECT * INTO a FROM media_assets WHERE id = target FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT count(*), min(status) INTO originals, original_state
    FROM media_files WHERE asset_id = target AND role = 'ORIGINAL';
  IF originals <> 1 THEN RAISE EXCEPTION 'asset % requires exactly one original', target; END IF;
  IF (a.storage_status = 'PENDING' AND original_state <> 'PENDING') OR
     (a.storage_status = 'READY' AND original_state <> 'READY') OR
     (a.storage_status IN ('ABANDONED','DELETING') AND EXISTS
       (SELECT 1 FROM media_files WHERE asset_id = target AND status NOT IN ('RETIRED','DELETED'))) OR
     (a.storage_status = 'DELETED' AND EXISTS (SELECT 1 FROM media_files WHERE asset_id = target AND status <> 'DELETED')) THEN
    RAISE EXCEPTION 'asset/file state mismatch for %', target;
  END IF;
  IF a.storage_status IN ('ABANDONED','DELETING','DELETED') AND EXISTS (
    SELECT 1 FROM media_uploads u JOIN media_files f ON f.id = u.file_id
    WHERE f.asset_id = target AND u.phase IN ('ISSUED','VALIDATING','PROMOTING')) THEN
    RAISE EXCEPTION 'closed asset has active preparation';
  END IF;
  IF a.storage_status <> 'READY' AND EXISTS (SELECT 1 FROM media_usages WHERE asset_id = target) THEN
    RAISE EXCEPTION 'non-READY asset has usages';
  END IF;
  IF EXISTS (
    SELECT 1 FROM media_files f LEFT JOIN media_uploads u ON u.file_id = f.id
    WHERE f.asset_id = target AND (
      ((a.layout = 'CANONICAL' OR f.role <> 'ORIGINAL') AND u.id IS NULL) OR
      (u.phase IN ('ISSUED','VALIDATING','PROMOTING') AND f.status <> 'PENDING') OR
      (u.phase = 'COMPLETED' AND f.status = 'PENDING') OR
      (u.phase = 'ABANDONED' AND f.status NOT IN ('RETIRED','DELETED')))) THEN
    RAISE EXCEPTION 'file/preparation state mismatch for %', target;
  END IF;
  SELECT status INTO deletion_state FROM media_deletion_jobs WHERE asset_id = target;
  IF (a.storage_status = 'DELETING' AND coalesce(deletion_state, '') NOT IN ('RUNNING','RETRY')) OR
     (a.storage_status = 'DELETED' AND coalesce(deletion_state, '') <> 'SUCCEEDED') OR
     (deletion_state IN ('RUNNING','RETRY') AND a.storage_status <> 'DELETING') OR
     (deletion_state = 'SUCCEEDED' AND a.storage_status <> 'DELETED') OR
     (deletion_state = 'SCHEDULED' AND (a.storage_status <> 'READY' OR a.library_status <> 'TRASHED'
       OR a.retention_hold IS NOT NULL OR a.scope = 'UNCLASSIFIED'
       OR EXISTS (SELECT 1 FROM media_usages WHERE asset_id = target))) THEN
    RAISE EXCEPTION 'asset/deletion job state mismatch for %', target;
  END IF;
END $$;
CREATE FUNCTION media_asset_consistency_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM media_assert_asset(NEW.id); RETURN NULL; END $$;
CREATE FUNCTION media_file_consistency_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM media_assert_asset(NEW.asset_id); RETURN NULL; END $$;
CREATE FUNCTION media_upload_consistency_trg() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target text;
BEGIN
  SELECT asset_id INTO STRICT target FROM media_files WHERE id = NEW.file_id;
  PERFORM media_assert_asset(target); RETURN NULL;
END $$;
CREATE FUNCTION media_deletion_consistency_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM media_assert_asset(NEW.asset_id); RETURN NULL; END $$;
CREATE FUNCTION media_usage_consistency_trg() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN PERFORM media_assert_asset(OLD.asset_id);
  ELSE PERFORM media_assert_asset(NEW.asset_id); END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER media_asset_consistency AFTER INSERT OR UPDATE ON media_assets
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION media_asset_consistency_trg();
CREATE CONSTRAINT TRIGGER media_file_consistency AFTER INSERT OR UPDATE ON media_files
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION media_file_consistency_trg();
CREATE CONSTRAINT TRIGGER media_upload_consistency AFTER INSERT OR UPDATE ON media_uploads
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION media_upload_consistency_trg();
CREATE CONSTRAINT TRIGGER media_deletion_consistency AFTER INSERT OR UPDATE ON media_deletion_jobs
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION media_deletion_consistency_trg();
CREATE CONSTRAINT TRIGGER media_usage_consistency AFTER INSERT OR UPDATE OR DELETE ON media_usages
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION media_usage_consistency_trg();

COMMIT;
