-- APM Blackboard Schema
-- Defines the task and stigmergy event structure for multi-agent coordination

-- Tasks Table (The State of the World)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    objective TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK(status IN ('new', 'claimed', 'running', 'blocked', 'review', 'done', 'failed')),
    priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    
    -- Stigmergy fields
    owner_claw TEXT, -- The name of the agent currently working on this (e.g., 'claw-planning')
    inputs TEXT,     -- JSON: { files: [], context: {} }
    outputs TEXT,    -- JSON: { files: [], result: {} }
    
    -- Metrics
    score REAL DEFAULT 0.0,
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    
    parent_task_id INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Pheromone Events (The Replayable History)
-- An append-only log of all agent actions
CREATE TABLE IF NOT EXISTS pheromone_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER,
    actor TEXT NOT NULL, -- Agent Name (e.g., 'claw-diagnosis')
    event_type TEXT NOT NULL, -- 'task_created', 'claimed', 'artifact_written', 'blocked', 'completed', 'failed'
    payload TEXT, -- JSON details of the event
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
    
-- Indexes for efficient polling/stigmergy
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_claw);
CREATE INDEX IF NOT EXISTS idx_pheromone_task_id ON pheromone_events(task_id);
