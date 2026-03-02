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
    X,
    MapPin,
    Briefcase,
    TrendingUp,
    Target,
    Mail,
    PhoneCall,
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
    const [profileVenture, setProfileVenture] = useState<any | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const openVentureProfile = async (venture: Venture) => {
        setProfileLoading(true);
        setProfileVenture({ name: venture.name, founder_name: venture.founder_name });
        try {
            const { venture: full } = await api.getVenture(venture.id);
            setProfileVenture(full);
        } catch (err) {
            console.error('Error fetching venture profile:', err);
        } finally {
            setProfileLoading(false);
        }
    };

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
        return callCounts.find(c => c.venture_id === ventureId) || { total: 0, completed: 0, latest_meet_link: undefined };
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
                                                <button
                                                    onClick={() => openVentureProfile(venture)}
                                                    className="text-left group"
                                                >
                                                    <div className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{venture.name}</div>
                                                    <div className="text-xs text-gray-400">{venture.founder_name}</div>
                                                </button>
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

            {/* Venture Profile Drawer */}
            {profileVenture && (
                <>
                    <div
                        className="fixed inset-0 z-40 bg-black/30 transition-opacity"
                        onClick={() => setProfileVenture(null)}
                    />
                    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-200">
                        {/* Drawer Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-lg font-bold text-gray-900">Business Profile</h2>
                            <button
                                onClick={() => setProfileVenture(null)}
                                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {profileLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {/* Company Header */}
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <Briefcase className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-gray-900">{profileVenture.name}</h3>
                                        {profileVenture.city && (
                                            <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                                                <MapPin className="w-3.5 h-3.5" />
                                                {profileVenture.city}{profileVenture.location ? `, ${profileVenture.location}` : ''}
                                            </div>
                                        )}
                                        {profileVenture.program_recommendation && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                {profileVenture.program_recommendation}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Founder Info */}
                                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Founder</h4>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <Users className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <div className="font-semibold text-gray-900">{profileVenture.founder_name || 'N/A'}</div>
                                            {profileVenture.founder_designation && (
                                                <div className="text-xs text-gray-500">{profileVenture.founder_designation}</div>
                                            )}
                                        </div>
                                    </div>
                                    {(profileVenture.founder_email || profileVenture.founder_phone) && (
                                        <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-200">
                                            {profileVenture.founder_email && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                                                    {profileVenture.founder_email}
                                                </div>
                                            )}
                                            {profileVenture.founder_phone && (
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <PhoneCall className="w-3.5 h-3.5 text-gray-400" />
                                                    {profileVenture.founder_phone}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Key Metrics */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Key Metrics</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <MetricCard label="Revenue (12M)" value={profileVenture.revenue_12m} icon={<TrendingUp className="w-4 h-4 text-green-600" />} />
                                        <MetricCard label="Revenue Target (3Y)" value={profileVenture.revenue_potential_3y} icon={<Target className="w-4 h-4 text-blue-600" />} />
                                        <MetricCard label="Employees" value={profileVenture.full_time_employees} icon={<Users className="w-4 h-4 text-purple-600" />} />
                                        <MetricCard label="Target Jobs" value={profileVenture.target_jobs} icon={<Briefcase className="w-4 h-4 text-amber-600" />} />
                                    </div>
                                </div>

                                {/* Business Details */}
                                <div>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Business Details</h4>
                                    <div className="space-y-3">
                                        {profileVenture.what_do_you_sell && (
                                            <DetailRow label="What they sell" value={profileVenture.what_do_you_sell} />
                                        )}
                                        {profileVenture.who_do_you_sell_to && (
                                            <DetailRow label="Who they sell to" value={profileVenture.who_do_you_sell_to} />
                                        )}
                                        {profileVenture.which_regions && (
                                            <DetailRow label="Regions" value={profileVenture.which_regions} />
                                        )}
                                        {profileVenture.company_type && (
                                            <DetailRow label="Company type" value={profileVenture.company_type} />
                                        )}
                                        {profileVenture.growth_focus && (
                                            <DetailRow label="Growth focus" value={profileVenture.growth_focus} />
                                        )}
                                        {profileVenture.description && (
                                            <DetailRow label="Description" value={profileVenture.description} />
                                        )}
                                    </div>
                                </div>

                                {/* Screening Notes */}
                                {profileVenture.vsm_notes && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Screening Notes</h4>
                                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                            {profileVenture.vsm_notes}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// Metric Card for Profile Drawer
const MetricCard: React.FC<{ label: string; value: any; icon: React.ReactNode }> = ({ label, value, icon }) => (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="text-xs text-gray-500">{label}</span>
        </div>
        <div className="text-sm font-bold text-gray-900">{value || 'N/A'}</div>
    </div>
);

// Detail Row for Profile Drawer
const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="bg-white border border-gray-100 rounded-lg px-4 py-3">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-sm text-gray-800">{value}</div>
    </div>
);

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
