VERSION=$(shell jq .version -r package.json)

.PHONY: build
build:
	./build

.PHONY: docker
docker:
	docker build -t zmstone/hocon-schema-viewer:$(VERSION) .
