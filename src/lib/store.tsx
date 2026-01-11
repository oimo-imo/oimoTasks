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

                // 1. Subscribe to user's data
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

        // Logic: If adding a child to a completed parent, uncheck the parent (recursive)
        if (task.parentTaskId) {
            const parent = tasks.find(t => t.id === task.parentTaskId);
            if (parent && parent.done) {
                // Collect updates to uncheck up the chain
                const updates: { id: string, data: Partial<Task> }[] = [];
                let current: Task | undefined = parent;
                while (current) {
                    if (current.done) {
                        updates.push({ id: current.id, data: { done: false } });
                    }
                    if (current.parentTaskId) {
                        const pid: string = current.parentTaskId;
                        current = tasks.find(t => t.id === pid);
                    } else {
                        current = undefined;
                    }
                }
                if (updates.length > 0) {
                    await repo.updateTasksBatch(updates);
                }
            }
        }

        await repo.addTask(user.uid, task);
    };

    const updateTask = async (id: string, data: Partial<Task>) => {
        // If we represent a purely local update or non-done update, just do it.
        // We only care about specialized logic if 'done' is being toggled.
        if (data.done === undefined) {
            await repo.updateTask(id, data);
            return;
        }

        const targetTask = tasks.find(t => t.id === id);
        if (!targetTask) return;

        const newDone = data.done;
        const updates: { id: string, data: Partial<Task> }[] = [];

        // 1. Myself
        updates.push({ id, data: { done: newDone } });

        // 2. Downward Propagation (Parent -> Children)
        // Find all descendants recursively
        const getAllDescendants = (parentId: string): Task[] => {
            const children = tasks.filter(t => t.parentTaskId === parentId);
            let descendants = [...children];
            children.forEach(child => {
                descendants = [...descendants, ...getAllDescendants(child.id)];
            });
            return descendants;
        };

        const descendants = getAllDescendants(id);
        descendants.forEach(d => {
            // Only update if different
            if (d.done !== newDone) {
                updates.push({ id: d.id, data: { done: newDone } });
            }
        });

        // 3. Upward Propagation (Child -> Parent)
        if (targetTask.parentTaskId) {
            let currentParentId = targetTask.parentTaskId;

            // We need to verify the state of siblings effectively.
            // CAUTION: The 'tasks' state is OLD state. We must account for the changes we are ABOUT to make.
            // We can simulate the new state.
            const upcomingStateMap = new Map<string, boolean>();
            updates.forEach(u => {
                if (u.data.done !== undefined) {
                    upcomingStateMap.set(u.id, u.data.done);
                }
            });

            const getTaskDoneState = (t: Task) => {
                if (upcomingStateMap.has(t.id)) return upcomingStateMap.get(t.id)!;
                return t.done;
            };

            while (currentParentId) {
                const parent = tasks.find(t => t.id === currentParentId);
                if (!parent) break;

                // Logic:
                // If we turned ON: Check if all siblings are now ON. If so, parent -> ON.
                // If we turned OFF: Parent -> OFF.

                if (!newDone) {
                    // One child became unchecked -> Parent unchecked
                    if (getTaskDoneState(parent)) {
                        updates.push({ id: parent.id, data: { done: false } });
                        upcomingStateMap.set(parent.id, false);
                    }
                } else {
                    // One child check -> Check if all siblings done
                    const siblings = tasks.filter(t => t.parentTaskId === parent.id);
                    const allSiblingsDone = siblings.every(s => getTaskDoneState(s)); // uses upcoming state

                    if (allSiblingsDone) {
                        if (!getTaskDoneState(parent)) {
                            updates.push({ id: parent.id, data: { done: true } });
                            upcomingStateMap.set(parent.id, true);
                        }
                    } else {
                        // Not all done, ensure parent is false (though unlikely to be true if we are just flipping one child to true, unless it was forcefully true)
                        // If parent WAS true, it should become false.
                        if (getTaskDoneState(parent)) {
                            updates.push({ id: parent.id, data: { done: false } });
                            upcomingStateMap.set(parent.id, false);
                        }
                    }
                }

                if (parent.parentTaskId) {
                    currentParentId = parent.parentTaskId;
                } else {
                    break;
                }
            }
        }

        if (updates.length === 1) {
            // Just normal update
            await repo.updateTask(id, data);
        } else {
            // Batch update
            await repo.updateTasksBatch(updates);
        }
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
