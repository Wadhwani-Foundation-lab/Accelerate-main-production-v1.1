import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, TrendingUp, Loader2, Briefcase, Users, Target, AlertTriangle, HelpCircle, Map, ChevronRight, Zap, FileText, ChevronUp, Plus, Shield, DollarSign, Rocket, MessageSquare, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { InteractionsSection } from '../components/Interactions/InteractionsSection';
import { STATUS_CONFIG } from '../components/StatusSelect';
import { useToast } from '../components/ui/Toast';

interface Venture {
    id: string;
    name: string;
    city: string;
    location: string;
    status: string;
    program_recommendation: string;
    revenue_12m: number;
    revenue_potential_3y: number;
    full_time_employees: number;
    target_jobs?: string;
    founder_name?: string;
    growth_current?: any;
    commitment?: any;
    needs: { id?: string; stream: string; status: string }[];
    streams?: any[];
    created_at: string;
    vsm_reviewed_at: string;
    vsm_notes?: string;
    internal_comments?: string;
    ai_analysis?: any;
    growth_target?: any;
    incremental_hiring?: string;
    venture_partner?: string;
    workbench_locked?: boolean;
    panel_ai_analysis?: any;
}

const OtherDetailsReadOnlySection: React.FC<{ selectedVenture: any }> = ({ selectedVenture }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
            >
                <span className="text-base font-bold text-gray-700">Other support details the venture is seeking from the program</span>
                <div className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 transition-colors">
                    {open ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
            </button>
            {open && (
                <div className="px-6 pb-6 space-y-4">
                    {/* Venture's Support Request from Application Form */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                            Support Description (from application)
                        </label>
                        <div className="w-full min-h-[120px] rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                            {selectedVenture.support_request || 'No support description provided'}
                        </div>
                    </div>

                    {/* VSM Notes (Read-only) */}
                    {selectedVenture.vsm_notes && (
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                                Screening Manager Notes
                            </label>
                            <div className="w-full min-h-[120px] rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedVenture.vsm_notes}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export const VentureManagerDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [ventures, setVentures] = useState<Venture[]>([]);
    const [selectedVenture, setSelectedVenture] = useState<Venture | null>(null);
    const [loading, setLoading] = useState(true);
    const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
    const [roadmapGenerated, setRoadmapGenerated] = useState(false);
    const [roadmapData, setRoadmapData] = useState<any>(null);
    const [panelAnalyzing, setPanelAnalyzing] = useState(false);
    const [panelAnalysisResult, setPanelAnalysisResult] = useState<any | null>(null);
    const [panelNotes, setPanelNotes] = useState('');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

    useEffect(() => {
        if (user) {
            fetchVentures();
        }
    }, [user, sortOrder]);

    const fetchVentures = async () => {
        try {
            // Fetch all ventures with program_recommendation = "Accelerate Prime"
            const { ventures: allVentures } = await api.getVentures({ sortBy: 'created_at', sortOrder });

            console.log('🔍 All ventures:', allVentures);
            console.log('🔍 Venture recommendations:', allVentures?.map((v: any) => ({
                name: v.name,
                program_recommendation: v.program_recommendation,
                matches: v.program_recommendation === 'Accelerate Prime'
            })));

            // Filter for Accelerate Prime only
            const accelerateVentures = allVentures?.filter(
                (v: Venture) => v.program_recommendation === 'Accelerate Prime'
            ) || [];

            console.log('✅ Filtered Accelerate ventures:', accelerateVentures);

            // Map ventures to ensure needs array exists
            const mappedVentures = accelerateVentures.map((v: any) => ({
                ...v,
                needs: (v.streams || v.needs || []).map((s: any) => ({
                    id: s.id,
                    stream: s.stream_name,
                    status: s.status
                }))
            }));

            setVentures(mappedVentures);
        } catch (err) {
            console.error('Error fetching ventures:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleVentureSelect = async (venture: Venture) => {
        // Optimistically set selected to show UI immediately
        setSelectedVenture(venture);
        setRoadmapGenerated(false); // Reset roadmap when selecting new venture
        setRoadmapData(null);
        setPanelAnalysisResult(null);
        setPanelNotes('');

        // Fetch fresh details with streams
        try {
            const { venture: freshVenture, streams } = await api.getVenture(venture.id);

            // Map streams to needs format
            const mappedNeeds = (streams || []).map((s: any) => ({
                id: s.id,
                stream: s.stream_name,
                status: s.status
            }));

            const fullVenture = {
                ...freshVenture,
                needs: mappedNeeds
            };

            setSelectedVenture(fullVenture);
            setPanelAnalysisResult(freshVenture.panel_ai_analysis || null);

            // Fetch existing roadmap
            try {
                const { roadmap } = await api.getRoadmap(venture.id);
                if (roadmap?.roadmap_data) {
                    setRoadmapData(roadmap.roadmap_data);
                    setRoadmapGenerated(true);
                }
            } catch (e) {
                // No roadmap yet, that's fine
            }
        } catch (error) {
            console.error('Error fetching venture details:', error);
        }
    };

    const runPanelAIAnalysis = async () => {
        if (!selectedVenture) return;
        setPanelAnalyzing(true);

        try {
            const result = await api.generatePanelInsights(selectedVenture.id, panelNotes);
            const insights = result.insights || result;

            setPanelAnalysisResult(insights);
            setVentures(prev => prev.map(v =>
                v.id === selectedVenture.id ? { ...v, panel_ai_analysis: insights } : v
            ));
        } catch (error: any) {
            console.error('Error generating panel insights:', error);
            toast(error.message || 'Failed to generate panel insights.', 'error');
        } finally {
            setPanelAnalyzing(false);
        }
    };

    const generateRoadmap = async () => {
        if (!selectedVenture) return;

        setGeneratingRoadmap(true);

        try {
            const result = await api.generateRoadmap(selectedVenture.id);
            const roadmap = result.roadmap;
            if (roadmap?.roadmap_data) {
                setRoadmapData(roadmap.roadmap_data);
            }
            setRoadmapGenerated(true);
        } catch (error: any) {
            console.error('Error generating roadmap:', error);
            toast(error.message || 'Failed to generate roadmap.', 'error');
        } finally {
            setGeneratingRoadmap(false);
        }
    };


    const [revenueFilter, setRevenueFilter] = useState<string>('all');

    const filteredVentures = ventures.filter(v => {
        if (revenueFilter === 'all') return true;
        return String(v.revenue_12m) === revenueFilter;
    });

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

            {/* MASTER VIEW: Venture List */}
            {!selectedVenture ? (
                <div className="space-y-4">
                    {/* Column Headers - always visible */}
                    <div className="grid grid-cols-12 gap-4 px-8 pb-4 border-b border-gray-200 items-end">
                        <div className="col-span-5">
                            <span className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Venture</span>
                        </div>
                        <div className="col-span-2 text-center">
                            <button
                                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-700 transition-colors inline-flex items-center gap-1"
                            >
                                Submitted
                                <span className="text-xs">{sortOrder === 'desc' ? '↓' : '↑'}</span>
                            </button>
                        </div>
                        <div className="col-span-3 text-center">
                            <span className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide">Program</span>
                        </div>
                        <div className="col-span-2 text-right">
                            <select
                                value={revenueFilter}
                                onChange={(e) => setRevenueFilter(e.target.value)}
                                className="text-[13px] font-semibold text-gray-500 uppercase tracking-wide border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer appearance-none pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_8px_center] bg-no-repeat"
                            >
                                <option value="all">Revenue</option>
                                <option value="1Cr-5Cr">1Cr - 5Cr</option>
                                <option value="5Cr-25Cr">5Cr - 25Cr</option>
                                <option value="25Cr-75Cr">25Cr - 75Cr</option>
                                <option value=">75Cr">&gt;75Cr</option>
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-16 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                            <span className="text-sm text-gray-400">Loading applications...</span>
                        </div>
                    ) : filteredVentures.length === 0 ? (
                        <div className="text-center p-16 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">
                            <div className="text-lg font-medium mb-1">No applications yet</div>
                            <div className="text-sm">Ventures recommended for Accelerate Prime will appear here.</div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                                {filteredVentures.map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => handleVentureSelect(v)}
                                        className="bg-white rounded-2xl border border-gray-200 hover:border-purple-400 shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer px-8 py-6 grid grid-cols-12 gap-4 items-center group"
                                    >
                                        {/* Venture Info */}
                                        <div className="col-span-5 space-y-1.5">
                                            <h2 className="text-[17px] font-semibold text-gray-900 leading-snug group-hover:text-purple-600 transition-colors">
                                                {v.name}
                                            </h2>
                                            <div className="flex items-center gap-2 text-gray-500 text-[13px]">
                                                <Target className="w-3.5 h-3.5 text-gray-400" />
                                                {v.location || v.city || 'Location not provided'}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[13px] text-gray-400">
                                                <Users className="w-3.5 h-3.5" />
                                                {v.founder_name || 'Founder not listed'}
                                            </div>
                                        </div>

                                        {/* Date of Submission */}
                                        <div className="col-span-2 text-center border-l border-gray-100 pl-4">
                                            <div className="text-[14px] font-medium text-gray-600">
                                                {v.created_at ? new Date(v.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' }).replace(/ /g, '-') : 'N/A'}
                                            </div>
                                        </div>

                                        {/* Status */}
                                        <div className="col-span-3 text-center border-l border-gray-100 pl-4">
                                            <span className={`inline-block px-4 py-1.5 rounded-full text-[13px] font-semibold ${v.program_recommendation
                                                ? 'bg-purple-50 text-purple-700'
                                                : 'bg-amber-50 text-amber-600'
                                                }`}>
                                                {v.program_recommendation || 'Awaiting review'}
                                            </span>
                                        </div>

                                        {/* Revenue & Arrow */}
                                        <div className="col-span-2 flex items-center justify-end gap-3 border-l border-gray-100 pl-4">
                                            <div className="text-right">
                                                <div className="text-[15px] font-semibold text-gray-800 whitespace-nowrap">
                                                    {v.revenue_12m ? `₹${v.revenue_12m} Cr` : '--'}
                                                </div>
                                            </div>
                                            <div className="w-9 h-9 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-purple-600 group-hover:text-white transition-all duration-200 flex-shrink-0">
                                                <ChevronRight className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                    )}
                </div>
            ) : (
                /* DETAIL VIEW: Screening Manager's Assessment */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Back Button */}
                    <div className="border-b border-gray-100 px-6 py-3 bg-gray-50">
                        <Button variant="ghost" onClick={() => setSelectedVenture(null)} className="text-gray-500 hover:text-gray-900 w-auto px-3 py-2 h-auto text-sm">
                            ← Back to Ventures
                        </Button>
                    </div>

                    {/* Header: Company Name Left, Status Right */}
                    <div className="border-b border-gray-100 px-6 py-5 bg-white flex items-center justify-between sticky top-0 z-20">
                        <h2 className="text-2xl font-bold text-gray-900">{selectedVenture.name}</h2>
                        <span className="px-4 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-bold">
                            {selectedVenture.status}
                        </span>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* VSM Assessment Info Banner */}
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 flex items-start gap-3">
                            <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-semibold text-purple-900">Screening Manager Assessment</p>
                                <p className="text-xs text-purple-700 mt-1">
                                    This venture was assessed by the Screening Manager and recommended for Accelerate Prime.
                                    {selectedVenture.vsm_reviewed_at && ` Reviewed on ${new Date(selectedVenture.vsm_reviewed_at).toLocaleDateString()}.`}
                                </p>
                            </div>
                        </div>

                        {/* Dashboard Metrics */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Current Revenue</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    {selectedVenture.revenue_12m || 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Revenue (3Y)</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    {selectedVenture.revenue_potential_3y || 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Current Full Time Employees</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    {selectedVenture.full_time_employees || 'N/A'}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Jobs</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    {selectedVenture.target_jobs || (() => {
                                        const rev = String(selectedVenture.revenue_potential_3y || '');
                                        if (rev.startsWith('15Cr') || rev.startsWith('15 Cr')) return '81';
                                        if (rev.startsWith('50Cr') || rev.startsWith('50 Cr') || rev === '50Cr+') return '188';
                                        if (rev.startsWith('5Cr') || rev.startsWith('5 Cr')) return '25';
                                        return '0';
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Venture Context */}
                        <div>
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-6 space-y-4">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Name: <span className="font-semibold text-gray-900">{selectedVenture.founder_name || 'N/A'}</span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Mobile: <span className="font-semibold text-gray-900">{(selectedVenture as any).founder_phone || 'N/A'}</span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Email: <span className="font-semibold text-gray-900">{(selectedVenture as any).founder_email || 'N/A'}</span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Registered company name</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.name || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Designation (Your role in the company)</span>
                                        <div className="font-medium text-gray-900">{(selectedVenture as any).founder_designation || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Company type:</span>
                                        <div className="font-medium text-gray-900">{(selectedVenture as any).company_type || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Which city is your company primarily based in</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.city || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">State in which your company is located</span>
                                        <div className="font-medium text-gray-900">{(selectedVenture as any).state || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">How did I hear about us:</span>
                                        <div className="font-medium text-gray-900">{(selectedVenture as any).referred_by || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Current vs Target Business */}
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                {/* Header Row */}
                                <div className="grid grid-cols-2 divide-x divide-gray-100">
                                    <div className="p-6 pb-3">
                                        <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-3">
                                            <Briefcase className="w-4 h-4 text-gray-400" />
                                            Current Business
                                        </div>
                                    </div>
                                    <div className="p-6 pb-3 bg-white">
                                        <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-blue-100 pb-3">
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                            New Venture
                                        </div>
                                    </div>
                                </div>

                                {/* Row 1: Product */}
                                <div className="grid grid-cols-2 divide-x divide-gray-100">
                                    <div className="px-6 py-3">
                                        <span className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Product / Service</span>
                                        <p className="text-sm text-gray-800 bg-gray-50/50 p-3 rounded-lg border border-gray-100 min-h-[44px] flex items-center">{(selectedVenture as any).what_do_you_sell || 'N/A'}</p>
                                    </div>
                                    <div className="px-6 py-3 bg-white">
                                        <span className="text-xs font-bold text-blue-400 uppercase block mb-1.5">New Product</span>
                                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-50 min-h-[44px] flex items-center shadow-sm shadow-blue-100/50">{(selectedVenture as any).focus_product || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Row 2: Segment */}
                                <div className="grid grid-cols-2 divide-x divide-gray-100">
                                    <div className="px-6 py-3">
                                        <span className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Customer Segment</span>
                                        <p className="text-sm text-gray-800 bg-gray-50/50 p-3 rounded-lg border border-gray-100 min-h-[44px] flex items-center">{(selectedVenture as any).who_do_you_sell_to || 'N/A'}</p>
                                    </div>
                                    <div className="px-6 py-3 bg-white">
                                        <span className="text-xs font-bold text-blue-400 uppercase block mb-1.5">New Segment</span>
                                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-50 min-h-[44px] flex items-center shadow-sm shadow-blue-100/50">{(selectedVenture as any).focus_segment || 'N/A'}</p>
                                    </div>
                                </div>

                                {/* Row 3: Region */}
                                <div className="grid grid-cols-2 divide-x divide-gray-100">
                                    <div className="px-6 py-3 pb-6">
                                        <span className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Region</span>
                                        <p className="text-sm text-gray-800 bg-gray-50/50 p-3 rounded-lg border border-gray-100 min-h-[44px] flex items-center">{(selectedVenture as any).which_regions || 'N/A'}</p>
                                    </div>
                                    <div className="px-6 py-3 pb-6 bg-white">
                                        <span className="text-xs font-bold text-blue-400 uppercase block mb-1.5">New Region</span>
                                        <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-50 min-h-[44px] flex items-center shadow-sm shadow-blue-100/50">{(selectedVenture as any).focus_geography || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Growth Idea Support Status */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Growth Idea Support Status
                            </h2>
                            <div className="grid grid-cols-3 gap-4">
                                {/* Row 1 */}
                                {['Product', 'Go-To-Market (GTM)', 'Capital Planning'].map(stream => {
                                    const rawStatus = selectedVenture.needs.find((n: any) =>
                                        n.stream === stream ||
                                        (stream === 'Go-To-Market (GTM)' && n.stream === 'GTM') ||
                                        (stream === 'Capital Planning' && n.stream === 'Funding')
                                    )?.status || 'N/A';

                                    const legacyMapping: Record<string, string> = {
                                        'Not started': 'Need some guidance',
                                        'Working on it': 'Need some guidance',
                                        'On track': "Don't need help",
                                        'Need some advice': 'Need some guidance',
                                        'Need guidance': 'Need some guidance',
                                        'Completed': "Don't need help",
                                        'Done': "Don't need help",
                                        'No help needed': "Don't need help"
                                    };

                                    const mappedStatus = legacyMapping[rawStatus] || rawStatus;
                                    const normalizedStatus = Object.keys(STATUS_CONFIG).find(
                                        key => key.toLowerCase() === mappedStatus?.toLowerCase()
                                    ) || mappedStatus;

                                    const config = STATUS_CONFIG[normalizedStatus] || {
                                        icon: HelpCircle,
                                        color: 'text-gray-400',
                                        bg: 'bg-gray-50',
                                        border: 'border-gray-200'
                                    };

                                    const Icon = config.icon;

                                    return (
                                        <div key={stream}>
                                            <span className="text-sm font-semibold text-gray-900 block mb-2">{stream}</span>
                                            <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${config.bg} ${config.border} ${config.color}`}>
                                                <Icon className="w-4 h-4" />
                                                {normalizedStatus}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                {/* Row 2 */}
                                {['Supply Chain', 'Operations', 'Team'].map(stream => {
                                    const rawStatus = selectedVenture.needs.find((n: any) =>
                                        n.stream === stream ||
                                        (stream === 'Supply Chain' && n.stream === 'SupplyChain')
                                    )?.status || 'N/A';

                                    const legacyMapping: Record<string, string> = {
                                        'Not started': 'Need some guidance',
                                        'Working on it': 'Need some guidance',
                                        'On track': "Don't need help",
                                        'Need some advice': 'Need some guidance',
                                        'Need guidance': 'Need some guidance',
                                        'Completed': "Don't need help",
                                        'Done': "Don't need help",
                                        'No help needed': "Don't need help"
                                    };

                                    const mappedStatus = legacyMapping[rawStatus] || rawStatus;
                                    const normalizedStatus = Object.keys(STATUS_CONFIG).find(
                                        key => key.toLowerCase() === mappedStatus?.toLowerCase()
                                    ) || mappedStatus;

                                    const config = STATUS_CONFIG[normalizedStatus] || {
                                        icon: HelpCircle,
                                        color: 'text-gray-400',
                                        bg: 'bg-gray-50',
                                        border: 'border-gray-200'
                                    };

                                    const Icon = config.icon;

                                    return (
                                        <div key={stream}>
                                            <span className="text-sm font-semibold text-gray-900 block mb-2">{stream}</span>
                                            <div className={`p-3 rounded-lg text-sm font-medium flex items-center gap-2 border ${config.bg} ${config.border} ${config.color}`}>
                                                <Icon className="w-4 h-4" />
                                                {normalizedStatus}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Company Document */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Company Document
                            </h2>
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Corporate presentation uploaded by the venture (screening manager can download)
                                </p>
                                {(selectedVenture as any).corporate_presentation_url ? (
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {(selectedVenture as any).corporate_presentation_url.split('/').pop()?.replace(/^\d+_/, '') || 'Corporate Presentation'}
                                            </span>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    const url = await api.getVentureDocumentUrl((selectedVenture as any).corporate_presentation_url);
                                                    window.open(url, '_blank');
                                                } catch (err) {
                                                    console.error('Failed to get document URL:', err);
                                                    toast('Failed to download document. Please try again.', 'error');
                                                }
                                            }}
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-semibold"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-500">
                                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-700">No document uploaded</p>
                                            <p className="text-xs text-gray-500 mt-1">The venture did not upload a corporate presentation</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Other Support Details */}
                        <OtherDetailsReadOnlySection selectedVenture={selectedVenture} />

                        {/* Panel Interview Insights - V2 */}
                        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                                <div className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-teal-500" />
                                    <span className="text-base font-bold text-gray-700">Panel Interview Insights</span>
                                    {panelAnalysisResult && !panelAnalyzing && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-xs font-medium text-teal-600">
                                            <Sparkles className="w-3 h-3" />
                                            AI Generated
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={runPanelAIAnalysis}
                                    disabled={panelAnalyzing || !!panelAnalysisResult}
                                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm"
                                >
                                    {panelAnalyzing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyzing...</>) : panelAnalysisResult ? (<><Sparkles className="w-4 h-4" /> Insights Generated</>) : (<><Target className="w-4 h-4" /> Generate Panel Insights</>)}
                                </button>
                            </div>

                            {/* Panel Notes Input */}
                            {!panelAnalysisResult && !panelAnalyzing && (
                                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Panel Notes (optional)</label>
                                    <textarea
                                        value={panelNotes}
                                        onChange={(e) => setPanelNotes(e.target.value)}
                                        placeholder="Add any pre-interview observations or focus areas for the AI analysis..."
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-300 resize-none"
                                        rows={3}
                                    />
                                </div>
                            )}

                            {!panelAnalysisResult && !panelAnalyzing && (
                                <div className="py-10 flex flex-col items-center gap-2 text-gray-300">
                                    <Target className="w-10 h-10" />
                                    <p className="text-sm">Click "Generate Panel Insights" for a deep-dive interview briefing</p>
                                </div>
                            )}

                            {panelAnalyzing && (
                                <div className="py-10 flex flex-col items-center gap-2 text-teal-400">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <p className="text-sm font-medium">Generating deep-dive panel briefing...</p>
                                </div>
                            )}

                            {panelAnalysisResult && !panelAnalyzing && (
                                <div className="space-y-0 divide-y divide-gray-100">
                                    {/* Panel Recommendation Badge */}
                                    <div className="p-6">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Panel Recommendation</span>
                                            <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                                                panelAnalysisResult.panel_recommendation === 'Accept' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                                                panelAnalysisResult.panel_recommendation === 'Accept with Conditions' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                                panelAnalysisResult.panel_recommendation === 'Defer' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                                                'bg-red-100 text-red-700 border border-red-200'
                                            }`}>
                                                {panelAnalysisResult.panel_recommendation}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Executive Summary */}
                                    <div className="p-6">
                                        <span className="text-xs font-semibold text-gray-400 uppercase">Executive Summary</span>
                                        <p className="text-sm text-gray-700 mt-2 leading-relaxed">{panelAnalysisResult.executive_summary}</p>
                                    </div>

                                    {/* Market Context */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Map className="w-4 h-4 text-blue-500" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Market Context</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{panelAnalysisResult.market_context}</p>
                                    </div>

                                    {/* Gap Deep Dive */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield className="w-4 h-4 text-red-500" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gap Deep Dive</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <span className="text-xs font-semibold text-red-500 uppercase">Critical Gaps</span>
                                                <ul className="mt-2 space-y-2">
                                                    {(panelAnalysisResult.gap_deep_dive?.critical_gaps || []).map((gap: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                            <XCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                                                            {gap}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-emerald-500 uppercase">Addressable Gaps</span>
                                                <ul className="mt-2 space-y-2">
                                                    {(panelAnalysisResult.gap_deep_dive?.addressable_gaps || []).map((gap: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                                                            {gap}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 italic">{panelAnalysisResult.gap_deep_dive?.gap_summary}</p>
                                    </div>

                                    {/* Revenue Deep Dive */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Revenue Deep Dive</span>
                                        </div>
                                        <div className="space-y-3 mb-4">
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Current Health</span>
                                                <p className="text-sm text-gray-700 mt-1">{panelAnalysisResult.revenue_deep_dive?.current_health}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Projection Credibility</span>
                                                <p className="text-sm text-gray-700 mt-1">{panelAnalysisResult.revenue_deep_dive?.projection_credibility}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Key Revenue Risks</span>
                                                <ul className="mt-1 space-y-1">
                                                    {(panelAnalysisResult.revenue_deep_dive?.key_revenue_risks || []).map((risk: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                                            {risk}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 italic">{panelAnalysisResult.revenue_deep_dive?.revenue_summary}</p>
                                    </div>

                                    {/* Growth Opportunity Deep Dive */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Rocket className="w-4 h-4 text-purple-500" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Growth Opportunity Deep Dive</span>
                                        </div>
                                        <div className="space-y-3 mb-4">
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Market Size Signal</span>
                                                <p className="text-sm text-gray-700 mt-1">{panelAnalysisResult.growth_opportunity_deep_dive?.market_size_signal}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Competitive Positioning</span>
                                                <p className="text-sm text-gray-700 mt-1">{panelAnalysisResult.growth_opportunity_deep_dive?.competitive_positioning}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-semibold text-gray-400 uppercase">Execution Feasibility</span>
                                                <p className="text-sm text-gray-700 mt-1">{panelAnalysisResult.growth_opportunity_deep_dive?.execution_feasibility}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 italic">{panelAnalysisResult.growth_opportunity_deep_dive?.growth_summary}</p>
                                    </div>

                                    {/* Strengths & Risks */}
                                    <div className="p-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <TrendingUp className="w-4 h-4 text-green-500" />
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Strengths</span>
                                                </div>
                                                <ul className="space-y-2">
                                                    {(panelAnalysisResult.strengths || []).map((s: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                                            {s}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Risks</span>
                                                </div>
                                                <ul className="space-y-2">
                                                    {(panelAnalysisResult.risks || []).map((r: string, i: number) => (
                                                        <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                                            {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Interview Questions */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <MessageSquare className="w-4 h-4 text-indigo-500" />
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Interview Questions</span>
                                        </div>
                                        <div className="space-y-4">
                                            {(panelAnalysisResult.interview_questions || []).map((q: any, i: number) => (
                                                <div key={i} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                                    <p className="text-sm font-semibold text-gray-800 mb-2">
                                                        <span className="text-indigo-500 mr-1">Q{i + 1}.</span>
                                                        {q.question}
                                                    </p>
                                                    <div>
                                                        <span className="text-[10px] font-bold text-blue-500 uppercase">Intent</span>
                                                        <p className="text-xs text-gray-600 mt-0.5">{q.intent}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Program Recommendation */}
                        <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Briefcase className="w-5 h-5 text-gray-400" />
                                <span className="text-base font-bold text-gray-700">Program Recommendation</span>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-purple-700">Recommended Program:</span>
                                    <span className="text-lg font-bold text-purple-900">{selectedVenture.program_recommendation?.toLowerCase().includes('prime') ? 'Accelerate Prime' : selectedVenture.program_recommendation}</span>
                                </div>
                                {selectedVenture.internal_comments && (
                                    <div className="mt-3 pt-3 border-t border-purple-200">
                                        <span className="text-xs font-bold text-purple-600 uppercase block mb-2">Internal Comments</span>
                                        <p className="text-sm text-purple-800 whitespace-pre-wrap">{selectedVenture.internal_comments}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Interactions Section */}
                        <InteractionsSection ventureId={selectedVenture.id} />

                        {/* Journey Roadmap */}
                        <div className="bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-200 p-8 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                        <Sparkles className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Generate Journey Roadmap</h2>
                                        <p className="text-sm text-indigo-600 font-semibold flex items-center gap-1.5">
                                            <Zap className="w-3.5 h-3.5" />
                                            Uses AI Insights
                                        </p>
                                    </div>
                                </div>
                                {!roadmapGenerated && (
                                    <button
                                        onClick={generateRoadmap}
                                        disabled={generatingRoadmap}
                                        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 text-white font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                    >
                                        {generatingRoadmap ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                Generating...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                Generate Roadmap
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            {roadmapGenerated ? (
                                <>
                                    <div className="mb-8 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-green-900">AI-powered roadmap generated successfully</p>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-8 uppercase tracking-wider font-semibold">Deliverables & Milestones</p>
                                </>
                            ) : (
                                <div className="py-12 text-center">
                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                                        <Map className="w-10 h-10 text-indigo-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">AI-Powered Journey Roadmap</h3>
                                    <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
                                        Generate a personalized roadmap with deliverables and milestones across all six streams using AI insights from the Screening Manager's assessment.
                                    </p>
                                </div>
                            )}

                            {roadmapGenerated && roadmapData && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {([
                                        { key: 'product', label: 'Product' },
                                        { key: 'gtm', label: 'GTM' },
                                        { key: 'capital_planning', label: 'Capital Planning' },
                                        { key: 'supply_chain', label: 'Supply Chain' },
                                        { key: 'operations', label: 'Operations' },
                                        { key: 'team', label: 'Team' },
                                    ] as { key: string; label: string }[]).map(({ key, label }) => {
                                        const area = (roadmapData as any)[key];
                                        const actions = Array.isArray(area) ? area : area?.actions || [];
                                        const relevance = area?.relevance;
                                        const supportPriority = area?.support_priority;
                                        return (
                                        <div key={key} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-2">
                                                <h3 className="text-sm font-bold text-blue-600 uppercase tracking-wider">{label}</h3>
                                                {supportPriority && (
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        supportPriority === 'Need deep support' || supportPriority === 'High' ? 'bg-red-100 text-red-700' :
                                                        supportPriority === 'Need some guidance' || supportPriority === 'Medium' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>{supportPriority}</span>
                                                )}
                                            </div>
                                            {relevance && <p className="text-xs text-gray-400 mb-4">{relevance}</p>}
                                            <div className="space-y-4">
                                                {actions.map((item: any) => (
                                                    <div key={item.id} className="flex items-start gap-3">
                                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${
                                                            item.priority === 'Need deep support' || item.priority === 'high' ? 'bg-red-500' :
                                                            item.priority === 'Need some guidance' || item.priority === 'medium' ? 'bg-orange-500' :
                                                            'bg-green-500'
                                                        }`} />
                                                        <div>
                                                            <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                                                            <p className="text-xs text-gray-500 italic mt-0.5">{item.description}</p>
                                                            <span className="text-[10px] text-gray-400 font-medium">{item.timeline}</span>
                                                            {item.success_metric && <p className="text-[10px] text-green-600 mt-0.5">✓ {item.success_metric}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Panel Feedback Button */}
                        <div className="mt-8 flex justify-end">
                            <button
                                onClick={() => navigate(`/vmanager/dashboard/panel-feedback/${selectedVenture.id}`)}
                                className="px-6 py-3 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors flex items-center gap-2"
                            >
                                Next: Panel Feedback
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
