-- Create panelists table for program review panels
CREATE TABLE IF NOT EXISTS panelists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    program TEXT NOT NULL CHECK (program IN ('Prime', 'Core', 'Select')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_panelists_email ON panelists(email);

-- Create index on program for filtering
CREATE INDEX IF NOT EXISTS idx_panelists_program ON panelists(program);

-- Insert sample panelists for Prime program (3 panelists)
INSERT INTO panelists (name, email, phone, program) VALUES
    ('Rajesh Kumar', 'rajesh.kumar@wadhwani.org', '+91 9876543210', 'Prime'),
    ('Priya Sharma', 'priya.sharma@wadhwani.org', '+91 9876543211', 'Prime'),
    ('Amit Patel', 'amit.patel@wadhwani.org', '+91 9876543212', 'Prime')
ON CONFLICT (email) DO NOTHING;

-- Insert sample panelists for Core and Select programs (4 panelists)
INSERT INTO panelists (name, email, phone, program) VALUES
    ('Neha Gupta', 'neha.gupta@wadhwani.org', '+91 9876543213', 'Core'),
    ('Vikram Singh', 'vikram.singh@wadhwani.org', '+91 9876543214', 'Core'),
    ('Anjali Reddy', 'anjali.reddy@wadhwani.org', '+91 9876543215', 'Select'),
    ('Rahul Verma', 'rahul.verma@wadhwani.org', '+91 9876543216', 'Select')
ON CONFLICT (email) DO NOTHING;

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE panelists ENABLE ROW LEVEL SECURITY;

-- Drop policies if they exist, then create them
DROP POLICY IF EXISTS "Allow authenticated users to read panelists" ON panelists;
DROP POLICY IF EXISTS "Allow admins to manage panelists" ON panelists;

-- Policy: Allow authenticated users to read panelists
CREATE POLICY "Allow authenticated users to read panelists"
    ON panelists FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Only admins/managers can insert/update panelists
CREATE POLICY "Allow admins to manage panelists"
    ON panelists FOR ALL
    TO authenticated
    USING (
        auth.jwt() ->> 'role' IN ('vsm', 'venture_mgr', 'committee', 'admin')
    );

COMMENT ON TABLE panelists IS 'Panel members who review venture applications for different programs';
COMMENT ON COLUMN panelists.program IS 'Program the panelist reviews: Prime, Core, or Select';
