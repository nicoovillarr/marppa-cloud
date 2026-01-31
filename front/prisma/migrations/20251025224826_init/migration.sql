-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SYSTEM_RESET', 'SYSTEM_RESET_FAILED', 'SYSTEM_RESET_SUCCESS', 'WORKER_CREATE', 'WORKER_CREATE_FAILED', 'WORKER_CREATED', 'WORKER_UPDATE', 'WORKER_UPDATED', 'WORKER_START', 'WORKER_STARTED', 'WORKER_TERMINATE', 'WORKER_TERMINATED', 'WORKER_DELETE', 'WORKER_DELETED', 'WORKER_IMAGE_CREATE', 'WORKER_IMAGE_CREATE_FAILED', 'WORKER_IMAGE_CREATED', 'ZONE_CREATE', 'ZONE_CREATED', 'ZONE_DELETE', 'ZONE_DELETED', 'NODE_ASSIGN_WORKER', 'NODE_ASSIGNED_WORKER', 'NODE_UNASSIGN_WORKER', 'NODE_UNASSIGNED_WORKER', 'NODE_CREATE_FIBER', 'NODE_CREATE_FIBER_FAILED', 'NODE_FIBER_CREATED', 'NODE_UPDATE_FIBER', 'NODE_UPDATE_FIBER_FAILED', 'NODE_FIBER_UPDATED', 'NODE_DELETE_FIBER', 'NODE_DELETE_FIBER_FAILED', 'NODE_FIBER_DELETED', 'PORTAL_CREATE', 'PORTAL_CREATE_FAILED', 'PORTAL_CREATED', 'PORTAL_UPDATE', 'PORTAL_UPDATE_FAILED', 'PORTAL_UPDATED', 'PORTAL_SYNC', 'PORTAL_SYNC_FAILED', 'PORTAL_SYNCED', 'PORTAL_DELETE', 'PORTAL_DELETE_FAILED', 'PORTAL_DELETED', 'TRANSPONDER_CREATE', 'TRANSPONDER_CREATE_FAILED', 'TRANSPONDER_CREATED', 'TRANSPONDER_UPDATE', 'TRANSPONDER_UPDATE_FAILED', 'TRANSPONDER_UPDATED', 'TRANSPONDER_DELETE', 'TRANSPONDER_DELETE_FAILED', 'TRANSPONDER_DELETED');

-- CreateEnum
CREATE TYPE "ResourceStatus" AS ENUM ('INACTIVE', 'QUEUED', 'PROVISIONING', 'UPDATING', 'ACTIVE', 'FAILED', 'TERMINATING', 'TERMINATED', 'DELETING', 'DELETED');

-- CreateEnum
CREATE TYPE "PortalType" AS ENUM ('CLOUDFLARE', 'DYNU');

-- CreateEnum
CREATE TYPE "TransponderMode" AS ENUM ('PROXY');

-- CreateTable
CREATE TABLE "Worker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "macAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "imageId" INTEGER NOT NULL,
    "instanceTypeKey" INTEGER NOT NULL,

    CONSTRAINT "Worker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerImage" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "osType" TEXT NOT NULL,
    "osVersion" TEXT,
    "osFamily" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "virtualizationType" TEXT NOT NULL,
    "workerStorageTypeId" TEXT,

    CONSTRAINT "WorkerImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerMMIFamily" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "WorkerMMIFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerMMI" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "cpuCores" DOUBLE PRECISION NOT NULL,
    "ramMB" INTEGER NOT NULL,
    "diskGB" INTEGER NOT NULL,
    "familyId" TEXT NOT NULL,

    CONSTRAINT "WorkerMMI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerStorageType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "persistent" BOOLEAN NOT NULL,
    "attachable" BOOLEAN NOT NULL,
    "shared" BOOLEAN NOT NULL,

    CONSTRAINT "WorkerStorageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkerDisk" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sizeGiB" INTEGER NOT NULL,
    "hostPath" TEXT NOT NULL,
    "mountPoint" TEXT,
    "isBoot" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT NOT NULL,
    "storageTypeId" TEXT NOT NULL,
    "workerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "WorkerDisk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'INACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Atom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "cidr" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "workerId" TEXT,
    "atomId" TEXT,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fiber" (
    "id" SERIAL NOT NULL,
    "protocol" TEXT NOT NULL,
    "hostPort" INTEGER,
    "targetPort" INTEGER NOT NULL,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "nodeId" TEXT NOT NULL,

    CONSTRAINT "Fiber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portal" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "address" TEXT NOT NULL,
    "type" "PortalType" NOT NULL,
    "apiKey" TEXT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastPublicIP" TEXT,
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "listenHttp" BOOLEAN NOT NULL DEFAULT true,
    "listenHttps" BOOLEAN NOT NULL DEFAULT false,
    "sslCertificate" TEXT,
    "sslKey" TEXT,
    "enableCompression" BOOLEAN NOT NULL DEFAULT true,
    "cacheEnabled" BOOLEAN NOT NULL DEFAULT true,
    "corsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "defaultServer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "zoneId" TEXT,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Portal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transponder" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "mode" "TransponderMode" NOT NULL DEFAULT 'PROXY',
    "status" "ResourceStatus" NOT NULL DEFAULT 'QUEUED',
    "cacheEnabled" BOOLEAN NOT NULL DEFAULT false,
    "addHeaders" JSONB,
    "proxyHeaders" JSONB,
    "proxyReadTimeout" INTEGER NOT NULL DEFAULT 60,
    "removeHeaders" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allowCookies" BOOLEAN NOT NULL DEFAULT true,
    "gzipEnabled" BOOLEAN NOT NULL DEFAULT false,
    "customIPAddress" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL,
    "portalId" TEXT NOT NULL,
    "nodeId" TEXT,

    CONSTRAINT "Transponder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "alias" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "parentCompanyId" TEXT,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "companyId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "browser" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("token")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "notes" TEXT,
    "data" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "companyId" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventResource" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,

    CONSTRAINT "EventResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventProperty" (
    "id" SERIAL NOT NULL,
    "eventId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "EventProperty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Worker_macAddress_key" ON "Worker"("macAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Node_ipAddress_key" ON "Node"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Node_workerId_key" ON "Node"("workerId");

-- CreateIndex
CREATE UNIQUE INDEX "Node_atomId_key" ON "Node"("atomId");

-- CreateIndex
CREATE UNIQUE INDEX "Fiber_protocol_hostPort_key" ON "Fiber"("protocol", "hostPort");

-- CreateIndex
CREATE UNIQUE INDEX "Portal_address_key" ON "Portal"("address");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EventProperty_eventId_key_key" ON "EventProperty"("eventId", "key");

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "WorkerImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Worker" ADD CONSTRAINT "Worker_instanceTypeKey_fkey" FOREIGN KEY ("instanceTypeKey") REFERENCES "WorkerMMI"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerImage" ADD CONSTRAINT "WorkerImage_workerStorageTypeId_fkey" FOREIGN KEY ("workerStorageTypeId") REFERENCES "WorkerStorageType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerMMI" ADD CONSTRAINT "WorkerMMI_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "WorkerMMIFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDisk" ADD CONSTRAINT "WorkerDisk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDisk" ADD CONSTRAINT "WorkerDisk_storageTypeId_fkey" FOREIGN KEY ("storageTypeId") REFERENCES "WorkerStorageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkerDisk" ADD CONSTRAINT "WorkerDisk_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Atom" ADD CONSTRAINT "Atom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "Worker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_atomId_fkey" FOREIGN KEY ("atomId") REFERENCES "Atom"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fiber" ADD CONSTRAINT "Fiber_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portal" ADD CONSTRAINT "Portal_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Portal" ADD CONSTRAINT "Portal_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transponder" ADD CONSTRAINT "Transponder_portalId_fkey" FOREIGN KEY ("portalId") REFERENCES "Portal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transponder" ADD CONSTRAINT "Transponder_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventResource" ADD CONSTRAINT "EventResource_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventProperty" ADD CONSTRAINT "EventProperty_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
