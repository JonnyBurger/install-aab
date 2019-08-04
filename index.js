#! /usr/bin/env node
const fs = require('fs');
const execa = require('execa');
const path = require('path');
const tempDir = require('temp-dir');

const jarPath = path.resolve(__dirname, 'bundletool-all-0.10.2.jar');

if (!process.argv[2]) {
	console.log('Pass a path to an .aab file. For example:');
	console.log('npx install-aab myapp.aab');
	process.exit(1);
}
const filePath = path.resolve(process.cwd(), process.argv[2]);
if (!fs.existsSync(filePath)) {
	console.log(`No file exists at ${filePath}`);
	process.exit(1);
}

const dir = path.join(tempDir, `install-aab-${Math.random()}`);
fs.mkdirSync(dir);

const apksOutput = `${dir}/app.apks`;
const unzipOutput = `${dir}/extracted`;
fs.mkdirSync(unzipOutput);

function cleanUp() {
	console.log('Cleaning up...');
	execa.sync('rm', ['-rf', dir]);
	console.log('Done.');
}

console.log('Extracting APK...');
execa('java', [
	'-jar',
	jarPath,
	'build-apks',
	`--bundle=${filePath}`,
	`--output=${apksOutput}`
])
	.catch(err => {
		console.log(`Could not run bundletool: ${err.message}`);
		cleanUp();
		process.exit(1);
	})
	.then(() => {
		console.log('Unzipping...');
		return execa('unzip', [apksOutput, '-d', unzipOutput]);
	})
	.catch(err => {
		console.log('Could not unzip output dir', err.message);
		cleanUp();
		process.exit(1);
	})
	.then(() => {
		console.log(`Unzipped.`);
		const apkPath = `${unzipOutput}/splits/base-master.apk`;
		console.log(`APK path: ${apkPath}`);
		console.log('Installing...');
		const installationProcess = execa('adb', ['install', apkPath]);
		installationProcess.stdout.pipe(process.stdout);
		installationProcess.stderr.pipe(process.stderr);
		return installationProcess;
	})
	.catch(err => {
		console.log(`Could not install: ${err.message}`);
		cleanUp();
		process.exit(1);
	})
	.then(() => {
		console.log('Installed!');
		cleanUp();
		process.exit(0);
	});
