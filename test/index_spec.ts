/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />

import fs = require("fs");

import dtsm = require("../lib/index");

describe("dtsm", ()=> {
    describe(".init", () => {

        var dtsmFilePath = "./test-tmp/dtsm.json";

        beforeEach(()=> {
            if (fs.existsSync(dtsmFilePath)) {
                fs.unlinkSync(dtsmFilePath);
            }
        });

        it("can create new dtsm.json", ()=> {
            dtsm.init(dtsmFilePath);
            assert(fs.existsSync(dtsmFilePath));
        });
    });

    describe(".search", ()=> {
        it("can find single file", ()=> {
            return dtsm.search("gae.channel").then(fileList => {
                assert(fileList.length === 1);
            });
        });

        it("can find multiple files", ()=> {
            return dtsm.search("angular").then(fileList => {
                assert(1 < fileList.length);
            });
        });
    });

    describe.skip(".install", ()=> {
        it("can install single file", ()=> {
            return dtsm.install({save: false}, "atom").then(fileList => {
                assert(fileList.length === 1);
            });
        });

        it("can't install files if it found more than 1 file", ()=> {
            return dtsm.install({save: false}, "angular").then(()=> {
                throw new Error("unexpected");
            }, ()=> {
                // TODO
                return "OK";
            });
        });
    });

    describe.skip(".uninstall", ()=> {
        it("can uninstall single file", ()=> {
            return dtsm.uninstall({save: false},"atom").then(fileList => {
                assert(fileList.length === 1);
            });
        });

        it("can uninstall single file by ambiguous matching", ()=> {
            return dtsm.uninstall({save: false},"angular").then(fileList => {
                assert(fileList.length === 1);
            });
        });
    });

    describe.skip(".outdated", ()=> {
        it("can detect outdated files", ()=> {
            return dtsm.outdated().then(fileList => {
                assert(fileList);
            });
        });
    });

    describe.skip(".fetch", ()=> {
        it("can fetch from remote repos", ()=> {
            return dtsm.fetch();
        });
    });
});
