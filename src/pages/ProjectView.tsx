import React, { useState, useMemo } from 'react';
import { useStore } from '../lib/store';
import clsx from 'clsx';
import { Target, Trash2, Square, CheckSquare, ChevronDown, ChevronRight as ChevronRightIcon, Plus, Calendar, ChevronLeft, Archive, FolderPlus, FolderOpen, Flame, GripVertical, Pencil, List, Eye, EyeOff } from 'lucide-react';
import type { Task, TaskDepth } from '../types';
import { format } from 'date-fns';
// Current AppLayout implementation uses simple conditional or NavLink from react-router-dom.
// I will check AppLayout later. For now, I'll assume I can render Archive view as a modal or selection state, OR adding a separate page is better.
// User said "Archive screen". I'll add a state `showArchive` for now to keep it simple within ProjectView or just use a link if logic allows.
// Actually, AppLayout has navigation. I'll add a route for Archive later. For now, I'll add a "Archived Projects" button that toggles a view mode in sidebar or similar.
// Let's implement Archive as a "view mode" in ProjectView for simplicity?
// "Archive is not prominent".
// I'll add a small button in the sidebar footer to "View Archived".

const ProjectView: React.FC = () => {
    const {
        projects, tasks,
        addProject, updateProject,
        addTask, updateTask, deleteTask, touchTask
    } = useStore();

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false); // Toggle to show archived projects
    const [isListMode, setIsListMode] = useState(false); // Toggle for Read-only List Mode
    const [filterHotOnly, setFilterHotOnly] = useState(false); // Sidebar filter for Hot projects
    const [hideCompleted, setHideCompleted] = useState(false); // Toggle to hide completed tasks
    const hasAutoSelected = React.useRef(false);

    // Initial Selection
    React.useEffect(() => {
        if (!hasAutoSelected.current && projects.length > 0) {
            const active = projects.find(p => !p.archived && (p.status === 'active' || p.status === 'chill'));
            if (active) setSelectedProjectId(active.id);
            else {
                const first = projects.find(p => !p.archived);
                if (first) setSelectedProjectId(first.id);
            }
            hasAutoSelected.current = true;
        }
    }, [projects]);

    // Validate Selection
    const activeProject = projects.find(p => p.id === selectedProjectId);
    React.useEffect(() => {
        if (selectedProjectId && !activeProject) {
            setSelectedProjectId(null); // Deselect if deleted or undefined
        }
    }, [selectedProjectId, activeProject]);

    // Sort & Filter projects
    const sortedProjects = useMemo(() => {
        let targetProjects = projects.filter(p => showArchived ? p.archived : !p.archived);

        if (filterHotOnly && !showArchived) {
            targetProjects = targetProjects.filter(p => p.isHot);
        }

        const orderMap = { 'active': 0, 'chill': 1, 'stalled': 2 };
        return [...targetProjects].sort((a, b) => {
            // Hot projects first if not filtering? Or just explicit sort?
            // Let's keep status sort, then hot priority?
            // Actually, keep it simple: Status > Order
            if (a.isHot !== b.isHot) return a.isHot ? -1 : 1; // Show Hot first

            const statusDiff = orderMap[a.status] - orderMap[b.status];
            if (statusDiff !== 0) return statusDiff;
            return a.order - b.order;
        });
    }, [projects, showArchived, filterHotOnly]);

    const projectTasks = useMemo(() => {
        if (!selectedProjectId) return [];
        let filtered = tasks.filter(t => t.projectId === selectedProjectId);
        if (hideCompleted) {
            // If hiding completed, we should also consider if a parent is hidden?
            // Usually, if a parent is not done but child is done, child is hidden.
            // If parent is done and hidden, children are inevitably hidden (not rendered).
            // Filter out done tasks.
            filtered = filtered.filter(t => !t.done);
        }
        return filtered.sort((a, b) => a.order - b.order);
    }, [tasks, selectedProjectId, hideCompleted]);

    const calculateProgress = (pid: string) => {
        const pTasks = tasks.filter(t => t.projectId === pid);
        if (pTasks.length === 0) return 0;
        const completed = pTasks.filter(t => t.done).length;
        return Math.round((completed / pTasks.length) * 100);
    };

    if (showArchived && !selectedProjectId && sortedProjects.length > 0) {
        // Auto select logic could go here
    }

    // Task Drag & Drop Logic (HTML5)
    // We only allow reordering within the same parent (Depth 1 sibling swap)
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault(); // allow drop
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
        e.preventDefault();
        const draggedTaskId = e.dataTransfer.getData('taskId');
        if (draggedTaskId === targetTaskId) return;

        const draggedTask = tasks.find(t => t.id === draggedTaskId);
        const targetTask = tasks.find(t => t.id === targetTaskId);

        if (!draggedTask || !targetTask) return;

        // Ensure same parent/project context for simplicity
        if (draggedTask.projectId !== targetTask.projectId) return;
        if (draggedTask.parentTaskId !== targetTask.parentTaskId) return; // Only siblings

        // Swap orders
        // Simple swap logic:
        // We have to reorder elements.
        // Let's just swap 'order' values effectively or shift.
        // A simple way is to average orders? No, integers.
        // Let's swap the orders of the two tasks for a quick fix, 
        // OR reassign orders for the whole list (cleaner but heavier).
        // Let's do a simple swap for now to see if user likes it.
        updateTask(draggedTaskId, { order: targetTask.order });
        updateTask(targetTaskId, { order: draggedTask.order });
    };

    return (
        <div className="h-full flex flex-col md:flex-row bg-white overflow-hidden">
            {/* Sidebar */}
            <div className={`w-full md:w-64 bg-gray-50 border-r border-gray-100 flex flex-col overflow-hidden ${selectedProjectId ? 'hidden md:flex' : 'flex'}`}>
                {/* Sidebar Header */}
                <div className="p-4 flex items-center justify-between">
                    <div className="font-bold text-gray-500 text-xs uppercase tracking-wider flex items-center gap-2">
                        {showArchived ? <Archive size={14} /> : <FolderOpen size={14} />}
                        {showArchived ? 'Archived Projects' : 'Projects'}
                    </div>

                    <div className="flex items-center gap-2">
                        {!showArchived && (
                            <button
                                onClick={() => setFilterHotOnly(!filterHotOnly)}
                                className={clsx(
                                    "p-1 rounded transition-colors",
                                    filterHotOnly ? "text-orange-500 bg-orange-100" : "text-gray-300 hover:text-gray-500"
                                )}
                                title="Filter Hot Projects"
                            >
                                <Flame size={14} fill={filterHotOnly ? "currentColor" : "none"} />
                            </button>
                        )}
                        <button
                            onClick={() => { setShowArchived(!showArchived); setSelectedProjectId(null); }}
                            className="text-[10px] text-gray-400 hover:text-indigo-600 underline"
                        >
                            {showArchived ? 'Back' : 'Archive'}
                        </button>
                    </div>
                </div>

                {/* Project List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                    {sortedProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={clsx(
                                "cursor-pointer px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group select-none relative overflow-hidden",
                                selectedProjectId === project.id
                                    ? "bg-white text-gray-800 shadow-sm ring-1 ring-gray-100"
                                    : "text-gray-600 hover:bg-gray-100/80"
                            )}
                        >
                            <div className="flex items-center gap-3 overflow-hidden w-full relative z-10">
                                <div className="relative">
                                    <div className={clsx(
                                        "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-transform",
                                        selectedProjectId === project.id && "scale-110",
                                        project.status === 'active' ? "bg-emerald-400 shadow-sm" :
                                            project.status === 'chill' ? "bg-amber-400 shadow-sm" : "bg-rose-400 shadow-sm"
                                    )} />
                                    {project.isHot && <div className="absolute -top-1.5 -right-1.5 text-[10px]">🔥</div>}
                                </div>
                                <span className={clsx("truncate flex-1 decoration-auto", project.status === 'stalled' && "line-through opacity-50")}>
                                    {project.name}
                                </span>
                                {selectedProjectId === project.id && <ChevronRightIcon size={14} className="text-gray-300" />}
                            </div>

                            {/* Subtle Progress Bar Background for selected item? Maybe too much. Keep it clean. */}
                        </div>
                    ))}
                    {sortedProjects.length === 0 && (
                        <div className="text-center p-4 text-xs text-gray-400 italic">
                            {showArchived ? 'No archived projects' : filterHotOnly ? 'No Hot projects' : 'No projects'}
                        </div>
                    )}
                </div>

                {/* Sidebar Footer: Add Project */}
                {!showArchived && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-3">
                        <AddProjectInput onAdd={addProject} />
                    </div>
                )}
            </div>

            {/* Main Content */}
            {activeProject ? (
                <div className={`flex-1 flex flex-col overflow-hidden bg-white ${selectedProjectId ? 'flex' : 'hidden md:flex'}`}>
                    <header className="px-6 py-5 border-b border-gray-100 flex-shrink-0 bg-white z-10 sticky top-0 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
                        {/* Top Row: Navigation & Meta Controls */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setSelectedProjectId(null)}
                                    className="md:hidden p-1.5 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                {/* Status Selectors */}
                                <div className="flex items-center bg-gray-100/50 p-1 rounded-lg">
                                    {(['active', 'chill', 'stalled'] as const).map(s => (
                                        <button
                                            key={s}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                updateProject(activeProject.id, { status: s });
                                            }}
                                            className={clsx(
                                                "px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                                                activeProject.status === s
                                                    ? "bg-white text-gray-800 shadow-sm"
                                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-200/50"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions: Archive & Hot & List Mode */}
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => updateProject(activeProject.id, { isHot: !activeProject.isHot })}
                                    className={clsx(
                                        "p-2 rounded-lg transition-colors",
                                        activeProject.isHot ? "bg-orange-100 text-orange-500" : "text-gray-300 hover:bg-gray-100"
                                    )}
                                    title="Toggle Hot Status"
                                >
                                    <Flame size={18} fill={activeProject.isHot ? "currentColor" : "none"} />
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-1" />
                                <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                                    <button
                                        onClick={() => setIsListMode(false)}
                                        className={clsx(
                                            "p-1.5 rounded-md transition-all",
                                            !isListMode ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                        )}
                                        title="Edit Mode"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                    <button
                                        onClick={() => setIsListMode(true)}
                                        className={clsx(
                                            "p-1.5 rounded-md transition-all",
                                            isListMode ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                        )}
                                        title="List Mode"
                                    >
                                        <List size={16} />
                                    </button>
                                </div>
                                <div className="w-px h-4 bg-gray-200 mx-1" />
                                <button
                                    onClick={() => setHideCompleted(!hideCompleted)}
                                    className={clsx(
                                        "p-2 rounded-lg transition-colors",
                                        hideCompleted ? "bg-indigo-50 text-indigo-600" : "text-gray-300 hover:bg-gray-100"
                                    )}
                                    title={hideCompleted ? "Show Completed Tasks" : "Hide Completed Tasks"}
                                >
                                    {hideCompleted ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                                <div className="w-px h-4 bg-gray-200 mx-1" />
                                <button
                                    onClick={() => {
                                        if (confirm("プロジェクトをアーカイブしますか？")) {
                                            updateProject(activeProject.id, { archived: !activeProject.archived });
                                            setSelectedProjectId(null);
                                        }
                                    }}
                                    className="p-2 text-gray-300 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title={activeProject.archived ? "Unarchive" : "Archive"}
                                >
                                    <Archive size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Middle Row: Title & Progress */}
                        <div className="mb-2">
                            <input
                                className="w-full text-2xl md:text-3xl font-extrabold text-gray-900 bg-transparent outline-none placeholder-gray-300 border-b border-transparent focus:border-indigo-200 transition-all px-1 -mx-1"
                                value={activeProject.name}
                                onChange={(e) => updateProject(activeProject.id, { name: e.target.value })}
                                placeholder="Project Name"
                            />
                        </div>

                        {/* Progress Bar & Count */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500 ease-out"
                                    style={{ width: `${calculateProgress(activeProject.id)}%` }}
                                />
                            </div>
                            <div className="flex items-baseline gap-2 text-indigo-900">
                                <span className="text-lg font-black">
                                    {calculateProgress(activeProject.id)}<span className="text-xs text-indigo-300 font-bold ml-0.5">%</span>
                                </span>
                                <span className="text-xs text-gray-400 font-medium whitespace-nowrap">
                                    ({projectTasks.filter(t => !t.done).length}/{projectTasks.length} tasks)
                                </span>
                            </div>
                        </div>
                    </header>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 md:p-8 md:pb-20">
                        <div className="max-w-4xl mx-auto space-y-1">
                            {/* Render Depth 1 Tasks */}
                            {projectTasks.filter(t => t.depth === 1).map(task => (
                                <TaskItem
                                    key={task.id}
                                    task={task}
                                    allTasks={projectTasks}
                                    depth={1}
                                    onUpdate={updateTask}
                                    onAdd={addTask}
                                    onDelete={deleteTask}
                                    onTouch={touchTask}
                                    isListMode={isListMode}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDrop={handleDrop}
                                />
                            ))}

                            {/* Add Task Depth 1 */}
                            {!isListMode && (
                                <div className="mt-6 pt-4 border-t border-dashed border-gray-200">
                                    <AddTaskInput
                                        onAdd={(title) => addTask({
                                            projectId: activeProject.id,
                                            title,
                                            done: false,
                                            depth: 1,
                                            ganttVisible: true,
                                            order: Date.now()
                                        })}
                                        placeholder="＋ Add New Task"
                                        className="scale-100"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className={`flex-1 flex flex-col items-center justify-center bg-white text-gray-300 ${selectedProjectId ? 'flex' : 'hidden md:flex'}`}>
                    <FolderPlus size={64} className="mb-4 text-gray-100" />
                    <p>Select or create a project</p>
                </div>
            )}
        </div>
    );
};

const TaskItem: React.FC<{
    task: Task;
    allTasks: Task[];
    depth: TaskDepth;
    onUpdate: (id: string, data: Partial<Task>) => void;
    onAdd: (task: any) => void;
    onDelete: (id: string) => void;
    onTouch: (id: string) => void;
    isListMode: boolean;
    onDragStart?: (e: React.DragEvent, id: string) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent, id: string) => void;
}> = ({ task, allTasks, depth, onUpdate, onAdd, onDelete, onTouch, isListMode, onDragStart, onDragOver, onDrop }) => {

    const children = allTasks.filter(t => t.parentTaskId === task.id).sort((a, b) => a.order - b.order);
    const [isExpanded, setIsExpanded] = useState(true);

    // IME & Input State Logic
    const [localTitle, setLocalTitle] = useState(task.title);

    // Sync local state when prop changes (external update), BUT only if not focusing/typing to prevent overwrite during IME
    // Actually, simple way: only sync on initial mount or if task.id changes.
    // If we use key=task.id, a new instance is created if ID changes.
    // If external update happens (e.g. another user), we might overwrite user input.
    // For now, let's sync localTitle to task.title ONLY if not active?
    // Or just rely on task.title prop for initial, and use localTitle for editing.
    React.useEffect(() => {
        setLocalTitle(task.title);
    }, [task.title]);

    const handleCheck = () => {
        onUpdate(task.id, { done: !task.done });
    };

    const handleFocus = () => {
        onUpdate(task.id, { isFocused: !task.isFocused });
    };

    const handleAddChild = (title: string) => {
        if (depth >= 3) return;
        onAdd({
            projectId: task.projectId,
            parentTaskId: task.id,
            title,
            done: false,
            depth: (depth + 1) as TaskDepth,
            ganttVisible: true,
            order: Date.now()
        });
    };

    // Keyboard Navigation Logic
    // Navigates between .task-title-input and .add-task-input
    // Navigates between .task-nav-item
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const inputs = Array.from(document.querySelectorAll('.task-nav-item')) as (HTMLInputElement | HTMLTextAreaElement)[]; // Use common class
            const currentIndex = inputs.indexOf(e.currentTarget);

            if (currentIndex === -1) return;

            e.preventDefault();
            if (e.key === 'ArrowDown') {
                const next = inputs[currentIndex + 1];
                if (next) next.focus();
            } else {
                const prev = inputs[currentIndex - 1];
                if (prev) prev.focus();
            }
        }
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    const handleBlur = () => {
        if (localTitle !== task.title) {
            onUpdate(task.id, { title: localTitle });
        }
    };



    return (
        <div
            // Removed draggable from outer div to force use of handle?
            // Or keep it but add handle visual. The user asked "can I grab this icon to move?".
            // Usually standard UX is drag handle or whole row.
            // Let's keep whole row draggable for ease but add the icon as a clear affordance.
            // Actually, if we add an icon, usually THAT is the drag handle.
            // But HTML5 DnD on a handle requires setting draggable on the handle or using a library.
            // Since we are using HTML5 DnD manually on the parent `div`, the whole div is draggable.
            // We can style the "drag handle" to LOOK like a handle, but the whole row works.
            draggable={!isListMode && depth === 1}
            onDragStart={(e) => onDragStart && onDragStart(e, task.id)}
            onDragOver={onDragOver}
            onDrop={(e) => onDrop && onDrop(e, task.id)}
            className={clsx(
                "group transition-all duration-200 rounded-lg relative pl-2", // Added padding left for handle space
                depth === 1 ? "bg-white border-b border-gray-100" :
                    depth === 2 ? "bg-white ml-6 border-l border-gray-100" :
                        "ml-5 border-l border-gray-100",
                !isListMode && depth === 1 && "cursor-default" // Reset cursor on main, handle will have move cursor
            )}
        >
            {/* Drag Handle (Depth 1 only) */}
            {!isListMode && depth === 1 && (
                <div
                    className="absolute left-[-12px] top-1/2 -translate-y-1/2 p-1 text-gray-300 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing hover:text-gray-500 transition-all"
                    title="Drag to reorder"
                >
                    <GripVertical size={14} />
                </div>
            )}

            {/* Task Row */}
            <div className={clsx(
                "flex items-center gap-2 pr-2 rounded-lg transition-colors group/row w-full",
                depth === 1 ? "py-2" : depth === 2 ? "py-1" : "py-0.5",
                task.isFocused
                    ? "bg-orange-50/50"
                    : (depth === 1 ? "hover:bg-gray-50/50" : "hover:bg-gray-50/30")
            )}>
                {/* Control Icons */}
                <div className="flex items-center">
                    {depth < 3 ? (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={clsx("p-1 text-gray-300 hover:text-indigo-500 transition-colors w-6 h-6 flex items-center justify-center", children.length === 0 && "opacity-20")}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                        </button>
                    ) : <div className="w-6" />}

                    <button onClick={handleCheck} className={clsx("text-gray-300 hover:text-indigo-500 transition-colors", task.done && "text-indigo-500")}>
                        {task.done ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                </div>

                {/* Title & Inputs */}
                <div className="flex-1 min-w-0 flex items-center gap-2 h-8">
                    {isListMode ? (
                        <span className={clsx(
                            "font-medium transition-all text-sm flex-1 whitespace-pre-wrap break-words", // Removed truncate, added wrap
                            depth === 1 ? "text-gray-800" : "text-gray-600",
                            task.done && "line-through text-gray-300"
                        )}>
                            {task.title}
                        </span>
                    ) : (
                        <textarea
                            ref={(el) => {
                                if (el) {
                                    el.style.height = 'auto'; // Reset to auto to get correct scrollHeight
                                    el.style.height = `${el.scrollHeight}px`;
                                }
                            }}
                            className={clsx(
                                "task-nav-item bg-transparent outline-none w-full transition-all text-sm resize-none overflow-hidden block", // Removed truncate, added resize-none
                                depth === 1 ? "text-gray-800 font-medium" : "text-gray-600",
                                task.done && "line-through text-gray-300"
                            )}
                            rows={1}
                            value={localTitle}
                            onChange={(e) => {
                                setLocalTitle(e.target.value);
                                e.target.style.height = 'auto';
                                e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            onBlur={handleBlur}
                            onKeyDown={(e) => {
                                // Delegate arrow keys to shared handler (needs type cast update if handler expects HTMLInputElement)
                                // Handle Enter to blur (submit)
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.currentTarget.blur();
                                }
                                // We can cast e to any to reuse handleKeyDown or update handleKeyDown to accept HTMLTextAreaElement
                                handleKeyDown(e as any);
                            }}
                            placeholder="Task Name"
                        />
                    )}

                    {/* Metadata Inputs */}
                    <div className="flex items-center gap-1 opacity-100 transition-opacity">
                        {/* Due Date (Depth 1 Only) */}
                        {depth === 1 && (
                            <div className="relative group/date">
                                <button className={clsx(
                                    "p-1 rounded text-xs flex items-center gap-1 transition-colors",
                                    task.dueDate ? "bg-red-50 text-red-500" : "text-gray-200 group-hover:text-gray-400"
                                )}>
                                    <Calendar size={14} />
                                    {task.dueDate && <span>{format(new Date(task.dueDate), 'MM/dd')}</span>}
                                </button>
                                {!isListMode && (
                                    <input
                                        type="date"
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                        value={task.dueDate || ''}
                                        onChange={(e) => onUpdate(task.id, { dueDate: e.target.value })}
                                    />
                                )}
                            </div>
                        )}

                        {/* Estimate (Depth 1 & 2) */}
                        {depth < 3 && (
                            <div className="flex items-center text-xs text-gray-300 bg-gray-50/50 px-1 rounded hover:bg-gray-100 transition-colors w-12 justify-end relative">
                                {isListMode ? (
                                    <span className="text-right w-full">{task.estimateDays || '-'}</span>
                                ) : (
                                    <select
                                        className="w-full bg-transparent text-right outline-none text-gray-500 appearance-none cursor-pointer z-10 relative"
                                        value={task.estimateDays || ''}
                                        onChange={(e) => onUpdate(task.id, { estimateDays: Number(e.target.value) || 0 })}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <option value="">-</option>
                                        {[1, 2, 3, 4, 5, 7, 10, 14].map(d => (
                                            <option key={d} value={d}>{d}</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}
                        {depth < 3 && <span className="text-xs text-gray-300 ml-[1px]">d</span>}
                    </div>
                </div>

                {/* Actions */}
                {!isListMode && (
                    <div className="flex items-center gap-1 opacity-20 group-hover/row:opacity-100 transition-opacity">
                        {/* Persistent Low Opacity: changed opacity-0 to opacity-20 */}
                        <button
                            onClick={handleFocus}
                            className={clsx("p-1.5 rounded transition-colors", task.isFocused ? "text-orange-500" : "text-gray-400 hover:text-orange-400")}
                            title="Focus"
                        >
                            <Target size={16} />
                        </button>
                        <button
                            onClick={() => onDelete(task.id)}
                            className="p-1.5 rounded text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* Children Recursive */}
            {isExpanded && depth < 3 && (
                <div className="pb-1">
                    {children.map(child => (
                        <TaskItem
                            key={child.id}
                            task={child}
                            allTasks={allTasks}
                            depth={(depth + 1) as TaskDepth}
                            onUpdate={onUpdate}
                            onAdd={onAdd}
                            onDelete={onDelete}
                            onTouch={onTouch}
                            isListMode={isListMode}
                            onDragStart={onDragStart}
                            onDragOver={onDragOver}
                            onDrop={onDrop}
                        />
                    ))}
                    {/* Compact Add Child Input */}
                    {!isListMode && (
                        <div className={clsx("ml-10 mt-0.5", depth === 1 ? "pr-2" : "")}>
                            <AddTaskInput
                                onAdd={handleAddChild}
                                placeholder="＋"
                                compact
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Add Project UI
const AddProjectInput: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        onAdd(name);
        setName('');
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <Plus size={16} className="text-gray-400 flex-shrink-0" />
            <input
                className="w-full bg-transparent text-sm outline-none text-gray-700 placeholder-gray-400"
                placeholder="New Project..."
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
        </form>
    );
}

const AddTaskInput: React.FC<{ onAdd: (title: string) => void; placeholder?: string; className?: string; compact?: boolean }> = ({ onAdd, placeholder, className, compact }) => {
    const [title, setTitle] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (title.trim()) {
            onAdd(title);
            setTitle(''); // Reset keeps focus usually
        }
    };

    // Shared Arrow Key Logic for Add Inputs
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const inputs = Array.from(document.querySelectorAll('.task-nav-item')) as HTMLInputElement[];
            const currentIndex = inputs.indexOf(e.currentTarget);

            if (currentIndex === -1) return;

            e.preventDefault();
            if (e.key === 'ArrowDown') {
                const next = inputs[currentIndex + 1];
                if (next) next.focus();
            } else {
                const prev = inputs[currentIndex - 1];
                if (prev) prev.focus();
            }
        }
    };

    if (compact) {
        return (
            <form onSubmit={handleSubmit} className={clsx("flex items-center gap-2 group/add font-medium", className)}>
                <input
                    className="task-nav-item bg-transparent text-xs outline-none w-full py-0.5 text-gray-500 placeholder-gray-300 focus:placeholder-indigo-300 transition-colors focus:text-indigo-600"
                    placeholder={placeholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </form>
        );
    }

    return (
        <form onSubmit={handleSubmit} className={clsx("relative", className)}>
            <div className="relative group">
                <Plus size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
                <input
                    className="task-nav-item w-full bg-gray-50 hover:bg-white focus:bg-white border-2 border-transparent focus:border-indigo-100 rounded-xl pl-10 pr-4 py-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition-all shadow-sm"
                    placeholder={placeholder}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                />
            </div>
        </form>
    );
};

export default ProjectView;
