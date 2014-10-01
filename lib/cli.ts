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

import fs = require("fs");

import dtsm = require("./index");

import program = require("commander");

(<any>program)
    .version(pkg.version, "-v, --version")
    .option("--force-online", "force turn on online check");

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

program.parse(process.argv);
