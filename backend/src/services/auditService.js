import { AuditLog } from '../models/index.js';

export async function writeAuditLog({
  actorId = null,
  actorRole = null,
  actionCode,
  entityType = null,
  entityId = null,
  before = null,
  after = null,
  ip = null,
}) {
  return AuditLog.create({
    actor_id: actorId,
    actor_role: actorRole,
    action_code: actionCode,
    entity_type: entityType,
    entity_id: entityId,
    before_json: before,
    after_json: after,
    ip,
  });
}
