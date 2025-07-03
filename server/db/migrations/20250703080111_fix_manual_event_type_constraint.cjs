/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // For SQLite, we need to completely recreate the table to remove the CHECK constraint
  return knex.schema.raw(`
    -- Create a temporary table with the new schema (no CHECK constraint)
    CREATE TABLE manual_events_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      type TEXT DEFAULT 'personal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      guests TEXT,
      recurrence_id INTEGER,
      parent_event_id INTEGER,
      original_start_time DATETIME,
      is_cancelled BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recurrence_id) REFERENCES recurrence_rules(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_event_id) REFERENCES manual_events(id) ON DELETE CASCADE
    );
    
    -- Copy all data from the old table
    INSERT INTO manual_events_new 
    SELECT * FROM manual_events;
    
    -- Drop the old table
    DROP TABLE manual_events;
    
    -- Rename the new table
    ALTER TABLE manual_events_new RENAME TO manual_events;
  `);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  // This rollback recreates the enum constraint
  return knex.schema.raw(`
    -- Create a temporary table with the old enum constraint
    CREATE TABLE manual_events_old (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      type TEXT DEFAULT 'personal' CHECK (type IN ('personal', 'blocked')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      description TEXT,
      guests TEXT,
      recurrence_id INTEGER,
      parent_event_id INTEGER,
      original_start_time DATETIME,
      is_cancelled BOOLEAN DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recurrence_id) REFERENCES recurrence_rules(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_event_id) REFERENCES manual_events(id) ON DELETE CASCADE
    );
    
    -- Copy data back (this will fail if there are non-enum values)
    INSERT INTO manual_events_old 
    SELECT * FROM manual_events;
    
    -- Drop and rename
    DROP TABLE manual_events;
    ALTER TABLE manual_events_old RENAME TO manual_events;
  `);
};