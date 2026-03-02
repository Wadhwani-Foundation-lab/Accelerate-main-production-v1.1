import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import {
    Loader2,
    Search,
    Calendar,
    Phone,
    Users,
    ChevronDown,
    Plus,
    Link2,
    ExternalLink,
    MoreHorizontal,
} from 'lucide-react';
import { ScheduleCallModal } from '../components/ScheduleCallModal';

interface Venture {
    id: string;
    name: string;
    founder_name?: string;
    status: string;
    program_recommendation?: string;
    created_at: string;
    assigned_vsm_id?: string;
    vsm_reviewed_at?: string;
}

interface Panelist {
    id: string;
    name: string;
    email: string;
    program: string;
}

interface CallCount {
    venture_id: string;
    total: number;
    completed: number;
    latest_meet_link?: string;
}

type ProgramFilter = '' | 'Prime' | 'Core' | 'Select';
type CallStatusFilter = '' | 'no_calls' | 'has_calls';

function getDisplayStatus(venture: Venture): { label: string; color: string; bg: string } {
    const status = venture.status;
    const rec = venture.program_recommendation;

    if (status === 'Panel Review' && rec === 'Prime') {
        return { label: 'Pending with Panel (Prime)', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' };
    }
    if (status === 'Panel Review') {
        return { label: `Pending with Panel (${rec || 'Core/Select'})`, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' };
    }
    if (status === 'Approved') {
        return { label: 'Accepted by Business', color: 'text-green-700', bg: 'bg-green-50 border-green-200' };
    }
    if (status === 'Rejected') {
        return { label: 'Declined by Business', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
    }
    if (status === 'Under Review' || status === 'Submitted') {
        return { label: 'Pending with Screening Manager', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    }
    return { label: status, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' };
}

export const OpsManagerDashboard: React.FC = () => {
    const [ventures, setVentures] = useState<Venture[]>([]);
    const [panelists, setPanelists] = useState<Panelist[]>([]);
    const [callCounts, setCallCounts] = useState<CallCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [programFilter, setProgramFilter] = useState<ProgramFilter>('');
    const [callStatusFilter, setCallStatusFilter] = useState<CallStatusFilter>('');
    const [scheduleModalVenture, setScheduleModalVenture] = useState<Venture | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch ventures with assessments
            const { data: ventureData } = await supabase
                .from('ventures')
                .select('*, assessments:venture_assessments(*)')
                .in('status', ['Panel Review', 'Approved', 'Rejected', 'Under Review', 'Submitted']);

            const flatVentures: Venture[] = (ventureData || []).map((v: any) => {
                const assessment = (v.assessments || []).find((a: any) => a.is_current) || v.assessments?.[0] || {};
                return {
                    ...v,
                    program_recommendation: assessment.program_recommendation,
                    vsm_reviewed_at: assessment.assessment_date,
                };
            });

            setVentures(flatVentures);

            // Fetch panelists
            const { data: panelistData } = await supabase
                .from('panelists')
                .select('*')
                .order('name');
            setPanelists(panelistData || []);

            // Fetch scheduled call counts grouped by venture_id
            const { data: callData } = await supabase
                .from('scheduled_calls')
                .select('venture_id, status, meet_link, created_at')
                .order('created_at', { ascending: false });

            const counts: Record<string, CallCount> = {};
            (callData || []).forEach((c: any) => {
                if (!counts[c.venture_id]) {
                    counts[c.venture_id] = { venture_id: c.venture_id, total: 0, completed: 0, latest_meet_link: c.meet_link };
                }
                counts[c.venture_id].total++;
                if (c.status === 'completed') counts[c.venture_id].completed++;
            });
            setCallCounts(Object.values(counts));
        } catch (err) {
            console.error('Error fetching ops data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const getCallCount = (ventureId: string) => {
        return callCounts.find(c => c.venture_id === ventureId) || { total: 0, completed: 0 };
    };

    // Filter ventures
    const committeeVentures = ventures.filter(v => v.status === 'Panel Review');
    const filteredVentures = ventures.filter(v => {
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            if (!v.name.toLowerCase().includes(q) && !(v.founder_name || '').toLowerCase().includes(q)) return false;
        }
        if (programFilter) {
            if (v.program_recommendation !== programFilter) return false;
        }
        if (callStatusFilter === 'no_calls') {
            if (getCallCount(v.id).total > 0) return false;
        }
        if (callStatusFilter === 'has_calls') {
            if (getCallCount(v.id).total === 0) return false;
        }
        return true;
    });

    // Summary card stats
    const pendingWithPanel = committeeVentures.length;
    const noCallsScheduled = committeeVentures.filter(v => getCallCount(v.id).total === 0).length;
    const hasCallsScheduled = committeeVentures.filter(v => getCallCount(v.id).total > 0).length;

    const getProgramBreakdown = (ventureList: Venture[]) => {
        const prime = ventureList.filter(v => v.program_recommendation === 'Prime').length;
        const core = ventureList.filter(v => v.program_recommendation === 'Core').length;
        const select = ventureList.filter(v => v.program_recommendation === 'Select').length;
        return { prime, core, select };
    };

    const pendingBreakdown = getProgramBreakdown(committeeVentures);
    const noCallsBreakdown = getProgramBreakdown(committeeVentures.filter(v => getCallCount(v.id).total === 0));
    const hasCallsBreakdown = getProgramBreakdown(committeeVentures.filter(v => getCallCount(v.id).total > 0));

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
                <p className="text-gray-500 mt-1">Ventures recommended to panel by screening manager</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <SummaryCard
                    title="Pending with Panel"
                    count={pendingWithPanel}
                    breakdown={pendingBreakdown}
                    icon={<Users className="w-5 h-5 text-indigo-600" />}
                    color="indigo"
                />
                <SummaryCard
                    title="No Calls Scheduled"
                    count={noCallsScheduled}
                    breakdown={noCallsBreakdown}
                    icon={<Calendar className="w-5 h-5 text-amber-600" />}
                    color="amber"
                />
                <SummaryCard
                    title="At Least 1 Call Scheduled"
                    count={hasCallsScheduled}
                    breakdown={hasCallsBreakdown}
                    icon={<Phone className="w-5 h-5 text-green-600" />}
                    color="green"
                />
            </div>

            {/* Filters Row */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search ventures..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                </div>
                <div className="relative">
                    <select
                        value={programFilter}
                        onChange={(e) => setProgramFilter(e.target.value as ProgramFilter)}
                        className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="">All Programs</option>
                        <option value="Prime">Prime</option>
                        <option value="Core">Core</option>
                        <option value="Select">Select</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                    <select
                        value={callStatusFilter}
                        onChange={(e) => setCallStatusFilter(e.target.value as CallStatusFilter)}
                        className="appearance-none pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    >
                        <option value="">All Call Status</option>
                        <option value="no_calls">No Calls Scheduled</option>
                        <option value="has_calls">Has Calls Scheduled</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-100 bg-gray-50">
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Business Name</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Program</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Assigned To</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">SC Program Rec. Date</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Calls Scheduled (Completed)</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Link</th>
                                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredVentures.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                        No ventures found
                                    </td>
                                </tr>
                            ) : (
                                filteredVentures.map((venture) => {
                                    const displayStatus = getDisplayStatus(venture);
                                    const cc = getCallCount(venture.id);
                                    const assignedPanelist = panelists.find(p =>
                                        venture.program_recommendation?.includes(p.program)
                                    );

                                    return (
                                        <tr key={venture.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-900">{venture.name}</div>
                                                <div className="text-xs text-gray-400">{venture.founder_name}</div>
                                            </td>
                                            <td className="px-4 py-3">
                                                {venture.program_recommendation ? (
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                                        venture.program_recommendation === 'Prime'
                                                            ? 'bg-purple-50 text-purple-700'
                                                            : venture.program_recommendation === 'Core'
                                                                ? 'bg-blue-50 text-blue-700'
                                                                : 'bg-teal-50 text-teal-700'
                                                    }`}>
                                                        {venture.program_recommendation}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${displayStatus.bg} ${displayStatus.color}`}>
                                                    {displayStatus.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {assignedPanelist?.name || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">
                                                {venture.vsm_reviewed_at
                                                    ? new Date(venture.vsm_reviewed_at).toLocaleDateString()
                                                    : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-gray-900 font-medium">{cc.total}({cc.completed})</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {cc.latest_meet_link ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <a
                                                            href={cc.latest_meet_link}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Join meeting"
                                                            className="inline-flex items-center justify-center text-indigo-600 hover:text-indigo-700 transition-colors"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(cc.latest_meet_link!);
                                                            }}
                                                            title="Copy meet link"
                                                            className="inline-flex items-center justify-center text-gray-400 hover:text-indigo-600 transition-colors"
                                                        >
                                                            <Link2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-300">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3">
                                                {cc.total > 0 ? (
                                                    <button
                                                        onClick={() => setScheduleModalVenture(venture)}
                                                        className="inline-flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Schedule Another
                                                    </button>
                                                ) : venture.status === 'Panel Review' ? (
                                                    <button
                                                        onClick={() => setScheduleModalVenture(venture)}
                                                        className="inline-flex items-center gap-1 text-indigo-600 text-sm font-medium hover:text-indigo-700 transition-colors"
                                                    >
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        Schedule Call
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-300">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Schedule Call Modal */}
            {scheduleModalVenture && (
                <ScheduleCallModal
                    venture={scheduleModalVenture}
                    panelists={panelists.filter(p => scheduleModalVenture.program_recommendation?.includes(p.program))}
                    onClose={() => setScheduleModalVenture(null)}
                    onScheduled={() => {
                        setScheduleModalVenture(null);
                        fetchData();
                    }}
                />
            )}
        </div>
    );
};

// Summary Card Component
const SummaryCard: React.FC<{
    title: string;
    count: number;
    breakdown: { prime: number; core: number; select: number };
    icon: React.ReactNode;
    color: string;
}> = ({ title, count, breakdown, icon, color }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center`}>
                {icon}
            </div>
            <span className="text-2xl font-bold text-gray-900">{count}</span>
        </div>
        <div className="text-sm font-medium text-gray-700 mb-2">{title}</div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>Prime: {breakdown.prime}</span>
            <span>Core: {breakdown.core}</span>
            <span>Select: {breakdown.select}</span>
        </div>
    </div>
);
