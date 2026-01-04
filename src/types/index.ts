import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'active' | 'chill' | 'stalled';

export interface Project {
    id: string;
    name: string;
    status: ProjectStatus;
    order: number;
    importantDeadline?: string; // YYYY-MM-DD
    isHot?: boolean; // Focused/Important Project
    archived: boolean;
    createdAt: Timestamp | Date; // Date for local mock fallback if needed
    updatedAt: Timestamp | Date;
}

export type TaskDepth = 1 | 2 | 3;

export interface GanttAnchor {
    type: 'week' | 'day';
    value: string; // YYYY-MM-DD
}

export interface Task {
    id: string;
    projectId: string; // Parent Project ID
    parentTaskId?: string; // Parent Task ID (for depth 2, 3)
    depth: TaskDepth;

    title: string;
    done: boolean;

    estimateDays?: number; // 0-30 (Depth 1-2 only)
    dueDate?: string; // YYYY-MM-DD (Depth 1 only)

    touchedAt?: Timestamp | Date;

    ganttVisible: boolean;
    ganttAnchor?: GanttAnchor;
    ganttManuallyScheduled?: boolean; // True if user explicitly moved it

    order: number; // Added for sorting within same parent

    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    isFocused?: boolean;
}

// For Dashboard "Today's Focus" (The spec mentions "Today's Focus" list)
// We might manage this as a separate collection or a flag on the Task.
// Spec says "4.1 今日やること（フォーカス）".
// "操作：フォーカスから外す" -> Implies it's a state or a list.
// Strategy: Add 'isFocused' boolean to Task or a separate 'focus' collection.
// Going with 'isFocused' boolean on Task for simplicity and "touched" update logic consistency.
// Wait, spec says "TouchedAt更新される操作: タスクをフォーカスに追加".
// Let's add `isFocused: boolean` to Task for now.
