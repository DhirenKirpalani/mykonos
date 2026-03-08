-- Add UPDATE policy for chat_messages to allow marking messages as read
-- This was missing from the original chat implementation

-- Allow admins and support agents to update messages (mark as read)
CREATE POLICY "Admins can update chat messages"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'support_agent')
    )
  );

-- Allow users to update messages in their own conversations
CREATE POLICY "Users can update messages in their conversations"
  ON chat_messages FOR UPDATE
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

COMMENT ON POLICY "Admins can update chat messages" ON chat_messages IS 'Allows admins and support agents to mark messages as read';
COMMENT ON POLICY "Users can update messages in their conversations" ON chat_messages IS 'Allows users to mark messages as read in their own conversations';
