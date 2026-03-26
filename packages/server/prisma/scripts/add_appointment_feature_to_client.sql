-- ============================================================
-- Migration: Add appointment pages & actions for CLIENT + ACCOUNTANT roles
-- Feature: gestion-rendez-vous (already exists)
-- ============================================================

-- 1. Add appointment pages
INSERT INTO "pages" ("PageUrl", "slug", "featureId", "createdAt", "updatedAt")
VALUES
  ('/appointments',          'appointments-list',     (SELECT id FROM "features" WHERE slug = 'gestion-rendez-vous'), NOW(), NOW()),
  ('/appointments/:id',      'appointment-detail',    (SELECT id FROM "features" WHERE slug = 'gestion-rendez-vous'), NOW(), NOW()),
  ('/appointments/calendar', 'appointments-calendar', (SELECT id FROM "features" WHERE slug = 'gestion-rendez-vous'), NOW(), NOW()),
  ('/appointments/history',  'appointments-history',  (SELECT id FROM "features" WHERE slug = 'gestion-rendez-vous'), NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE SET
  "PageUrl"   = EXCLUDED."PageUrl",
  "featureId" = EXCLUDED."featureId",
  "updatedAt" = NOW();

-- 2. Add appointment actions
INSERT INTO "actions" ("name", "code", "category", "pageId", "createdAt", "updatedAt")
VALUES
  ('Voir la liste des rendez-vous',    'VIEW_APPOINTMENTS',         'read',  (SELECT id FROM "pages" WHERE slug = 'appointments-list'),     NOW(), NOW()),
  ('Créer un rendez-vous',             'CREATE_APPOINTMENT',        'write', (SELECT id FROM "pages" WHERE slug = 'appointments-list'),     NOW(), NOW()),
  ('Voir le détail d''un rendez-vous', 'VIEW_APPOINTMENT_DETAIL',   'read',  (SELECT id FROM "pages" WHERE slug = 'appointment-detail'),    NOW(), NOW()),
  ('Modifier un rendez-vous',          'UPDATE_APPOINTMENT',        'write', (SELECT id FROM "pages" WHERE slug = 'appointment-detail'),    NOW(), NOW()),
  ('Annuler un rendez-vous',           'CANCEL_APPOINTMENT',        'write', (SELECT id FROM "pages" WHERE slug = 'appointment-detail'),    NOW(), NOW()),
  ('Reporter un rendez-vous',          'REPORT_APPOINTMENT',        'write', (SELECT id FROM "pages" WHERE slug = 'appointment-detail'),    NOW(), NOW()),
  ('Voir le calendrier',               'VIEW_APPOINTMENTS_CALENDAR','read',  (SELECT id FROM "pages" WHERE slug = 'appointments-calendar'), NOW(), NOW()),
  ('Voir l''historique des reports',   'VIEW_APPOINTMENTS_HISTORY', 'read',  (SELECT id FROM "pages" WHERE slug = 'appointments-history'),  NOW(), NOW()),
  ('Voir les disponibilités',          'VIEW_AVAILABILITY_SLOTS',   'read',  (SELECT id FROM "pages" WHERE slug = 'appointments-list'),     NOW(), NOW())
ON CONFLICT ("code") DO UPDATE SET
  "name"      = EXCLUDED."name",
  "category"  = EXCLUDED."category",
  "pageId"    = EXCLUDED."pageId",
  "updatedAt" = NOW();

-- 3. Assign feature gestion-rendez-vous to CLIENT role
INSERT INTO "p_features" ("role_id", "feature_id")
VALUES (
  (SELECT id FROM "roles" WHERE code = 'CLIENT'),
  (SELECT id FROM "features" WHERE slug = 'gestion-rendez-vous')
)
ON CONFLICT ("role_id", "feature_id") DO NOTHING;

-- 4. Assign pages to CLIENT role
INSERT INTO "p_pages" ("role_id", "page_id")
SELECT (SELECT id FROM "roles" WHERE code = 'CLIENT'), id
FROM "pages"
WHERE slug IN ('appointments-list', 'appointment-detail', 'appointments-calendar', 'appointments-history')
ON CONFLICT ("role_id", "page_id") DO NOTHING;

-- 5. Assign actions to CLIENT role
INSERT INTO "role_actions" ("roleId", "actionId", "createdAt", "updatedAt")
SELECT (SELECT id FROM "roles" WHERE code = 'CLIENT'), id, NOW(), NOW()
FROM "actions"
WHERE code IN (
  'VIEW_APPOINTMENTS', 'CREATE_APPOINTMENT', 'VIEW_APPOINTMENT_DETAIL',
  'UPDATE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'REPORT_APPOINTMENT',
  'VIEW_APPOINTMENTS_CALENDAR', 'VIEW_APPOINTMENTS_HISTORY', 'VIEW_AVAILABILITY_SLOTS'
)
ON CONFLICT ("roleId", "actionId") DO NOTHING;

-- 6. Assign feature gestion-rendez-vous to ACCOUNTANT role
INSERT INTO "p_features" ("role_id", "feature_id")
VALUES (
  (SELECT id FROM "roles" WHERE code = 'ACCOUNTANT'),
  (SELECT id FROM "features" WHERE slug = 'gestion-rendez-vous')
)
ON CONFLICT ("role_id", "feature_id") DO NOTHING;

-- 7. Assign pages to ACCOUNTANT role
INSERT INTO "p_pages" ("role_id", "page_id")
SELECT (SELECT id FROM "roles" WHERE code = 'ACCOUNTANT'), id
FROM "pages"
WHERE slug IN ('appointments-list', 'appointment-detail', 'appointments-calendar', 'appointments-history')
ON CONFLICT ("role_id", "page_id") DO NOTHING;

-- 8. Assign actions to ACCOUNTANT role
INSERT INTO "role_actions" ("roleId", "actionId", "createdAt", "updatedAt")
SELECT (SELECT id FROM "roles" WHERE code = 'ACCOUNTANT'), id, NOW(), NOW()
FROM "actions"
WHERE code IN (
  'VIEW_APPOINTMENTS', 'CREATE_APPOINTMENT', 'VIEW_APPOINTMENT_DETAIL',
  'UPDATE_APPOINTMENT', 'CANCEL_APPOINTMENT', 'REPORT_APPOINTMENT',
  'VIEW_APPOINTMENTS_CALENDAR', 'VIEW_APPOINTMENTS_HISTORY', 'VIEW_AVAILABILITY_SLOTS'
)
ON CONFLICT ("roleId", "actionId") DO NOTHING;
