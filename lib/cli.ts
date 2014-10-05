/// <reference path="../typings/update-notifier/update-notifier.d.ts" />
/// <reference path="../typings/universal-analytics/universal-analytics.d.ts" />
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

import program = require("commander");

(<any>program)
    .version(pkg.version, "-v, --version")
    .option("--force-online", "force turn on online check") // TODO
    .option("--config <path>", "path to json file");

var forceOnline:boolean;
var configPath:string;

function setup() {
    "use strict";

    forceOnline = (<any>program).forceOnline;
    configPath = (<any>program).config;
    return new dtsm.Manager(configPath || "dtsm.json");
}

program
    .command("init")
    .description("make new dtsm.json")
    .action((opts:{})=> {
        var manager = setup();

        var jsonContent = manager.init();

        console.log("write to " + configPath);
        console.log(jsonContent);
    });

program
    .command("search [phrase]")
    .description("search .d.ts files")
    .option("--raw", "output search result by raw format")
    .action((phrase:string, opts:{raw:boolean;})=> {
        var manager = setup();

        manager.search(phrase || "").then(fileList => {
            if (opts.raw) {
                fileList.forEach(fileInfo => {
                    console.log(fileInfo.path);
                });
            } else {
                if (fileList.length === 0) {
                    console.log("No results.");
                } else {
                    console.log("Search results.");
                    console.log("");
                    fileList.forEach(fileInfo => {
                        console.log("\t" + fileInfo.path);
                    });
                }
            }
        });
    });

program
    .command("fetch")
    .description("fetch all data from remote repos")
    .action((opts:{})=> {
        var manager = setup();

        console.log("fetching...");
        manager.fetch()
            .then(() => {
            }, (error:any)=> {
                console.error(error);
                return Promise.reject(null);
            }).catch(()=> {
                process.exit(1);
            });
    });

program
    .command("install files...")
    .description("install .d.ts files")
    .option("--save", "save .d.ts file path into dtsm.json")
    .option("--stdin", "use input from stdin")
    .action((...targets:string[])=> {
        var manager = setup();

        var opts:{save:boolean;stdin:boolean;} = <any>targets.pop();
        var save = !!opts.save;
        var stdin = !!opts.stdin;

        if (!stdin && targets.length === 0) {
            manager.installFromFile()
                .then(result => {
                }, (error:any)=> {
                    console.error(error);
                    return Promise.reject(null);
                }).catch(()=> {
                    process.exit(1);
                });
        } else if (targets.length !== 0) {
            manager.install({save: save}, targets)
                .then(fileList => {
                }, (error:any)=> {
                    console.error(error);
                    return Promise.reject(null);
                }).catch(()=> {
                    process.exit(1);
                });
        } else {
            var rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.on("line", (line:string)=> {
                manager.install({save: save}, [line])
                    .then(fileList => {
                    }, (error:any)=> {
                        console.error(error);
                        return Promise.reject(null);
                    }).catch(()=> {
                        process.exit(1);
                    });
            });
        }
    });

program.parse(process.argv);
