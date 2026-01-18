import React, { useMemo, useState } from 'react';
import { useStore } from '../lib/store';
import { format, addWeeks, startOfWeek, parseISO, differenceInCalendarWeeks, addDays, startOfDay, differenceInCalendarDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays, Filter, Flame, Map, Flag, AlertTriangle, Layers } from 'lucide-react';
import clsx from 'clsx';

type ViewMode = 'week' | 'day';

const GanttView: React.FC = () => {
    const { projects, tasks, updateTask } = useStore();
    const [viewMode, setViewMode] = useState<ViewMode>('day');
    const [isPlanningMode, setIsPlanningMode] = useState(false); // 6 Months view
    const [offset, setOffset] = useState(0);
    const [filterActiveOnly, setFilterActiveOnly] = useState(true);
    const [filterHotOnly, setFilterHotOnly] = useState(false);
    const [filterDepth1Only, setFilterDepth1Only] = useState(false);

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


    // ... (helper functions)
    // Helper to get task range (Fixed or Auto)
    const getTaskRange = (task: any, children: any[]) => {
        let start = task.ganttAnchor?.value ? parseISO(task.ganttAnchor.value) : null;
        if (!start && task.dueDate) start = startOfWeek(parseISO(task.dueDate), { weekStartsOn: 1 });
        if (!start && task.createdAt) {
            const d = (task.createdAt as any).toDate ? (task.createdAt as any).toDate() : task.createdAt;
            start = startOfWeek(d, { weekStartsOn: 1 });
        }
        if (!start) start = today;

        let end = addDays(start!, task.estimateDays || 1);
        let isAuto = false;

        // Auto-Range Mode if no estimate and has children
        if ((!task.estimateDays || task.estimateDays === 0) && children && children.length > 0) {
            isAuto = true;
            const childRanges = children.map(c => {
                let cS = c.ganttAnchor?.value ? parseISO(c.ganttAnchor.value) : null;
                if (!cS && c.dueDate) cS = startOfWeek(parseISO(c.dueDate), { weekStartsOn: 1 });
                if (!cS && c.createdAt) {
                    const d = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : c.createdAt;
                    cS = startOfWeek(d, { weekStartsOn: 1 });
                }
                if (!cS) cS = today;

                // Untouched logic for children (same as renderBar logic)
                if (!c.done && c.ganttManuallyScheduled === false && differenceInCalendarDays(startOfDay(cS!), today) < 0) {
                    cS = today;
                }

                const cE = addDays(cS!, c.estimateDays || 1);
                return { start: cS, end: cE };
            });

            const minStart = childRanges.reduce((min, r) => r.start < min ? r.start : min, childRanges[0].start);
            const maxEnd = childRanges.reduce((max, r) => r.end > max ? r.end : max, childRanges[0].end);

            start = minStart;
            end = maxEnd;
        }

        return { start: start!, end: end, isAuto };
    };


    const handleDrop = async (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('taskId');
        if (!taskId) return;

        // Find task and check if it's a parent in Range Mode
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const children = tasks.filter(t => t.parentTaskId === taskId && !t.done);

        // Planning Mode Adjustment
        const effectiveViewMode = isPlanningMode ? 'day' : viewMode;

        // Determine Mode
        const { start: currentStart, isAuto } = getTaskRange(task, children);

        if (isAuto && children.length > 0) {
            // Bulk Move
            const deltaDays = differenceInCalendarDays(targetDate, currentStart);
            if (deltaDays === 0) return;

            await Promise.all(children.map(child => {
                let cS = child.ganttAnchor?.value ? parseISO(child.ganttAnchor.value) : null;
                // Fallback logic duplicated for safety
                if (!cS && child.dueDate) cS = startOfWeek(parseISO(child.dueDate), { weekStartsOn: 1 });
                if (!cS && child.createdAt) {
                    const d = (child.createdAt as any).toDate ? (child.createdAt as any).toDate() : child.createdAt;
                    cS = startOfWeek(d, { weekStartsOn: 1 });
                }
                if (!cS) cS = today;

                // If untouched and moving force manual
                const newDate = addDays(cS!, deltaDays);
                const newAnchor = format(newDate, 'yyyy-MM-dd');

                return updateTask(child.id, {
                    ganttAnchor: { type: child.ganttAnchor?.type || 'day', value: newAnchor },
                    ganttManuallyScheduled: true
                });
            }));

        } else {
            // Normal Move
            const newAnchorValue = format(
                effectiveViewMode === 'week' ? startOfWeek(targetDate, { weekStartsOn: 1 }) : targetDate,
                'yyyy-MM-dd'
            );

            await updateTask(taskId, {
                ganttAnchor: { type: effectiveViewMode, value: newAnchorValue },
                ganttManuallyScheduled: true
            });
        }
    };

    // Resize Logic
    const [resizingTaskId, setResizingTaskId] = useState<string | null>(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeOriginalEstimate, setResizeOriginalEstimate] = useState(0);

    // Updating estimate directly might cause flicker or confusing DB writes. 
    // Better to track visual delta and commit on mouseup.
    // For simplicity in this iteration, let's update local state 'previewEstimate' if possible, or just commit on DragEnd if we use dnd.
    // BUT user wanted "Drag edge". Standard Mouse Events are best.

    // We need a ref to track temp estimate for the resizing task to render it effectively.
    const [resizePreviewEstimate, setResizePreviewEstimate] = useState<number | null>(null);

    // Global Mouse Handlers for Resize
    React.useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!resizingTaskId) return;

            const diff = e.clientX - resizeStartX;
            // Determine cell width approximation. 
            // In Week mode: 1 cell ~ ? px. In Day mode: 1 cell ~ ? px. 
            // This is hard because cell width is flexible in CSS (min-w). 
            // We can approximate or measure? 
            // Let's assume standard min-widths: Day=40px, Week=120px. 
            // Wait, CSS says min-w-[40px] and min-w-[120px].

            const effectiveViewMode = isPlanningMode ? 'day' : viewMode;
            const daysPerPixel = effectiveViewMode === 'week' ? 7 / 120 : 1 / 40;

            const diffDays = Math.round(diff * daysPerPixel);
            const newEst = Math.max(1, resizeOriginalEstimate + diffDays);

            setResizePreviewEstimate(newEst);
        };

        const handleMouseUp = async () => {
            if (resizingTaskId && resizePreviewEstimate !== null) {
                await updateTask(resizingTaskId, {
                    estimateDays: resizePreviewEstimate,
                    ganttManuallyScheduled: true // Lock it if it was auto
                });
            }
            setResizingTaskId(null);
            setResizePreviewEstimate(null);
        };

        if (resizingTaskId) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingTaskId, resizeStartX, resizeOriginalEstimate, resizePreviewEstimate, viewMode, isPlanningMode, updateTask]);

    const handleResizeStart = (e: React.MouseEvent, task: any, children: any[]) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingTaskId(task.id);
        setResizeStartX(e.clientX);

        // If Auto Mode, calculate current duration in days as original estimate
        let validEstimate = task.estimateDays || 0;
        if (validEstimate === 0 && children.length > 0) {
            const { start, end } = getTaskRange(task, children);
            validEstimate = differenceInCalendarDays(end, start);
        }
        if (validEstimate === 0) validEstimate = 1;

        setResizeOriginalEstimate(validEstimate);
        setResizePreviewEstimate(validEstimate);
        setResizePreviewEstimate(validEstimate);
    };

    const handleResizeReset = async (e: React.MouseEvent, task: any) => {
        e.preventDefault();
        e.stopPropagation();
        // Reset to 0 -> Auto Range Mode
        await updateTask(task.id, {
            estimateDays: 0
        });
    };



    // Grouping Logic
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

    // Rendering Bar Logic
    const renderBar = (task: any, children: any[], cellDate: Date) => {
        // ... (existing helper logic)

        let displayAnchor: Date;
        let isAuto = false;
        let estimate = task.estimateDays || 0;

        // If Resizing this task, use preview
        if (resizingTaskId === task.id && resizePreviewEstimate !== null) {
            // When resizing, we effectively treat it as Manual/Fixed mode visually
            estimate = resizePreviewEstimate;
            // Anchor is standard
            let raw = task.ganttAnchor?.value ? parseISO(task.ganttAnchor.value) : null;
            // ... fallback logic ...
            if (!raw && task.dueDate) raw = startOfWeek(parseISO(task.dueDate), { weekStartsOn: 1 });
            if (!raw && task.createdAt) {
                const d = (task.createdAt as any).toDate ? (task.createdAt as any).toDate() : task.createdAt;
                raw = startOfWeek(d, { weekStartsOn: 1 });
            }
            if (!raw) raw = today;

            // If it WAS auto, we need the calculated start as the anchor for visualization during resize
            if ((!task.estimateDays || task.estimateDays === 0) && children.length > 0) {
                const { start } = getTaskRange(task, children);
                raw = start;
            }
            displayAnchor = raw!;

        } else {
            // Standard Render
            const range = getTaskRange(task, children);
            displayAnchor = range.start;
            isAuto = range.isAuto;
            // Re-calc estimate for display if auto
            if (isAuto) {
                estimate = differenceInCalendarDays(range.end, range.start);
            } else {
                // Manual
                estimate = task.estimateDays || 1;
            }
        }

        // Overdue shift logic adjustment for Auto? 
        // Auto ranges are based on children. If children are shifted, Auto Range shifts. 
        // So we don't need special overdrive logic for Auto Parent itself, just rely on computed `start`.
        // BUT for Manual tasks (Basic logic), we retain the existing shift logic.

        let isOverdueShift = false;

        // New Logic: Only shift if the task is NOT auto-range AND is NOT completed
        if (!isAuto && !task.done) {
            // Check if the *End* of the task is in the past.
            // If estimate is 1 (1 day duration), end is Start + 1 day.
            // If End <= Today, it means the task "should have finished yesterday or before".
            const calculatedEndDate = addDays(displayAnchor, estimate);
            const isEndPast = differenceInCalendarDays(startOfDay(calculatedEndDate), today) <= 0;

            if (task.ganttManuallyScheduled !== false && isEndPast) {
                displayAnchor = today;
                isOverdueShift = true;
            }
            // Untouched logic: If start is past, move to today (Keep "Backlog" feel)
            // Wait, this was the OLD logic that initiated the shift if Start was past.
            // User wanted: "Only shift if Estimate End Date is past".
            // So we should REMOVE the shift for just "Start is Past".
            // If it's untouched/backlog, we usually want it to float to today.
            // BUT if the user explicitly changed the logic to "Allow past start", then we should respect that?
            // "Old: Start Day Past -> Move to Today" (This was the backlog behavior)
            // "New: End Day Past -> Move to Today"
            // So if Start is past but End is future, it stays in past. 
            // So this block:
            /*
            if (task.ganttManuallyScheduled === false && rawIsPast) {
                displayAnchor = today;
            }
            */
            // should be modified or removed?
            // If it's untouched, it usually means "I haven't planned it yet".
            // If I created a task 3 days ago and didn't touch it, it should probably float to today?
            // User request says: "Old: Start date past -> Today. New: Estimate End date past -> Today".
            // So even for untouched tasks, we apply the new rule.

            // Check if untouched task's END is past
            if (task.ganttManuallyScheduled === false) {
                const rawIsEndPast = differenceInCalendarDays(startOfDay(calculatedEndDate), today) <= 0;
                if (rawIsEndPast) {
                    displayAnchor = today;
                }
            }
        }

        const effectiveViewMode = isPlanningMode ? 'day' : viewMode;

        let isStart = false;
        let isCarryOver = false;
        let effectiveEstimate = estimate;

        // 1. Check strict start match
        if (effectiveViewMode === 'week') {
            isStart = differenceInCalendarWeeks(cellDate, displayAnchor, { weekStartsOn: 1 }) === 0;
        } else {
            isStart = differenceInCalendarDays(cellDate, displayAnchor) === 0;
        }

        // 2. Check Carry-Over (Start is before ViewStart, but End is after ViewStart)
        // Only if we are at the FIRST column of the view
        const isFirstColumn = effectiveViewMode === 'week'
            ? differenceInCalendarWeeks(cellDate, startDate, { weekStartsOn: 1 }) === 0
            : differenceInCalendarDays(cellDate, startDate) === 0;

        if (isFirstColumn && !isStart) {
            // If valid bar, displayAnchor < startDate AND (displayAnchor + estimate) > startDate
            const startDiff = differenceInCalendarDays(startDate, displayAnchor);
            if (startDiff > 0) {
                // Started before view. Check if it ends after view start
                // If estimate is days
                if (estimate > startDiff) {
                    isCarryOver = true;
                    effectiveEstimate = estimate - startDiff;
                }
            }
        }

        if (isStart || isCarryOver) {
            let widthCells = 1;

            if (effectiveViewMode === 'week') {
                widthCells = Math.max(1, Math.ceil(effectiveEstimate / 7));
            } else {
                widthCells = effectiveEstimate;
            }

            const widthPercent = widthCells * 100;
            const isUntouched = task.ganttManuallyScheduled === false && !isAuto;

            let styleClass = "";
            let borderStyle = "";

            if (isAuto) {
                // Auto Range Style
                styleClass = "bg-indigo-50/50 text-indigo-400";
                borderStyle = "border-2 border-indigo-300 border-dashed";
            } else if (isOverdueShift) {
                styleClass = "bg-rose-100 border-rose-200 text-rose-500";
                borderStyle = "border";
            } else if (isUntouched) {
                // Untouched logic: If start is past, move to today (Keep "Backlog" feel)
                // We keep the visual style for untouched tasks
                styleClass = "bg-sky-50 border-sky-200 text-sky-400";
                borderStyle = "border";
            } else {
                styleClass = "bg-indigo-200 border-indigo-300 text-indigo-800";
                if (task.depth === 2) styleClass = "bg-indigo-100/80 border-indigo-200 text-indigo-600";
                borderStyle = "border";
            }

            // Should we indicate it's a "Partial" bar? 
            // Maybe remove left rounded corner?
            const roundedClass = isCarryOver ? "rounded-r rounded-l-none" : "rounded";

            return (
                <div
                    draggable={!resizingTaskId && !isCarryOver} // Disable drag if resizing or if it's a partial bar (dragging partial might be confusing logic-wise, but maybe okay? Let's disable for safety effectively moving anchor)
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className={clsx(
                        "absolute top-1 bottom-1 shadow-sm text-[10px] flex items-center justify-center font-bold px-1 overflow-visible whitespace-nowrap z-10 select-none group/bar",
                        !resizingTaskId && !isCarryOver && "cursor-move hover:brightness-95 transition-all",
                        styleClass,
                        borderStyle,
                        roundedClass
                    )}
                    style={{ left: '2px', width: `calc(${widthPercent}% - 4px)` }}
                >
                    {/* Content */}
                    <span className="truncate overflow-hidden w-full text-center">
                        {estimate > 0 ? `${estimate}d` : ''}
                    </span>

                    {/* Resize Handle - Only show if it's the actual end of the bar? Yes, logic handles right edge. */}
                    <div
                        className="absolute right-0 top-0 bottom-0 w-3 cursor-col-resize hover:bg-black/10 flex items-center justify-center opacity-0 group-hover/bar:opacity-100 transition-opacity"
                        onMouseDown={(e) => handleResizeStart(e, task, children)}
                        onDoubleClick={(e) => handleResizeReset(e, task)}
                    >
                        <div className="w-0.5 h-3 bg-black/20 rounded-full" />
                    </div>
                </div>
            );
        }
        return null;
    };



    const monthHeaders = useMemo(() => {
        if (timeHeaders.length === 0) return [];

        const months: { label: string; colSpan: number }[] = [];
        let currentMonthLabel = '';
        let currentCount = 0;

        timeHeaders.forEach(h => {
            const label = format(h.date, 'M月');
            if (label !== currentMonthLabel) {
                if (currentMonthLabel !== '') {
                    months.push({ label: currentMonthLabel, colSpan: currentCount });
                }
                currentMonthLabel = label;
                currentCount = 1;
            } else {
                currentCount++;
            }
        });
        if (currentCount > 0) {
            months.push({ label: currentMonthLabel, colSpan: currentCount });
        }
        return months;
    }, [timeHeaders]);

    const isSaturday = (date: Date) => date.getDay() === 6;
    const isSunday = (date: Date) => date.getDay() === 0;

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
                        <button
                            onClick={() => setFilterDepth1Only(!filterDepth1Only)}
                            className={clsx(
                                "px-2 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 transition-all",
                                filterDepth1Only ? "bg-purple-50 border-purple-100 text-purple-600" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
                            )}
                            title="Show 1st Level Tasks Only"
                        >
                            <Layers size={14} /> 1st
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
                            onClick={() => { setIsPlanningMode(true); setViewMode('day'); setOffset(0); }}
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
                        {/* Month Row */}
                        <tr>
                            <th className="p-1 min-w-[220px] bg-gray-50 border-b border-r border-gray-200 sticky left-0 z-50"></th>
                            {monthHeaders.map((m, i) => (
                                <th key={i} colSpan={m.colSpan} className="p-1 text-xs text-gray-500 font-bold border-b border-r border-gray-200 text-left pl-2 bg-gray-50">
                                    {m.label}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            <th className="p-3 text-left min-w-[220px] border-b border-r border-gray-200 font-bold text-gray-500 text-sm pl-6 bg-gray-50 sticky left-0 z-50">Task</th>
                            {timeHeaders.map(h => {
                                const isSat = isSaturday(h.date);
                                const isSun = isSunday(h.date);
                                return (
                                    <th key={h.date.toString()} className={clsx(
                                        "p-2 border-b border-r border-gray-200 font-mono text-sm text-gray-600 text-center",
                                        viewMode === 'week' && !isPlanningMode ? "min-w-[120px]" : "min-w-[40px]",
                                        isSat ? "bg-blue-100" : isSun ? "bg-red-100" : "bg-gray-50"
                                    )}>
                                        <div className="font-bold">{h.label}</div>
                                        {h.subLabel && <div className="text-[10px] text-gray-500 font-medium">{h.subLabel}</div>}
                                    </th>
                                );
                            })}
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
                                {group.tasks.map(d1 => {
                                    const dueDate = d1.dueDate ? parseISO(d1.dueDate) : null;
                                    const estimate = d1.estimateDays || 0;
                                    const startDeadline = dueDate ? addDays(dueDate, -estimate) : null;

                                    return (
                                        <React.Fragment key={d1.id}>
                                            <tr className="hover:bg-indigo-50/10 transition-colors group/row">
                                                <td className="p-2 border-r border-gray-100 text-sm font-medium text-gray-800 border-b border-gray-100 pl-6 sticky left-0 bg-white group-hover/row:bg-indigo-50/10 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    <div className="flex items-center gap-2 max-w-[200px]">
                                                        <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", d1.done ? "bg-gray-300" : "bg-indigo-500")}></span>
                                                        <span className="truncate">{d1.title}</span>
                                                    </div>
                                                </td>
                                                {timeHeaders.map(h => {
                                                    const isSat = isSaturday(h.date);
                                                    const isSun = isSunday(h.date);
                                                    const isDue = dueDate && differenceInCalendarDays(h.date, dueDate) === 0;
                                                    // Hide Start Deadline if it overlaps with Due Date
                                                    const isStartDead = startDeadline && differenceInCalendarDays(h.date, startDeadline) === 0 && !isDue;

                                                    // Danger Zone: After Start Deadline AND Before Due Date
                                                    const isDanger = startDeadline && dueDate &&
                                                        differenceInCalendarDays(h.date, startDeadline) > 0 &&
                                                        differenceInCalendarDays(h.date, dueDate) < 0;

                                                    return (
                                                        <td
                                                            key={h.date.toString()}
                                                            className={clsx(
                                                                "border-r border-gray-100 border-b border-gray-100 p-0 relative h-10 transition-colors overflow-visible",
                                                                isDue ? "!bg-red-500/20" : isStartDead ? "!bg-yellow-500/20" : isDanger ? "!bg-yellow-100/40" : isSat ? "bg-blue-50/60 hover:bg-blue-100" : isSun ? "bg-red-50/60 hover:bg-red-100" : "hover:bg-gray-50"
                                                            )}
                                                            onDragOver={handleDragOver}
                                                            onDrop={(e) => handleDrop(e, h.date)}
                                                        >
                                                            {isDue && (
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                                                                    <Flag size={12} className="text-red-600 fill-red-600/20" />
                                                                </div>
                                                            )}
                                                            {isStartDead && (
                                                                <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                                                                    <AlertTriangle size={12} className="text-amber-600 fill-amber-600/20" />
                                                                </div>
                                                            )}
                                                            {renderBar(d1, d1.children, h.date)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                            {!filterDepth1Only && d1.children.map(d2 => {
                                                const d2DueDate = d2.dueDate ? parseISO(d2.dueDate) : null;
                                                const d2Estimate = d2.estimateDays || 0;
                                                const d2StartDeadline = d2DueDate ? addDays(d2DueDate, -d2Estimate) : null;

                                                return (
                                                    <tr key={d2.id} className="hover:bg-indigo-50/10 transition-colors group/row">
                                                        <td className="p-1 border-r border-gray-100 text-xs text-gray-500 border-b border-gray-100 pl-10 sticky left-0 bg-white group-hover/row:bg-indigo-50/10 z-40 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                            <div className="max-w-[180px] truncate flex items-center gap-1">
                                                                <span className="text-gray-300">└</span> {d2.title}
                                                            </div>
                                                        </td>
                                                        {timeHeaders.map(h => {
                                                            const isSat = isSaturday(h.date);
                                                            const isSun = isSunday(h.date);
                                                            const isDue = d2DueDate && differenceInCalendarDays(h.date, d2DueDate) === 0;
                                                            // Hide Start Deadline if it overlaps with Due Date
                                                            const isStartDead = d2StartDeadline && differenceInCalendarDays(h.date, d2StartDeadline) === 0 && !isDue;

                                                            const isDanger = d2StartDeadline && d2DueDate &&
                                                                differenceInCalendarDays(h.date, d2StartDeadline) > 0 &&
                                                                differenceInCalendarDays(h.date, d2DueDate) < 0;

                                                            return (
                                                                <td
                                                                    key={h.date.toString()}
                                                                    className={clsx(
                                                                        "border-r border-gray-100 border-b border-gray-100 p-0 relative h-8 transition-colors overflow-visible",
                                                                        isDue ? "!bg-red-500/20" : isStartDead ? "!bg-yellow-500/20" : isDanger ? "!bg-yellow-100/40" : isSat ? "bg-blue-50/60 hover:bg-blue-100" : isSun ? "bg-red-50/60 hover:bg-red-100" : "hover:bg-gray-50"
                                                                    )}
                                                                    onDragOver={handleDragOver}
                                                                    onDrop={(e) => handleDrop(e, h.date)}
                                                                >
                                                                    {isDue && (
                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                                                                            <Flag size={10} className="text-red-600 fill-red-600/20" />
                                                                        </div>
                                                                    )}
                                                                    {isStartDead && (
                                                                        <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                                                                            <AlertTriangle size={10} className="text-amber-600 fill-amber-600/20" />
                                                                        </div>
                                                                    )}
                                                                    {renderBar(d2, [], h.date)}
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
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
