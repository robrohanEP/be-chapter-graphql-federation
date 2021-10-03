
# linux/arm64
OS=linux
ARCH=arm64
EXTRA=/v8
PLATFORM=$(OS)/$(ARCH) #$(EXTRA)

build:
	GOOS=$(OS) GOARCH=$(ARCH) go build -o bramble ./cmd/bramble
#	./bramble -conf config.json
	docker build --platform $(PLATFORM) -t bramble:latest .

run:
	docker run -it -p 8082:8082 -p 8083:8083 -p 8084:8084 \
		--name bramble bramble:latest

