-- Soft delete: add deleted_at timestamp to instances
-- Deleted instances are excluded from all normal queries via a view/filter.
-- The status column already has 'cancelled'; deleted_at adds a true soft-delete layer
-- so data (activity log, subscriptions) is preserved and recoverable.

ALTER TABLE instances ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Instances are considered deleted when deleted_at IS NOT NULL.
-- Application queries must filter: .is('deleted_at', null)

-- Update RLS: staff cannot see deleted instances via normal queries
-- (they must explicitly include deleted ones if needed for recovery)
DROP POLICY IF EXISTS "Staff can view instances" ON instances;
CREATE POLICY "Staff can view instances"
  ON instances FOR SELECT
  TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['super_admin','admin','support']) AND deleted_at IS NULL);

-- Super admin can view all instances including deleted (for recovery)
CREATE POLICY "Super admin can view deleted instances"
  ON instances FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'));

-- Soft delete function: sets deleted_at instead of physically deleting
CREATE OR REPLACE FUNCTION soft_delete_instance(instance_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE instances
  SET deleted_at = now(), status = 'cancelled'
  WHERE id = instance_id AND deleted_at IS NULL;
END;
$$;
