import React, { useState } from 'react';
import { X, Loader2, Phone, Video, Mail, FileText } from 'lucide-react';
import type { CreateInteractionInput } from '../../types/interactions';

interface AddInteractionModalProps {
    onClose: () => void;
    onSubmit: (data: CreateInteractionInput) => Promise<void>;
}

export const AddInteractionModal: React.FC<AddInteractionModalProps> = ({ onClose, onSubmit }) => {
    const [formData, setFormData] = useState<CreateInteractionInput>({
        interaction_type: 'call',
        title: '',
        transcript: '',
        interaction_date: new Date().toISOString().slice(0, 16), // Format for datetime-local
        participants: []
    });
    const [participantInput, setParticipantInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [uploadedFileName, setUploadedFileName] = useState<string>('');

    const handleAddParticipant = () => {
        if (participantInput.trim()) {
            setFormData({
                ...formData,
                participants: [...(formData.participants || []), participantInput.trim()]
            });
            setParticipantInput('');
        }
    };

    const handleRemoveParticipant = (index: number) => {
        setFormData({
            ...formData,
            participants: formData.participants?.filter((_, i) => i !== index)
        });
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check if it's a text file
        if (!file.type.includes('text') && !file.name.endsWith('.txt') && !file.name.endsWith('.log')) {
            setError('Please upload a text file (.txt or .log)');
            return;
        }

        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        try {
            const text = await file.text();
            setFormData({ ...formData, transcript: text });
            setUploadedFileName(file.name);
            setError('');
        } catch (err) {
            setError('Failed to read file. Please try again.');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.transcript.trim()) {
            setError('Please enter transcript or notes');
            return;
        }

        try {
            setSaving(true);
            await onSubmit(formData);
        } catch (err: any) {
            setError(err.message || 'Failed to save interaction');
            setSaving(false);
        }
    };

    const typeIcons = {
        call: Phone,
        meeting: Video,
        email: Mail,
        note: FileText
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Add New Interaction</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="space-y-5">
                        {/* Type Selection */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Interaction Type
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                                {(['call', 'meeting', 'email', 'note'] as const).map((type) => {
                                    const Icon = typeIcons[type];
                                    const isSelected = formData.interaction_type === type;
                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, interaction_type: type })}
                                            className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${isSelected
                                                    ? 'border-purple-500 bg-purple-50'
                                                    : 'border-gray-200 hover:border-gray-300'
                                                }`}
                                        >
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-purple-600' : 'text-gray-400'}`} />
                                            <span className={`text-xs font-semibold capitalize ${isSelected ? 'text-purple-900' : 'text-gray-600'}`}>
                                                {type}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Title */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Title <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g., Initial Discovery Call, Q2 Review Meeting"
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none"
                            />
                        </div>

                        {/* Date and Time */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.interaction_date}
                                onChange={(e) => setFormData({ ...formData, interaction_date: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none"
                            />
                        </div>

                        {/* Participants */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Participants <span className="text-gray-400 font-normal">(optional)</span>
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={participantInput}
                                    onChange={(e) => setParticipantInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
                                    placeholder="Name or email"
                                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddParticipant}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold text-sm transition-colors"
                                >
                                    Add
                                </button>
                            </div>
                            {formData.participants && formData.participants.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {formData.participants.map((participant, index) => (
                                        <span
                                            key={index}
                                            className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium flex items-center gap-2"
                                        >
                                            {participant}
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveParticipant(index)}
                                                className="hover:text-purple-900"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Transcript/Notes */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Transcript / Notes <span className="text-red-500">*</span>
                                </label>
                                <label className="cursor-pointer">
                                    <input
                                        type="file"
                                        accept=".txt,.log,text/*"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <span className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-xs font-semibold text-purple-700 transition-colors">
                                        <FileText className="w-3.5 h-3.5" />
                                        Upload File
                                    </span>
                                </label>
                            </div>
                            {uploadedFileName && (
                                <div className="mb-2 flex items-center gap-2 text-xs text-purple-700 bg-purple-50 px-3 py-2 rounded-lg border border-purple-200">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span className="font-medium">Uploaded: {uploadedFileName}</span>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setFormData({ ...formData, transcript: '' });
                                            setUploadedFileName('');
                                        }}
                                        className="ml-auto hover:text-purple-900"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            )}
                            <textarea
                                value={formData.transcript}
                                onChange={(e) => setFormData({ ...formData, transcript: e.target.value })}
                                placeholder="Paste your call transcript here or upload a text file..."
                                rows={10}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-100 focus:border-purple-300 outline-none resize-none font-mono text-sm"
                                required
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                {formData.transcript.length} characters
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-gray-200 rounded-lg font-semibold text-sm hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving || !formData.transcript.trim()}
                            className="px-5 py-2.5 bg-purple-600 text-white rounded-lg font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Interaction'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
