import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
    Briefcase,
    Edit3,
    Loader2,
    Save,
    Send,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    ChevronUp,
    AlertTriangle,
    HelpCircle,
    Plus,
    FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { STATUS_CONFIG } from '../components/StatusSelect';

// Types
interface Venture {
    id: string;
    name: string;
    description: string;
    founder_name?: string; // Top level field
    // New Fields
    city: string;
    location?: string; // Added location
    revenue_12m?: string;
    full_time_employees?: string;
    growth_focus: string;
    revenue_potential_3y: string;
    min_investment?: string; // Optional as it comes from commitment
    incremental_hiring?: string; // Optional as it comes from commitment
    // JSONB Fields
    growth_current: any; // { industry, product, segment, geography }
    growth_target: any; // { product, segment, geography } (descriptions)
    commitment?: any; // Added commitment object
    needs: { id?: string; stream: string; status: string }[]; // mapped from streams
    status: string;
    program_recommendation?: string;
    agreement_status?: string; // 'Sent', 'Signed', etc.
    venture_partner?: string; // New for Phase 15
    created_at: string;
    // VSM Fields
    vsm_notes?: string;
    internal_comments?: string;
    ai_analysis?: any;
    vsm_reviewed_at?: string; // Timestamp when VSM reviewed
}

const OtherDetailsSection: React.FC<{ selectedVenture: any; vsmNotes: string; setVsmNotes: (v: string) => void }> = ({ selectedVenture, vsmNotes, setVsmNotes }) => {
    const [open, setOpen] = useState(true);
    return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors">
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

                    {/* VSM Notes */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                            Screening Manager Notes (optional)
                        </label>
                        <textarea
                            className="w-full h-36 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none resize-none transition"
                            placeholder="Add your notes from the call or assessment here..."
                            value={vsmNotes}
                            onChange={e => setVsmNotes(e.target.value)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const AIInsightsSection: React.FC<{ selectedVenture: any; vsmNotes: string; analyzing: boolean; analysisResult: any; onRunAnalysis: () => void }> = ({ analyzing, analysisResult, onRunAnalysis }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                <span className="text-base font-bold text-gray-700">Generate AI insights</span>
            </div>
            <button
                onClick={onRunAnalysis}
                disabled={analyzing}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold transition-colors shadow-sm"
            >
                {analyzing ? (<><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</>) : (<><Sparkles className="w-4 h-4" /> Generate insights</>)}
            </button>
        </div>
        {!analysisResult && !analyzing && (
            <div className="py-10 flex flex-col items-center gap-2 text-gray-300">
                <Sparkles className="w-10 h-10" />
                <p className="text-sm">Click “Generate insights” to analyse this venture</p>
            </div>
        )}
        {analyzing && (
            <div className="py-10 flex flex-col items-center gap-2 text-indigo-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm font-medium">Analysing venture data…</p>
            </div>
        )}
        {analysisResult && !analyzing && (
            <div className="grid grid-cols-3 divide-x divide-gray-100">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">PROS</span>
                    </div>
                    <ul className="space-y-2">
                        {(analysisResult.strengths || []).map((s: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                {s}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">CONS</span>
                    </div>
                    <ul className="space-y-2">
                        {(analysisResult.risks || []).map((r: string, i: number) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                {r}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <HelpCircle className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Probing questions</span>
                    </div>
                    <ol className="space-y-2 list-decimal list-inside">
                        {(analysisResult.questions || []).map((q: string, i: number) => (
                            <li key={i} className="text-sm text-gray-700">{q}</li>
                        ))}
                    </ol>
                </div>
            </div>
        )}
    </div>
);

const RecommendProgramSection: React.FC<{
    program: string;
    setProgram: (v: string) => void;
    internalComments: string;
    setInternalComments: (v: string) => void;
    userRole: string | null;
    selectedPartner: string;
    setSelectedPartner: (v: string) => void;
    saving: boolean;
    onSave: () => void;
    isAlreadySubmitted: boolean;
    reviewedAt?: string;
}> = ({ program, setProgram, internalComments, setInternalComments, userRole, selectedPartner, setSelectedPartner, saving, onSave, isAlreadySubmitted, reviewedAt }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-400" />
                <span className="text-base font-bold text-gray-700">Recommend program</span>
            </div>
            {isAlreadySubmitted && reviewedAt && (
                <span className="text-xs text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full border border-green-200">
                    ✓ Reviewed {new Date(reviewedAt).toLocaleDateString()}
                </span>
            )}
        </div>
        <div className="p-6 space-y-5">
            {isAlreadySubmitted && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-900">Already Reviewed</p>
                        <p className="text-xs text-blue-700 mt-1">You can update your recommendation below if needed.</p>
                    </div>
                </div>
            )}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select a program</label>
                <select className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm text-gray-800" value={program} onChange={e => setProgram(e.target.value)}>
                    <option value="">Select a program…</option>
                    <option value="Selfserve">Self-Serve</option>
                    <option value="Accelerate Core">Accelerate Core</option>
                    <option value="Accelerate Select">Accelerate Select</option>
                    <option value="Accelerate Prime">Accelerate Prime</option>
                </select>
            </div>
            {userRole === 'committee' && (
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Assign Venture Partner</label>
                    <select className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none text-sm text-gray-800" value={selectedPartner} onChange={e => setSelectedPartner(e.target.value)}>
                        <option value="">Select Partner…</option>
                        <option value="Arun Kumar">Arun Kumar</option>
                        <option value="Meetul Patel">Meetul Patel</option>
                        <option value="Rajesh Jain">Rajesh Jain</option>
                    </select>
                </div>
            )}
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Comments</label>
                <textarea className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none text-sm text-gray-700 placeholder:text-gray-400 resize-none" placeholder="Add any internal notes or comments…" value={internalComments} onChange={e => setInternalComments(e.target.value)} />
            </div>
            <div className="flex justify-end pt-2 border-t border-gray-100">
                <button onClick={onSave} disabled={saving || !program} className="flex items-center gap-2 px-8 py-3 rounded-lg bg-gray-900 hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-md">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isAlreadySubmitted ? 'Update Recommendation' : 'Submit'}
                </button>
            </div>
        </div>
    </div>
);

export const VSMDashboard: React.FC = () => {
    const { user } = useAuth();
    const [ventures, setVentures] = useState<Venture[]>([]);
    const [selectedVenture, setSelectedVenture] = useState<Venture | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | null>(null);

    // Form State
    const [vsmNotes, setVsmNotes] = useState('');
    const [program, setProgram] = useState('');
    const [internalComments, setInternalComments] = useState('');
    const [saving, setSaving] = useState(false);

    // Venture Partner State
    const [selectedPartner, setSelectedPartner] = useState('');

    // Edit Profile State
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [editProfileData, setEditProfileData] = useState<any>({});

    const [userRole, setUserRole] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            checkUserRole();
        }
    }, [user]);

    useEffect(() => {
        if (userRole) {
            fetchVentures();
        }
    }, [userRole]);

    const checkUserRole = () => {
        if (!user) {
            setUserRole('not-logged-in');
            return;
        }

        const email = user.email || '';
        // Check for Venture Manager first (arun@admin.com)
        if (email.includes('arun')) {
            setUserRole('venture_mgr');
            return;
        }
        // Check for Committee (committee@admin.com)
        if (email.includes('committee')) {
            setUserRole('committee');
            return;
        }
        // Then Screening Manager (other admin emails)
        if (email.includes('admin')) {
            setUserRole('success_mgr');
            return;
        }

        // Fallback or explicit profile check
        setUserRole('entrepreneur');
    };

    const fetchVentures = async () => {
        setLoading(true);
        try {
            const { ventures: data } = await api.getVentures();

            let filteredData = data || [];

            // ROLE BASED FILTERING (keep client-side for now as API returns all for staff)
            if (userRole === 'venture_mgr') {
                filteredData = filteredData.filter((v: any) => v.program_recommendation === 'Accelerate Prime');
            } else if (userRole === 'committee') {
                filteredData = filteredData.filter((v: any) => ['Accelerate Core', 'Accelerate Select'].includes(v.program_recommendation || ''));
            }

            // Map data to ensure needs array exists and streams are mapped to needs
            const mappedVentures = filteredData.map((v: any) => ({
                ...v,
                needs: (v.streams || v.needs || []).map((s: any) => ({
                    id: s.id,
                    stream: s.stream_name,
                    status: s.status
                }))
            }));

            setVentures(mappedVentures);
        } catch (error) {
            console.error('Error fetching ventures:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleVentureSelect = async (venture: Venture) => {
        // Optimistically set selected to show UI immediately
        setSelectedVenture(venture);
        setAnalysisResult(null);

        // Fetch fresh details with streams
        try {
            const { venture: freshVenture, streams } = await api.getVenture(venture.id);

            // ── Data Correction: extract fields from JSONB BEFORE building fullVenture ──

            // Financials (inside commitment JSON)
            if (freshVenture.commitment) {
                freshVenture.revenue_12m = freshVenture.commitment.lastYearRevenue || '0';
                freshVenture.revenue_potential_3y = freshVenture.commitment.revenuePotential || '0';
                freshVenture.min_investment = freshVenture.commitment.investment || '0';
                freshVenture.incremental_hiring = freshVenture.commitment.incrementalHiring || 'TBD';
            }

            // Employees (inside growth_current JSON)
            if (freshVenture.growth_current) {
                freshVenture.full_time_employees = freshVenture.growth_current.employees || '0';
            }

            // ─────────────────────────────────────────────────────────────────

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

            // Setup form state
            setVsmNotes(freshVenture.vsm_notes || '');
            setProgram(freshVenture.program_recommendation || 'Selfserve');
            setInternalComments(freshVenture.internal_comments || '');
            setAnalysisResult(freshVenture.ai_analysis || null);
            setSelectedPartner(freshVenture.venture_partner || '');
            setEditProfileData(freshVenture.growth_target || {});

        } catch (error) {
            console.error('Error fetching venture details:', error);
        }
    };

    const handleSave = async () => {
        if (!selectedVenture) return;

        // VALIDATION
        if (!program) {
            alert("Please select a Recommended Program before submitting.");
            return;
        }

        setSaving(true);
        try {
            const updatePayload: any = {
                vsm_notes: vsmNotes,
                program_recommendation: program,
                internal_comments: internalComments,
                status: 'Under Review', // Always update status to Under Review when VSM submits
                ai_analysis: analysisResult || selectedVenture.ai_analysis, // Persist AI analysis if generated
                vsm_reviewed_at: new Date().toISOString() // Track when VSM reviewed
            };

            if (userRole === 'committee') {
                updatePayload.venture_partner = selectedPartner;
                updatePayload.status = 'Committee Review'; // Committee changes status to Committee Review
            }

            // Save to database
            await api.updateVenture(selectedVenture.id, updatePayload);

            // Update local state to reflect changes immediately
            setVentures(prev => prev.map(v =>
                v.id === selectedVenture.id
                    ? { ...v, ...updatePayload }
                    : v
            ));

            // Update the selected venture state as well
            setSelectedVenture(prev => prev ? { ...prev, ...updatePayload } : null);

            // Success feedback
            alert('✓ Recommendation submitted successfully!\n\nStatus: ' + updatePayload.status + '\nProgram: ' + program);

            // Navigate back to list after 1 second
            setTimeout(() => {
                setSelectedVenture(null);
                // Refresh ventures list to ensure latest data from DB
                fetchVentures();
            }, 1000);

        } catch (error: any) {
            console.error('Error saving:', error);
            alert('Failed to save assessment: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const runAIAnalysis = async () => {
        if (!selectedVenture) return;
        setAnalyzing(true);

        try {
            // Call the backend API to generate insights using Claude
            const result = await api.generateInsights(selectedVenture.id, vsmNotes);
            const newAnalysis = result.insights;

            // Show results in UI
            setAnalysisResult(newAnalysis);
            setVentures(prev => prev.map(v =>
                v.id === selectedVenture.id ? { ...v, ai_analysis: newAnalysis } : v
            ));
        } catch (error: any) {
            console.error('Error generating AI insights:', error);

            // Show user-friendly error message
            alert(error.message || 'Failed to generate AI insights. Please check if the API key is configured.');
        } finally {
            setAnalyzing(false);
        }
    };

    const saveProfileChanges = async () => {
        if (!selectedVenture) return;

        try {
            await api.updateVenture(selectedVenture.id, { growth_target: editProfileData });

            setVentures(prev => prev.map(v =>
                v.id === selectedVenture.id ? { ...v, growth_target: editProfileData } : v
            ));

            setSelectedVenture(prev => prev ? { ...prev, growth_target: editProfileData } : null);
            setIsEditingProfile(false);
            alert("Venture profile updated.");

        } catch (e) {
            console.error("Error updating profile", e);
            alert("Failed to update profile");
        }
    };

    return (
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">

            {/* Header / Title */}
            {!selectedVenture && (
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {userRole === 'venture_mgr' ? 'Prime Applications' :
                                userRole === 'committee' ? 'Core & Select Apps' :
                                    'Applications'} <span className="text-gray-400 font-normal ml-2">({ventures.length})</span>
                        </h1>
                        <p className="text-gray-500 mt-1">Review and assess venture applications.</p>
                    </div>
                </div>
            )}

            {/* MASTER VIEW: Venture List (Big Cards) */}
            {!selectedVenture ? (
                <div className="space-y-6">
                    {loading ? (
                        <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
                    ) : ventures.length === 0 ? (
                        <div className="text-center p-12 bg-white rounded-2xl border border-gray-200 text-gray-400">
                            No applications found.
                        </div>
                    ) : (
                        ventures.map(v => (
                            <div
                                key={v.id}
                                onClick={() => handleVentureSelect(v)}
                                className="bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer p-8 flex items-center justify-between group"
                            >
                                {/* Left Column: Identity */}
                                <div className="space-y-4 w-1/3">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 leading-tight group-hover:text-blue-700 transition-colors mb-1">
                                            {v.name}
                                        </h2>
                                        <div className="flex items-center gap-2 text-gray-500 text-sm tracking-wide uppercase font-semibold">
                                            <Target className="w-4 h-4" />
                                            {v.location || v.growth_current?.city || 'Unknown City'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <Users className="w-3.5 h-3.5" />
                                        {v.founder_name || v.growth_current?.founder_name || 'FOUNDER'}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-24 bg-gray-100 mx-4"></div>

                                {/* Middle Column: Program Status */}
                                <div className="flex-1 px-8 flex items-center justify-center">
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Program Status</span>
                                        <div className={`px-5 py-2.5 rounded-full text-sm font-bold ${v.program_recommendation
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'bg-gray-50 text-gray-600 border border-gray-200'
                                        }`}>
                                            {v.program_recommendation || 'Pending Review'}
                                        </div>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-24 bg-gray-100 mx-4"></div>

                                {/* Right Column: Revenue & Action */}
                                <div className="flex items-center gap-6 w-1/4 justify-end pl-4">
                                    <div className="text-center">
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">Revenue (LTM)</span>
                                        <div className="text-2xl font-bold text-gray-900">{v.revenue_12m || v.commitment?.lastYearRevenue || v.commitment?.revenuePotential || 'N/A'}</div>
                                    </div>

                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:translate-x-1">
                                        <Send className="w-6 h-6 rotate-0" /> {/* Using Send as arrow/chevron replacement or just arrow right if available */}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                /* DETAIL VIEW: Full Screen Venture Assessment */
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">

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
                        {/* Section 1: Dashboard Metrics */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Current Revenue</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    <span className="text-sm text-gray-400">₹</span>
                                    {selectedVenture.revenue_12m || '0'}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Target Revenue (3Y)</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    <span className="text-sm text-gray-400">₹</span>
                                    {selectedVenture.revenue_potential_3y || selectedVenture.commitment?.revenuePotential || '0'}
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Current Full Time Employees</span>
                                <div className="text-xl font-bold text-gray-900 flex items-center gap-1">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    {selectedVenture.full_time_employees || '0'}
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Venture Context Comparison (Side-by-Side) */}
                        <div>
                            <div className="flex justify-end items-center mb-4">
                                {(userRole === 'venture_mgr' || userRole === 'committee') && (
                                    <Button
                                        variant="outline"
                                        onClick={() => isEditingProfile ? saveProfileChanges() : setIsEditingProfile(true)}
                                        className="text-xs h-8"
                                    >
                                        {isEditingProfile ? <><Save className="w-3 h-3 mr-1" /> Save Changes</> : <><Edit3 className="w-3 h-3 mr-1" /> Edit Profile</>}
                                    </Button>
                                )}
                            </div>

                            {/* Header Info Row */}
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 mb-6 space-y-4">
                                <div className="grid grid-cols-3 gap-6">
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Name: <span className="font-semibold text-gray-900">{selectedVenture.founder_name || selectedVenture.growth_current?.founder_name || 'N/A'}</span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Mobile: <span className="font-semibold text-gray-900">{selectedVenture.growth_current?.phone || selectedVenture.growth_current?.mobile || 'N/A'}</span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Email: <span className="font-semibold text-gray-900">{selectedVenture.growth_current?.email || 'N/A'}</span></span>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Registered company name</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.name || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Designation (Your role in the company)</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.growth_current?.role || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Company type:</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.growth_current?.business_type || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">Which city is your company primarily based in</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.growth_current?.city || selectedVenture.city || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">State in which your company is located</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.growth_current?.state || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <span className="text-sm text-gray-600 block mb-1">How did I hear about us:</span>
                                        <div className="font-medium text-gray-900">{selectedVenture.growth_current?.referred_by || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>


                            {/* Comparison Card */}
                            <div className="bg-white border boundary-gray-200 rounded-xl overflow-hidden shadow-sm">
                                <div className="grid grid-cols-2 divide-x divide-gray-100">
                                    {/* Current Business Column */}
                                    <div className="p-6">
                                        <div className="flex items-center gap-2 text-gray-900 font-bold border-b border-gray-100 pb-3 mb-4">
                                            <Briefcase className="w-4 h-4 text-gray-400" />
                                            Current Business
                                        </div>
                                        <div className="space-y-5">
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Product / Service</span>
                                                <p className="text-sm text-gray-800 bg-gray-50/50 p-3 rounded-lg border border-gray-100 min-h-[44px] flex items-center">{selectedVenture.growth_current?.product || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Customer Segment</span>
                                                <p className="text-sm text-gray-800 bg-gray-50/50 p-3 rounded-lg border border-gray-100 min-h-[44px] flex items-center">{selectedVenture.growth_current?.segment || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-gray-400 uppercase block mb-1.5">Region</span>
                                                <p className="text-sm text-gray-800 bg-gray-50/50 p-3 rounded-lg border border-gray-100 min-h-[44px] flex items-center">{selectedVenture.growth_current?.geography || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* New Venture Column */}
                                    <div className={`p-6 ${isEditingProfile ? 'bg-blue-50/30' : 'bg-white'}`}>
                                        <div className="flex items-center gap-2 text-blue-900 font-bold border-b border-blue-100 pb-3 mb-4">
                                            <TrendingUp className="w-4 h-4 text-blue-600" />
                                            New Venture
                                        </div>
                                        <div className="space-y-5">
                                            <div>
                                                <span className="text-xs font-bold text-blue-400 uppercase block mb-1.5">New Product</span>
                                                {isEditingProfile ? (
                                                    <input
                                                        className="w-full p-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
                                                        value={editProfileData.product || ''}
                                                        onChange={e => setEditProfileData({ ...editProfileData, product: e.target.value })}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-50 min-h-[44px] flex items-center shadow-sm shadow-blue-100/50">{selectedVenture.growth_target?.product || 'N/A'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-blue-400 uppercase block mb-1.5">New Segment</span>
                                                {isEditingProfile ? (
                                                    <input
                                                        className="w-full p-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
                                                        value={editProfileData.segment || ''}
                                                        onChange={e => setEditProfileData({ ...editProfileData, segment: e.target.value })}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-50 min-h-[44px] flex items-center shadow-sm shadow-blue-100/50">{selectedVenture.growth_target?.segment || 'N/A'}</p>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-xs font-bold text-blue-400 uppercase block mb-1.5">New Region</span>
                                                {isEditingProfile ? (
                                                    <input
                                                        className="w-full p-2.5 text-sm border border-blue-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-100 focus:border-blue-300 outline-none"
                                                        value={editProfileData.geography || ''}
                                                        onChange={e => setEditProfileData({ ...editProfileData, geography: e.target.value })}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-gray-800 bg-white p-3 rounded-lg border border-blue-50 min-h-[44px] flex items-center shadow-sm shadow-blue-100/50">{selectedVenture.growth_target?.geography || 'N/A'}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Growth Idea Support Status */}
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

                        {/* Section 4: Company Document */}
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 mb-4">
                                Company Document
                            </h2>
                            <div className="bg-white border border-gray-200 rounded-xl p-6">
                                <p className="text-sm text-gray-600 mb-4">
                                    Corporate presentation uploaded by the venture (screening manager can download)
                                </p>
                                {(selectedVenture as any).document_url || (selectedVenture as any).corporate_presentation_url ? (
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <span className="text-sm font-medium text-gray-900">
                                                {(selectedVenture as any).document_name || 'Corporate Presentation.pdf'}
                                            </span>
                                        </div>
                                        <a
                                            href={(selectedVenture as any).document_url || (selectedVenture as any).corporate_presentation_url}
                                            download
                                            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm font-semibold"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                            Download
                                        </a>
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

                        {/* Section 5: Other Details (Optional, Collapsible) */}
                        <OtherDetailsSection selectedVenture={selectedVenture} vsmNotes={vsmNotes} setVsmNotes={setVsmNotes} />

                        {/* Section 6: Generate AI Insights CTA + Output */}
                        <AIInsightsSection
                            selectedVenture={selectedVenture}
                            vsmNotes={vsmNotes}
                            analyzing={analyzing}
                            analysisResult={analysisResult}
                            onRunAnalysis={runAIAnalysis}
                        />

                        {/* Section 7: Recommend Program */}
                        <RecommendProgramSection
                            program={program}
                            setProgram={setProgram}
                            internalComments={internalComments}
                            setInternalComments={setInternalComments}
                            userRole={userRole}
                            selectedPartner={selectedPartner}
                            setSelectedPartner={setSelectedPartner}
                            saving={saving}
                            onSave={handleSave}
                            isAlreadySubmitted={!!selectedVenture?.program_recommendation}
                            reviewedAt={(selectedVenture as any)?.vsm_reviewed_at}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
