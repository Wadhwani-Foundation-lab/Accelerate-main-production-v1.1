import { Router, Request, Response, NextFunction } from 'express';
import { authenticateUser } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { createAuthenticatedClient } from '../config/supabase';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createInteractionSchema = z.object({
    interaction_type: z.enum(['call', 'meeting', 'email', 'note']).default('call'),
    title: z.string().optional(),
    transcript: z.string().min(1, 'Transcript/notes cannot be empty'),
    interaction_date: z.string().optional(),
    participants: z.array(z.string()).optional()
});

const updateInteractionSchema = z.object({
    interaction_type: z.enum(['call', 'meeting', 'email', 'note']).optional(),
    title: z.string().optional(),
    transcript: z.string().optional(),
    interaction_date: z.string().optional(),
    participants: z.array(z.string()).optional()
});

// Helper to get authenticated client
async function getContext(req: Request) {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const supabase = createAuthenticatedClient(token);

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    return { supabase, role: profile?.role || 'entrepreneur' };
}

/**
 * GET /api/ventures/:ventureId/interactions
 * Get all interactions for a venture
 */
router.get(
    '/ventures/:ventureId/interactions',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);
            const { ventureId } = req.params;

            // Check access permissions
            const canAccess = role === 'venture_manager' || role === 'committee' || role === 'admin';
            if (!canAccess) {
                return res.status(403).json({ error: 'Unauthorized to view interactions' });
            }

            // Get interactions (not deleted)
            const { data: interactions, error } = await supabase
                .from('venture_interactions')
                .select(`
                    *,
                    created_by_user:users!venture_interactions_created_by_fkey(
                        id,
                        email
                    )
                `)
                .eq('venture_id', ventureId)
                .is('deleted_at', null)
                .order('interaction_date', { ascending: false });

            if (error) throw error;

            successResponse(res, { interactions: interactions || [] });
        } catch (error) {
            console.error('Error fetching interactions:', error);
            next(error);
        }
    }
);

/**
 * POST /api/ventures/:ventureId/interactions
 * Create a new interaction
 */
router.post(
    '/ventures/:ventureId/interactions',
    authenticateUser,
    validateBody(createInteractionSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);
            const { ventureId } = req.params;

            // Check access permissions
            const canCreate = role === 'venture_manager' || role === 'committee' || role === 'admin';
            if (!canCreate) {
                return res.status(403).json({ error: 'Unauthorized to create interactions' });
            }

            // Create interaction
            const { data: interaction, error } = await supabase
                .from('venture_interactions')
                .insert({
                    venture_id: ventureId,
                    created_by: req.user.id,
                    ...req.body
                })
                .select()
                .single();

            if (error) throw error;

            createdResponse(res, { interaction });
        } catch (error) {
            console.error('Error creating interaction:', error);
            next(error);
        }
    }
);

/**
 * PATCH /api/interactions/:id
 * Update an existing interaction
 */
router.patch(
    '/interactions/:id',
    authenticateUser,
    validateBody(updateInteractionSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);
            const { id } = req.params;

            // Get the interaction to check ownership
            const { data: existing } = await supabase
                .from('venture_interactions')
                .select('created_by')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({ error: 'Interaction not found' });
            }

            // Only creator or admin can edit
            const canEdit = existing.created_by === req.user.id || role === 'admin';
            if (!canEdit) {
                return res.status(403).json({ error: 'Unauthorized to edit this interaction' });
            }

            // Update interaction
            const { data: interaction, error } = await supabase
                .from('venture_interactions')
                .update(req.body)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            successResponse(res, { interaction });
        } catch (error) {
            console.error('Error updating interaction:', error);
            next(error);
        }
    }
);

/**
 * DELETE /api/interactions/:id
 * Soft delete an interaction
 */
router.delete(
    '/interactions/:id',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);
            const { id } = req.params;

            // Get the interaction to check ownership
            const { data: existing } = await supabase
                .from('venture_interactions')
                .select('created_by')
                .eq('id', id)
                .single();

            if (!existing) {
                return res.status(404).json({ error: 'Interaction not found' });
            }

            // Only creator or admin can delete
            const canDelete = existing.created_by === req.user.id || role === 'admin';
            if (!canDelete) {
                return res.status(403).json({ error: 'Unauthorized to delete this interaction' });
            }

            // Soft delete
            const { error } = await supabase
                .from('venture_interactions')
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;

            noContentResponse(res);
        } catch (error) {
            console.error('Error deleting interaction:', error);
            next(error);
        }
    }
);

export default router;
