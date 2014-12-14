/// <reference path="../typings/update-notifier/update-notifier.d.ts" />
/// <reference path="../typings/commander/commander.d.ts" />

import updateNotifier = require("update-notifier");
var pkg = require("../package.json");

var notifier = updateNotifier({
    packageName: pkg.name,
    packageVersion: pkg.version
});
if (notifier.update) {
    notifier.notify();
}

import readline = require("readline");

import dtsm = require("./index");

var program:IExportedCommand = require("commander");

interface IExportedCommand extends commander.IExportedCommand {
    forceOnline:boolean;
    config:string;
    remote:string;
    insight:string;
}

program
    .version(pkg.version, "-v, --version")
    .option("--insight <use>", "send usage opt in/out. in = `--insight true`, out = `--insight false`")
    .option("--force-online", "force turn on online check")
    .option("--remote <uri>", "uri of remote repository")
    .option("--config <path>", "path to json file");

function setup():Promise<dtsm.Manager> {
    "use strict";

    var forceOnline = program.forceOnline;
    var configPath:string = program.config;
    var remoteUri:string = program.remote;
    var insightStr = program.insight;
    var insightOptout:boolean;

    if (typeof insightStr === "string") {
        if (insightStr !== "true" && insightStr !== "false") {
            return Promise.reject("--insight options required \"true\" or \"false\"");
        } else if (insightStr === "true") {
            insightOptout = false; // inverse
        } else {
            insightOptout = true; // inverse
        }
    }

    var options:dtsm.Options = {
        configPath: configPath || "dtsm.json",
        baseRepo: remoteUri,
        forceOnline: forceOnline,
        insightOptout: insightOptout
    };
    return dtsm.Manager
        .createManager(options)
        .then(manager => {
            return manager.tracker
                .askPermissionIfNeeded()
                .then(()=> manager);
        });
}

function errorHandler(err:any) {
    "use strict";

    console.error(err);
    return Promise.resolve(null).then(()=> {
        process.exit(1);
    });
}

program
    .command("init")
    .description("make new dtsm.json")
    .action((opts:{})=> {
        setup()
            .then(manager => {
                var jsonContent = manager.init();

                console.log("write to " + manager.configPath);
                console.log(jsonContent);
            })
            .catch(errorHandler);
    });

program
    .command("search [phrase]")
    .description("search .d.ts files")
    .option("--raw", "output search result by raw format")
    .action((phrase:string, opts:{raw:boolean;})=> {
        setup()
            .then(manager => {
                manager.checkOutdated(outdated => {
                    if (outdated) {
                        console.warn("caution: repository info is maybe outdated. please exec `dtsm fetch` command");
                    }
                });
                return manager;
            })
            .then(manager => {
                return manager.search(phrase || "");
            })
            .then(resultList => {
                if (opts.raw) {
                    resultList.forEach(result => {
                        console.log(result.fileInfo.path);
                    });
                } else {
                    if (resultList.length === 0) {
                        console.log("No results.");
                    } else {
                        console.log("Search results.");
                        console.log("");
                        resultList.forEach(result => {
                            console.log("\t" + result.fileInfo.path);
                        });
                    }
                }
            })
            .catch(errorHandler);
    });

program
    .command("fetch")
    .description("fetch all data from remote repos")
    .action((opts:{})=> {
        setup()
            .then(manager=> {
                console.log("fetching...");
                return manager.fetch();
            })
            .catch(errorHandler);
    });

program
    .command("install files...")
    .description("install .d.ts files")
    .option("--save", "save .d.ts file path into dtsm.json")
    .option("--dry-run", "save .d.ts file path into dtsm.json")
    .option("--stdin", "use input from stdin")
    .action((...targets:string[])=> {
        var opts:{save:boolean;dryRun:boolean;stdin:boolean;} = <any>targets.pop();
        var save = !!opts.save;
        var dryRun = !!opts.dryRun;
        var stdin = !!opts.stdin;

        setup()
            .then(manager => {
                if (stdin || targets.length !== 0) {
                    // do not check installFromFile pattern
                    manager.checkOutdated(outdated => {
                        if (outdated) {
                            console.warn("caution: repository info is maybe outdated. please exec `dtsm fetch` command");
                        }
                    });
                }
                return manager;
            })
            .then(manager=> {

                if (!stdin && targets.length === 0) {
                    manager.installFromFile({dryRun: dryRun})
                        .then(result => {
                            Object.keys(result.dependencies).forEach(depName => {
                                console.log(depName);
                            });
                        })
                        .catch(errorHandler);
                } else if (targets.length !== 0) {
                    manager.install({save: save, dryRun: dryRun}, targets)
                        .then(result => {
                            Object.keys(result.dependencies).forEach(depName => {
                                console.log(depName);
                            });
                        })
                        .catch(errorHandler);
                } else {
                    var rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    rl.on("line", (line:string)=> {
                        manager.install({save: save, dryRun: dryRun}, [line])
                            .then(result => {
                                Object.keys(result.dependencies).forEach(depName => {
                                    console.log(depName);
                                });
                            })
                            .catch(errorHandler);
                    });
                }
            })
            .catch(errorHandler);
    });

program.parse(process.argv);
