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

build: clean azure-native/pull node_modules
	pnpm --filter=cli build
	cd output && pnpm install --ignore-scripts

types: azure-native/pull node_modules
	pnpm --filter=cli create-types

transpile:
	pnpm --filter=output build
