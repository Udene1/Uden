-- Keep durable graph-node intent aligned with the JSON tool contract even when
-- older persistence code does not explicitly bind the newer columns.
CREATE TRIGGER IF NOT EXISTS task_graph_nodes_runtime_intent_after_insert
AFTER INSERT ON task_graph_nodes
WHEN json_valid(NEW.tool_input_json)
BEGIN
  UPDATE task_graph_nodes
  SET runtime_capability = COALESCE(NEW.runtime_capability, json_extract(NEW.tool_input_json, '$.runtimeCapability')),
      preferred_runtime_kind = COALESCE(NEW.preferred_runtime_kind, json_extract(NEW.tool_input_json, '$.preferredRuntimeKind')),
      risk_level = CASE
        WHEN json_extract(NEW.tool_input_json, '$.runtimeCapability') IN ('network.outbound') AND json_extract(NEW.tool_input_json, '$.preferredRuntimeKind') = 'desktop_local' THEN 'critical'
        WHEN json_extract(NEW.tool_input_json, '$.runtimeCapability') IN ('filesystem.write','git.write','network.outbound') THEN 'high'
        ELSE COALESCE(NEW.risk_level, 'medium')
      END,
      latency_preference = COALESCE(NEW.latency_preference, 'balanced')
  WHERE id = NEW.id AND graph_id = NEW.graph_id AND tenant_id = NEW.tenant_id;
END;

CREATE TRIGGER IF NOT EXISTS task_graph_nodes_runtime_intent_after_update
AFTER UPDATE OF tool_input_json, runtime_capability, preferred_runtime_kind ON task_graph_nodes
WHEN json_valid(NEW.tool_input_json)
BEGIN
  UPDATE task_graph_nodes
  SET runtime_capability = COALESCE(NEW.runtime_capability, json_extract(NEW.tool_input_json, '$.runtimeCapability')),
      preferred_runtime_kind = COALESCE(NEW.preferred_runtime_kind, json_extract(NEW.tool_input_json, '$.preferredRuntimeKind')),
      risk_level = CASE
        WHEN COALESCE(NEW.runtime_capability, json_extract(NEW.tool_input_json, '$.runtimeCapability')) = 'network.outbound'
          AND COALESCE(NEW.preferred_runtime_kind, json_extract(NEW.tool_input_json, '$.preferredRuntimeKind')) = 'desktop_local' THEN 'critical'
        WHEN COALESCE(NEW.runtime_capability, json_extract(NEW.tool_input_json, '$.runtimeCapability')) IN ('filesystem.write','git.write','network.outbound') THEN 'high'
        ELSE COALESCE(NEW.risk_level, 'medium')
      END
  WHERE id = NEW.id AND graph_id = NEW.graph_id AND tenant_id = NEW.tenant_id;
END;
