-- Update existing row(s)
UPDATE public.email_settings
SET
  business_name = REPLACE(business_name, 'Lirah', 'Lyrata'),
  contact_email = REPLACE(contact_email, 'lirah', 'lyrata'),
  website = CASE WHEN website IS NOT NULL THEN REPLACE(website, 'lirah', 'lyrata') ELSE website END,
  instagram_url = CASE WHEN instagram_url IS NOT NULL THEN REPLACE(instagram_url, 'lirah', 'lyrata') ELSE instagram_url END,
  linkedin_url = CASE WHEN linkedin_url IS NOT NULL THEN REPLACE(linkedin_url, 'lirah', 'lyrata') ELSE linkedin_url END,
  facebook_url = CASE WHEN facebook_url IS NOT NULL THEN REPLACE(facebook_url, 'lirah', 'lyrata') ELSE facebook_url END,
  twitter_url = CASE WHEN twitter_url IS NOT NULL THEN REPLACE(twitter_url, 'lirah', 'lyrata') ELSE twitter_url END;

-- Update column defaults for future rows
ALTER TABLE public.email_settings
  ALTER COLUMN business_name SET DEFAULT 'Lyrata',
  ALTER COLUMN contact_email SET DEFAULT 'suporte@lyrata.pt',
  ALTER COLUMN website SET DEFAULT 'https://lyrata.pt';