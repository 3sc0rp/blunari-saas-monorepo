-- Add pending status to bookings table
-- This fixes the issue where widget bookings can only be 'confirmed' instead of 'pending'

-- First, check if we need to add the pending status
DO $$ 
BEGIN
    -- Try to create the booking_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');
        
        -- Alter the bookings table to use the enum
        ALTER TABLE public.bookings 
        ALTER COLUMN status TYPE booking_status 
        USING status::booking_status;
        
        -- Update the default to be pending
        ALTER TABLE public.bookings 
        ALTER COLUMN status SET DEFAULT 'pending';
        
        RAISE NOTICE 'Created booking_status enum and updated bookings table';
    ELSE
        -- Check if pending is already in the enum
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'booking_status')
            AND enumlabel = 'pending'
        ) THEN
            -- Add pending to existing enum
            ALTER TYPE booking_status ADD VALUE 'pending' BEFORE 'confirmed';
            RAISE NOTICE 'Added pending to existing booking_status enum';
        ELSE
            RAISE NOTICE 'booking_status enum already supports pending';
        END IF;
    END IF;
    
    -- If table is still using text constraint, update it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'bookings' 
        AND tc.constraint_type = 'CHECK' 
        AND tc.constraint_name = 'bookings_status_check'
    ) THEN
        -- Drop the old text constraint
        ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
        
        -- Change column to use enum if not already
        ALTER TABLE public.bookings 
        ALTER COLUMN status TYPE booking_status 
        USING status::booking_status;
        
        -- Set default to pending
        ALTER TABLE public.bookings 
        ALTER COLUMN status SET DEFAULT 'pending';
        
        RAISE NOTICE 'Updated bookings table to use booking_status enum';
    END IF;
END $$;
