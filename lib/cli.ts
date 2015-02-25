/// <reference path="../typings/es6-promise/es6-promise.d.ts" />
/// <reference path="../typings/update-notifier/update-notifier.d.ts" />
/// <reference path="../typings/archy/archy.d.ts" />
/// <reference path="../node_modules/commandpost/commandpost.d.ts" />

require("es6-promise").polyfill();

try {
    // optional
    require("source-map-support").install();
} catch (e) {
}

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
import archy = require("archy");

interface RootOptions {
    offline:boolean;
    config:string[];
    remote:string[];
    insight:string[];
    ref:string[];
}

var root = commandpost
    .create<RootOptions, {}>("dtsm")
    .version(pkg.version, "-v, --version")
    .option("--insight <use>", "send usage opt in/out. in = `--insight true`, out = `--insight false`")
    .option("--offline", "offline first")
    .option("--remote <uri>", "uri of remote repository")
    .option("--config <path>", "path to json file")
    .option("--ref <ref>", "ref of repository")
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
                        .then(result => printResult(result));
                } else if (args.files.length !== 0) {
                    return manager.install({save: opts.save, dryRun: opts.dryRun}, args.files)
                        .then(result => printResult(result));
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
                                .then(result => printResult(result));
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
            .then(result => printResult(result))
            .catch(errorHandler);
    });

root
    .subCommand<{}, {}>("refs")
    .description("show refs, it can use with --ref option")
    .action((opts, args)=> {
        setup(root.parsedOpts)
            .then(manager=> manager.refs())
            .then(refs => {
                refs = refs.filter(ref => {
                    // ignore github pull refs
                    if (ref.name.indexOf("refs/pull/") === 0) {
                        return false;
                    }
                    return true;
                });
                var branches = refs.filter(ref => ref.name.indexOf("refs/heads/") === 0);
                var tags = refs.filter(ref => ref.name.indexOf("refs/tags/") === 0);

                if (branches.length !== 0) {
                    console.log("Branches:");
                    branches.forEach(ref => {
                        var branchName = ref.name.substr("refs/heads/".length);
                        console.log("\t", branchName);
                    });
                    console.log("");
                }
                if (tags.length !== 0) {
                    console.log("Tags:");
                    tags.forEach(ref => {
                        var tagName = ref.name.substr("refs/tags/".length);
                        console.log("\t", tagName);
                    });
                    console.log("");
                }
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
    var specifiedRef:string = opts.ref[0];
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
    if (remoteUri || specifiedRef) {
        repos.push({
            url: remoteUri,
            ref: specifiedRef
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

function printResult(result:pmb.Result) {
    "use strict";

    // short is justice.

    var emitRepo = 1 < result.manager.repos.length;
    var emitHost = result.manager.repos.filter(repo => {
            if (!!repo.urlInfo) {
                return repo.urlInfo.host !== "github.com";
            } else if (!!repo.sshInfo) {
                return repo.sshInfo.hostname !== "github.com";
            } else {
                return true;
            }
        }).length !== 0;
    var fileInfo = (dep:pmb.ResolvedDependency) => {
        if (!!dep.parent && dep.parent.repo === dep.repo && dep.parent.ref === dep.ref) {
            // emit only root node
            return "";
        }
        var result = "";
        if (emitRepo && emitHost) {
            if (dep.repoInstance.urlInfo) {
                result += dep.repoInstance.urlInfo.hostname;
            } else if (dep.repoInstance.sshInfo) {
                result += dep.repoInstance.sshInfo.hostname;
            }
        }
        if (emitRepo) {
            var path:string;
            if (dep.repoInstance.urlInfo) {
                path = dep.repoInstance.urlInfo.pathname;
            } else if (dep.repoInstance.sshInfo) {
                path = dep.repoInstance.sshInfo.path;
            }
            var hasExt = /\.git$/.test(path);
            if (!emitHost) {
                path = path.substr(1);
            }
            if (hasExt) {
                path = path.substr(0, path.length - 4);
            }
            result += path;

        }
        result += "#" + dep.fileInfo.ref.substr(0, 6);
        return " " + result;
    };

    var show = (deps:{[depName: string]: pmb.ResolvedDependency;} = {}, data?:archy.Data) => {
        Object.keys(deps).forEach(depName => {
            var d:archy.Data = {
                label: depName,
                nodes: []
            };
            var dep = deps[depName];
            if (!!data) {
                data.nodes.push(d);
            }
            d.label += fileInfo(dep);
            show(dep.dependencies, d);
            if (!data) {
                console.log(archy(d));
            }
        });
    };

    show(result.dependencies);
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
