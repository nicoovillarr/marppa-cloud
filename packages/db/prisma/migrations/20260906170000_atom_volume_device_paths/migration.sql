-- hostPath used to be the directory the worker mounted the volume on. The worker no longer
-- mounts anything -- Docker does, straight off the block device -- so the column now holds
-- the logical volume's device path. The volume group is the default one; a host running
-- with ATOM_VOLUME_GROUP set to something else needs this rewritten to match.
UPDATE "AtomVolume"
SET "hostPath" = '/dev/vg_data/atomvol-' || "id"
WHERE "hostPath" LIKE '/var/lib/marppa/atom-volumes/%';
