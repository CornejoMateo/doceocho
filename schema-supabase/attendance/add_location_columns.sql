-- Add location columns to attendance_settings
ALTER TABLE public.attendance_settings 
ADD COLUMN target_latitude numeric NULL,
ADD COLUMN target_longitude numeric NULL;

-- Update coordinates
UPDATE public.attendance_settings 
SET target_latitude = -33.13014693131956,
    target_longitude = -64.34463907854392
WHERE id = 1;
