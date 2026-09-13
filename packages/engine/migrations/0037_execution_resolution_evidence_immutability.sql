-- Once a contradiction has been resolved, its evidence chain is an audit record.
-- Prevent later mutation or cascading deletion from rewriting what justified resolution.

DROP TRIGGER IF EXISTS execution_resolved_contradiction_update_guard;
CREATE TRIGGER execution_resolved_contradiction_update_guard
BEFORE UPDATE ON execution_contradictions
WHEN OLD.status='resolved'
BEGIN
  SELECT RAISE(ABORT, 'Resolved execution contradiction evidence is immutable');
END;

DROP TRIGGER IF EXISTS execution_resolved_contradiction_delete_guard;
CREATE TRIGGER execution_resolved_contradiction_delete_guard
BEFORE DELETE ON execution_contradictions
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.contradiction_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolved execution contradiction evidence cannot be deleted');
END;

DROP TRIGGER IF EXISTS execution_resolution_validation_update_guard;
CREATE TRIGGER execution_resolution_validation_update_guard
BEFORE UPDATE ON execution_validations
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.validation_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolution validation evidence is immutable');
END;

DROP TRIGGER IF EXISTS execution_resolution_validation_delete_guard;
CREATE TRIGGER execution_resolution_validation_delete_guard
BEFORE DELETE ON execution_validations
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.validation_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolution validation evidence cannot be deleted');
END;

DROP TRIGGER IF EXISTS execution_resolution_action_update_guard;
CREATE TRIGGER execution_resolution_action_update_guard
BEFORE UPDATE ON execution_corrective_actions
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.corrective_action_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolution corrective-action evidence is immutable');
END;

DROP TRIGGER IF EXISTS execution_resolution_action_delete_guard;
CREATE TRIGGER execution_resolution_action_delete_guard
BEFORE DELETE ON execution_corrective_actions
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.corrective_action_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolution corrective-action evidence cannot be deleted');
END;

DROP TRIGGER IF EXISTS execution_resolution_plan_update_guard;
CREATE TRIGGER execution_resolution_plan_update_guard
BEFORE UPDATE ON execution_plan_revisions
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.plan_revision_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolution plan evidence is immutable');
END;

DROP TRIGGER IF EXISTS execution_resolution_plan_delete_guard;
CREATE TRIGGER execution_resolution_plan_delete_guard
BEFORE DELETE ON execution_plan_revisions
WHEN EXISTS (SELECT 1 FROM execution_contradiction_resolutions r WHERE r.plan_revision_id=OLD.id)
BEGIN
  SELECT RAISE(ABORT, 'Resolution plan evidence cannot be deleted');
END;

DROP TRIGGER IF EXISTS execution_resolution_diagnosis_update_guard;
CREATE TRIGGER execution_resolution_diagnosis_update_guard
BEFORE UPDATE ON execution_diagnoses
WHEN EXISTS (
  SELECT 1
  FROM execution_contradiction_resolutions r
  JOIN execution_corrective_actions a ON a.id=r.corrective_action_id
  WHERE a.diagnosis_id=OLD.id
)
BEGIN
  SELECT RAISE(ABORT, 'Resolution diagnosis evidence is immutable');
END;

DROP TRIGGER IF EXISTS execution_resolution_diagnosis_delete_guard;
CREATE TRIGGER execution_resolution_diagnosis_delete_guard
BEFORE DELETE ON execution_diagnoses
WHEN EXISTS (
  SELECT 1
  FROM execution_contradiction_resolutions r
  JOIN execution_corrective_actions a ON a.id=r.corrective_action_id
  WHERE a.diagnosis_id=OLD.id
)
BEGIN
  SELECT RAISE(ABORT, 'Resolution diagnosis evidence cannot be deleted');
END;
