-- ============================================================
-- Seeder: Dictionary sample data (numeric PK)
-- ============================================================

-- 1️⃣ dict_entries
INSERT INTO dict_entries (entry_id, lang, headword, pos, ipa, audio_url, created_at, updated_at)
VALUES (1, 'en', 'go', 'verb', '/ɡoʊ/', NULL, NOW(), NOW()),
       (2, 'en', 'depart', 'verb', '/dɪˈpɑːrt/', NULL, NOW(), NOW()),
       (3, 'en', 'stay', 'verb', '/steɪ/', NULL, NOW(), NOW());

-- 2️⃣ dict_forms
INSERT INTO dict_forms (form_id, entry_id, form, morph_tag, is_lemma, created_at, updated_at)
VALUES (1, 1, 'go', 'V-INF', TRUE, NOW(), NOW()),
       (2, 1, 'goes', 'V-3SG', FALSE, NOW(), NOW()),
       (3, 1, 'went', 'V-PAST', FALSE, NOW(), NOW()),
       (4, 1, 'gone', 'V-PP', FALSE, NOW(), NOW());

-- 3️⃣ dict_senses
INSERT INTO dict_senses (sense_id, entry_id, "order", short_def, created_at, updated_at)
VALUES (1, 1, 1, 'to move or travel from one place to another', NOW(), NOW()),
       (2, 1, 2, 'to leave a place', NOW(), NOW());

-- 4️⃣ dict_examples
INSERT INTO dict_examples (example_id, sense_id, locale, example, translation, created_at, updated_at)
VALUES (1, 1, 'vi', 'I go to school every day.', 'Tôi đi học mỗi ngày.', NOW(), NOW()),
       (2, 2, 'vi', 'It is late — I have to go.', 'Trễ rồi — tôi phải đi.', NOW(), NOW());

-- 5️⃣ dict_relations
INSERT INTO dict_relations (relation_id, from_entry_id, to_entry_id, kind, created_at, updated_at)
VALUES (1, 1, 2, 'synonym', NOW(), NOW()),
       (2, 1, 3, 'antonym', NOW(), NOW());
