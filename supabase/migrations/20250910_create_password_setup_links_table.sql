-- Create password_setup_links table for tracking single-use links with expiration
CREATE TABLE IF NOT EXISTS password_setup_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    token UUID NOT NULL UNIQUE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_setup_links_token ON password_setup_links(token);
CREATE INDEX IF NOT EXISTS idx_password_setup_links_tenant_id ON password_setup_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_password_setup_links_email ON password_setup_links(email);
CREATE INDEX IF NOT EXISTS idx_password_setup_links_expires_at ON password_setup_links(expires_at);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_password_setup_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic updated_at
CREATE TRIGGER trigger_password_setup_links_updated_at
    BEFORE UPDATE ON password_setup_links
    FOR EACH ROW
    EXECUTE FUNCTION update_password_setup_links_updated_at();

-- Create function to clean up expired links
CREATE OR REPLACE FUNCTION cleanup_expired_password_setup_links()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM password_setup_links 
    WHERE expires_at < NOW() - INTERVAL '24 hours'; -- Keep expired links for 24 hours for audit
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add RLS policies
ALTER TABLE password_setup_links ENABLE ROW LEVEL SECURITY;

-- Policy for service role (functions can manage all links)
CREATE POLICY "Service role can manage password setup links" ON password_setup_links
FOR ALL USING (auth.role() = 'service_role');

-- Policy for admins to view their created links
CREATE POLICY "Admins can view their created links" ON password_setup_links
FOR SELECT USING (
    created_by = auth.uid() AND 
    EXISTS (
        SELECT 1 FROM admin_users 
        WHERE user_id = auth.uid() AND is_active = true
    )
);
