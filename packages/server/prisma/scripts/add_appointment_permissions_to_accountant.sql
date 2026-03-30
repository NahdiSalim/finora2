-- Add gestion-rendez-vous permissions to ACCOUNTANT role
-- Run with: npx prisma db execute --file prisma/scripts/add_appointment_permissions_to_accountant.sql

DO $$
DECLARE
  v_accountant_role_id INTEGER;
  v_action_id INTEGER;
  v_page_id INTEGER;
  v_feature_id INTEGER;
  v_action_codes TEXT[] := ARRAY[
    'VIEW_MEETINGS',
    'CREATE_MEETING',
    'VIEW_MEETING_DETAIL',
    'UPDATE_MEETING',
    'DELETE_MEETING'
  ];
  v_code TEXT;
BEGIN
  -- Get ACCOUNTANT role id
  SELECT id INTO v_accountant_role_id FROM "Role" WHERE code = 'ACCOUNTANT';
  IF v_accountant_role_id IS NULL THEN
    RAISE EXCEPTION 'ACCOUNTANT role not found';
  END IF;

  FOREACH v_code IN ARRAY v_action_codes LOOP
    -- Get action id
    SELECT a.id, p.id, p."featureId"
      INTO v_action_id, v_page_id, v_feature_id
      FROM "Action" a
      JOIN "Pages" p ON p.id = a."pageId"
      WHERE a.code = v_code;

    IF v_action_id IS NULL THEN
      RAISE NOTICE 'Action % not found, skipping', v_code;
      CONTINUE;
    END IF;

    -- Insert RoleAction (ignore if already exists)
    INSERT INTO "RoleAction" ("roleId", "actionId", "createdAt", "updatedAt")
    VALUES (v_accountant_role_id, v_action_id, NOW(), NOW())
    ON CONFLICT ("roleId", "actionId") DO NOTHING;

    -- Insert p_pages (ignore if already exists)
    INSERT INTO "p_pages" ("role_id", "page_id", "createdAt", "updatedAt")
    VALUES (v_accountant_role_id, v_page_id, NOW(), NOW())
    ON CONFLICT ("role_id", "page_id") DO NOTHING;

    -- Insert p_features (ignore if already exists)
    INSERT INTO "p_features" ("role_id", "feature_id", "createdAt", "updatedAt")
    VALUES (v_accountant_role_id, v_feature_id, NOW(), NOW())
    ON CONFLICT ("role_id", "feature_id") DO NOTHING;

    RAISE NOTICE 'Permission % granted to ACCOUNTANT', v_code;
  END LOOP;

  RAISE NOTICE 'Done. Appointment permissions added to ACCOUNTANT role.';
END $$;
