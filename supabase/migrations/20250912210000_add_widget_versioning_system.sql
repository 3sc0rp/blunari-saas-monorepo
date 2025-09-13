-- Widget versioning and deployment management system
CREATE TABLE widget_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    version_number TEXT NOT NULL, -- e.g., "1.0.0", "1.1.0-beta", "2.0.0-rc1"
    config JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'testing', 'staging', 'production', 'deprecated', 'archived')),
    deployment_strategy TEXT NOT NULL DEFAULT 'immediate' CHECK (deployment_strategy IN ('immediate', 'gradual', 'scheduled', 'canary')),
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    target_audience JSONB DEFAULT '{}', -- Targeting rules for gradual rollouts
    feature_flags JSONB DEFAULT '{}',
    changelog TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deployed_at TIMESTAMPTZ,
    rolled_back_at TIMESTAMPTZ,
    rollback_reason TEXT
);

-- Widget deployment history
CREATE TABLE widget_deployments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_version_id UUID NOT NULL REFERENCES widget_versions(id) ON DELETE CASCADE,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
    deployment_type TEXT NOT NULL CHECK (deployment_type IN ('full', 'canary', 'gradual', 'rollback')),
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completion_time TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'rolled_back')),
    rollout_percentage INTEGER DEFAULT 100,
    traffic_split JSONB DEFAULT '{}', -- A/B testing traffic allocation
    metrics JSONB DEFAULT '{}', -- Deployment performance metrics
    error_details TEXT,
    deployed_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Feature flags management
CREATE TABLE widget_feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    flag_key TEXT NOT NULL,
    flag_name TEXT NOT NULL,
    description TEXT,
    flag_type TEXT NOT NULL DEFAULT 'boolean' CHECK (flag_type IN ('boolean', 'string', 'number', 'json')),
    default_value JSONB NOT NULL DEFAULT 'false',
    targeting_rules JSONB DEFAULT '[]',
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(widget_id, tenant_id, flag_key)
);

-- Widget A/B testing experiments
CREATE TABLE widget_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    experiment_name TEXT NOT NULL,
    description TEXT,
    control_version_id UUID NOT NULL REFERENCES widget_versions(id),
    treatment_version_id UUID NOT NULL REFERENCES widget_versions(id),
    traffic_allocation JSONB NOT NULL DEFAULT '{"control": 50, "treatment": 50}',
    targeting_rules JSONB DEFAULT '{}',
    success_metrics JSONB NOT NULL DEFAULT '[]', -- Key metrics to track
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'running', 'paused', 'completed', 'archived')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    results JSONB DEFAULT '{}',
    statistical_significance NUMERIC(5,4), -- p-value
    winner_version_id UUID REFERENCES widget_versions(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Widget rollback configurations
CREATE TABLE widget_rollback_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    auto_rollback_enabled BOOLEAN NOT NULL DEFAULT false,
    error_threshold_percentage NUMERIC(5,2) DEFAULT 5.0, -- Auto-rollback if error rate exceeds this
    performance_threshold_ms INTEGER DEFAULT 5000, -- Auto-rollback if load time exceeds this
    monitoring_window_minutes INTEGER DEFAULT 15,
    fallback_version_id UUID REFERENCES widget_versions(id),
    notification_channels JSONB DEFAULT '[]', -- Slack, email, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE(widget_id, tenant_id)
);

-- Add indexes for performance
CREATE INDEX idx_widget_versions_widget_tenant ON widget_versions(widget_id, tenant_id);
CREATE INDEX idx_widget_versions_status ON widget_versions(status);
CREATE INDEX idx_widget_versions_created_at ON widget_versions(created_at);

CREATE INDEX idx_widget_deployments_version_id ON widget_deployments(widget_version_id);
CREATE INDEX idx_widget_deployments_environment ON widget_deployments(environment);
CREATE INDEX idx_widget_deployments_status ON widget_deployments(status);
CREATE INDEX idx_widget_deployments_start_time ON widget_deployments(start_time);

CREATE INDEX idx_widget_feature_flags_widget_tenant ON widget_feature_flags(widget_id, tenant_id);
CREATE INDEX idx_widget_feature_flags_enabled ON widget_feature_flags(is_enabled);

CREATE INDEX idx_widget_experiments_widget_tenant ON widget_experiments(widget_id, tenant_id);
CREATE INDEX idx_widget_experiments_status ON widget_experiments(status);
CREATE INDEX idx_widget_experiments_dates ON widget_experiments(start_date, end_date);

-- Add RLS policies
ALTER TABLE widget_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_rollback_configs ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY "Users can manage widget versions for their tenant" ON widget_versions
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can view deployments for their tenant" ON widget_deployments
    FOR SELECT USING (
        widget_version_id IN (
            SELECT id FROM widget_versions 
            WHERE tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
        )
    );

CREATE POLICY "Users can manage feature flags for their tenant" ON widget_feature_flags
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage experiments for their tenant" ON widget_experiments
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

CREATE POLICY "Users can manage rollback configs for their tenant" ON widget_rollback_configs
    FOR ALL USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);

-- Service role policies for Edge Functions
CREATE POLICY "Service role can manage all widget versions" ON widget_versions
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all deployments" ON widget_deployments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all feature flags" ON widget_feature_flags
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all experiments" ON widget_experiments
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all rollback configs" ON widget_rollback_configs
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for version management
CREATE OR REPLACE FUNCTION get_active_widget_version(widget_id_param TEXT, tenant_id_param UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    active_version_id UUID;
BEGIN
    -- Get the production version with highest rollout percentage
    SELECT id INTO active_version_id
    FROM widget_versions
    WHERE widget_id = widget_id_param 
        AND tenant_id = tenant_id_param
        AND status = 'production'
    ORDER BY rollout_percentage DESC, created_at DESC
    LIMIT 1;
    
    RETURN active_version_id;
END;
$$;

CREATE OR REPLACE FUNCTION deploy_widget_version(
    version_id_param UUID,
    environment_param TEXT,
    deployment_type_param TEXT DEFAULT 'full',
    rollout_percentage_param INTEGER DEFAULT 100
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deployment_id UUID;
    version_record widget_versions%ROWTYPE;
BEGIN
    -- Get version details
    SELECT * INTO version_record FROM widget_versions WHERE id = version_id_param;
    
    IF version_record.id IS NULL THEN
        RAISE EXCEPTION 'Widget version not found';
    END IF;
    
    -- Create deployment record
    INSERT INTO widget_deployments (
        widget_version_id,
        environment,
        deployment_type,
        rollout_percentage,
        status,
        deployed_by
    )
    VALUES (
        version_id_param,
        environment_param,
        deployment_type_param,
        rollout_percentage_param,
        'pending',
        auth.uid()
    )
    RETURNING id INTO deployment_id;
    
    -- Update version status if deploying to production
    IF environment_param = 'production' THEN
        UPDATE widget_versions 
        SET 
            status = 'production',
            deployed_at = NOW(),
            rollout_percentage = rollout_percentage_param
        WHERE id = version_id_param;
    END IF;
    
    RETURN deployment_id;
END;
$$;

CREATE OR REPLACE FUNCTION rollback_widget_version(
    widget_id_param TEXT,
    tenant_id_param UUID,
    rollback_reason_param TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_version_id UUID;
    previous_version_id UUID;
    rollback_deployment_id UUID;
BEGIN
    -- Get current production version
    SELECT id INTO current_version_id
    FROM widget_versions
    WHERE widget_id = widget_id_param 
        AND tenant_id = tenant_id_param
        AND status = 'production'
    ORDER BY deployed_at DESC
    LIMIT 1;
    
    -- Get previous stable version
    SELECT id INTO previous_version_id
    FROM widget_versions
    WHERE widget_id = widget_id_param 
        AND tenant_id = tenant_id_param
        AND status IN ('production', 'archived')
        AND id != current_version_id
        AND deployed_at IS NOT NULL
    ORDER BY deployed_at DESC
    LIMIT 1;
    
    IF previous_version_id IS NULL THEN
        RAISE EXCEPTION 'No previous version available for rollback';
    END IF;
    
    -- Mark current version as rolled back
    UPDATE widget_versions 
    SET 
        status = 'deprecated',
        rolled_back_at = NOW(),
        rollback_reason = rollback_reason_param
    WHERE id = current_version_id;
    
    -- Deploy previous version
    SELECT deploy_widget_version(previous_version_id, 'production', 'rollback', 100) 
    INTO rollback_deployment_id;
    
    RETURN rollback_deployment_id;
END;
$$;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON widget_versions, widget_deployments, widget_feature_flags, widget_experiments, widget_rollback_configs TO anon, authenticated;
GRANT ALL ON widget_versions, widget_deployments, widget_feature_flags, widget_experiments, widget_rollback_configs TO service_role;

GRANT EXECUTE ON FUNCTION get_active_widget_version(TEXT, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION deploy_widget_version(UUID, TEXT, TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION rollback_widget_version(TEXT, UUID, TEXT) TO authenticated, service_role;