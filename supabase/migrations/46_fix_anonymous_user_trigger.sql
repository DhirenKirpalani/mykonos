-- Fix handle_new_user trigger to skip anonymous users
-- Anonymous users don't have profile data (email, first_name, last_name)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Skip profile creation for anonymous users (they don't have email)
  IF NEW.email IS NULL OR NEW.is_anonymous = true THEN
    RETURN NEW;
  END IF;

  -- Create profile for registered users only
  INSERT INTO public.users (id, first_name, last_name, email, phone, country, preferred_language, email_verified, email_verified_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'country', 'US'),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
    NEW.email_confirmed_at
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user IS 'Creates user profile for registered users only, skips anonymous users';
