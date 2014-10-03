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

import program = require("commander");

(<any>program)
    .version(pkg.version, "-v, --version")
    .option("--force-online", "force turn on online check");

program
    .command("init")
    .description("make new dtsm.json")
    .action((opts:{})=> {
        var path = "dtsm.json";
        var jsonContent = dtsm.init(path);

        console.log("write to " + path);
        console.log(jsonContent);
    });

program
    .command("search [phrase]")
    .description("search .d.ts files")
    .option("--raw", "output search result by raw format")
    .action((phrase:string, opts:{raw:boolean;})=> {
        dtsm.search(phrase || "").then(fileList => {
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
        console.log("fetching...");
        dtsm.fetch()
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
        var opts:{save:boolean;stdin:boolean;} = <any>targets.pop();
        var save = !!opts.save;
        var stdin = !!opts.stdin;

        var path = "dtsm.json";

        if (!stdin && targets.length === 0) {
            dtsm.installFromFile(path)
                .then(result => {
                }, (error:any)=> {
                    console.error(error);
                    return Promise.reject(null);
                }).catch(()=> {
                    process.exit(1);
                });
        } else if (targets.length !== 0) {
            dtsm.install({path: path, save: save}, targets)
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
                dtsm.install({path: path, save: save}, [line])
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
