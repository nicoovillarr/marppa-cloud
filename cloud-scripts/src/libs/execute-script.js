const { execFile } = require('child_process');
const { promisify } = require('util');
const exec = promisify(execFile);
const path = require('path');
const fs = require('fs');

/**
 * Executes a shell script with the provided parameters.
 * @param {string} script The path to the script to execute.
 * @param {Array<string>} parameters The parameters to pass to the script.
 * @returns A promise that resolves with the script's output.
 */
const executeScript = (script, parameters) => {
  if (!script || typeof script !== 'string') {
    throw new Error('Script path must be a valid string');
  }

  const filePath = path.join(__dirname, 'scripts', script);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Script file not found: ${filePath}`);
  }

  console.log(
    `Executing script: ${script} with parameters: ${parameters.join(' ')}`,
  );

  return new Promise((resolve) => {
    exec(filePath, { args: parameters })
      .then(({ stdout, stderr }) => {
        if (stderr) {
          console.error(`Error executing script: ${stderr}`);
          resolve();
        } else {
          console.log(`Script executed successfully: ${stdout}`);
          resolve(stdout.trim());
        }
      })
      .catch((error) => {
        console.error(`Execution failed: ${error.message}`);
        resolve();
      });
  });
};

module.exports = executeScript;
