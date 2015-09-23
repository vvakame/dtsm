"use strict";

// incremental search. based by peco.

import * as child_process from 'child_process';
import * as which from "which";

export function exec(suggestions:string[], defaultQueries:string[], command = "peco"):Promise<string[]> {
    "use strict";

    return new Promise((resolve:(result:string)=>void, reject:(err:any)=>void) => {
        // EPIPE is can't handling. resolve command exists first.
        which(command, (err, path) => {
            if (!!err) {
                reject(err);
                return;
            }
            resolve(path);
        });
    })
        .then(path => {
            return new Promise((resolve, reject) => {
                let args:string[] = [];
                if (defaultQueries && 0 < defaultQueries.length) {
                    args = ["--query", defaultQueries.join(" ")];
                }
                let cmd = child_process.spawn(path, args);
                let result:string[] = [];

                cmd.on("error", (err:NodeJS.ErrnoException)=> {
                    reject(err);
                });
                cmd.stdout.on("data", (data:any) => {
                    let str:string = data.toString();
                    let newResult = str.split("\n").filter(str => !!str);
                    result = result.concat(newResult);
                });

                cmd.stdout.on("end", () => {
                    resolve(result);
                });

                cmd.stdin.write(suggestions.join('\n') + "\n");
            });
        });
}
