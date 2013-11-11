/// <reference path="node-git.d.ts" />

import base = require("git");

var git = new base.Git("./.git");

/*
 git.call_git("", "clone", "", {}, ["git@github.com:christkv/node-git.git"], (err, data) => {
 console.log(arguments);
 });
 */

new base.Repo("./", (err, repo)=> {
    if (false) {
        repo.log((err, commits)=> {
            commits.forEach(commit=> {
                console.log(JSON.stringify(commit, null, 2));
            });
        })

        repo.head((err, head)=> {
            console.log(JSON.stringify(head, null, 2));
        });

        repo.heads((err, heads)=> {
            heads.forEach(head=> {
                console.log(JSON.stringify(head, null, 2));
            });
        });
    }
});
