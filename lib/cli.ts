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
    .action((phrase:string, opts:{})=> {
        dtsm.search(phrase || "").then(fileList => {
            if (fileList.length === 0) {
                console.log("No results.");
            } else {
                console.log("Search results.");
                console.log("");
                fileList.forEach(fileInfo => {
                    console.log("\t" + fileInfo.path);
                });
            }
        });
    });

program
    .command("install files...")
    .description("install .d.ts files")
    .option("--save", "save .d.ts file path into dtsm.json")
    .action((...targets:string[])=> {
        var opts:{save:boolean;} = <any>targets.pop();
        var save = !!opts.save;

        var path = "dtsm.json";

        if (targets.length === 0) {
            dtsm.installFromFile(path)
                .then(result => {
                }, (error:any)=> {
                    console.error(error);
                    return Promise.reject(null);
                }).catch(()=> {
                    process.exit(1);
                });
        } else {
            dtsm.install({path: path, save: save}, targets)
                .then(fileList => {
                }, (error:any)=> {
                    console.error(error);
                    return Promise.reject(null);
                }).catch(()=> {
                    process.exit(1);
                });
        }
    });

program.parse(process.argv);
