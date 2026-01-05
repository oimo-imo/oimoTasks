import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Project, Task } from '../types';
import * as repo from './repository';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, type User, linkWithCredential, EmailAuthProvider } from 'firebase/auth';

interface StoreContextType {
    user: User | null;
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
    logout: () => Promise<void>;
    linkEmailAccount: (password: string) => Promise<void>;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                // User logged in: specific tasks + migration
                console.log('User logged in:', u.uid);

                // 1. Migrate any anonymous data (local data without userId)
                // This logic runs every time but is safe because it searches for missing userId
                await repo.migrateAnonymousData(u.uid);

                // 2. Subscribe to user's data
                const unsubProjects = repo.subscribeProjects(u.uid, (data) => {
                    setProjects(data);
                    setIsLoading(false);
                });

                const unsubTasks = repo.subscribeTasks(u.uid, (data) => {
                    setTasks(data);
                });

                return () => {
                    unsubProjects();
                    unsubTasks();
                };
            } else {
                // No user: Clear data or show empty
                console.log('No user logged in');
                setProjects([]);
                setTasks([]);
                setIsLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
        };
    }, []);

    const addProject = async (name: string) => {
        if (!user) return;
        await repo.addProject(user.uid, name);
    };

    const updateProject = async (id: string, data: Partial<Project>) => {
        await repo.updateProject(id, data);
    };

    const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
        if (!user) return;
        await repo.addTask(user.uid, task);
    };

    const updateTask = async (id: string, data: Partial<Task>) => {
        await repo.updateTask(id, data);
    };

    const deleteTask = async (id: string) => {
        await repo.deleteTask(id);
    };

    const touchTask = async (id: string) => {
        await repo.updateTask(id, {}, true);
    };

    const logout = async () => {
        await signOut(auth);
    };

    const linkEmailAccount = async (password: string) => {
        if (!auth.currentUser || !auth.currentUser.email) {
            throw new Error("No authenticated user or email found.");
        }
        const credential = EmailAuthProvider.credential(auth.currentUser.email, password);
        await linkWithCredential(auth.currentUser, credential);
        // Force update user state if needed, but onAuthStateChanged might trigger or we just rely on current object
        setUser({ ...auth.currentUser }); // Update state to reflect provider changes
    };

    return (
        <StoreContext.Provider value={{
            user,
            projects,
            tasks,
            isLoading,
            addProject,
            updateProject,
            addTask,
            updateTask,
            deleteTask,
            touchTask,
            logout,
            linkEmailAccount
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
