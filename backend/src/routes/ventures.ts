import { Router, Request, Response, NextFunction } from 'express';
import * as ventureService from '../services/ventureService';
import * as aiService from '../services/aiService';
import { authenticateUser } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validate';
import { createAuthenticatedClient } from '../config/supabase';
import {
    createVentureSchema,
    updateVentureSchema,
    createStreamSchema,
    updateStreamSchema,
    ventureQuerySchema
} from '../types/schemas';
import { successResponse, createdResponse, noContentResponse } from '../utils/response';

const router = Router();

// Helper to get authenticated client and user role
async function getContext(req: Request) {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const supabase = createAuthenticatedClient(token);

    // Get user profile/role safely
    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', req.user.id)
        .single();

    return { supabase, role: profile?.role || 'entrepreneur' };
}

// ============ VENTURE ROUTES ============

/**
 * GET /api/ventures
 * Get all ventures (with filters)
 */
router.get(
    '/',
    authenticateUser,
    validateQuery(ventureQuerySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);

            const result = await ventureService.getVentures(
                supabase,
                req.user.id,
                role,
                req.query as any
            );

            successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/ventures
 * Create a new venture
 */
router.post(
    '/',
    authenticateUser,
    validateBody(createVentureSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || '';
            const supabase = createAuthenticatedClient(token);

            const venture = await ventureService.createVenture(supabase, req.user.id, req.body);
            createdResponse(res, { venture });
        } catch (error) {
            console.error('Error creating venture:', error);
            next(error);
        }
    }
);

/**
 * GET /api/ventures/:id
 * Get a single venture by ID
 */
router.get(
    '/:id',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);

            const result = await ventureService.getVentureById(
                supabase,
                req.params.id,
                req.user.id,
                role
            );

            successResponse(res, result);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/ventures/:id
 * Update a venture
 */
router.put(
    '/:id',
    authenticateUser,
    validateBody(updateVentureSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);

            const venture = await ventureService.updateVenture(
                supabase,
                req.params.id,
                req.user.id,
                role,
                req.body
            );

            successResponse(res, { venture });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/ventures/:id
 * Delete a venture
 */
router.delete(
    '/:id',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);

            await ventureService.deleteVenture(
                supabase,
                req.params.id,
                req.user.id,
                role
            );

            noContentResponse(res);
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/ventures/:id/submit
 * Submit a venture for review
 */
router.post(
    '/:id/submit',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || '';
            const supabase = createAuthenticatedClient(token);

            const venture = await ventureService.submitVenture(supabase, req.params.id, req.user.id);
            successResponse(res, {
                message: 'Venture submitted for review',
                venture
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/ventures/:id/generate-insights
 * Generate AI insights for a venture using Claude API
 */
router.post(
    '/:id/generate-insights',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);

            // Only screening managers, venture managers, and committee members can generate insights
            if (!['success_mgr', 'venture_mgr', 'committee_member', 'admin'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Only screening managers and above can generate AI insights'
                });
            }

            // Get the venture data
            const { data: venture, error: fetchError } = await supabase
                .from('ventures')
                .select('*')
                .eq('id', req.params.id)
                .single();

            if (fetchError || !venture) {
                return res.status(404).json({
                    success: false,
                    message: 'Venture not found'
                });
            }

            // Get VSM notes from request body (optional)
            const vsmNotes = req.body.vsm_notes || venture.vsm_notes || '';

            // Generate insights using Claude API
            const insights = await aiService.generateVentureInsights(venture, vsmNotes);

            // Save insights to database
            const { error: updateError } = await supabase
                .from('ventures')
                .update({
                    ai_analysis: insights,
                    vsm_reviewed_at: new Date().toISOString()
                })
                .eq('id', req.params.id);

            if (updateError) {
                console.error('Error saving insights to database:', updateError);
                // Return insights anyway, even if DB save fails
            }

            successResponse(res, {
                message: 'AI insights generated successfully',
                insights
            });
        } catch (error: any) {
            console.error('Error generating AI insights:', error);

            // Return user-friendly error message
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate AI insights',
                error: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
);

// ============ STREAM ROUTES ============

/**
 * GET /api/ventures/:id/streams
 * Get all streams for a venture
 */
router.get(
    '/:id/streams',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || '';
            const supabase = createAuthenticatedClient(token);

            const streams = await ventureService.getVentureStreams(supabase, req.params.id);
            successResponse(res, { streams });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * POST /api/ventures/:id/streams
 * Create a new stream for a venture
 */
router.post(
    '/:id/streams',
    authenticateUser,
    validateBody(createStreamSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || '';
            const supabase = createAuthenticatedClient(token);

            const stream = await ventureService.createStream(supabase, req.params.id, req.body);
            createdResponse(res, { stream });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * PUT /api/streams/:id
 * Update a stream
 */
router.put(
    '/streams/:id',
    authenticateUser,
    validateBody(updateStreamSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || '';
            const supabase = createAuthenticatedClient(token);

            const stream = await ventureService.updateStream(supabase, req.params.id, req.body);
            successResponse(res, { stream });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * DELETE /api/streams/:id
 * Delete a stream
 */
router.delete(
    '/streams/:id',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const token = req.headers.authorization?.split(' ')[1] || '';
            const supabase = createAuthenticatedClient(token);

            await ventureService.deleteStream(supabase, req.params.id);
            noContentResponse(res);
        } catch (error) {
            next(error);
        }
    }
);

export default router;
