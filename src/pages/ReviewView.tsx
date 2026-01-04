import React from 'react';
import { PieChart, ListChecks, ArrowUpRight, TrendingUp } from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';

// Mock Data for Visualization
const MONTHLY_DATA = [
    { name: '7月', completed: 45, planned: 60 },
    { name: '8月', completed: 52, planned: 55 },
    { name: '9月', completed: 38, planned: 50 }, // Summer slump?
    { name: '10月', completed: 65, planned: 70 },
    { name: '11月', completed: 78, planned: 80 },
    { name: '12月', completed: 50, planned: 50 }, // Current (partial)
];

const UTILIZATION_DATA = [
    { name: 'Week 1', rate: 65 },
    { name: 'Week 2', rate: 72 },
    { name: 'Week 3', rate: 85 },
    { name: 'Week 4', rate: 78 },
];

const ReviewView: React.FC = () => {
    return (
        <div className="h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <header className="p-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                        <PieChart size={20} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">記録・分析</h1>
                        <p className="text-xs text-gray-400">Activity Analytics</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-5xl mx-auto space-y-6">

                    {/* Metrics Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <ListChecks size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-800">328</div>
                                <div className="text-xs text-gray-500">今年の消化タスク総数</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                <ArrowUpRight size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-800">89%</div>
                                <div className="text-xs text-gray-500">月平均 達成率</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <div className="text-3xl font-bold text-gray-800">54<span className="text-sm font-normal text-gray-400">h</span></div>
                                <div className="text-xs text-gray-500">今月の稼働時間</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Monthly Completion Chart */}
                        <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm h-80 flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-6 bg-indigo-500 rounded-full"></div>
                                月別タスク消化数
                            </h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={MONTHLY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            cursor={{ fill: '#f9fafb' }}
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Bar dataKey="completed" fill="#6366f1" radius={[4, 4, 0, 0]} name="消化数" />
                                        <Bar dataKey="planned" fill="#e0e7ff" radius={[4, 4, 0, 0]} name="計画数" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Utilization Trend */}
                        <div className="p-6 rounded-3xl bg-white border border-gray-100 shadow-sm h-80 flex flex-col">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                稼働率推移 (直近4週間)
                            </h3>
                            <div className="flex-1 min-h-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={UTILIZATION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                        />
                                        <Area type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" name="稼働率 (%)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                    </div>

                    {/* Placeholder for future detailed table */}
                    <div className="p-6 rounded-3xl bg-gray-50 border border-gray-100 border-dashed text-center text-gray-400 py-12">
                        詳細なログテーブルは準備中です...
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewView;
