-- Add gestion-rendez-vous permissions to ACCOUNTANT role
-- Inserts roleAction, p_pages, p_features for all meeting actions

DO $$
DECLARE
  v_role_id INT;
  v_action_id INT;
  v_page_id INT;
  v_feature_id INT;
  action_code TEXT;
  meeting_action_codes TEXT[] := ARRAY[
    'VIEW_MEETINGS',
    'CREATE_MEETING',
    'VIEW_MEETING_DETAIL',
    'UPDATE_MEETING',
    'DELETE_MEETING'
  ];
BEGIN
  -- Get ACCOUNTANT role id
  SELECT id INTO v_role_id FROM "roles" WHERE code = 'ACCOUNTANT';
  IF v_role_id IS NULL THEN
    RAISE NOTICE 'ACCOUNTANT role not found, skipping';
    RETURN;
  END IF;

  FOREACH action_code IN ARRAY meeting_action_codes LOOP
    -- Get action id
    SELECT a.id, p.id, f.id
    INTO v_action_id, v_page_id, v_feature_id
    FROM "actions" a
    JOIN "pages" p ON p.id = a."pageId"
    JOIN "features" f ON f.id = p."featureId"
    WHERE a.code = action_code
    LIMIT 1;

    IF v_action_id IS NULL THEN
      RAISE NOTICE 'Action % not found, skipping', action_code;
      CONTINUE;
    END IF;

    -- roleAction
    INSERT INTO "role_actions" ("roleId", "actionId")
    VALUES (v_role_id, v_action_id)
    ON CONFLICT ("roleId", "actionId") DO NOTHING;

    -- p_pages
    INSERT INTO "p_pages" ("role_id", "page_id")
    VALUES (v_role_id, v_page_id)
    ON CONFLICT ("role_id", "page_id") DO NOTHING;

    -- p_features
    INSERT INTO "p_features" ("role_id", "feature_id")
    VALUES (v_role_id, v_feature_id)
    ON CONFLICT ("role_id", "feature_id") DO NOTHING;

  END LOOP;

  RAISE NOTICE 'Appointment permissions added to ACCOUNTANT role';
END $$;
