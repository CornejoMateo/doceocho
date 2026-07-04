-- ============================================
-- LISTS (Columnas/Listas)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_lists (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    position INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_kanban_lists_board ON kanban_lists(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_lists_position ON kanban_lists(board_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_lists_archived ON kanban_lists(is_archived) WHERE is_archived = FALSE;

-- ============================================
-- CARDS (Tarjetas)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_cards (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    list_id BIGINT NOT NULL REFERENCES kanban_lists(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    is_archived BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMPTZ,
    start_date TIMESTAMPTZ,
    reminder_date TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'none' CHECK (priority IN ('none', 'low', 'medium', 'high', 'very_high')),
    completed_at TIMESTAMPTZ,
    cover_image_url TEXT,
    color VARCHAR(7)
);

CREATE INDEX IF NOT EXISTS idx_kanban_cards_list ON kanban_cards(list_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON kanban_cards(list_id, position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_due_date ON kanban_cards(due_date);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_priority ON kanban_cards(priority);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_archived ON kanban_cards(is_archived) WHERE is_archived = FALSE;

-- ============================================
-- LABELS (Etiquetas)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_labels (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kanban_labels_board ON kanban_labels(board_id);

-- ============================================
-- CARD LABELS (Relación tarjeta-etiqueta)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_card_labels (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    label_id BIGINT NOT NULL REFERENCES kanban_labels(id) ON DELETE CASCADE,
    UNIQUE(card_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_kanban_card_labels_card ON kanban_card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_labels_label ON kanban_card_labels(label_id);

-- ============================================
-- CARD MEMBERS (Relación tarjeta-miembros)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_card_members (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_observer BOOLEAN DEFAULT FALSE,
    UNIQUE(card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_kanban_card_members_card ON kanban_card_members(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_members_user ON kanban_card_members(user_id);

-- ============================================
-- ATTACHMENTS (Archivos adjuntos)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_attachments (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    file_type VARCHAR(100),
    storage_path TEXT
);

CREATE INDEX IF NOT EXISTS idx_kanban_attachments_card ON kanban_attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_attachments_user ON kanban_attachments(user_id);

-- ============================================
-- CRM INTEGRATIONS (Integración con CRM)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_card_crm_links (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    link_type VARCHAR(50) NOT NULL CHECK (link_type IN ('client', 'budget', 'order', 'invoice')),
    entity_id BIGINT NOT NULL,
    UNIQUE(card_id, link_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_kanban_crm_links_card ON kanban_card_crm_links(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_crm_links_entity ON kanban_card_crm_links(link_type, entity_id);

-- ============================================
-- CUSTOM FIELDS (Campos personalizados por tablero)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_custom_fields (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'select', 'currency', 'checkbox')),
    options JSONB, -- For select fields: array of options
    is_required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_kanban_custom_fields_board ON kanban_custom_fields(board_id);

-- ============================================
-- CUSTOM FIELD VALUES (Valores de campos personalizados)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_custom_field_values (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    card_id BIGINT NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
    field_id BIGINT NOT NULL REFERENCES kanban_custom_fields(id) ON DELETE CASCADE,
    value TEXT,
    UNIQUE(card_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_kanban_custom_field_values_card ON kanban_custom_field_values(card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_custom_field_values_field ON kanban_custom_field_values(field_id);

-- ============================================
-- AUTOMATION RULES (Reglas de automatización tipo Butler)
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_automation_rules (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    board_id BIGINT NOT NULL REFERENCES kanban_boards(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN ('card_moved', 'card_created', 'card_updated', 'due_date_approaching', 'due_date_passed')),
    trigger_conditions JSONB, -- Conditions for trigger
    actions JSONB NOT NULL, -- Actions to execute
    run_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_kanban_automation_rules_board ON kanban_automation_rules(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_automation_rules_active ON kanban_automation_rules(is_active) WHERE is_active = TRUE;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_kanban_boards_updated_at ON kanban_boards;
CREATE TRIGGER update_kanban_boards_updated_at BEFORE UPDATE ON kanban_boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_lists_updated_at ON kanban_lists;
CREATE TRIGGER update_kanban_lists_updated_at BEFORE UPDATE ON kanban_lists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_cards_updated_at ON kanban_cards;
CREATE TRIGGER update_kanban_cards_updated_at BEFORE UPDATE ON kanban_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_custom_field_values_updated_at ON kanban_custom_field_values;
CREATE TRIGGER update_kanban_custom_field_values_updated_at BEFORE UPDATE ON kanban_custom_field_values
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kanban_automation_rules_updated_at ON kanban_automation_rules;
CREATE TRIGGER update_kanban_automation_rules_updated_at BEFORE UPDATE ON kanban_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_card_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_card_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_card_crm_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_custom_field_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE kanban_automation_rules ENABLE ROW LEVEL SECURITY;

-- Boards: Users can see boards they are members of or own
DROP POLICY IF EXISTS "Users can view boards they are members of" ON kanban_boards;
CREATE POLICY "Users can view boards they are members of" ON kanban_boards
    FOR SELECT USING (
        owner_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can create boards" ON kanban_boards;
CREATE POLICY "Users can create boards" ON kanban_boards
    FOR INSERT WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Board owners can update boards" ON kanban_boards;
CREATE POLICY "Board owners can update boards" ON kanban_boards
    FOR UPDATE USING (
        owner_id = auth.uid()
    );

DROP POLICY IF EXISTS "Board owners can delete boards" ON kanban_boards;
CREATE POLICY "Board owners can delete boards" ON kanban_boards
    FOR DELETE USING (owner_id = auth.uid());

-- Board Members: Members can view other members of their boards
DROP POLICY IF EXISTS "Members can view board members" ON kanban_board_members;
CREATE POLICY "Members can view board members" ON kanban_board_members
    FOR SELECT USING (
        board_id IN (
            SELECT id FROM kanban_boards WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Board admins can manage members" ON kanban_board_members;
CREATE POLICY "Board admins can manage members" ON kanban_board_members
    FOR ALL USING (
        board_id IN (
            SELECT id FROM kanban_boards WHERE owner_id = auth.uid()
        )
    );

-- Lists: Members can view lists of their boards
DROP POLICY IF EXISTS "Members can view lists" ON kanban_lists;
CREATE POLICY "Members can view lists" ON kanban_lists
    FOR SELECT USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Editors can create lists" ON kanban_lists;
CREATE POLICY "Editors can create lists" ON kanban_lists
    FOR INSERT WITH CHECK (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Editors can update lists" ON kanban_lists;
CREATE POLICY "Editors can update lists" ON kanban_lists
    FOR UPDATE USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can delete lists" ON kanban_lists;
CREATE POLICY "Admins can delete lists" ON kanban_lists
    FOR DELETE USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

-- Cards: Members can view cards of their boards
DROP POLICY IF EXISTS "Members can view cards" ON kanban_cards;
CREATE POLICY "Members can view cards" ON kanban_cards
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Editors can create cards" ON kanban_cards;
CREATE POLICY "Editors can create cards" ON kanban_cards
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Editors can update cards" ON kanban_cards;
CREATE POLICY "Editors can update cards" ON kanban_cards
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Admins can delete cards" ON kanban_cards;
CREATE POLICY "Admins can delete cards" ON kanban_cards
    FOR DELETE USING (true);

-- Labels: Members can view labels of their boards
DROP POLICY IF EXISTS "Members can view labels" ON kanban_labels;
CREATE POLICY "Members can view labels" ON kanban_labels
    FOR SELECT USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Editors can manage labels" ON kanban_labels;
CREATE POLICY "Editors can manage labels" ON kanban_labels
    FOR ALL USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

-- Card Labels: Members can view card labels
DROP POLICY IF EXISTS "Members can view card labels" ON kanban_card_labels;
CREATE POLICY "Members can view card labels" ON kanban_card_labels
    FOR SELECT USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Editors can manage card labels" ON kanban_card_labels;
CREATE POLICY "Editors can manage card labels" ON kanban_card_labels
    FOR ALL USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

-- Card Members: Members can view card members
DROP POLICY IF EXISTS "Members can view card members" ON kanban_card_members;
CREATE POLICY "Members can view card members" ON kanban_card_members
    FOR SELECT USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Editors can manage card members" ON kanban_card_members;
CREATE POLICY "Editors can manage card members" ON kanban_card_members
    FOR ALL USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

-- Attachments: Members can view attachments
DROP POLICY IF EXISTS "Members can view attachments" ON kanban_attachments;
CREATE POLICY "Members can view attachments" ON kanban_attachments
    FOR SELECT USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Editors can upload attachments" ON kanban_attachments;
CREATE POLICY "Editors can upload attachments" ON kanban_attachments
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Admins can delete attachments" ON kanban_attachments;
CREATE POLICY "Admins can delete attachments" ON kanban_attachments
    FOR DELETE USING (
        user_id = auth.uid()
        OR card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

-- CRM Links: Members can view CRM links
DROP POLICY IF EXISTS "Members can view CRM links" ON kanban_card_crm_links;
CREATE POLICY "Members can view CRM links" ON kanban_card_crm_links
    FOR SELECT USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Editors can manage CRM links" ON kanban_card_crm_links;
CREATE POLICY "Editors can manage CRM links" ON kanban_card_crm_links
    FOR ALL USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

-- Custom Fields: Members can view custom fields
DROP POLICY IF EXISTS "Members can view custom fields" ON kanban_custom_fields;
CREATE POLICY "Members can view custom fields" ON kanban_custom_fields
    FOR SELECT USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage custom fields" ON kanban_custom_fields;
CREATE POLICY "Admins can manage custom fields" ON kanban_custom_fields
    FOR ALL USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

-- Custom Field Values: Members can view custom field values
DROP POLICY IF EXISTS "Members can view custom field values" ON kanban_custom_field_values;
CREATE POLICY "Members can view custom field values" ON kanban_custom_field_values
    FOR SELECT USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "Editors can manage custom field values" ON kanban_custom_field_values;
CREATE POLICY "Editors can manage custom field values" ON kanban_custom_field_values
    FOR ALL USING (
        card_id IN (
            SELECT id FROM kanban_cards 
            WHERE list_id IN (
                SELECT id FROM kanban_lists 
                WHERE board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
            )
        )
    );

-- Automation Rules: Members can view automation rules
DROP POLICY IF EXISTS "Members can view automation rules" ON kanban_automation_rules;
CREATE POLICY "Members can view automation rules" ON kanban_automation_rules
    FOR SELECT USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can manage automation rules" ON kanban_automation_rules;
CREATE POLICY "Admins can manage automation rules" ON kanban_automation_rules
    FOR ALL USING (
        board_id IN (SELECT id FROM kanban_boards WHERE owner_id = auth.uid())
    );

-- ============================================
-- END OF MIGRATION
-- ============================================
