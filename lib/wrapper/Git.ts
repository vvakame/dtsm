/// <reference path="../../DefinitelyTyped/node-git.d.ts" />

import base = require("git");

export interface IGitCallback<R> {
    success: (data:R)=>void;
    error?: (error:any)=>void;
}

export class Git {
    clone(remoteUrl:string, cloneTo:string, callback:IGitCallback<any>):void {
        var git = new base.Git(cloneTo);
        git.call_git("", "clone", "", {}, ["--bare", remoteUrl, cloneTo], (err, data) => {
            if (!err) {
                callback.success(data);
            } else if (callback.error) {
                callback.error(err);
            }
        });
    }
}
