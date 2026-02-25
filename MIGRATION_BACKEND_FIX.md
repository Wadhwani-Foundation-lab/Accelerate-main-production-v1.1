# Backend Migration Fix for New Schema

## Problem

The backend code is trying to insert data into `ventures` table with fields that don't exist in the new schema (`growth_current`, `growth_target`, `commitment`, etc.). These fields now belong in the `venture_applications` table.

## Solution: Update Backend Venture Service

Replace the `createVenture` function in `backend/src/services/ventureService.ts`:

### Current Code (Lines 107-124):
```typescript
export async function createVenture(
    client: SupabaseClient,
    userId: string,
    data: CreateVentureRequest
): Promise<Venture> {
    const { data: venture, error } = await client
        .from('ventures')
        .insert({
            user_id: userId,
            ...data,  // ❌ This spreads fields that don't exist!
            status: 'draft',
        })
        .select()
        .single();

    if (error) throw error;
    return venture;
}
```

### New Code (Compatible with New Schema):
```typescript
export async function createVenture(
    client: SupabaseClient,
    userId: string,
    data: CreateVentureRequest
): Promise<any> {
    // Step 1: Extract data for ventures table (only core fields)
    const ventureData = {
        user_id: userId,
        name: data.name,
        founder_name: data.founder_name,
        city: data.growth_current?.city || null,
        location: data.growth_current?.city || null, // Or get from separate field
        status: 'Draft',
        program_name: data.program,
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
        what_do_you_sell: data.growth_current?.product || null,
        who_do_you_sell_to: data.growth_current?.segment || null,
        which_regions: data.growth_current?.geography || null,
        company_type: data.growth_current?.business_type || null,
        referred_by: data.growth_current?.referred_by || null,

        // Founder details
        founder_email: data.growth_current?.email || null,
        founder_phone: data.growth_current?.phone || null,
        founder_designation: data.growth_current?.role || null,

        // Financial metrics (convert string to numeric)
        revenue_12m: data.commitment?.lastYearRevenue ? parseFloat(data.commitment.lastYearRevenue) : null,
        revenue_potential_3y: data.commitment?.revenuePotential ? parseFloat(data.commitment.revenuePotential) : null,
        min_investment: data.commitment?.investment ? parseFloat(data.commitment.investment) : null,

        // Team metrics (convert string to integer)
        full_time_employees: data.growth_current?.employees ? parseInt(data.growth_current.employees) : null,
        incremental_hiring: data.commitment?.incrementalHiring ? parseInt(data.commitment.incrementalHiring) : null,

        // Growth focus (convert comma-separated string to array)
        growth_focus: data.growth_focus ? data.growth_focus.split(',') : [],
        focus_product: data.growth_target?.product || null,
        focus_segment: data.growth_target?.segment || null,
        focus_geography: data.growth_target?.geography || null,

        // Support needs
        blockers: data.blockers || null,
        support_request: data.support_request || null,

        // Additional data (anything else goes here)
        state: data.growth_current?.state || null,
        additional_data: {},
    };

    // Step 4: Create application record
    const { error: appError } = await client
        .from('venture_applications')
        .insert(applicationData);

    if (appError) {
        // Rollback: delete the venture if application creation fails
        await client.from('ventures').delete().eq('id', venture.id);
        throw appError;
    }

    // Step 5: Return combined data (for backward compatibility)
    return {
        ...venture,
        // Include application data for frontend compatibility
        growth_current: data.growth_current,
        growth_target: data.growth_target,
        growth_focus: data.growth_focus,
        commitment: data.commitment,
        blockers: data.blockers,
        support_request: data.support_request,
    };
}
```

## Alternative: Quick Fix (Less Ideal)

If you want a quick fix without major refactoring, you can add the old JSONB fields back to the ventures table:

```sql
-- Run in Supabase SQL Editor
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS growth_current jsonb;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS growth_target jsonb;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS commitment jsonb;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS needs jsonb;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS blockers text;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS support_request text;
ALTER TABLE ventures ADD COLUMN IF NOT EXISTS growth_focus text;
```

⚠️ **Warning:** This reintroduces the redundancy issues that were fixed in the new schema!

## Recommended Approach

1. ✅ **Use the new `createVenture` function** (proper separation)
2. ✅ **Update `getVentureById`** to join with `venture_applications`
3. ✅ **Use the `ventures_complete` view** for dashboards (already includes application data)

## Testing

After updating the code:

```bash
# Restart backend
cd backend
npm run dev
```

Then test submitting a new venture application.
