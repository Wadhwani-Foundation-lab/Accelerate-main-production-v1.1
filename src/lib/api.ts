import { supabase } from './supabase';

interface SignupData {
    email: string;
    password: string;
    full_name: string;
    role?: 'entrepreneur' | 'vsm' | 'committee' | 'admin';
}

interface VentureQueryParams {
    status?: string;
    program?: string;
    limit?: number;
    offset?: number;
}

class ApiClient {
    // ============ AUTH ENDPOINTS ============

    async signup(data: SignupData) {
        const { data: authData, error } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
                data: {
                    full_name: data.full_name,
                    role: data.role || 'entrepreneur',
                },
            },
        });

        if (error) throw error;
        return { user: authData.user, session: authData.session };
    }

    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return { user: data.user, session: data.session };
    }

    async logout() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    }

    async getMe() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        // Return structured as profile for backward compatibility
        return {
            profile: {
                id: user?.id,
                email: user?.email,
                full_name: user?.user_metadata?.full_name,
                role: user?.user_metadata?.role
            }
        };
    }

    // ============ VENTURE ENDPOINTS ============

    async getVentures(params: VentureQueryParams = {}) {
        let query = supabase
            .from('ventures')
            .select('*, streams:venture_streams(*)', { count: 'exact' });

        if (params.status) {
            query = query.eq('status', params.status);
        }
        if (params.program) {
            query = query.eq('program', params.program);
        }
        if (params.limit) {
            query = query.limit(params.limit);
        }
        if (params.offset) {
            query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
        }

        const { data, error, count } = await query;
        if (error) throw error;
        return { ventures: data, total: count };
    }

    async createVenture(data: any) {
        // Call backend API instead of Supabase directly
        // Backend will split data between ventures and venture_applications tables
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const session = await supabase.auth.getSession();

        const response = await fetch(`${API_URL}/api/ventures`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.data.session?.access_token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to create venture');
        }

        const result = await response.json();
        // Backend returns { venture: ... } directly, not wrapped in data
        return { venture: result.venture };
    }

    async getVenture(id: string) {
        const { data, error } = await supabase
            .from('ventures')
            .select(`
                *,
                streams:venture_streams(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Return streams and other data as top-level properties to match component expectations
        return {
            venture: data,
            streams: data.streams || [],
            milestones: [], // Mock or add fetch if table exists
            support_hours: {} // Mock or add fetch if table exists
        };
    }

    async updateVenture(id: string, data: any) {
        const { data: venture, error } = await supabase
            .from('ventures')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Supabase update error:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
                payload: data
            });
            throw error;
        }
        return { venture };
    }

    // ============ STREAM ENDPOINTS ============

    async getVentureStreams(ventureId: string) {
        const { data, error } = await supabase
            .from('venture_streams')
            .select('*')
            .eq('venture_id', ventureId);

        if (error) throw error;
        return { streams: data };
    }

    async createStream(ventureId: string, data: { stream_name: string; status: string }) {
        const { data: stream, error } = await supabase
            .from('venture_streams')
            .insert({ ...data, venture_id: ventureId })
            .select()
            .single();

        if (error) throw error;
        return { stream };
    }

    async updateStream(id: string, data: { stream_name?: string; status?: string }) {
        const { data: stream, error } = await supabase
            .from('venture_streams')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { stream };
    }

    async deleteStream(id: string) {
        const { error } = await supabase
            .from('venture_streams')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }

    async submitVenture(id: string) {
        // Call backend API to submit venture
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        const session = await supabase.auth.getSession();

        const response = await fetch(`${API_URL}/api/ventures/${id}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.data.session?.access_token}`
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to submit venture');
        }

        const result = await response.json();
        // Backend returns { message: '...', venture: ... } directly
        return { venture: result.venture };
    }

    // ============ INTERACTION ENDPOINTS ============

    async getInteractions(ventureId: string) {
        const { data, error } = await supabase
            .from('venture_interactions')
            .select('*, created_by_user:users!venture_interactions_created_by_fkey(id, email)')
            .eq('venture_id', ventureId)
            .is('deleted_at', null)
            .order('interaction_date', { ascending: false });

        if (error) throw error;
        return { interactions: data || [] };
    }

    async createInteraction(ventureId: string, data: any) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: interaction, error } = await supabase
            .from('venture_interactions')
            .insert({
                venture_id: ventureId,
                created_by: user.id,
                ...data
            })
            .select()
            .single();

        if (error) throw error;
        return { interaction };
    }

    async updateInteraction(id: string, data: any) {
        const { data: interaction, error } = await supabase
            .from('venture_interactions')
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return { interaction };
    }

    async deleteInteraction(id: string) {
        const { error } = await supabase
            .from('venture_interactions')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw error;
    }

    // ============ AI INSIGHTS ENDPOINTS ============

    async generateInsights(ventureId: string, vsmNotes?: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

        const response = await fetch(`${API_URL}/api/ventures/${ventureId}/generate-insights`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ vsm_notes: vsmNotes })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Failed to generate AI insights');
        }

        const data = await response.json();
        return data; // Returns { message, insights }
    }
}

export const api = new ApiClient();
