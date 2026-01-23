const prisma = require('../prisma');
const { ResourceStatus, EventType } = require('@prisma/client');
const { createEvent, addEventResource } = require('../event-helper');
const hiveService = require('../../services/hive.service');
const meshService = require('../../services/mesh.service');
const { sendWorkerMessage } = require('../web-sockets');

const process = async (event) => {
  let worker;

  const updateWorkerStatus = async (status) => {
    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        status,
        updatedBy: event.createdBy,
      },
    });

    sendWorkerMessage(worker, 'UPDATED', { status });
  };

  try {
    const resourceWorker = event.resources.find(
      (r) => r.resourceType === 'Worker',
    );
    if (!resourceWorker) {
      throw new Error(`No worker resource found for event ID: ${event.id}`);
    }

    worker = await prisma.worker.findUnique({
      where: {
        id: resourceWorker.resourceId,
        status: { not: ResourceStatus.DELETED },
      },
      include: {
        node: true,
      },
    });

    if (!worker) {
      throw new Error(`Worker not found for event ID: ${event.id}`);
    }

    console.log('Worker information:', worker);

    if (worker.status !== ResourceStatus.INACTIVE) {
      throw new Error(
        `Worker is not in INACTIVE state for event ID: ${event.id}`,
      );
    }

    if (!worker.node) {
      throw new Error(`Worker node not found for event ID: ${event.id}`);
    }

    if (worker.node.status !== ResourceStatus.ACTIVE) {
      throw new Error(
        `Worker node is not in ACTIVE state for event ID: ${event.id}`,
      );
    }

    await updateWorkerStatus(ResourceStatus.PROVISIONING);

    await hiveService.startWorker(worker.id);

    // Wait for VM to start and stabilize
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const vnet = await hiveService.getWorkerVnet(worker.id, worker.node.zoneId);
    if (!vnet) {
      throw new Error(`VNet not found for worker ID: ${worker.id}`);
    }

    await meshService.linkVnetToBridge(vnet, worker.node.zoneId);

    // Additional wait for network configuration to settle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Verify connectivity (optional but recommended for debugging)
    console.log(
      `Worker ${worker.id} should be accessible at ${worker.node.ipAddress}`,
    );

    // Diagnose connectivity if verification fails
    const isConnected = await meshService.verifyWorkerConnectivity(
      worker.node.ipAddress,
      10,
    );
    if (!isConnected) {
      console.warn(
        `Worker ${worker.id} is not immediately reachable. Running comprehensive diagnostics...`,
      );

      // Bridge/network diagnostics
      const bridgeDiagnostics = await meshService.diagnoseBridgeConnectivity(
        worker.node.zoneId,
        worker.node.ipAddress,
      );
      console.log(
        'Bridge connectivity diagnostics:',
        JSON.stringify(bridgeDiagnostics, null, 2),
      );

      // Worker VM diagnostics
      const workerDiagnostics = await hiveService.diagnoseWorkerNetwork(
        worker.id,
        worker.node.ipAddress,
        worker.node.zoneId,
      );
      console.log(
        'Worker VM diagnostics:',
        JSON.stringify(workerDiagnostics, null, 2),
      );

      // Cloud-init status check
      const cloudInitStatus = await hiveService.checkCloudInitStatus(worker.id);
      console.log(
        'Cloud-init status:',
        JSON.stringify(cloudInitStatus, null, 2),
      );

      // Try to test login
      const canLogin = await hiveService.testWorkerLogin(worker.id);
      console.log(
        `Login test result: ${canLogin ? '✅ Success' : '❌ Failed'}`,
      );

      // Specific recommendations based on diagnostics
      if (!workerDiagnostics.vmRunning) {
        console.error(`❌ Worker VM ${worker.id} is not running!`);
      } else if (!workerDiagnostics.vmHasInterface) {
        console.error(
          `❌ Worker VM ${worker.id} has no network interface attached to bridge ${worker.node.zoneId}`,
        );
      } else if (!workerDiagnostics.vnetConnectedToBridge) {
        console.error(
          `❌ Worker VM ${worker.id} vnet is not connected to bridge ${worker.node.zoneId}`,
        );
        console.log(`🔧 Attempting to fix vnet-bridge connection...`);

        const vnet = await hiveService.getWorkerVnet(
          worker.id,
          worker.node.zoneId,
        );
        if (vnet) {
          const fixed = await meshService.fixVnetBridgeConnection(
            vnet,
            worker.node.zoneId,
          );
          if (fixed) {
            console.log(
              `✅ Fixed vnet-bridge connection. Testing connectivity again...`,
            );

            // Wait a moment for network to stabilize
            await new Promise((resolve) => setTimeout(resolve, 3000));

            // Test connectivity again
            const retestConnectivity =
              await meshService.verifyWorkerConnectivity(
                worker.node.ipAddress,
                10,
              );
            if (retestConnectivity) {
              console.log(
                `🎉 Worker ${worker.id} is now reachable at ${worker.node.ipAddress}!`,
              );
            } else {
              console.warn(
                `⚠️ Fixed bridge connection but worker still not reachable. May need more time or cloud-init restart.`,
              );
            }
          }
        }
      } else if (!workerDiagnostics.cloudInitComplete) {
        console.error(
          `❌ Cloud-init has not completed on worker ${worker.id} - this is likely the main issue!`,
        );
        console.log(
          `💡 Recommendation: Check cloud-init logs via console: sudo virsh console ${worker.id}`,
        );
      } else if (!canLogin) {
        console.error(
          `❌ Cannot login to worker ${worker.id} - cloud-init user configuration failed`,
        );
        console.log(
          `💡 Recommendation: Check cloud-init user-data configuration`,
        );
      } else if (
        canLogin &&
        workerDiagnostics.vmRunning &&
        workerDiagnostics.vnetConnectedToBridge
      ) {
        // All infrastructure is working, but worker might have wrong IP due to DHCP timing
        console.warn(
          `⚠️ Worker infrastructure is working but not reachable at expected IP ${worker.node.ipAddress}`,
        );
        console.log(
          `🔧 This might be a DHCP reservation timing issue. Attempting to fix...`,
        );

        // Force DHCP lease renewal
        const dhcpFixed = await meshService.forceRenewDhcpLease(
          worker.node.zoneId,
          worker.macAddress,
        );
        if (dhcpFixed) {
          console.log(
            `✅ DHCP lease renewal initiated. Restarting worker to get correct IP...`,
          );

          // Restart the worker to get new IP
          await hiveService.forceStopWorker(worker.id);
          await new Promise((resolve) => setTimeout(resolve, 3000));
          await hiveService.startWorker(worker.id);
          await new Promise((resolve) => setTimeout(resolve, 8000));

          // Test again
          const finalTest = await meshService.verifyWorkerConnectivity(
            worker.node.ipAddress,
            15,
          );
          if (finalTest) {
            console.log(
              `🎉 Worker ${worker.id} is now reachable at correct IP ${worker.node.ipAddress}!`,
            );
          } else {
            console.warn(
              `⚠️ Worker may need manual intervention. Try: sudo virsh console ${worker.id}`,
            );
          }
        }
      } else if (!workerDiagnostics.dhcpRequestVisible) {
        console.warn(
          `⚠️ No DHCP requests visible from worker ${worker.id} - VM may not be booting properly`,
        );
      } else if (!bridgeDiagnostics.arpEntry) {
        console.warn(
          `⚠️ Worker ${worker.id} is not responding to network requests - check VM status`,
        );
      }

      // Don't fail the event, but log the issue for investigation
      console.warn(
        `Worker ${worker.id} may have connectivity issues. Check logs and run manual diagnostics.`,
      );
    } else {
      console.log(
        `✅ Worker ${worker.id} is reachable at ${worker.node.ipAddress}`,
      );
    }

    await updateWorkerStatus(ResourceStatus.ACTIVE);

    sendWorkerMessage(worker.id, 'WORKER_STARTED');

    const eventUpdated = await createEvent(
      EventType.WORKER_STARTED,
      event.createdBy,
      event.companyId,
    );

    await addEventResource(eventUpdated.id, 'Event', event.id);
    await addEventResource(eventUpdated.id, 'Worker', worker.id);
  } catch (error) {
    console.error(`Error processing event ID ${event.id}:`, error);

    if (worker) {
      await updateWorkerStatus(
        event.retries >= 4 ? ResourceStatus.FAILED : ResourceStatus.QUEUED,
      );
    }

    throw error;
  }
};

module.exports = process;
