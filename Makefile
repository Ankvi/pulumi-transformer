clean:
	rm -rf tmp
	rm -rf output

azure-native:
	git clone https://github.com/pulumi/pulumi-azure-native.git azure-native

node_modules:
	npm install

build: clean azure-native node_modules
	npm run build

types: azure-native node_modules
	npm run create-types
