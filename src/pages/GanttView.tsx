import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { format, addWeeks, startOfWeek, parseISO, differenceInCalendarWeeks, addDays, startOfDay, differenceInCalendarDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, Filter, Flame, Map } from 'lucide-react';
import clsx from 'clsx';

type ViewMode = 'week' | 'day';

const GanttView: React.FC = () => {
    const { projects, tasks, updateTask } = useStore();
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [isPlanningMode, setIsPlanningMode] = useState(false); // 6 Months view
    const [offset, setOffset] = useState(0);
    const [filterActiveOnly, setFilterActiveOnly] = useState(true);
    const [filterHotOnly, setFilterHotOnly] = useState(false);

    // ... (Project filtering same)
    const activeProjectIds = useMemo(() => {
        return projects
            .filter(p => {
                if (p.archived) return false;
                if (filterActiveOnly && p.status === 'stalled') return false;
                if (filterHotOnly && !p.isHot) return false;
                return true;
            })
            .sort((a, b) => a.order - b.order)
            .map(p => p.id);
    }, [projects, filterActiveOnly, filterHotOnly]);

    // ... (Task filtering same)
    const ganttTasks = useMemo(() => {
        return tasks.filter(t =>
            activeProjectIds.includes(t.projectId) &&
            (t.depth === 1 || t.depth === 2) &&
            !t.done
        );
    }, [tasks, activeProjectIds]);

    // ... (Time management same)
    const today = startOfDay(new Date());
    const startDate = useMemo(() => {
        // Offset Logic:
        // if isPlanningMode, offset is in 6-month chunks? Or just standard weeks? 
        // Let's keep offset as "pages" effectively.
        // Planning View: 24 weeks per page.
        // Week View: 5 weeks per page.
        // Day View: 2 weeks (14 days) per page.
        if (isPlanningMode) {
            // 6 months ~ 26 weeks
            return startOfWeek(addWeeks(today, offset * 26), { weekStartsOn: 1 });
        }
        if (viewMode === 'week') {
            return startOfWeek(addWeeks(today, offset * 5), { weekStartsOn: 1 });
        } else {
            return addDays(today, offset * 14);
        }
    }, [viewMode, offset, today, isPlanningMode]);

    const timeHeaders = useMemo(() => {
        if (isPlanningMode) {
            // Planning: 26 weeks * 7 days = 182 days
            const result: { date: Date; label: string; subLabel?: string }[] = [];
            let current = startDate;
            for (let i = 0; i < 182; i++) {
                // Show Month only when it changes? Or every week?
                // Just standard daily.
                result.push({
                    date: current,
                    label: format(current, 'dd'),
                    subLabel: format(current, 'EE')
                });
                current = addDays(current, 1);
            }
            return result;
        }

        if (viewMode === 'week') {
            const result: { date: Date; label: string; subLabel?: string }[] = [];
            let current = startDate;
            for (let i = 0; i < 5; i++) { // Show 5 weeks
                result.push({ date: current, label: `${format(current, 'MM/dd')}~` });
                current = addWeeks(current, 1);
            }
            return result;
        } else {
            // Day view: Show 14 days
            const result: { date: Date; label: string; subLabel?: string }[] = [];
            let current = startDate;
            for (let i = 0; i < 14; i++) {
                result.push({
                    date: current,
                    label: format(current, 'dd'),
                    subLabel: format(current, 'EE')
                });
                current = addDays(current, 1);
            }
            return result;
        }
    }, [viewMode, startDate, isPlanningMode]);

    // Force viewMode to 'week' logic if isPlanningMode is active for render purposes?
    // Actually, we can just check isPlanningMode in renderBar.
    // It is essentially a 'week' view but wider.

    // Drag and Drop Handlers (Same)
    const handleDragStart = (e: React.DragEvent, taskId: string) => {
        e.dataTransfer.setData('taskId', taskId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        // If Planning Mode, we are technically in 'day' context now (requested by user).
        const effectiveViewMode = isPlanningMode ? 'day' : viewMode;

        const newAnchorValue = format(
            effectiveViewMode === 'week' ? startOfWeek(targetDate, { weekStartsOn: 1 }) : targetDate,
            'yyyy-MM-dd'
        );

        await updateTask(taskId, {
            ganttAnchor: { type: effectiveViewMode, value: newAnchorValue },
            ganttManuallyScheduled: true
        });
    };

    // Grouping Logic (Same)
    const groupedTasks = useMemo(() => {
        const groups = activeProjectIds.map(pid => {
            const project = projects.find(p => p.id === pid);
            const pTasks = ganttTasks.filter(t => t.projectId === pid);

            const structured = pTasks.filter(t => t.depth === 1).map(d1 => {
                const children = pTasks.filter(t => t.parentTaskId === d1.id).sort((a, b) => a.order - b.order);
                return { ...d1, children };
            }).sort((a, b) => a.order - b.order);

            return { project, tasks: structured };
        });
        return groups.filter(g => g.tasks.length > 0);
    }, [activeProjectIds, projects, ganttTasks]);


    // Rendering Bar Logic (Same)
    const renderBar = (task: any, cellDate: Date) => {
        let anchorDate = task.ganttAnchor?.value ? parseISO(task.ganttAnchor.value) : null;
        if (!anchorDate && task.dueDate) anchorDate = startOfWeek(parseISO(task.dueDate), { weekStartsOn: 1 });
        if (!anchorDate) anchorDate = task.createdAt && task.createdAt.toDate ? startOfWeek(task.createdAt.toDate(), { weekStartsOn: 1 }) : today;

        const effectiveViewMode = isPlanningMode ? 'day' : viewMode;

        let isStart = false;
        if (effectiveViewMode === 'week') {
            isStart = differenceInCalendarWeeks(cellDate, anchorDate!, { weekStartsOn: 1 }) === 0;
        } else {
            const effectiveStart = task.ganttAnchor?.type === 'week' ? startOfWeek(anchorDate!, { weekStartsOn: 1 }) : anchorDate!;
            isStart = differenceInCalendarDays(cellDate, effectiveStart) === 0;
        }

        if (isStart) {
            const estimate = task.estimateDays || 1;
            let widthCells = 1;

            if (effectiveViewMode === 'week') {
                widthCells = Math.max(1, Math.ceil(estimate / 5));
            } else {
                widthCells = estimate;
            }

            const widthPercent = widthCells * 100;

            const isUntouched = task.ganttManuallyScheduled === false;

            const styleClass = isUntouched
                ? "bg-sky-50 border-sky-200 text-sky-400"
                : "bg-indigo-200 border-indigo-300 text-indigo-800";

            return (
                <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={clsx(
                        "absolute top-1 bottom-1 border rounded shadow-sm text-[10px] flex items-center justify-center font-bold px-1 overflow-hidden whitespace-nowrap z-10 cursor-move hover:brightness-95 transition-all select-none",
                        styleClass,
                        task.depth === 2 && !isUntouched && "bg-indigo-100/80 border-indigo-200 text-indigo-600"
                    )}
                    style={{ left: '2px', width: `calc(${widthPercent}% - 4px)` }}
                >
                    {task.estimateDays ? `${task.estimateDays}d` : ''}
                </div>
            );
        }
        return null;
    };


    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Controls Header - Responsive Grid/Flex */}
            <div className="p-4 border-b border-gray-100 bg-white flex-shrink-0 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                {/* Left Group: Title & Filters (Wrappable) */}
                <div className="flex flex-wrap items-center gap-3 md:gap-6">
                    <h2 className="text-xl font-bold text-gray-800 mr-2 md:mr-0">Gantt</h2>

                    {/* View Filters */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setFilterActiveOnly(!filterActiveOnly)}
                            className={clsx(
                                "px-2 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all",
                                filterActiveOnly ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                            )}
                        >
                            <Filter size={14} /> {filterActiveOnly ? 'Active' : 'All'}
                        </button>
                        <button
                            onClick={() => setFilterHotOnly(!filterHotOnly)}
                            className={clsx(
                                "px-2 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all",
                                filterHotOnly ? "bg-orange-50 border-orange-100 text-orange-500" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                            )}
                        >
                            <Flame size={14} fill={filterHotOnly ? "currentColor" : "none"} /> Hot
                        </button>
                    </div>

                    <div className="hidden md:block w-px h-6 bg-gray-200" />

                    {/* View Modes */}
                    <div className="flex bg-gray-100 p-0.5 rounded-lg overflow-x-auto max-w-full">
                        <button
                            onClick={() => { setViewMode('day'); setIsPlanningMode(false); setOffset(0); }}
                            className={clsx("px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-all flex items-center gap-1 whitespace-nowrap", !isPlanningMode && viewMode === 'day' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                        >
                            <CalendarDays size={14} /> Daily
                        </button>
                        <button
                            onClick={() => { setViewMode('week'); setIsPlanningMode(false); setOffset(0); }}
                            className={clsx("px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-all flex items-center gap-1 whitespace-nowrap", !isPlanningMode && viewMode === 'week' ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
                        >
                            <Calendar size={14} /> Weekly
                        </button>
                        <button
                            onClick={() => { setIsPlanningMode(true); setOffset(0); }}
                            className={clsx("px-3 py-1 rounded-md text-xs md:text-sm font-medium transition-all flex items-center gap-1 whitespace-nowrap", isPlanningMode ? "bg-white shadow-sm text-green-600" : "text-gray-500 hover:text-gray-700")}
                        >
                            <Map size={14} /> 6 Mo
                        </button>
                    </div>
                </div>

                {/* Right Group: Navigation */}
                <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto bg-gray-50 md:bg-transparent p-2 md:p-0 rounded-lg">
                    <button onClick={() => setOffset(o => o - 1)} className="p-1.5 hover:bg-gray-200 md:hover:bg-gray-100 rounded-full transition-colors"><ChevronLeft size={20} /></button>
                    <span className="font-mono font-bold text-sm md:text-lg text-gray-700 text-center flex-1 md:flex-none">
                        {format(timeHeaders[0].date, 'yyyy/MM/dd')} ~
                    </span>
                    <button onClick={() => setOffset(o => o + 1)} className="p-1.5 hover:bg-gray-200 md:hover:bg-gray-100 rounded-full transition-colors"><ChevronRight size={20} /></button>
                </div>
            </div>

            {/* Matrix */}
            <div className="flex-1 overflow-auto custom-scrollbar relative bg-white">
                <table className="w-full border-collapse">
                    <thead className="sticky top-0 bg-gray-50 z-40 shadow-sm">
                        <tr>
                            <th className="p-3 text-left min-w-[220px] border-b border-r border-gray-200 font-bold text-gray-500 text-sm pl-6 bg-gray-50 sticky left-0 z-50">Task</th>
                            {timeHeaders.map(h => (
                                <th key={h.date.toString()} className={clsx(
                                    "p-2 border-b border-r border-gray-200 font-mono text-sm text-gray-600 bg-gray-50 text-center",
                                    viewMode === 'week' ? "min-w-[120px]" : "min-w-[40px]"
                                )}>
                                    <div className="font-bold">{h.label}</div>
                                    {h.subLabel && <div className="text-[10px] text-gray-400 font-normal">{h.subLabel}</div>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {groupedTasks.map(group => (
                            <React.Fragment key={group.project?.id}>
                                <tr className="bg-gray-100/50">
                                    <td colSpan={timeHeaders.length + 1} className="p-2 font-bold text-gray-700 text-xs uppercase tracking-wider sticky left-0 bg-gray-100/90 backdrop-blur-sm border-b border-gray-200 pl-4 z-30">
                                        {group.project?.name}
                                    </td>
                                </tr>
                                {group.tasks.map(d1 => (
                                    <React.Fragment key={d1.id}>
                                        <tr className="hover:bg-indigo-50/10 transition-colors group/row">
                                            <td className="p-2 border-r border-gray-100 text-sm font-medium text-gray-800 border-b border-gray-100 pl-6 sticky left-0 bg-white group-hover/row:bg-indigo-50/10 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                <div className="flex items-center gap-2 max-w-[200px]">
                                                    <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", d1.done ? "bg-gray-300" : "bg-indigo-500")}></span>
                                                    <span className="truncate">{d1.title}</span>
                                                </div>
                                            </td>
                                            {timeHeaders.map(h => (
                                                <td
                                                    key={h.date.toString()}
                                                    className="border-r border-gray-100 border-b border-gray-100 p-0 relative h-10 hover:bg-gray-50 transition-colors overflow-visible"
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, h.date)}
                                                >
                                                    {renderBar(d1, h.date)}
                                                </td>
                                            ))}
                                        </tr>
                                        {d1.children.map(d2 => (
                                            <tr key={d2.id} className="hover:bg-indigo-50/10 transition-colors group/row">
                                                <td className="p-1 border-r border-gray-100 text-xs text-gray-500 border-b border-gray-100 pl-10 sticky left-0 bg-white group-hover/row:bg-indigo-50/10 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    <div className="max-w-[180px] truncate flex items-center gap-1">
                                                        <span className="text-gray-300">└</span> {d2.title}
                                                    </div>
                                                </td>
                                                {timeHeaders.map(h => (
                                                    <td
                                                        key={h.date.toString()}
                                                        className="border-r border-gray-100 border-b border-gray-100 p-0 relative h-8 hover:bg-gray-50 transition-colors overflow-visible"
                                                        onDragOver={handleDragOver}
                                                        onDrop={(e) => handleDrop(e, h.date)}
                                                    >
                                                        {renderBar(d2, h.date)}
                                                    </td>
                                                ))}

                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                {groupedTasks.length === 0 && (
                    <div className="p-20 text-center text-gray-300 flex flex-col items-center gap-2">
                        <Calendar size={48} className="opacity-20" />
                        <div>No Active Tasks</div>
                        <div className="text-xs">Select "Projects" to add tasks</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GanttView;
