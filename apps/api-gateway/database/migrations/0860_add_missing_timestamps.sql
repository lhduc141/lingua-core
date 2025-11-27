SET search_path TO public;

-- B) topic_translations: bổ sung updated_at
ALTER TABLE topic_translations
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- B) option_translations: bổ sung updated_at
ALTER TABLE option_translations
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- D) eval_dimensions: bổ sung created_at, updated_at
ALTER TABLE eval_dimensions
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- E) rubric_criteria: bổ sung created_at, updated_at
ALTER TABLE rubric_criteria
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- H) dict_forms: bổ sung created_at, updated_at
ALTER TABLE dict_forms
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- H) dict_relations: bổ sung created_at, updated_at
ALTER TABLE dict_relations
    ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
