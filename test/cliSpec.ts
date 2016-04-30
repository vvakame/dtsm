"use strict";

import * as nexpect from "nexpect";
import * as rimraf from "rimraf";
import * as mkdirp from "mkdirp";

import * as fs from "fs";
import * as path from "path";

describe("command line interface", () => {

    var dtsmPath = path.resolve(__dirname, "../bin/dtsm");
    var testWorkingDir = path.resolve(process.cwd(), "test-cli");
    var fixtureRootDir = path.resolve(process.cwd(), "test/fixture");

    before(done => {
        // turn off send usage
        // make fetch log
        nexpect
            .spawn("node", [dtsmPath, "--insight", "false", "fetch"])
            .run((err, stdout, exit) => {
                assert(!err);
                assert(exit === 0);
                done();
            });
    });

    beforeEach(() => {
        rimraf.sync(testWorkingDir);
        mkdirp.sync(testWorkingDir);
    });

    describe("init sub-command", () => {

        it("make new dtsm.json", done=> {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn("node", [dtsmPath, "--config", targetFile, "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));
                    done();
                });
        });

        it("make new dtsm.json with --remote option", done=> {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn("node", [dtsmPath, "--config", targetFile, "--remote", "https://github.com/vvakame/gapidts.git", "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));

                    var data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                    assert(data.repos.length === 1);
                    assert(data.repos[0].url === "https://github.com/vvakame/gapidts.git");

                    done();
                });
        });
    });

    describe("search sub-command", () => {

        it("can find all .d.ts files without config file", done=> {
            nexpect
                .spawn("node", [dtsmPath, "search"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    // https://github.com/DefinitelyTyped/DefinitelyTyped has greater than 500 .d.ts files
                    assert(500 < stdout.length);

                    done();
                });
        });

        it("can find all .d.ts files with config file", done=> {
            var configFile = path.resolve(fixtureRootDir, "dtsm-gapidts-repo.json");

            nexpect
                .spawn("node", [dtsmPath, "--config", configFile, "search"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    // https://github.com/vvakame/gapidts has less than 300 .d.ts files
                    assert(stdout.length < 300);

                    done();
                });
        });

        it("can find all .d.ts files with --remote option", done=> {
            nexpect
                .spawn("node", [dtsmPath, "--remote", "https://github.com/vvakame/gapidts.git", "search"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    // https://github.com/vvakame/gapidts has less than 300 .d.ts files
                    assert(stdout.length < 300);

                    done();
                });
        });

        it("can find .d.ts files by phrase", done=> {
            nexpect
                .spawn("node", [dtsmPath, "search", "atom"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    // found 2 files
                    assert(stdout.length < 10);

                    done();
                });
        });

        it("can find .d.ts files with --raw option", done=> {
            nexpect
                .spawn("node", [dtsmPath, "search", "--raw"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    assert(stdout.length !== 0);
                    stdout.forEach(line=> {
                        assert(line.indexOf("\t") === -1);
                    });

                    done();
                });
        });
    });

    describe("fetch sub-command", () => {

        it("can fetch remote info", done=> {
            nexpect
                .spawn("node", [dtsmPath, "fetch"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    done();
                });
        });

        it("can fetch remote info with --remote option", done=> {
            nexpect
                .spawn("node", [dtsmPath, "--remote", "https://github.com/vvakame/gapidts.git", "fetch"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    done();
                });
        });
    });

    describe("install sub-command", () => {

        it("can install .d.ts file", done=> {
            assert(!fs.existsSync(path.resolve(testWorkingDir, "typings/atom/atom.d.ts")));
            nexpect
                .spawn("node", [dtsmPath, "install", "atom"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    assert(stdout.some(line => line.indexOf("atom/atom.d.ts") !== -1));
                    assert(stdout.some(line => line.indexOf("space-pen/space-pen.d.ts") !== -1));

                    assert(fs.existsSync(path.resolve(testWorkingDir, "typings/atom/atom.d.ts")));
                    assert(fs.existsSync(path.resolve(testWorkingDir, "typings/space-pen/space-pen.d.ts")));

                    done();
                });
        });

        it("can install .d.ts file with --dry-run option", done=> {
            assert(!fs.existsSync(path.resolve(testWorkingDir, "/typings/atom/atom.d.ts")));
            nexpect
                .spawn("node", [dtsmPath, "install", "atom", "--dry-run"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    assert(stdout.some(line => line.indexOf("atom/atom.d.ts") !== -1));
                    assert(stdout.some(line => line.indexOf("space-pen/space-pen.d.ts") !== -1));

                    assert(!fs.existsSync(path.resolve(testWorkingDir, "typings/atom/atom.d.ts")));
                    assert(!fs.existsSync(path.resolve(testWorkingDir, "typings/space-pen/space-pen.d.ts")));

                    done();
                });
        });

        it("can install .d.ts file with --save option", done=> {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn("node", [dtsmPath, "--config", targetFile, "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));

                    var data: any;

                    data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                    assert(Object.keys(data.dependencies).length === 0);

                    nexpect
                        .spawn("node", [dtsmPath, "install", "--save", "atom"], {
                            cwd: testWorkingDir
                        })
                        .run((err, stdout, exit) => {
                            assert(!err);
                            assert(exit === 0);

                            data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                            assert(Object.keys(data.dependencies).length === 1);

                            done();
                        });
                });
        });

        it("can install .d.ts file with --remote and --save option", done=> {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn("node", [dtsmPath, "--config", targetFile, "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));

                    var data: any;

                    data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                    assert(Object.keys(data.dependencies).length === 0);

                    nexpect
                        .spawn("node", [dtsmPath, "--remote", "https://github.com/vvakame/gapidts.git", "install", "--save", "bigquery-v2-browser"], {
                            cwd: testWorkingDir
                        })
                        .run((err, stdout, exit) => {
                            assert(!err);
                            assert(exit === 0);

                            data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                            assert(Object.keys(data.dependencies).length === 1);

                            var dep = data.dependencies["test/valid/bigquery-v2-browser.d.ts"];
                            assert(dep.repo === "https://github.com/vvakame/gapidts.git");

                            done();
                        });
                });
        });
    });

    describe("uninstall sub-command", () => {

        it("can uninstall definition files", () => {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");
            var bundleFile = path.resolve(testWorkingDir, "typings/bundle.d.ts");

            assert(!fs.existsSync(targetFile));
            return Promise.resolve(null)
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "init"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                resolve();
                            });
                    });
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "install", "es6-promise", "--save"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                assert(fs.existsSync(path.resolve(testWorkingDir, "typings/es6-promise/es6-promise.d.ts")));
                                assert(fs.existsSync(bundleFile));
                                assert(fs.readFileSync(bundleFile).indexOf('/// <reference path="es6-promise/es6-promise.d.ts" />') !== -1);
                                resolve();
                            });
                    });
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "uninstall", "es6-promise", "--save"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                assert(!fs.existsSync(path.resolve(testWorkingDir + "typings/es6-promise/es6-promise.d.ts")));
                                assert(fs.existsSync(bundleFile));
                                assert(fs.readFileSync(bundleFile).indexOf('/// <reference path="es6-promise/es6-promise.d.ts" />') === -1);
                                resolve();
                            });
                    });
                });
        });
    });

    describe("update sub-command", () => {

        it("can update definition files", () => {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            assert(!fs.existsSync(targetFile));
            return Promise.resolve(null)
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "init"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                resolve();
                            });
                    });
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "install", "es6-promise"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                resolve();
                            });
                    });
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "update", "--save"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                resolve();
                            });
                    });
                });
        });
    });

    describe("link sub-command", () => {

        it("can link npm or bower definition files", () => {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            assert(!fs.existsSync(targetFile));
            return Promise.resolve(null)
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "init"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                resolve();
                            });
                    });
                })
                .then(() => {
                    return new Promise((resolve, reject) => {
                        nexpect
                            .spawn("node", [dtsmPath, "--config", targetFile, "link", "--save"])
                            .run((err, stdout, exit) => {
                                assert(!err);
                                if (err) {
                                    reject(err);
                                    return;
                                }
                                assert(exit === 0);
                                assert(fs.existsSync(targetFile));
                                resolve();
                            });
                    });
                });
        });
    });

    describe("refs sub-command", () => {

        it("can show repository refs", done=> {
            var targetFile = path.resolve(testWorkingDir, "dtsm.json");

            nexpect
                .spawn("node", [dtsmPath, "--config", targetFile, "refs"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    done();
                });
        });
    });
});
