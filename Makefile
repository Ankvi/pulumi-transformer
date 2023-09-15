clean:
	rm -rf tmp
	rm -rf output/src/*

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

output/build: clean azure-native/pull node_modules
	pnpm --filter=cli build

output/install:
	cd output && \
		pnpm install --ignore-scripts

output/lint: output/install
	pnpm --filter=output lint

output/transpile: output/install
	pnpm --filter=output build

output/publish: output/transpile
	pnpm --filter=cli publish

output/publish/dryrun: output/transpile
	pnpm --filter=cli publish --dry-run
