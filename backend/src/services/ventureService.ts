import { SupabaseClient } from '@supabase/supabase-js';
import {
    Venture,
    VentureStream,
    CreateVentureRequest,
    UpdateVentureRequest,
    CreateStreamRequest,
    VentureQueryParams
} from '../types';

/**
 * Get all ventures for a user (with optional filters)
 */
export async function getVentures(
    client: SupabaseClient,
    userId: string,
    userRole: string,
    filters?: VentureQueryParams
) {
    let query = client.from('ventures').select('*', { count: 'exact' });

    // Entrepreneurs can only see their own ventures
    if (userRole === 'entrepreneur') {
        query = query.eq('user_id', userId);
    }
    // VSM and committee can see all ventures

    // Apply filters
    if (filters?.status) {
        query = query.eq('status', filters.status);
    }
    if (filters?.program) {
        query = query.eq('program', filters.program);
    }

    // Pagination
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    query = query.range(offset, offset + limit - 1);

    // Order by created_at desc
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) throw error;

    return {
        ventures: data || [],
        total: count || 0,
    };
}

/**
 * Get a single venture by ID
 * Updated for new schema: joins with venture_applications to get complete data
 */
export async function getVentureById(
    client: SupabaseClient,
    ventureId: string,
    userId: string,
    userRole: string
) {
    const { data: venture, error } = await client
        .from('ventures')
        .select('*')
        .eq('id', ventureId)
        .single();

    if (error) throw error;
    if (!venture) throw new Error('Venture not found');

    // Check permissions
    if (userRole === 'entrepreneur' && venture.user_id !== userId) {
        throw new Error('Unauthorized access to venture');
    }

    // Get application data (normalized form data)
    const { data: application } = await client
        .from('venture_applications')
        .select('*')
        .eq('venture_id', ventureId)
        .single();

    // Reconstruct growth_current, growth_target, commitment objects for frontend compatibility
    const reconstructedVenture: any = {
        ...venture,
        growth_current: application ? {
            product: application.what_do_you_sell,
            segment: application.who_do_you_sell_to,
            geography: application.which_regions,
            city: venture.city,
            email: application.founder_email,
            phone: application.founder_phone,
            role: application.founder_designation,
            business_type: application.company_type,
            employees: application.full_time_employees,
            referred_by: application.referred_by,
            state: application.state,
        } : null,
        growth_target: application ? {
            product: application.focus_product,
            segment: application.focus_segment,
            geography: application.focus_geography,
        } : null,
        growth_focus: application?.growth_focus ? (Array.isArray(application.growth_focus) ? application.growth_focus.join(',') : application.growth_focus) : null,
        commitment: application ? {
            lastYearRevenue: application.revenue_12m,
            revenuePotential: application.revenue_potential_3y,
            investment: application.min_investment,
            incrementalHiring: application.incremental_hiring,
        } : null,
        blockers: application?.blockers || null,
        support_request: application?.support_request || null,
    };

    // Get streams
    const { data: streams } = await client
        .from('venture_streams')
        .select('*')
        .eq('venture_id', ventureId);

    // Get milestones
    const { data: milestones } = await client
        .from('venture_milestones')
        .select('*')
        .eq('venture_id', ventureId);

    // Get support hours
    const { data: supportHours } = await client
        .from('support_hours')
        .select('*')
        .eq('venture_id', ventureId)
        .single();

    return {
        venture: reconstructedVenture,
        streams: streams || [],
        milestones: milestones || [],
        support_hours: supportHours || null,
    };
}

/**
 * Create a new venture (updated for new schema)
 * Splits data between ventures table and venture_applications table
 */
export async function createVenture(
    client: SupabaseClient,
    userId: string,
    data: CreateVentureRequest
): Promise<any> {
    // Type assertion for extended data from frontend
    const growthCurrent: any = data.growth_current || {};
    const growthTarget: any = data.growth_target || {};
    const commitment: any = data.commitment || {};

    // Step 1: Extract data for ventures table (only core fields)
    const ventureData = {
        user_id: userId,
        name: data.name,
        founder_name: data.founder_name || null,
        city: growthCurrent.city || null,
        location: growthCurrent.city || null,
        status: 'Draft',
        program_name: data.program || null,
        workbench_locked: true,
    };

    // Step 2: Create venture record
    const { data: venture, error: ventureError } = await client
        .from('ventures')
        .insert(ventureData)
        .select()
        .single();

    if (ventureError) throw ventureError;

    // Step 3: Extract application data
    const applicationData = {
        venture_id: venture.id,

        // Business info
        what_do_you_sell: growthCurrent.product || null,
        who_do_you_sell_to: growthCurrent.segment || null,
        which_regions: growthCurrent.geography || null,
        company_type: growthCurrent.business_type || null,
        referred_by: growthCurrent.referred_by || null,

        // Founder details
        founder_email: growthCurrent.email || null,
        founder_phone: growthCurrent.phone || null,
        founder_designation: growthCurrent.role || null,

        // Financial metrics (store as original string values)
        revenue_12m: commitment.lastYearRevenue ? commitment.lastYearRevenue.toString() : null,
        revenue_potential_3y: commitment.revenuePotential ? commitment.revenuePotential.toString() : null,
        min_investment: commitment.investment ? parseFloat(commitment.investment.toString().replace(/,/g, '')) : null,

        // Team metrics (store as original string value)
        full_time_employees: growthCurrent.employees ? growthCurrent.employees.toString() : null,
        incremental_hiring: commitment.incrementalHiring ? parseInt(commitment.incrementalHiring.toString()) : null,

        // Growth focus (convert to array)
        growth_focus: data.growth_focus ? (Array.isArray(data.growth_focus) ? data.growth_focus : data.growth_focus.split(',').filter(Boolean)) : [],
        focus_product: growthTarget.product || null,
        focus_segment: growthTarget.segment || null,
        focus_geography: growthTarget.geography || null,

        // Support needs
        blockers: data.blockers || null,
        support_request: data.support_request || null,

        // Additional
        state: growthCurrent.state || null,
        additional_data: {},
    };

    // Step 4: Create application record
    const { error: appError } = await client
        .from('venture_applications')
        .insert(applicationData);

    if (appError) {
        console.error('Error creating venture_applications:', appError);
        // Rollback: delete the venture if application creation fails
        await client.from('ventures').delete().eq('id', venture.id);
        throw appError;
    }

    // Step 5: Return combined data (for backward compatibility with frontend)
    return {
        ...venture,
        // Include original data for frontend compatibility
        growth_current: data.growth_current,
        growth_target: data.growth_target,
        growth_focus: data.growth_focus,
        commitment: data.commitment,
        blockers: data.blockers,
        support_request: data.support_request,
    };
}

/**
 * Update a venture (updated for new schema)
 * Splits updates between ventures and venture_applications tables
 */
export async function updateVenture(
    client: SupabaseClient,
    ventureId: string,
    userId: string,
    userRole: string,
    data: UpdateVentureRequest
): Promise<Venture> {
    // Get venture first to check permissions
    const { data: existingVenture, error: fetchError } = await client
        .from('ventures')
        .select('*')
        .eq('id', ventureId)
        .single();

    if (fetchError) throw fetchError;
    if (!existingVenture) throw new Error('Venture not found');

    // Check permissions
    if (userRole === 'entrepreneur' && existingVenture.user_id !== userId) {
        throw new Error('Unauthorized to update this venture');
    }

    // Entrepreneurs can't change status directly (except submit)
    if (userRole === 'entrepreneur' && data.status && data.status !== 'submitted') {
        delete data.status;
    }

    // Type assertion for extended data from frontend (schema validates these at runtime)
    const updateData: any = data;
    const growthCurrent: any = data.growth_current || {};
    const growthTarget: any = data.growth_target || {};
    const commitment: any = data.commitment || {};

    // Separate data into ventures table fields
    const ventureUpdates: any = {};
    if (data.name) ventureUpdates.name = data.name;
    if (data.founder_name !== undefined) ventureUpdates.founder_name = data.founder_name;
    if (data.status) ventureUpdates.status = data.status;
    if (updateData.city || growthCurrent.city) ventureUpdates.city = updateData.city || growthCurrent.city;
    if (updateData.location) ventureUpdates.location = updateData.location;

    // VSM fields
    if (updateData.vsm_notes !== undefined) ventureUpdates.vsm_notes = updateData.vsm_notes;
    if (updateData.program_recommendation !== undefined) ventureUpdates.program_recommendation = updateData.program_recommendation;
    if (updateData.internal_comments !== undefined) ventureUpdates.internal_comments = updateData.internal_comments;
    if (updateData.vsm_reviewed_at !== undefined) ventureUpdates.vsm_reviewed_at = updateData.vsm_reviewed_at;

    // Committee fields
    if (updateData.venture_partner !== undefined) ventureUpdates.venture_partner = updateData.venture_partner;
    if (updateData.committee_feedback !== undefined) ventureUpdates.committee_feedback = updateData.committee_feedback;
    if (updateData.committee_decision !== undefined) ventureUpdates.committee_decision = updateData.committee_decision;

    // Agreement fields
    if (updateData.agreement_status !== undefined) ventureUpdates.agreement_status = updateData.agreement_status;

    // Update ventures table if there are changes
    let venture = existingVenture;
    if (Object.keys(ventureUpdates).length > 0) {
        const { data: updatedVenture, error } = await client
            .from('ventures')
            .update(ventureUpdates)
            .eq('id', ventureId)
            .select()
            .single();

        if (error) throw error;
        venture = updatedVenture;
    }

    // Prepare application updates if needed
    const applicationUpdates: any = {};

    // Growth current fields
    if (growthCurrent.product !== undefined) applicationUpdates.what_do_you_sell = growthCurrent.product;
    if (growthCurrent.segment !== undefined) applicationUpdates.who_do_you_sell_to = growthCurrent.segment;
    if (growthCurrent.geography !== undefined) applicationUpdates.which_regions = growthCurrent.geography;
    if (growthCurrent.business_type !== undefined) applicationUpdates.company_type = growthCurrent.business_type;
    if (growthCurrent.email !== undefined) applicationUpdates.founder_email = growthCurrent.email;
    if (growthCurrent.phone !== undefined) applicationUpdates.founder_phone = growthCurrent.phone;
    if (growthCurrent.role !== undefined) applicationUpdates.founder_designation = growthCurrent.role;
    if (growthCurrent.employees !== undefined) applicationUpdates.full_time_employees = growthCurrent.employees.toString();
    if (growthCurrent.referred_by !== undefined) applicationUpdates.referred_by = growthCurrent.referred_by;
    if (growthCurrent.state !== undefined) applicationUpdates.state = growthCurrent.state;

    // Growth target fields
    if (growthTarget.product !== undefined) applicationUpdates.focus_product = growthTarget.product;
    if (growthTarget.segment !== undefined) applicationUpdates.focus_segment = growthTarget.segment;
    if (growthTarget.geography !== undefined) applicationUpdates.focus_geography = growthTarget.geography;

    // Growth focus
    if (data.growth_focus !== undefined) {
        applicationUpdates.growth_focus = Array.isArray(data.growth_focus)
            ? data.growth_focus
            : data.growth_focus.split(',').filter(Boolean);
    }

    // Commitment fields
    if (commitment.lastYearRevenue !== undefined) {
        applicationUpdates.revenue_12m = commitment.lastYearRevenue.toString();
    }
    if (commitment.revenuePotential !== undefined) {
        applicationUpdates.revenue_potential_3y = commitment.revenuePotential.toString();
    }
    if (commitment.investment !== undefined) {
        applicationUpdates.min_investment = parseFloat(commitment.investment.toString().replace(/,/g, ''));
    }
    if (commitment.incrementalHiring !== undefined) {
        applicationUpdates.incremental_hiring = parseInt(commitment.incrementalHiring.toString());
    }

    // Direct field mappings
    if (updateData.revenue_12m !== undefined) applicationUpdates.revenue_12m = updateData.revenue_12m.toString();
    if (updateData.revenue_potential_3y !== undefined) applicationUpdates.revenue_potential_3y = updateData.revenue_potential_3y.toString();
    if (updateData.min_investment !== undefined) applicationUpdates.min_investment = parseFloat(updateData.min_investment.toString().replace(/,/g, ''));
    if (updateData.incremental_hiring !== undefined) applicationUpdates.incremental_hiring = parseInt(updateData.incremental_hiring.toString());
    if (updateData.full_time_employees !== undefined) applicationUpdates.full_time_employees = updateData.full_time_employees.toString();
    if (updateData.blockers !== undefined) applicationUpdates.blockers = updateData.blockers;
    if (updateData.support_request !== undefined) applicationUpdates.support_request = updateData.support_request;

    // Update venture_applications table if there are changes
    if (Object.keys(applicationUpdates).length > 0) {
        const { error: appError } = await client
            .from('venture_applications')
            .update(applicationUpdates)
            .eq('venture_id', ventureId);

        if (appError) {
            console.error('Error updating venture_applications:', appError);
            // Continue anyway - venture core data was updated
        }
    }

    return venture;
}

/**
 * Delete a venture
 */
export async function deleteVenture(
    client: SupabaseClient,
    ventureId: string,
    userId: string,
    userRole: string
): Promise<void> {
    // Get venture first to check permissions
    const { data: existingVenture, error: fetchError } = await client
        .from('ventures')
        .select('*')
        .eq('id', ventureId)
        .single();

    if (fetchError) throw fetchError;
    if (!existingVenture) throw new Error('Venture not found');

    // Only entrepreneurs can delete their own ventures, or admins
    if (userRole === 'entrepreneur' && existingVenture.user_id !== userId) {
        throw new Error('Unauthorized to delete this venture');
    }
    if (userRole !== 'entrepreneur' && userRole !== 'admin') {
        throw new Error('Only entrepreneurs can delete their ventures');
    }

    const { error } = await client
        .from('ventures')
        .delete()
        .eq('id', ventureId);

    if (error) throw error;
}

/**
 * Submit a venture for review
 */
export async function submitVenture(
    client: SupabaseClient,
    ventureId: string,
    userId: string
): Promise<Venture> {
    // Status must be 'Submitted' (capital S) to match database constraint
    // Type assertion needed because types still use old lowercase values
    return updateVenture(client, ventureId, userId, 'entrepreneur', { status: 'Submitted' as any });
}

// ============ STREAM OPERATIONS ============

/**
 * Get streams for a venture
 */
export async function getVentureStreams(client: SupabaseClient, ventureId: string): Promise<VentureStream[]> {
    const { data, error } = await client
        .from('venture_streams')
        .select('*')
        .eq('venture_id', ventureId)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
}

/**
 * Create a stream for a venture
 */
export async function createStream(
    client: SupabaseClient,
    ventureId: string,
    data: CreateStreamRequest
): Promise<VentureStream> {
    const { data: stream, error } = await client
        .from('venture_streams')
        .insert({
            venture_id: ventureId,
            ...data,
        })
        .select()
        .single();

    if (error) throw error;
    return stream;
}

/**
 * Update a stream
 */
export async function updateStream(
    client: SupabaseClient,
    streamId: string,
    data: Partial<CreateStreamRequest>
): Promise<VentureStream> {
    const { data: stream, error } = await client
        .from('venture_streams')
        .update(data)
        .eq('id', streamId)
        .select()
        .single();

    if (error) throw error;
    return stream;
}

/**
 * Delete a stream
 */
export async function deleteStream(client: SupabaseClient, streamId: string): Promise<void> {
    const { error } = await client
        .from('venture_streams')
        .delete()
        .eq('id', streamId);

    if (error) throw error;
}
