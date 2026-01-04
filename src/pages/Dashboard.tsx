import React, { useMemo } from 'react';
import { useStore } from '../lib/store';
import { format, differenceInDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Square, Flame, Target, CalendarClock } from 'lucide-react';
import type { Task } from '../types';

// Helper to calculate days remaining
const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    return differenceInDays(new Date(dueDate), new Date());
};

const Dashboard: React.FC = () => {
    const { projects, tasks, updateTask } = useStore();

    // 4.1 Today's Focus
    // Filter tasks where isFocused is true and not done
    const focusTasks = useMemo(() => {
        return tasks.filter(t => t.isFocused && !t.done).slice(0, 5); // Max 5 as per spec loop? Spec says "Max 5 items" to show.
    }, [tasks]);

    // 4.2 Near Deadline (Depth 1, has DueDate, Not Done, Within 14 days)
    const deadlineTasks = useMemo(() => {
        return tasks.filter(t => {
            if (t.depth !== 1) return false;
            if (t.done) return false;
            if (!t.dueDate) return false;
            const days = getDaysRemaining(t.dueDate);
            return days !== null && days <= 14 && days >= 0; // "Within 14 days" usually implies future or today? logic says <= 14. 
        }).sort((a, b) => {
            return (new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
        });
    }, [tasks]);

    // 4.3 Recommendations
    // Spec: Deadline tasks (Priority 1), Top 1-3 are Deadline.
    // Others: Not touched for long, Short estimate, Stalled projects.
    const recommendations = useMemo(() => {
        // 1. Deadline Tasks (Already sorted by date)
        const priorityLists = [...deadlineTasks];

        // 2. Others (Placeholder logic for now as "Touched" analysis is needed)
        // Find tasks in 'stalled' projects that haven't been touched in a while?
        // For now, let's fill with some non-focused tasks
        const otherCandidates = tasks.filter(t => !t.isFocused && !t.done && !priorityLists.includes(t));

        // Simple Shuffle or just pick top 3
        const others = otherCandidates.slice(0, 3);

        return [...priorityLists.slice(0, 3), ...others].slice(0, 3); // Top 3 total? Spec says "Top 1-3 are Deadline". Let's show max 5 recs.
    }, [deadlineTasks, tasks]);



    const getBreadcrumb = (task: Task) => {
        const project = projects.find(p => p.id === task.projectId);
        const projectName = project ? project.name : 'Unknown Project';

        const parents: string[] = [];
        let currentParentId = task.parentTaskId;

        // Safety counter to prevent infinite loops if circular reference exists
        let depthSafety = 0;
        while (currentParentId && depthSafety < 5) {
            const parent = tasks.find(t => t.id === currentParentId);
            if (parent) {
                parents.unshift(parent.title);
                currentParentId = parent.parentTaskId;
            } else {
                break;
            }
            depthSafety++;
        }

        if (parents.length > 0) {
            return `${projectName} > ${parents.join(' > ')}`;
        }
        return projectName;
    };

    const handleToggleDone = (task: Task) => {
        updateTask(task.id, { done: !task.done });
    };

    const handleToggleFocus = (task: Task) => {
        updateTask(task.id, { isFocused: !task.isFocused });
    };

    const today = new Date();

    return (
        <div className="h-full flex flex-col bg-gray-50 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="p-6 pb-2">
                <div className="text-gray-500 text-sm font-medium">{format(today, 'yyyy年MM月dd日 (EEE)', { locale: ja })}</div>
                <h1 className="text-3xl font-bold text-gray-800 mt-1">Dashboard</h1>
            </div>

            <div className="p-6 space-y-8 max-w-2xl mx-auto w-full">

                {/* 4.1 Today's Focus */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="text-orange-500" />
                        <h2 className="text-xl font-bold text-gray-800">今日のフォーカス</h2>
                        <span className="text-sm text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{focusTasks.length}/5</span>
                    </div>

                    {focusTasks.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                            今日のタスクを選択してください
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {focusTasks.map(task => (
                                <div key={task.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow">
                                    <button onClick={() => handleToggleDone(task)} className="mt-1 text-gray-300 hover:text-indigo-500 transition-colors">
                                        <Square size={24} />
                                    </button>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-800 text-lg leading-tight mb-1">{task.title}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{getBreadcrumb(task)}</span>
                                            {task.estimateDays && <span>{task.estimateDays} day</span>}
                                        </div>
                                    </div>
                                    <button onClick={() => handleToggleFocus(task)} className="p-2 text-orange-500 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                                        <Target size={20} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 4.2 Near Deadline */}
                {deadlineTasks.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <CalendarClock className="text-red-500" />
                            <h2 className="text-xl font-bold text-gray-800">締切が迫っています</h2>
                        </div>
                        <div className="space-y-3">
                            {deadlineTasks.map(task => {
                                const days = getDaysRemaining(task.dueDate);
                                return (
                                    <div key={task.id} className="bg-white p-3 rounded-lg border-l-4 border-red-400 shadow-sm flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-800">{task.title}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-xs text-gray-400">{getBreadcrumb(task)}</div>
                                                <div className="text-xs text-red-500 font-bold">あと {days} 日 ({format(new Date(task.dueDate!), 'MM/dd')})</div>
                                            </div>
                                        </div>
                                        {!task.isFocused && (
                                            <button onClick={() => handleToggleFocus(task)} className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100 flex-shrink-0 ml-2">
                                                フォーカスへ
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* 4.3 Recommendations */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Flame className="text-indigo-500" />
                        <h2 className="text-xl font-bold text-gray-800">おすすめタスク</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        {recommendations.map(task => (
                            <div key={task.id} className="bg-white/60 p-3 rounded-lg border border-gray-200 flex items-center justify-between hover:bg-white transition-colors">
                                <div>
                                    <div className="font-medium text-gray-700">{task.title}</div>
                                    <div className="text-xs text-gray-400">{getBreadcrumb(task)}</div>
                                </div>
                                <button onClick={() => handleToggleFocus(task)} className="text-gray-400 hover:text-orange-500">
                                    <Target size={18} />
                                </button>
                            </div>
                        ))}
                        {recommendations.length === 0 && (
                            <p className="text-sm text-gray-400">現在おすすめできるタスクはありません。</p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default Dashboard;
