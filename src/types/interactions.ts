export interface Interaction {
    id: string;
    venture_id: string;
    interaction_type: 'call' | 'meeting' | 'email' | 'note';
    title?: string;
    transcript: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    interaction_date: string;
    participants?: string[];
    deleted_at?: string | null;
    created_by_user?: {
        id: string;
        email: string;
    };
}

export interface CreateInteractionInput {
    interaction_type: 'call' | 'meeting' | 'email' | 'note';
    title?: string;
    transcript: string;
    interaction_date?: string;
    participants?: string[];
}

export interface UpdateInteractionInput {
    interaction_type?: 'call' | 'meeting' | 'email' | 'note';
    title?: string;
    transcript?: string;
    interaction_date?: string;
    participants?: string[];
}
