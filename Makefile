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
	bun src/index.ts build

