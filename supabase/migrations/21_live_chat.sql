-- Live Chat System
-- Support for customer support chat with user association, order reference, and history persistence

-- Chat conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  guest_email TEXT,
  guest_name TEXT,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number TEXT,
  status TEXT DEFAULT 'open', -- 'open', 'assigned', 'resolved', 'closed'
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  subject TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  closed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT chat_conversations_user_or_guest_check 
    CHECK (
      (user_id IS NOT NULL) OR 
      (guest_email IS NOT NULL AND guest_name IS NOT NULL)
    )
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL, -- 'customer', 'agent', 'system'
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name TEXT,
  message_text TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_sender_type CHECK (sender_type IN ('customer', 'agent', 'system'))
);

-- Chat attachments table (for future use)
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_order ON chat_conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created ON chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);

-- Row Level Security
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own conversations
CREATE POLICY "Users can view their own chat conversations" 
  ON chat_conversations FOR SELECT 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND guest_email IS NOT NULL)
  );

-- Users can create conversations
CREATE POLICY "Users can create chat conversations" 
  ON chat_conversations FOR INSERT 
  WITH CHECK (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND guest_email IS NOT NULL)
  );

-- Users can update their own conversations
CREATE POLICY "Users can update their own chat conversations" 
  ON chat_conversations FOR UPDATE 
  USING (
    (auth.uid() IS NOT NULL AND auth.uid() = user_id) OR
    (auth.uid() IS NULL AND guest_email IS NOT NULL)
  );

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations" 
  ON chat_messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND (
        (auth.uid() IS NOT NULL AND auth.uid() = chat_conversations.user_id) OR
        (auth.uid() IS NULL AND chat_conversations.guest_email IS NOT NULL)
      )
    )
  );

-- Users can send messages in their conversations
CREATE POLICY "Users can send messages in their conversations" 
  ON chat_messages FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_conversations 
      WHERE chat_conversations.id = chat_messages.conversation_id 
      AND (
        (auth.uid() IS NOT NULL AND auth.uid() = chat_conversations.user_id) OR
        (auth.uid() IS NULL AND chat_conversations.guest_email IS NOT NULL)
      )
    )
  );

ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view attachments in their conversations
CREATE POLICY "Users can view attachments in their conversations" 
  ON chat_attachments FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages 
      JOIN chat_conversations ON chat_conversations.id = chat_messages.conversation_id
      WHERE chat_messages.id = chat_attachments.message_id 
      AND (
        (auth.uid() IS NOT NULL AND auth.uid() = chat_conversations.user_id) OR
        (auth.uid() IS NULL AND chat_conversations.guest_email IS NOT NULL)
      )
    )
  );

-- Function to create new chat conversation
CREATE OR REPLACE FUNCTION create_chat_conversation(
  p_user_id UUID DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL,
  p_guest_name TEXT DEFAULT NULL,
  p_order_id UUID DEFAULT NULL,
  p_subject TEXT DEFAULT NULL,
  p_initial_message TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
  v_order_number TEXT;
BEGIN
  -- Get order number if order_id provided
  IF p_order_id IS NOT NULL THEN
    SELECT order_number INTO v_order_number FROM orders WHERE id = p_order_id;
  END IF;
  
  -- Create conversation
  INSERT INTO chat_conversations (
    user_id,
    guest_email,
    guest_name,
    order_id,
    order_number,
    subject,
    status
  ) VALUES (
    p_user_id,
    p_guest_email,
    p_guest_name,
    p_order_id,
    v_order_number,
    p_subject,
    'open'
  ) RETURNING id INTO v_conversation_id;
  
  -- Add initial message if provided
  IF p_initial_message IS NOT NULL THEN
    INSERT INTO chat_messages (
      conversation_id,
      sender_type,
      sender_id,
      sender_name,
      message_text
    ) VALUES (
      v_conversation_id,
      'customer',
      p_user_id,
      COALESCE(p_guest_name, 'Customer'),
      p_initial_message
    );
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to send chat message
CREATE OR REPLACE FUNCTION send_chat_message(
  p_conversation_id UUID,
  p_sender_type TEXT,
  p_message_text TEXT,
  p_sender_id UUID DEFAULT NULL,
  p_sender_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert message
  INSERT INTO chat_messages (
    conversation_id,
    sender_type,
    sender_id,
    sender_name,
    message_text
  ) VALUES (
    p_conversation_id,
    p_sender_type,
    p_sender_id,
    p_sender_name,
    p_message_text
  ) RETURNING id INTO v_message_id;
  
  -- Update conversation timestamp
  UPDATE chat_conversations 
  SET updated_at = NOW() 
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_as_read(
  p_conversation_id UUID,
  p_sender_type TEXT
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE chat_messages 
  SET is_read = true 
  WHERE conversation_id = p_conversation_id 
  AND sender_type != p_sender_type
  AND is_read = false;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to close conversation
CREATE OR REPLACE FUNCTION close_chat_conversation(
  p_conversation_id UUID
) RETURNS void AS $$
BEGIN
  UPDATE chat_conversations 
  SET status = 'closed',
      closed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
