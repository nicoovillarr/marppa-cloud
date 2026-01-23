const { EventType } = require('@prisma/client');
const hiveService = require('../../services/hive.service');
const meshService = require('../../services/mesh.service');
const orbitService = require('../../services/orbit.service');
const { createEvent } = require('../event-helper');

const process = async (event) => {
  try {
    await hiveService.forceResetHive();
    await meshService.forceResetMesh();
    await orbitService.forceResetOrbit();

    await createEvent(
      EventType.SYSTEM_RESET_SUCCESS,
      event.createdBy,
      event.companyId,
    );

    console.log('System reset process completed successfully.');
  } catch (error) {
    await createEvent(
      EventType.SYSTEM_RESET_FAILED,
      event.createdBy,
      event.companyId,
    );

    console.error('System reset failed:', error);
    process.exit(1);
  }
};

module.exports = process;
