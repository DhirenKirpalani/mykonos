-- Notification and Email System
-- Support for email notifications and notification queue

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- List of available variables for this template
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notification queue table
CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  notification_type TEXT NOT NULL, -- 'order_confirmation', 'payment_success', 'payment_failure', 'order_shipped', 'order_delivered', 'password_reset', 'email_verification'
  template_key TEXT NOT NULL REFERENCES email_templates(template_key),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB, -- Template variables used
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'cancelled'
  priority INTEGER DEFAULT 5, -- 1 (highest) to 10 (lowest)
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  metadata JSONB, -- Additional context (order_id, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_notification_status CHECK (status IN ('pending', 'sent', 'failed', 'cancelled'))
);

-- Notification history table (for audit trail)
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID NOT NULL REFERENCES notification_queue(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_scheduled ON notification_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_notification_queue_user ON notification_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_type ON notification_queue(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_history_notification ON notification_history(notification_id);

-- Row Level Security
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Email templates are viewable by authenticated users" 
  ON email_templates FOR SELECT 
  USING (auth.role() = 'authenticated');

ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications" 
  ON notification_queue FOR SELECT 
  USING (auth.uid() = user_id);

ALTER TABLE notification_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their notification history" 
  ON notification_history FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM notification_queue 
      WHERE notification_queue.id = notification_history.notification_id 
      AND notification_queue.user_id = auth.uid()
    )
  );

-- Function to queue notification
CREATE OR REPLACE FUNCTION queue_notification(
  p_user_id UUID,
  p_recipient_email TEXT,
  p_recipient_name TEXT,
  p_notification_type TEXT,
  p_template_key TEXT,
  p_variables JSONB DEFAULT '{}'::JSONB,
  p_priority INTEGER DEFAULT 5,
  p_scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  p_metadata JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
  v_template email_templates%ROWTYPE;
  v_notification_id UUID;
  v_subject TEXT;
  v_body_html TEXT;
  v_body_text TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  -- Get template
  SELECT * INTO v_template 
  FROM email_templates 
  WHERE template_key = p_template_key AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Email template not found: %', p_template_key;
  END IF;
  
  -- Replace variables in subject and body
  v_subject := v_template.subject;
  v_body_html := v_template.body_html;
  v_body_text := v_template.body_text;
  
  -- Simple variable replacement ({{variable_name}})
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_subject := REPLACE(v_subject, '{{' || v_key || '}}', v_value);
    v_body_html := REPLACE(v_body_html, '{{' || v_key || '}}', v_value);
    IF v_body_text IS NOT NULL THEN
      v_body_text := REPLACE(v_body_text, '{{' || v_key || '}}', v_value);
    END IF;
  END LOOP;
  
  -- Insert notification
  INSERT INTO notification_queue (
    user_id,
    recipient_email,
    recipient_name,
    notification_type,
    template_key,
    subject,
    body_html,
    body_text,
    variables,
    priority,
    scheduled_for,
    metadata
  ) VALUES (
    p_user_id,
    p_recipient_email,
    p_recipient_name,
    p_notification_type,
    p_template_key,
    v_subject,
    v_body_html,
    v_body_text,
    p_variables,
    p_priority,
    p_scheduled_for,
    p_metadata
  ) RETURNING id INTO v_notification_id;
  
  -- Add to history
  INSERT INTO notification_history (notification_id, status)
  VALUES (v_notification_id, 'pending');
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as sent
CREATE OR REPLACE FUNCTION mark_notification_sent(
  p_notification_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE notification_queue 
  SET 
    status = 'sent',
    sent_at = NOW(),
    updated_at = NOW()
  WHERE id = p_notification_id;
  
  INSERT INTO notification_history (notification_id, status)
  VALUES (p_notification_id, 'sent');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as failed
CREATE OR REPLACE FUNCTION mark_notification_failed(
  p_notification_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
DECLARE
  v_notification notification_queue%ROWTYPE;
BEGIN
  SELECT * INTO v_notification FROM notification_queue WHERE id = p_notification_id;
  
  -- Increment retry count
  UPDATE notification_queue 
  SET 
    retry_count = retry_count + 1,
    error_message = p_error_message,
    updated_at = NOW(),
    status = CASE 
      WHEN retry_count + 1 >= max_retries THEN 'failed'
      ELSE 'pending'
    END,
    failed_at = CASE 
      WHEN retry_count + 1 >= max_retries THEN NOW()
      ELSE failed_at
    END,
    scheduled_for = CASE 
      WHEN retry_count + 1 < max_retries THEN NOW() + INTERVAL '5 minutes' * (retry_count + 1)
      ELSE scheduled_for
    END
  WHERE id = p_notification_id;
  
  INSERT INTO notification_history (notification_id, status, error_message)
  VALUES (p_notification_id, 'failed', p_error_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get pending notifications
CREATE OR REPLACE FUNCTION get_pending_notifications(
  p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
  id UUID,
  recipient_email TEXT,
  recipient_name TEXT,
  notification_type TEXT,
  subject TEXT,
  body_html TEXT,
  body_text TEXT,
  priority INTEGER,
  retry_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    nq.id,
    nq.recipient_email,
    nq.recipient_name,
    nq.notification_type,
    nq.subject,
    nq.body_html,
    nq.body_text,
    nq.priority,
    nq.retry_count
  FROM notification_queue nq
  WHERE nq.status = 'pending'
    AND nq.scheduled_for <= NOW()
  ORDER BY nq.priority ASC, nq.scheduled_for ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
