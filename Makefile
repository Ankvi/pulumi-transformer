azure-native:
	git clone --no-checkout --filter=blob:none --sparse --depth 1 https://github.com/pulumi/pulumi-azure-native azure-native
	cd azure-native && \
		git sparse-checkout set sdk/nodejs && \
		git checkout master

node_modules:
	pnpm install

azure-native/pull: azure-native
	cd azure-native && git pull

list-module-names: azure-native/pull  node_modules
	pnpm --filter=cli list-module-names

output: azure-native/pull node_modules
	pnpm --filter=cli create-output

output/install:
	cd output && \
		pnpm install --ignore-scripts

output/lint: output/install
	pnpm --filter=output lint

output/transpile: output/install
	pnpm --filter=output build

publish: output/transpile
	pnpm --filter=cli run publish

publish/dryrun: output/transpile
	pnpm --filter=cli run publish:dryrun
