/// <reference path="../DefinitelyTyped/node.d.ts" />

import fs = require("fs");
import gitWrapper = require("./wrapper/Git");
var Git = gitWrapper.Git;

var DTSM_HOME = process.env["DTSM_HOME"] || process.env["HOME"] + "/.dtsm";

export class Manager {

    static run() {
        var manager = new Manager();
        manager.clone("https://github.com/borisyankov/DefinitelyTyped.git");
    }

    clone(remoteUrl:string):void {
        var git = new Git();

        git.clone(remoteUrl, Utils.makeClonePath(remoteUrl), {
            success: (data)=> {
                console.log(data);
            },
            error: (error)=> {
                console.error(error);
            }
        });
    }
}

export class Utils {
    private constructor() {
    }

    static makeClonePath(remoteUrl:string) {
        var regexp:RegExp;
        if (remoteUrl.indexOf("git@") === 0) {
            // git@github.com:borisyankov/DefinitelyTyped.git
            regexp = /^([a-z]+)\@([^:]+):([^\/]+)\/(.+)\.git$/;
        } else if (remoteUrl.indexOf("http") === 0) {
            // https://github.com/borisyankov/DefinitelyTyped.git
            regexp = /^([a-z]+:\/\/([^\/]+)\/([^\/]+)\/(.+)\.git$)/;
        } else {
            // https://github.com/borisyankov/DefinitelyTyped
            throw new Error("unknown repository types");
        }

        var results = remoteUrl.match(regexp);
        var protocol = results[1];
        var host = results[2];
        var user = results[3];
        var repository = results[4];

        return DTSM_HOME + "/" + host + "/" + user + "/" + repository;
    }
}


