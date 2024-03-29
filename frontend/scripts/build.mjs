#!/usr/bin/env zx
import shell from "shelljs";
import { runTask } from "zx-run-task";

const { find, cp, mkdir } = shell;

function copyStatic() {
	mkdir('-p', 'dist');
	cp('static/*', 'dist');
	return Promise.resolve();
}

async function buildVueTemplates() {
	const templates = find('.')
		.filter(file => !file.includes('node_modules/'))
		.filter(file => !file.includes('static/'))
		.filter(file => !file.includes('dist/'))
		.filter(file => file.match(/\.html$/));

	function outfile(fileName) {
		return fileName.replace(/\.html$/, '.js');
	}

	async function buildTemplates(infile, outfile) {
		await runTask(`Building vue.js template ${ infile }`, $`
			npx --no-install vue-compiler-dom-cli \
				--infile ${ infile } \
				--outfile ${ outfile } \
				--mode module
		`);
	}

	for (const template of templates) {
		await buildTemplates(template, outfile(template));
	}
}

async function bundleFrontend() {
	await runTask("Bundle frontend", $`
		npx --no-install esbuild --bundle index.ts \
			--define:__VUE_OPTIONS_API__=false \
			--define:__VUE_PROD_DEVTOOLS__=false \
			--target=chrome80 \
			--outfile=dist/bundle.js \
			--minify \
			--tree-shaking=true \
			--sourcemap
	`);
}

async function checkFrontendTypings() {
	await runTask("Checking frontend typings", $`npx tsc`);
}

async function lintTypescriptFiles() {
	await runTask('Linting code', $`
		npx --no-install eslint \
			--max-warnings 0 \
			--parser @typescript-eslint/parser \
			--plugin @typescript-eslint/tslint \
			--config eslintrc.yml \
			--ext .ts .
	`);
}

await Promise.all([
	copyStatic(),
	buildVueTemplates()
		.then(() => Promise.all([
			bundleFrontend(),
			//lintTypescriptFiles(),
			checkFrontendTypings()
		]))
]);
