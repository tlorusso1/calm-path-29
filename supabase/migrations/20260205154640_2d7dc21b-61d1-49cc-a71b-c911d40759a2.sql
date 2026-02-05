-- Add column for full modes backup in weekly snapshots
ALTER TABLE weekly_snapshots 
ADD COLUMN modes_full_backup jsonb;