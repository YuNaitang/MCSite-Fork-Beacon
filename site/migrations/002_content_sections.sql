-- Content sections configuration (stored in site_settings)
-- These will be inserted as defaults via PHP, no direct SQL needed for the table

-- Add display_order to server_configs for multi-server sorting
ALTER TABLE server_configs
    ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER protocol,
    ADD COLUMN is_displayed TINYINT NOT NULL DEFAULT 1 AFTER display_order,
    ADD INDEX idx_display_order (display_order);
