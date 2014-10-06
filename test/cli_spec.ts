import nexpect = require("nexpect");
import rimraf = require("rimraf");
import mkdirp = require("mkdirp");
import fs = require("fs");

describe("command line interface", ()=> {

    var command = process.cwd() + "/bin/dtsm";
    var testWorkingDir = process.cwd() + "/test-cli";
    var fixtureRootDir = process.cwd() + "/test/fixture";

    before(done => {
        // turn off send usage
        // make fetch log
        console.log(command, "--insight", "false", "fetch");
        nexpect
            .spawn(command, ["--insight", "false", "fetch"], {
                cwd: testWorkingDir
            })
            .run((err, stdout, exit) => {
                if (exit === 0) {
                    done();
                }
            });
    });

    beforeEach(()=> {
        rimraf.sync(testWorkingDir);
        mkdirp.sync(testWorkingDir);
    });

    describe("init sub-command", () => {

        it("make new dtsm.json", done=> {
            var targetFile = testWorkingDir + "/dtsm.json";

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn(command, ["--config", targetFile, "init"], {
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
            var targetFile = testWorkingDir + "/dtsm.json";

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn(command, ["--config", targetFile, "--remote", "https://github.com/vvakame/gapidts.git", "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));

                    var data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                    assert(data.baseRepo === "https://github.com/vvakame/gapidts.git");

                    done();
                });
        });
    });

    describe("search sub-command", () => {

        it("can find all .d.ts files without config file", done=> {
            nexpect
                .spawn(command, ["search"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    // https://github.com/borisyankov/DefinitelyTyped has greater than 500 .d.ts files
                    assert(500 < stdout.length);

                    done();
                });
        });

        it("can find all .d.ts files with config file", done=> {
            var configFile = fixtureRootDir + "/dtsm-gapidts-repo.json";

            nexpect
                .spawn(command, ["--config", configFile, "search"])
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
                .spawn(command, ["--remote", "https://github.com/vvakame/gapidts.git", "search"])
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
                .spawn(command, ["search", "atom"])
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
                .spawn(command, ["search", "--raw"])
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
                .spawn(command, ["fetch"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    done();
                });
        });

        it("can fetch remote info with --remote option", done=> {
            nexpect
                .spawn(command, ["--remote", "https://github.com/vvakame/gapidts.git", "fetch"])
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    done();
                });
        });
    });

    describe("install sub-command", () => {

        it("can install .d.ts file", done=> {
            assert(!fs.existsSync(testWorkingDir + "/typings/atom/atom.d.ts"));
            nexpect
                .spawn(command, ["install", "atom"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    assert(stdout.some(line => line.indexOf("atom/atom.d.ts") !== -1));
                    assert(stdout.some(line => line.indexOf("space-pen/space-pen.d.ts") !== -1));

                    assert(fs.existsSync(testWorkingDir + "/typings/atom/atom.d.ts"));
                    assert(fs.existsSync(testWorkingDir + "/typings/space-pen/space-pen.d.ts"));

                    done();
                });
        });

        it("can install .d.ts file with --dry-run option", done=> {
            assert(!fs.existsSync(testWorkingDir + "/typings/atom/atom.d.ts"));
            nexpect
                .spawn(command, ["install", "atom", "--dry-run"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    assert(stdout.some(line => line.indexOf("atom/atom.d.ts") !== -1));
                    assert(stdout.some(line => line.indexOf("space-pen/space-pen.d.ts") !== -1));

                    assert(!fs.existsSync(testWorkingDir + "/typings/atom/atom.d.ts"));
                    assert(!fs.existsSync(testWorkingDir + "/typings/space-pen/space-pen.d.ts"));

                    done();
                });
        });

        it("can install .d.ts file with --stdin option", done=> {
            assert(!fs.existsSync(testWorkingDir + "/typings/atom/atom.d.ts"));
            var p = nexpect
                .spawn(command, ["install", "--stdin"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);

                    assert(stdout.some(line => line.indexOf("atom/atom.d.ts") !== -1));
                    assert(stdout.some(line => line.indexOf("space-pen/space-pen.d.ts") !== -1));

                    done();
                });
            // can't use nexpect sendline and sendEof :/
            p.stdin.write("atom\n");
            p.stdin.end();
        });

        it("can install .d.ts file with --save option", done=> {
            var targetFile = testWorkingDir + "/dtsm.json";

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn(command, ["--config", targetFile, "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));

                    var data:any;

                    data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                    assert(Object.keys(data.dependencies).length === 0);

                    nexpect
                        .spawn(command, ["install", "--save", "atom"], {
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
            var targetFile = testWorkingDir + "/dtsm.json";

            assert(!fs.existsSync(targetFile));
            nexpect
                .spawn(command, ["--config", targetFile, "init"], {
                    cwd: testWorkingDir
                })
                .run((err, stdout, exit) => {
                    assert(!err);
                    assert(exit === 0);
                    assert(fs.existsSync(targetFile));

                    var data:any;

                    data = JSON.parse(fs.readFileSync(targetFile, "utf8"));
                    assert(Object.keys(data.dependencies).length === 0);

                    nexpect
                        .spawn(command, ["--remote", "https://github.com/vvakame/gapidts.git", "install", "--save", "bigquery-v2-browser"], {
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
});
