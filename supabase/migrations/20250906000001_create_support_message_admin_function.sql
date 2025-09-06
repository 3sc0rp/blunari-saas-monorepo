-- Create admin RPC function for support ticket messages
CREATE OR REPLACE FUNCTION create_support_message_admin(
  p_ticket_id UUID,
  p_message TEXT,
  p_sender_type TEXT DEFAULT 'admin',
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_message_id UUID;
BEGIN
  INSERT INTO support_ticket_messages (
    ticket_id,
    message,
    sender_type,
    metadata
  ) VALUES (
    p_ticket_id,
    p_message,
    p_sender_type,
    p_metadata
  )
  RETURNING id INTO new_message_id;
  
  RETURN new_message_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_support_message_admin TO authenticated;
