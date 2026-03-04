import { Router, Request, Response, NextFunction } from 'express';
import * as ventureService from '../services/ventureService';
import * as aiService from '../services/aiService';
import { extractDocumentText } from '../services/documentService';
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

            // Fetch corporate presentation text if available
            const { data: appData } = await supabase
                .from('venture_applications')
                .select('corporate_presentation_url')
                .eq('venture_id', req.params.id)
                .maybeSingle();

            let corporatePresentationText: string | undefined;
            if (appData?.corporate_presentation_url) {
                const text = await extractDocumentText(appData.corporate_presentation_url);
                if (text) corporatePresentationText = text;
            }

            const ventureWithDoc = {
                ...venture,
                corporate_presentation_text: corporatePresentationText,
            };

            // Generate insights using Claude API
            const insights = await aiService.generateVentureInsights(ventureWithDoc, vsmNotes);

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

// ============ ROADMAP ROUTES ============

/**
 * POST /api/ventures/:id/generate-roadmap
 * Generate AI-powered journey roadmap for a venture
 */
router.post(
    '/:id/generate-roadmap',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase, role } = await getContext(req);

            if (!['venture_mgr', 'committee_member', 'admin'].includes(role)) {
                return res.status(403).json({
                    success: false,
                    message: 'Only venture managers, committee members, and admins can generate roadmaps'
                });
            }

            // Get venture with application and assessment data
            const { data: venture, error: ventureError } = await supabase
                .from('ventures')
                .select(`
                    *,
                    application:venture_applications(*),
                    assessments:venture_assessments(*)
                `)
                .eq('id', req.params.id)
                .single();

            if (ventureError || !venture) {
                return res.status(404).json({ success: false, message: 'Venture not found' });
            }

            const app = venture.application?.[0] || venture.application || {};
            const assessment = (venture.assessments || []).find((a: any) => a.is_current) || venture.assessments?.[0] || {};

            // Extract document text if available
            let corporatePresentationText: string | undefined;
            if (app.corporate_presentation_url) {
                const text = await extractDocumentText(app.corporate_presentation_url);
                if (text) corporatePresentationText = text;
            }

            // Build venture data with application fields
            const ventureData = {
                ...venture,
                revenue_12m: app.revenue_12m,
                revenue_potential_3y: app.revenue_potential_3y,
                full_time_employees: app.full_time_employees,
                growth_focus: app.growth_focus,
                what_do_you_sell: app.what_do_you_sell,
                who_do_you_sell_to: app.who_do_you_sell_to,
                which_regions: app.which_regions,
                focus_product: app.focus_product,
                focus_segment: app.focus_segment,
                focus_geography: app.focus_geography,
                blockers: app.blockers,
                support_request: app.support_request,
                incremental_hiring: app.incremental_hiring,
                corporate_presentation_text: corporatePresentationText,
            };

            const startTime = Date.now();

            // Generate roadmap via Claude
            const roadmapData = await aiService.generateVentureRoadmap(ventureData, {
                vsmNotes: assessment.notes || '',
                aiAnalysis: assessment.ai_analysis || null,
            });

            const durationSeconds = Math.round((Date.now() - startTime) / 1000);

            // Mark old roadmaps as not current
            await supabase
                .from('venture_roadmaps')
                .update({ is_current: false })
                .eq('venture_id', req.params.id)
                .eq('is_current', true);

            // Get version number
            const { count } = await supabase
                .from('venture_roadmaps')
                .select('*', { count: 'exact', head: true })
                .eq('venture_id', req.params.id);

            // Insert new roadmap
            const { data: savedRoadmap, error: insertError } = await supabase
                .from('venture_roadmaps')
                .insert({
                    venture_id: req.params.id,
                    generated_by: req.user.id,
                    generation_source: 'ai_generated',
                    based_on_assessment_id: assessment.id || null,
                    roadmap_data: roadmapData,
                    roadmap_version: (count || 0) + 1,
                    is_current: true,
                    generation_duration_seconds: durationSeconds,
                    generation_model: 'claude-sonnet-4-5-20250929',
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error saving roadmap:', insertError);
                // Return data even if save fails
                return successResponse(res, { roadmap: { roadmap_data: roadmapData }, saved: false });
            }

            successResponse(res, { roadmap: savedRoadmap });
        } catch (error: any) {
            console.error('Error generating roadmap:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate roadmap',
            });
        }
    }
);

/**
 * GET /api/ventures/:id/roadmap
 * Get the current roadmap for a venture
 */
router.get(
    '/:id/roadmap',
    authenticateUser,
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { supabase } = await getContext(req);

            const { data: roadmap, error } = await supabase
                .from('venture_roadmaps')
                .select('*')
                .eq('venture_id', req.params.id)
                .eq('is_current', true)
                .maybeSingle();

            if (error) {
                console.error('Error fetching roadmap:', error);
                return res.status(500).json({ success: false, message: 'Failed to fetch roadmap' });
            }

            successResponse(res, { roadmap: roadmap || null });
        } catch (error) {
            next(error);
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
