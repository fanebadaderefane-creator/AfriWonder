-- Remplace AfriConnect par AfriWonder dans les documents légaux et infos entité (marque AfriWonder)
UPDATE legal_documents
SET
  title = REPLACE(REPLACE(title, 'AfriConnect', 'AfriWonder'), 'africonnect.', 'afriwonder.'),
  content = REPLACE(REPLACE(content, 'AfriConnect', 'AfriWonder'), 'africonnect.', 'afriwonder.')
WHERE title LIKE '%AfriConnect%' OR content LIKE '%AfriConnect%' OR content LIKE '%africonnect.%';

UPDATE legal_entity_info
SET
  company_name = REPLACE(company_name, 'AfriConnect', 'AfriWonder'),
  email = REPLACE(email, 'africonnect.', 'afriwonder.'),
  dpo_email = REPLACE(dpo_email, 'africonnect.', 'afriwonder.')
WHERE company_name LIKE '%AfriConnect%' OR email LIKE '%africonnect.%' OR dpo_email LIKE '%africonnect.%';
