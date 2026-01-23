const { spawn } = require('child_process');

function runCommand(cmd, args = [], print = false) {
  if (print) {
    console.log(`Running command: ${cmd} ${args.join(' ')}`);
  }

  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', reject);

    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(
          new Error(
            `Command "${cmd} ${args.join(
              ' ',
            )}" failed with code ${code}\n${stderr}`,
          ),
        );
      }
    });
  });
}

module.exports = runCommand;
