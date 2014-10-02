/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../typings/es6-promise/es6-promise.d.ts" />

/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />

import fs = require("fs");
import rimraf = require("rimraf");

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

    describe(".install", ()=> {

        var dtsmFilePath = "./test-tmp/install/dtsm.json";

        beforeEach(()=> {
            if (fs.existsSync(dtsmFilePath)) {
                fs.unlinkSync(dtsmFilePath);
            }
        });

        it("can install single file without save options", ()=> {
            return dtsm.install({path: dtsmFilePath, save: false}, ["jquery/jquery.d.ts"]).then(result => {
                assert(Object.keys(result.dependencies).length === 1);
                assert(!result.dependencies["jquery/jquery.d.ts"].error);
                assert(!fs.existsSync(dtsmFilePath));
            });
        });

        it("can install single file with save options", ()=> {
            dtsm.init(dtsmFilePath);

            return dtsm.install({path: dtsmFilePath, save: true}, ["jquery/jquery.d.ts"]).then(result => {
                assert(Object.keys(result.dependencies).length === 1);
                assert(!result.dependencies["jquery/jquery.d.ts"].error);
                assert(fs.existsSync(dtsmFilePath));

                var json = fs.readFileSync(dtsmFilePath, "utf8");
                var data = JSON.parse(json);
                assert(data.dependencies["jquery/jquery.d.ts"]);
            });
        });

        it("can't install files if it found more than 1 file", ()=> {
            return dtsm.install({path: dtsmFilePath, save: false}, ["angul"]).then(result=> {
                throw new Error("unexpected");
            }, ()=> {
                // TODO
                return "OK";
            });
        });
    });


    describe(".installFromFile", ()=> {

        var dtsmFilePath = "./test/fixture/dtsm-installFromFile.json";
        var targetDir:string = JSON.parse(fs.readFileSync(dtsmFilePath, "utf8")).path;

        beforeEach(()=> {
            if (fs.existsSync(targetDir)) {
                rimraf.sync(targetDir);
            }
        });

        it("can install files from recipe", ()=> {
            assert(!fs.existsSync(targetDir));
            return dtsm.installFromFile(dtsmFilePath).then(result => {
                assert(1 < Object.keys(result.dependencies).length); // atom.d.ts has meny dependencies
                assert(fs.existsSync("test-tmp/installFromFile/atom/atom.d.ts"));
            });
        });
    });

    describe.skip(".uninstall", ()=> {
        it("can uninstall single file", ()=> {
            return dtsm.uninstall({path: "test-tmp/uninstall/dtsm.json", save: false}, "atom").then(fileList => {
                assert(fileList.length === 1);
            });
        });

        it("can uninstall single file by ambiguous matching", ()=> {
            return dtsm.uninstall({path: "test-tmp/uninstall/dtsm.json", save: false}, "angular").then(fileList => {
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
