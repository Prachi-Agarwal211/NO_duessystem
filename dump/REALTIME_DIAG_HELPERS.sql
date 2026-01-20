-- ============================================================================
-- REALTIME DIAGNOSTIC HELPERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_publication_tables()
RETURNS TABLE (tablename TEXT) AS $$
BEGIN
    RETURN QUERY SELECT tablename::TEXT FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_table_policies(table_name TEXT)
RETURNS TABLE (policyname TEXT, permissive TEXT, roles TEXT, cmd TEXT, qual TEXT, with_check TEXT) AS $$
BEGIN
    RETURN QUERY SELECT 
        p.policyname::TEXT, 
        p.permissive::TEXT, 
        p.roles::TEXT, 
        p.cmd::TEXT, 
        p.qual::TEXT, 
        p.with_check::TEXT
    FROM pg_policies p
    WHERE p.tablename = get_table_policies.table_name
    AND p.schemaname = 'public';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
