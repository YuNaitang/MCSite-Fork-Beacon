ALTER TABLE server_status_logs
    ADD COLUMN server_id INT UNSIGNED DEFAULT NULL AFTER id,
    ADD INDEX idx_server_recorded (server_id, recorded_at);

UPDATE server_status_logs SET server_id = (SELECT id FROM server_configs ORDER BY id ASC LIMIT 1);
