
OS=linux
# This Arch is set for Docker on an M1 Mac
ARCH=arm64 #x86_64 amd64 .. wasm ;)
PLATFORM=$(OS)/$(ARCH)

build:
	GOOS=$(OS) GOARCH=$(ARCH) go build -o bramble ./cmd/bramble
#	Will be running: ./bramble -conf config.json
	docker build --platform $(PLATFORM) -t bramble:latest .

run:
	docker run -it -p 8082:8082 -p 8083:8083 -p 8084:8084 \
		--name bramble bramble:latest

