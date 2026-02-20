// Blackboard TypeScript Interfaces

export type TaskStatus = 'new' | 'claimed' | 'running' | 'blocked' | 'review' | 'done' | 'failed';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type EventType = 'task_created' | 'claimed' | 'artifact_written' | 'blocked' | 'completed' | 'failed';

export interface BlackboardTask {
    id: number;
    title: string;
    objective: string;
    status: TaskStatus;
    priority: TaskPriority;

    owner_claw?: string;
    inputs?: any;  // JSON
    outputs?: any; // JSON

    score: number;
    failure_reason?: string;
    retry_count: number;
    max_retries: number;

    parent_task_id?: number;
    created_at: string;
    updated_at: string;
}

export interface PheromoneEvent {
    id: number;
    task_id?: number;
    actor: string;
    event_type: EventType;
    payload?: any; // JSON
    created_at: string;
}

export interface TaskCreationParams {
    title: string;
    objective: string;
    priority?: TaskPriority;
    inputs?: any;
    parent_task_id?: number;
}
