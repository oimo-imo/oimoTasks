import {
    addDoc,
    deleteDoc,
    doc,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { format } from 'date-fns';
import { db, projectsRef, tasksRef } from './firebase';
import type { Project, Task } from '../types';

// ==========================================
// Projects
// ==========================================

export const subscribeProjects = (userId: string, onUpdate: (projects: Project[]) => void) => {
    // Only fetch projects for this user
    const q = query(
        projectsRef,
        where('userId', '==', userId),
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const projects = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Project[];
        onUpdate(projects);
    });
};

export const addProject = async (userId: string, name: string) => {
    await addDoc(projectsRef, {
        userId,
        name,
        status: 'active',
        order: Date.now(),
        archived: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};

export const updateProject = async (id: string, data: Partial<Project>) => {
    const ref = doc(db, 'projects', id);
    await updateDoc(ref, {
        ...data,
        updatedAt: serverTimestamp()
    });
};

// ==========================================
// Migration
// ==========================================



// ==========================================
// Tasks
// ==========================================

export const subscribeTasks = (userId: string, onUpdate: (tasks: Task[]) => void) => {
    const q = query(
        tasksRef,
        where('userId', '==', userId),
        orderBy('order', 'asc')
    );

    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Task[];
        onUpdate(tasks);
    });
};

export const addTask = async (userId: string, task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    // User Requirement: New Depth 1/2 tasks should generate a gantt bar starting TODAY (Daily view).
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Default values if not provided
    const payload: any = { ...task };
    if (payload.ganttVisible === undefined) payload.ganttVisible = true;

    // Default to Day anchor (Today)
    if (payload.ganttAnchor === undefined) {
        payload.ganttAnchor = { type: 'day', value: todayStr };
        payload.ganttManuallyScheduled = false; // Mark as default/untouched
    }

    const finalData = {
        ...payload,
        userId,
        touchedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await addDoc(tasksRef, finalData);
};

export const updateTask = async (id: string, data: Partial<Task>, markTouched: boolean = true) => {
    const ref = doc(db, 'tasks', id);

    const updates: any = {
        ...data,
        updatedAt: serverTimestamp()
    };

    if (markTouched) {
        updates.touchedAt = serverTimestamp();
    }

    await updateDoc(ref, updates);
};

export const deleteTask = async (id: string) => {
    const ref = doc(db, 'tasks', id);
    await deleteDoc(ref);
};
