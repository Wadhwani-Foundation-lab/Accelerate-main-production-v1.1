import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { ArrowLeft, CheckCircle, FileText, Loader2, Lock, AlertCircle, Zap, Users, ShieldCheck, ArrowUpRight, Search, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { StatusSelect } from '../components/StatusSelect';

export const VentureWorkbench = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [venture, setVenture] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [signing, setSigning] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [milestones, setMilestones] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [supportHours, setSupportHours] = useState<any>(null);

    useEffect(() => {
        if (id) fetchVentureData();
    }, [id]);

    const updateStreamStatus = async (streamId: string, newStatus: string) => {
        try {
            // Optimistic update
            setStreams(prev => prev.map(s =>
                s.id === streamId ? { ...s, status: newStatus } : s
            ));

            await api.updateStream(streamId, { status: newStatus });

        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
            fetchVentureData();
        }
    };

    const fetchVentureData = async () => {
        try {
            if (!id) return;
            // Fetch All Venture Data in one call
            const { venture, streams, milestones, support_hours } = await api.getVenture(id);

            console.log('🔍 Venture Data:', venture);
            console.log('🔒 Workbench Locked:', venture.workbench_locked);
            console.log('📊 Status:', venture.status);

            setVenture(venture);
            setStreams(streams || []);
            setMilestones(milestones || []);
            setSupportHours(support_hours);

        } catch (error) {
            console.error('Error fetching venture data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignAgreement = async () => {
        if (!accepted || !id) return;
        setSigning(true);
        try {
            await api.updateVenture(id, {
                agreement_status: 'Signed',
                agreement_accepted_at: new Date().toISOString()
            });

            // Refresh
            fetchVentureData();
        } catch (error) {
            console.error('Error signing agreement:', error);
            alert('Failed to sign agreement. Please try again.');
        } finally {
            setSigning(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!venture) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Venture Not Found</h2>
                    <Button onClick={() => navigate('/dashboard')} variant="outline" className="mt-4">
                        Back to Dashboard
                    </Button>
                </div>
            </div>
        );
    }

    const isSigned = venture.agreement_status === 'Signed';

    // Group milestones by category for display
    const milestonesByCategory = milestones.reduce((acc: any, curr: any) => {
        if (!acc[curr.category]) acc[curr.category] = [];
        acc[curr.category].push(curr.description);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-gray-900 -ml-2">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {isSigned ? 'Venture Dashboard February' : 'Review Agreement'}
                        </h1>
                    </div>
                </div>
                {isSigned && (
                    <div className="flex gap-4">
                        <div className="bg-white px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium flex items-center gap-2">
                            Progress Status <span className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                        <div className="bg-white px-3 py-1.5 rounded-full border border-gray-200 text-xs font-medium flex items-center gap-2">
                            Support Satisfaction <span className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                    </div>
                )}
            </div>

            <div className="max-w-7xl mx-auto">
                {/* Workbench Locked Banner */}
                {(venture.workbench_locked || venture.status === 'Contract Sent') && (
                    <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-300 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-6 flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-5 h-5 text-orange-600" />
                                    <h3 className="text-lg font-bold text-orange-900">Action Required: Review Contract</h3>
                                </div>
                                <p className="text-sm text-orange-800 mb-4">
                                    Your Venture Manager has sent a contract for your review. Please review the contract terms and sign to unlock your workbench and continue with the program.
                                </p>
                                <div className="flex items-center gap-3">
                                    <Button
                                        className="bg-orange-600 hover:bg-orange-700 text-white"
                                        onClick={() => {
                                            // Scroll to contract section or show contract modal
                                            alert('Contract review feature coming soon. Please check your email for contract details.');
                                        }}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        Review Contract
                                    </Button>
                                    <span className="text-xs text-orange-700 font-medium">
                                        Status: <span className="font-bold">{venture.status}</span>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {!isSigned ? (
                    // SIGNING VIEW
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-5xl mx-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Review contract</h2>
                        </div>

                        <div className="divide-y divide-gray-200">
                            {/* Roadmap */}
                            <div className="flex flex-col md:flex-row">
                                <div className="md:w-1/4 bg-gray-50/50 p-6 font-semibold text-gray-700 md:border-r border-gray-200 flex items-start">
                                    Roadmap
                                </div>
                                <div className="md:w-3/4 p-6">
                                    {/* Roadmap Content */}
                                    <div className="space-y-4">
                                        {Object.keys(milestonesByCategory).length > 0 ? (
                                            Object.entries(milestonesByCategory).map(([category, items]: [string, any]) => (
                                                <div key={category} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                                                    <h4 className="font-bold text-gray-800 mb-2">{category}</h4>
                                                    <ul className="list-disc pl-5 space-y-1">
                                                        {(items as string[]).map((item, i) => (
                                                            <li key={i} className="text-gray-600 text-sm">{item}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="italic text-gray-400">No specific roadmap milestones defined yet.</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Support provided */}
                            <div className="flex flex-col md:flex-row border-t border-gray-200">
                                <div className="md:w-1/4 bg-gray-50/50 p-6 font-semibold text-gray-700 md:border-r border-gray-200 flex items-start">
                                    Support provided
                                </div>
                                <div className="md:w-3/4 p-6">
                                    {/* Support Provided Content */}
                                    <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
                                                <Zap className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-900 text-sm tracking-wide">SUPPORT PROVIDED</h3>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Resources & Advisory Access</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                                <Zap className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Virtual Growth Accelerator</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed group-hover:text-gray-700">Full access to our digital scaling environment.</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                                <Users className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Masterclasses</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Expert-led sessions with industry-specific training.</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                                <FileText className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Stream Overviews</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Strategy & tips developed by experts for each department.</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                                                <FileText className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Deliverable Playbooks</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Step-by-step guides for every project milestone.</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-[140px]">
                                                <Clock className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Expert Hours (Sprint)</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed mb-4">First 60 days of intensive support.</p>
                                                <div className="mt-auto">
                                                    <div className="text-[8px] font-bold text-blue-600 uppercase mb-1">Specified Hours</div>
                                                    <div className="bg-gray-50 rounded px-2 py-1 text-xs font-bold flex justify-between">
                                                        40 <span className="text-gray-400">HRS</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col min-h-[140px]">
                                                <Clock className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Expert Hours (Journey)</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed mb-4">Ongoing strategic advisory.</p>
                                                <div className="mt-auto">
                                                    <div className="text-[8px] font-bold text-blue-600 uppercase mb-1">Specified Hours</div>
                                                    <div className="bg-gray-50 rounded px-2 py-1 text-xs font-bold flex justify-between">
                                                        120 <span className="text-gray-400">HRS</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                                                <ArrowUpRight className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Provider Referrals</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">Vetted network of verified service providers.</p>
                                            </div>
                                            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex flex-col">
                                                <Search className="w-5 h-5 text-blue-500 mb-3" />
                                                <h4 className="text-[10px] font-bold text-gray-900 uppercase mb-1.5">Research Reports</h4>
                                                <p className="text-[10px] text-gray-500 leading-relaxed">In-depth market and stream analytics documents.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Venture commitment */}
                            <div className="flex flex-col md:flex-row border-t border-gray-200">
                                <div className="md:w-1/4 bg-gray-50/50 p-6 font-semibold text-gray-700 md:border-r border-gray-200 flex items-start">
                                    Venture commitment
                                </div>
                                <div className="md:w-3/4 p-6">
                                    <div className="bg-slate-50/50 rounded-xl p-6 border border-slate-100">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-8 h-8 rounded bg-red-600 flex items-center justify-center">
                                                <ShieldCheck className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="font-black text-gray-900 text-sm tracking-wide uppercase">Venture Commitment</h3>
                                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Requirements for participation</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-1">Journey Progression</h4>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">Committed to progressing through all journey items as relevant.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-1">Stream SPOCs</h4>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">Dedicated points of contact for each functional stream.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-1">Monthly Check-ins</h4>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">Regular strategy alignment with Venture Partners.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-1">Direct Funding</h4>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">Budget allocation for additional expert requirements.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-1">Testimonials</h4>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">Willingness to share success stories and case studies.</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    <CheckCircle className="w-3 h-3 text-red-500" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase mb-1">Impact Data</h4>
                                                    <p className="text-[10px] text-gray-500 leading-relaxed">Growth and jobs inputs for our impact reporting team.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Checkbox */}
                            <div className="flex border-t border-gray-200">
                                <div className="p-6 w-full flex items-center gap-4">
                                    <label className="flex items-center gap-4 cursor-pointer group">
                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${accepted ? 'bg-black border-black text-white' : 'border-gray-300 group-hover:border-gray-500 bg-white text-transparent'}`}>
                                            <CheckCircle className="w-3.5 h-3.5" strokeWidth={3} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={accepted}
                                            onChange={(e) => setAccepted(e.target.checked)}
                                        />
                                        <span className="text-base font-bold text-gray-900">I accept the terms and conditions</span>
                                    </label>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex border-t border-gray-200">
                                <div className="w-1/2 p-4 border-r border-gray-200 flex justify-center">
                                    <Button variant="outline" className="w-full max-w-[200px] text-gray-700 border-gray-300 font-bold hover:bg-gray-100 hover:text-gray-900">
                                        Decline
                                    </Button>
                                </div>
                                <div className="w-1/2 p-4 flex justify-center">
                                    <Button
                                        className="w-full max-w-[200px] font-bold text-white bg-black hover:bg-gray-800 disabled:bg-gray-300 disabled:text-gray-500"
                                        disabled={!accepted || signing}
                                        onClick={handleSignAgreement}
                                    >
                                        {signing ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                                            </span>
                                        ) : 'Join Program'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // WORKBENCH VIEW (Signed)
                    <div className="space-y-6">
                        {/* Status Cards */}
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-8 grid grid-cols-1 gap-4">
                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-lime-100 text-lime-800 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded">Business</div>
                                        <div>
                                            <div className="font-bold text-gray-900">{venture.name}</div>
                                            <div className="text-xs text-gray-500">{venture.city} • ₹{venture.revenue_12m}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-lime-100 text-lime-800 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded">CEO</div>
                                        <span className="font-bold text-gray-900">Arun Kumar</span>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-lime-400 text-lime-900 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded">Venture</div>
                                        <div>
                                            <div className="font-bold text-gray-900">{venture.growth_focus}</div>
                                            <div className="text-xs text-gray-500">Target: ₹{venture.revenue_potential_3y}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="bg-orange-600 text-white px-3 py-1 text-xs font-bold uppercase tracking-wider rounded">Partner</div>
                                        <span className="font-bold text-gray-900">{venture.venture_partner || 'Unassigned'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-100 p-0 overflow-hidden flex">
                                <div className="flex-1 border-r border-gray-100 p-4 text-center">
                                    <div className="bg-purple-900 text-white text-[10px] uppercase font-bold py-1 px-2 rounded mb-2 inline-block">Support Tier</div>
                                    <div className="text-xl font-bold text-gray-900">{venture.final_program || 'Prime'}</div>
                                </div>
                                <div className="flex-1 border-r border-gray-100 p-4 text-center">
                                    <div className="text-2xl font-bold text-gray-900">{supportHours?.balance ?? 15}</div>
                                    <div className="text-xs text-gray-500 uppercase font-bold">Hours Balance</div>
                                </div>
                                <div className="flex-1 bg-purple-900 text-white p-4 flex flex-col justify-center">
                                    <div className="text-xs opacity-80 uppercase font-bold">Outcome</div>
                                    <div className="font-bold text-sm">Start + 3yr Incremental</div>
                                </div>
                            </div>
                        </div>

                        {/* Journey Table */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h3 className="font-bold text-lg text-gray-900">Journey</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-orange-500 text-white text-xs uppercase font-bold">
                                            <th className="px-6 py-3 text-left">Stream</th>
                                            <th className="px-6 py-3 text-left">Owner</th>
                                            <th className="px-6 py-3 text-left">End</th>
                                            <th className="px-6 py-3 text-left">Status</th>
                                            <th className="px-6 py-3 text-left">End Output</th>
                                            <th className="px-6 py-3 text-left">Sprint Deliverable</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {streams.length > 0 ? (
                                            streams.map((row, i) => (
                                                <tr key={i} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 font-medium text-gray-900">{row.stream_name}</td>
                                                    <td className="px-6 py-4 text-gray-600">{row.owner || 'Founder'}</td>
                                                    <td className="px-6 py-4 text-gray-600">{row.end_date || 'Oct 2025'}</td>
                                                    <td className="px-6 py-4">
                                                        <StatusSelect
                                                            status={row.status}
                                                            onChange={(newStatus) => updateStreamStatus(row.id, newStatus)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500 italic">Marker for success</td>
                                                    <td className="px-6 py-4 text-gray-500 italic">Stream unblock</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-4 text-center text-gray-500">No streams defined.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Feedback & Support Notes */}
                        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 grid grid-cols-2 gap-8">
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4">Feedback</h4>
                                <ul className="space-y-2">
                                    <li className="text-red-500 text-sm flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                        Provided expert did not understand domain enough to be valuable
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900 mb-4">Support Notes</h4>
                                <ul className="space-y-2">
                                    <li className="text-red-500 text-sm flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                        Validate Supply Chain and Operations requirements are understood through the playbook
                                    </li>
                                    <li className="text-red-500 text-sm flex items-start gap-2">
                                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                                        Provide research on relevant government programs to address forex risk management
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    );
};
