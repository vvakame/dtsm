// incremental search. based by peco.

import child_process = require('child_process');

export function exec(suggestions:string[]):Promise<string[]> {
    "use strict";

    var peco = child_process.spawn('peco');
    var result:string[] = [];

    return new Promise((resolve, reject) => {
        peco.stdin.write(suggestions.join('\n') + "\n");
        peco.stdout.on('data', (data:any) => {
            var str:string = data.toString();
            var newResult = str.split("\n").filter(str => !!str);
            result = result.concat(newResult);
        });
        peco.stdout.on("end", () => {
            resolve(result);
        });
    });
}
