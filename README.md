# DTSM [![Circle CI](https://circleci.com/gh/vvakame/dtsm.png?style=badge)](https://circleci.com/gh/vvakame/dtsm) [![Build status](https://ci.appveyor.com/api/projects/status/basbr6gmdfekrwc7/branch/master?svg=true)](https://ci.appveyor.com/project/vvakame/dtsm/branch/master)

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
fetching...
fetching https://github.com/borisyankov/DefinitelyTyped.git

# search .d.ts
$ dtsm search atom
Search results.

	atom/atom.d.ts
	dojo/dojox.atom.d.ts

# install .d.ts
$ dtsm install atom
atom/atom.d.ts #be0b6b
├── q/Q.d.ts
├── jquery/jquery.d.ts
├─┬ space-pen/space-pen.d.ts
│ └── jquery/jquery.d.ts
├─┬ emissary/emissary.d.ts
│ └── mixto/mixto.d.ts
├─┬ pathwatcher/pathwatcher.d.ts
│ ├── node/node.d.ts
│ └── q/Q.d.ts
├─┬ text-buffer/text-buffer.d.ts
│ ├─┬ emissary/emissary.d.ts
│ │ └── mixto/mixto.d.ts
│ └── q/Q.d.ts
└─┬ status-bar/status-bar.d.ts
  ├─┬ space-pen/space-pen.d.ts
  │ └── jquery/jquery.d.ts
  └─┬ text-buffer/text-buffer.d.ts
    ├─┬ emissary/emissary.d.ts
    │ └── mixto/mixto.d.ts
    └── q/Q.d.ts

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

10 directories, 10 files

# create dtsm.json and save dependencies
$ dtsm init
write to dtsm.json
{
  "repos": [
    {
      "url": "https://github.com/borisyankov/DefinitelyTyped.git",
      "ref": "master"
    }
  ],
  "path": "typings",
  "bundle": "typings/bundle.d.ts",
  "dependencies": {}
}

$ dtsm install --save atom
atom/atom.d.ts #be0b6b
├── q/Q.d.ts
├── jquery/jquery.d.ts
├─┬ space-pen/space-pen.d.ts
│ └── jquery/jquery.d.ts
├─┬ emissary/emissary.d.ts
│ └── mixto/mixto.d.ts
├─┬ pathwatcher/pathwatcher.d.ts
│ ├── node/node.d.ts
│ └── q/Q.d.ts
├─┬ text-buffer/text-buffer.d.ts
│ ├─┬ emissary/emissary.d.ts
│ │ └── mixto/mixto.d.ts
│ └── q/Q.d.ts
└─┬ status-bar/status-bar.d.ts
  ├─┬ space-pen/space-pen.d.ts
  │ └── jquery/jquery.d.ts
  └─┬ text-buffer/text-buffer.d.ts
    ├─┬ emissary/emissary.d.ts
    │ └── mixto/mixto.d.ts
    └── q/Q.d.ts

$ cat dtsm.json
{
  "repos": [
    {
      "url": "https://github.com/borisyankov/DefinitelyTyped.git",
      "ref": "master"
    }
  ],
  "path": "typings",
  "bundle": "typings/bundle.d.ts",
  "dependencies": {
    "atom/atom.d.ts": {
      "ref": "be0b6b394f77a59e192ad7cfec18078706e44db5"
    }
  }
}

$ rm -rf typings/

$ dtsm install
atom/atom.d.ts #be0b6b
├── q/Q.d.ts
├── jquery/jquery.d.ts
├─┬ space-pen/space-pen.d.ts
│ └── jquery/jquery.d.ts
├─┬ emissary/emissary.d.ts
│ └── mixto/mixto.d.ts
├─┬ pathwatcher/pathwatcher.d.ts
│ ├── node/node.d.ts
│ └── q/Q.d.ts
├─┬ text-buffer/text-buffer.d.ts
│ ├─┬ emissary/emissary.d.ts
│ │ └── mixto/mixto.d.ts
│ └── q/Q.d.ts
└─┬ status-bar/status-bar.d.ts
  ├─┬ space-pen/space-pen.d.ts
  │ └── jquery/jquery.d.ts
  └─┬ text-buffer/text-buffer.d.ts
    ├─┬ emissary/emissary.d.ts
    │ └── mixto/mixto.d.ts
    └── q/Q.d.ts

$ ls -la | grep typings
drwxr-xr-x  13 vvakame  wheel     442  3 27 00:31 typings

$ dtsm update --save
atom/atom.d.ts #0c2ee8
├── q/Q.d.ts
├── jquery/jquery.d.ts
├─┬ space-pen/space-pen.d.ts
│ └── jquery/jquery.d.ts
├─┬ emissary/emissary.d.ts
│ └── mixto/mixto.d.ts
├─┬ pathwatcher/pathwatcher.d.ts
│ ├── node/node.d.ts
│ └── q/Q.d.ts
├─┬ text-buffer/text-buffer.d.ts
│ ├─┬ emissary/emissary.d.ts
│ │ └── mixto/mixto.d.ts
│ └── q/Q.d.ts
└─┬ status-bar/status-bar.d.ts
  ├─┬ space-pen/space-pen.d.ts
  │ └── jquery/jquery.d.ts
  └─┬ text-buffer/text-buffer.d.ts
    ├─┬ emissary/emissary.d.ts
    │ └── mixto/mixto.d.ts
    └── q/Q.d.ts
```

## Advanced usage

### reference other repository

```
# search for another repository
$ dtsm --remote https://github.com/vvakame/gapidts.git search bigquery
Search results.

	test/valid/bigquery-v2-browser.d.ts
	test/valid/bigquery-v2-nodejs.d.ts
```

[example](https://github.com/vvakame/dtsm/blob/master/example/otherRepo/dtsm.json)

### reference mixed repository

```
$ cat dtsm.json
{
  "repos": [
    {
      "url": "https://github.com/borisyankov/DefinitelyTyped.git",
      "ref": "master"
    },
    {
      "url": "https://github.com/vvakame/gapidts.git",
      "ref": "master"
    }
  ],
  "path": "typings",
  "bundle": "typings/bundle.d.ts",
  "dependencies": {
    "jquery/jquery.d.ts": {
      "ref": "0605ebbdbdd8183c70b4a14e1e34ecb3f2b446bf"
    },
    "gapidts/bigquery-v2-browser.d.ts": {
      "repo": "https://github.com/vvakame/gapidts.git",
      "ref": "4edbcca555936a931407d667f8687f175ecbd5ed",
      "path": "test/valid/bigquery-v2-browser.d.ts"
    }
  }
}

$ dtsm install
jquery/jquery.d.ts borisyankov/DefinitelyTyped#0605eb

gapidts/bigquery-v2-browser.d.ts vvakame/gapidts#4edbcc
└── gapidts/googleapis-browser-common.d.ts
```

[example](https://github.com/vvakame/dtsm/blob/master/example/mixedRepisitory/dtsm.json)

### Install with interactive filtering

If you use [peco](https://github.com/peco/peco), you can install .d.ts file interactive.

```
$ dtsm search -i
$ dtsm install -i
```

![dtsm install -i](https://cloud.githubusercontent.com/assets/125332/5699331/88f612da-9a68-11e4-89c4-eaebaa4cb21b.gif)

## Change log

See [CHANGELOG](https://github.com/vvakame/dtsm/blob/master/CHANGELOG.md)

## Contributing

This package's author vvakame is not native english speaker. My first language is Japanese.
If you are native english speaker. I wish received a pull request for document and anything.

## TODO

 * write document
 * create pull request
   * generate self check todo list
 * Windows support
