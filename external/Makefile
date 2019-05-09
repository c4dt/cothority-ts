.PHONY: all
all:

js/cothority/node_modules/protobufjs:
	cd js/cothority && npm ci

js/cothority/src/protobuf/proto.js: private PATH := $(PATH):js/cothority/node_modules/protobufjs/bin
js/cothority/src/protobuf/proto.js: proto/*.proto | js/cothority/node_modules/protobufjs
	pbjs -t static-module -o $@ $^
js/cothority/src/protobuf/proto.d.ts: private PATH := $(PATH):js/cothority/node_modules/protobufjs/bin
js/cothority/src/protobuf/proto.d.ts: js/cothority/src/protobuf/proto.js | js/cothority/node_modules/protobufjs
	pbts -o $@ $<
all: $(addprefix js/cothority/src/protobuf/proto.,js d.ts)

js/cothority/src/protobuf/models.json: js/cothority/node_modules/protobufjs
	cd js/cothority && npm run protobuf
all: js/cothority/src/protobuf/models.json
