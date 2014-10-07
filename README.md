# DTSM [![Circle CI](https://circleci.com/gh/vvakame/dtsm.png?style=badge)](https://circleci.com/gh/vvakame/dtsm)

The .d.ts manager

.d.ts is TypeScript definition file.
[DefinitelyTyped!](https://github.com/borisyankov/DefinitelyTyped)

## Install

```
$ npm install -g dtsm
```

dtsm depends on Node.js, npm and git command.
please install git client.

## Usage

```
# fetch from remote repository
$ dtsm fetch

# search .d.ts
$ dtsm search atom
Search results.

	atom/atom.d.ts
	dojo/dojox.atom.d.ts

# install .d.ts
$ dtsm install atom
atom/atom.d.ts
q/Q.d.ts
jquery/jquery.d.ts
space-pen/space-pen.d.ts
emissary/emissary.d.ts
pathwatcher/pathwatcher.d.ts
text-buffer/text-buffer.d.ts
status-bar/status-bar.d.ts
mixto/mixto.d.ts
node/node.d.ts

$ tree typings
  typings
  ├── atom
  │   └── atom.d.ts
  ├── emissary
  │   └── emissary.d.ts
  ├── jquery
  │   └── jquery.d.ts
  ├── mixto
  │   └── mixto.d.ts
  ├── node
  │   └── node.d.ts
  ├── pathwatcher
  │   └── pathwatcher.d.ts
  ├── q
  │   └── Q.d.ts
  ├── space-pen
  │   └── space-pen.d.ts
  ├── status-bar
  │   └── status-bar.d.ts
  └── text-buffer
      └── text-buffer.d.ts

# create dtsm.json and save dependencies
$ dtsm init
write to dtsm.json
{
  "baseRepo": "https://github.com/borisyankov/DefinitelyTyped.git",
  "baseRef": "master",
  "path": "typings",
  "dependencies": {}
}

$ dtsm install --save atom
dtsm install --save atom
atom/atom.d.ts
q/Q.d.ts
jquery/jquery.d.ts
space-pen/space-pen.d.ts
emissary/emissary.d.ts
pathwatcher/pathwatcher.d.ts
text-buffer/text-buffer.d.ts
status-bar/status-bar.d.ts
node/node.d.ts
mixto/mixto.d.ts

$ cat dtsm.json
{
  "baseRepo": "https://github.com/borisyankov/DefinitelyTyped.git",
  "baseRef": "master",
  "path": "typings",
  "dependencies": {
    "atom/atom.d.ts": {
      "ref": "65a465cdec4884a55f0911d5501a6aaa6b919e8a"
    }
  }
}

$ rm -rf typings/

$ dtsm install
atom/atom.d.ts
q/Q.d.ts
jquery/jquery.d.ts
space-pen/space-pen.d.ts
emissary/emissary.d.ts
pathwatcher/pathwatcher.d.ts
text-buffer/text-buffer.d.ts
status-bar/status-bar.d.ts
mixto/mixto.d.ts
node/node.d.ts

$ ls -la | grep typings
  drwxr-xr-x   12 vvakame  staff   408 10  6 17:36 typings
```

## Advanced usage

### reference other repository

```
# search for another repository
$ dtsm search --remote https://github.com/vvakame/gapidts bigquery
Search results.

	test/valid/bigquery-v2-browser.d.ts
	test/valid/bigquery-v2-nodejs.d.ts
```

[example](https://github.com/vvakame/dtsm/blob/master/example/otherRepo/dtsm.json)

### reference mixed repository

```
$ cat dtsm.json
{
  "baseRepo": "https://github.com/borisyankov/DefinitelyTyped.git",
  "baseRef": "master",
  "path": "typings",
  "dependencies": {
    "jquery/jquery.d.ts": {
      "ref": "65a465cdec4884a55f0911d5501a6aaa6b919e8a"
    },
    "gapi/bigquery-v2-browser.d.ts": {
      "repo": "https://github.com/vvakame/gapidts",
      "ref": "8311d2e889b5a6637ebe092012cd647c44a8f6f4",
      "path": "test/valid/bigquery-v2-browser.d.ts"
    }
  }
}
$ dtsm install
jquery/jquery.d.ts
gapi/bigquery-v2-browser.d.ts
gapi/googleapis-browser-common.d.ts
```

[example](https://github.com/vvakame/dtsm/blob/master/example/mixedRepisitory/dtsm.json)

### Install with interactive filtering

If you use [peco](https://github.com/peco/peco), you can install .d.ts file interactive.

```
$ dtsm search --raw | peco | dtsm install --stdin
```

## Contributing

This package's author vvakame is not native english speaker. My first language is Japanese.
If you are native english speaker. I wish received a pull request for document and anything.

## TODO

 * write document
 * list sub-command
 * update sub-command
   * --save option
 * create pull request
   * generate self check todo list
 * Windows support
 * generate bundle.d.ts
