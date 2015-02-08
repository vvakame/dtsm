/// <reference path="../typings/update-notifier/update-notifier.d.ts" />
/// <reference path="../node_modules/commandpost/commandpost.d.ts" />

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
import pmb = require("packagemanager-backend");
import is = require("./incrementalsearch");

import commandpost = require("commandpost");

interface RootOptions {
    offline:boolean;
    config:string[];
    remote:string[];
    insight:string[];
}

var root = commandpost
    .create<RootOptions, {}>("dtsm")
    .version(pkg.version, "-v, --version")
    .option("--insight <use>", "send usage opt in/out. in = `--insight true`, out = `--insight false`")
    .option("--offline", "offline first")
    .option("--remote <uri>", "uri of remote repository")
    .option("--config <path>", "path to json file")
    .action(()=> {
        process.stdout.write(root.helpText() + '\n');
    });

root
    .subCommand("init")
    .description("make new dtsm.json")
    .action(()=> {
        setup(root.parsedOpts)
            .then(manager => {
                var jsonContent = manager.init();

                console.log("write to " + manager.configPath);
                console.log(jsonContent);
            })
            .catch(errorHandler);
    });

interface SearchOptions {
    raw:boolean;
    interactive:boolean;
}

interface SearchArguments {
    phrase: string;
}

root
    .subCommand<SearchOptions, SearchArguments>("search [phrase]")
    .description("search .d.ts files")
    .option("--raw", "output search result by raw format")
    .option("-i, --interactive", "do incremental searching. use `peco` default")
    .action((opts, args) => {
        setup(root.parsedOpts)
            .then(manager => {
                return manager.search(args.phrase || "");
            })
            .then(resultList => {
                if (!opts.interactive) {
                    return Promise.resolve(resultList);
                }
                var candidates = resultList.map(result => result.fileInfo.path);
                if (candidates.length === 0) {
                    return Promise.resolve(resultList);
                }
                return is
                    .exec(candidates, "peco")
                    .then(selected => {
                        return selected
                            .map(path => {
                                return resultList.filter(result => result.fileInfo.path === path)[0];
                            })
                            .filter(result => !!result);
                    });
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

root
    .subCommand("fetch")
    .description("fetch all data from remote repos")
    .action(()=> {
        setup(root.parsedOpts)
            .then(manager=> {
                process.stdout.write("fetching...\n");
                return manager.fetch();
            })
            .catch(errorHandler);
    });

interface InstallOptions {
    save:boolean;
    dryRun: boolean;
    interactive: boolean;
}

interface InstallArguments {
    files: string[];
}

root
    .subCommand<InstallOptions, InstallArguments>("install [files...]")
    .description("install .d.ts files")
    .option("--save", "save .d.ts file path into dtsm.json")
    .option("--dry-run", "save .d.ts file path into dtsm.json")
    .option("-i, --interactive", "do incremental searching. use `peco` default")
    .action((opts, args) => {
        // .action((...targets:string[])=> {

        setup(root.parsedOpts)
            .then(manager=> {
                if (!opts.interactive && args.files.length === 0) {
                    return manager.installFromFile({dryRun: opts.dryRun})
                        .then(result => {
                            Object.keys(result.dependencies).forEach(depName => {
                                console.log(depName);
                            });
                        });
                } else if (args.files.length !== 0) {
                    return manager.install({save: opts.save, dryRun: opts.dryRun}, args.files)
                        .then(result => {
                            Object.keys(result.dependencies).forEach(depName => {
                                console.log(depName);
                            });
                        });
                } else {
                    return manager.search("")
                        .then(resultList => {
                            var candidates = resultList.map(result => result.fileInfo.path);
                            if (candidates.length === 0) {
                                return Promise.resolve(resultList);
                            }
                            return is
                                .exec(candidates, "peco")
                                .then(selected => {
                                    return selected
                                        .map(path => {
                                            return resultList.filter(result => result.fileInfo.path === path)[0];
                                        })
                                        .filter(result => !!result);
                                });
                        })
                        .then(resultList => {
                            var files = resultList.map(result => result.fileInfo.path);
                            return manager.install({save: opts.save, dryRun: opts.dryRun}, files)
                                .then(result => {
                                    Object.keys(result.dependencies).forEach(depName => {
                                        console.log(depName);
                                    });
                                });
                        });
                }
            })
            .catch(errorHandler);
    });

interface UpdateOptions {
    save:boolean;
    dryRun: boolean;
}

root
    .subCommand<UpdateOptions, {}>("update")
    .description("update definition files version")
    .option("--save", "save updated ref into dtsm.json")
    .option("--dry-run", "save .d.ts file path into dtsm.json")
    .action((opts, args)=> {
        setup(root.parsedOpts)
            .then(manager=> {
                return manager.update({save: opts.save, dryRun: opts.dryRun});
            })
            .then(result => {
                Object.keys(result.dependencies).forEach(depName => {
                    console.log(depName);
                });
            })
            .catch(errorHandler);
    });

commandpost
    .exec(root, process.argv)
    .catch(errorHandler);

function setup(opts:RootOptions):Promise<dtsm.Manager> {
    "use strict";

    var offline = opts.offline;
    var configPath:string = opts.config[0];
    var remoteUri:string = opts.remote[0];
    var insightStr = opts.insight[0];
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

    var repos:pmb.RepositorySpec[] = [];
    if (remoteUri) {
        repos.push({
            url: remoteUri
        });
    }
    var options:dtsm.Options = {
        configPath: configPath || "dtsm.json",
        repos: repos,
        offline: offline,
        insightOptout: insightOptout
    };
    return dtsm
        .createManager(options)
        .then(manager => {
            return manager.tracker
                .askPermissionIfNeeded()
                .then(()=> manager);
        });
}

function errorHandler(err:any) {
    "use strict";

    if (err instanceof Error) {
        console.error(err.stack);
    } else {
        console.error(err);
    }
    return Promise.resolve(null).then(()=> {
        process.exit(1);
    });
}
