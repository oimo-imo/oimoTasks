import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Project, Task } from '../types';
import * as repo from './repository';

interface StoreContextType {
    projects: Project[];
    tasks: Task[];
    isLoading: boolean;

    // Project Actions
    addProject: (name: string) => Promise<void>;
    updateProject: (id: string, data: Partial<Project>) => Promise<void>;

    // Task Actions
    addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateTask: (id: string, data: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;

    // Special Actions
    touchTask: (id: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubProjects = repo.subscribeProjects((data) => {
            setProjects(data);
            setIsLoading(false); // Assume ready when projects load (or tasks)
        });

        const unsubTasks = repo.subscribeTasks((data) => {
            setTasks(data);
            // Could also set IsLoading false here, or combine loading states
        });

        return () => {
            unsubProjects();
            unsubTasks();
        };
    }, []);

    const addProject = async (name: string) => {
        await repo.addProject(name);
    };

    const updateProject = async (id: string, data: Partial<Project>) => {
        await repo.updateProject(id, data);
    };

    const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
        await repo.addTask(task);
    };

    const updateTask = async (id: string, data: Partial<Task>) => {
        // "Touched" logic handled in repository default true, but explicit for some cases
        // Spec 3.1: Task name edit, Estimate edit, Done, etc update touched.
        // Repository's updateTask defaults markTouched to true, so just calling it is fine.
        await repo.updateTask(id, data);
    };

    const deleteTask = async (id: string) => {
        await repo.deleteTask(id);
    };

    const touchTask = async (id: string) => {
        // Just explicit touch
        await repo.updateTask(id, {}, true);
    };

    return (
        <StoreContext.Provider value={{
            projects,
            tasks,
            isLoading,
            addProject,
            updateProject,
            addTask,
            updateTask,
            deleteTask,
            touchTask
        }}>
            {children}
        </StoreContext.Provider>
    );
};

export const useStore = () => {
    const context = useContext(StoreContext);
    if (context === undefined) {
        throw new Error('useStore must be used within a StoreProvider');
    }
    return context;
};
