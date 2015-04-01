<a name"0.9.1"></a>
### 0.9.1 (2015-04-02)


#### Bug Fixes

* **dtsm:** add `grunt setup` to appveyor.yml ([5b963bd6](https://github.com/vvakame/dtsm/commit/5b963bd6))


#### Features

* **dtsm:**
  * challenge for windows support! update dependencies ([44fb100e](https://github.com/vvakame/dtsm/commit/44fb100e))
  * update node.js version in appveyor ([83af71f5](https://github.com/vvakame/dtsm/commit/83af71f5))
  * add appveyor.yml ([b3603305](https://github.com/vvakame/dtsm/commit/b3603305))


<a name="0.9.0"></a>
## 0.9.0 (2015-03-27)


#### Features

* **dtsm:** support default query in --interactive option ([9b4be7bf](https://github.com/vvakame/dtsm/commit/9b4be7bfc1512d641858a1ead61c028772a0bf6e))


<a name="0.8.2"></a>
### 0.8.2 (2015-03-23)


#### Features

* **dtsm:** update dependencies ([0f10fba6](https://github.com/vvakame/dtsm/commit/0f10fba676a9cf581125a8508b4853260e6d1c80))


<a name="0.8.1"></a>
### 0.8.1 (2015-03-13)

* **dtsm:** update dependencies

<a name="0.8.0"></a>
## 0.8.0 (2015-03-05)


#### Bug Fixes

* **dtsm:**
  * fix `grunt test` failed ([90e382a9](https://github.com/vvakame/dtsm/commit/90e382a9da822da54c034097d43f29251a058871))
  * avoid twice tracking in uninstall method ([b316cdbf](https://github.com/vvakame/dtsm/commit/b316cdbfe18edc5508aa45260fcff418681f9183))
  * fix output directory resolution ([9fabbc](https://github.com/vvakame/dtsm/commit/9fabbc071dccf4b8263dfa48db036dcedf49d766)) thanks @Tsuguya !

#### Features

* **dtsm:** implement uninstall sub-command and Manager#uninstall method ([7962a40e](https://github.com/vvakame/dtsm/commit/7962a40e0dd06c272f3a902d7206d7f320b856af))


<a name="0.7.0"></a>
## 0.7.0 (2015-02-25)


#### Features

* **deps:**
  * add archy to dependencies ([1e8321da](https://github.com/vvakame/dtsm/commit/1e8321da5eefe8c6616390c61d342fb0b0193a81))
  * update dependencies and apply packagemanager-backend 0.5.0 ([888b2270](https://github.com/vvakame/dtsm/commit/888b227080acaa761458d701d2ec1c4cf50d92a6))
* **dtsm:**
  * improve display dependency tree styling ([1a374496](https://github.com/vvakame/dtsm/commit/1a37449609bf7537e46fa472f16d385ffb8ef593))
  * implement resolveMissingDependency ([15af730b](https://github.com/vvakame/dtsm/commit/15af730b99457d9ba39584851c8917c3c515e8bf))
  * improve install result displaying ([001f348c](https://github.com/vvakame/dtsm/commit/001f348c700f6b6bee928eb2bb1913092590a057))
  * add utils.padString function ([e13ee8a1](https://github.com/vvakame/dtsm/commit/e13ee8a19b3154f5ceba7f1ffc4ef8a89af86857))


<a name="0.6.1"></a>
### 0.6.1 (2015-02-09)


#### Bug Fixes

* **dtsm:** fix install from file is failed when dtsm.json are hand assembled ([e0c7a9a9](https://github.com/vvakame/dtsm/commit/e0c7a9a98f7f3cc2b83462796242a8aa3f03d1f4))


<a name="0.6.0"></a>
## 0.6.0 (2015-02-08)


#### Features

* **dtsm:**
  * add `dtsm refs` sub-command ([f2ea9773](https://github.com/vvakame/dtsm/commit/f2ea9773897e0430049dd77ab44db2f27c71e835))
  * move feature of es6 polyfill main code to test code ([c9938369](https://github.com/vvakame/dtsm/commit/c99383697f10a8288aa87cdf9dde8640d09ce4ed))
  * add `--ref` option ([0a541f21](https://github.com/vvakame/dtsm/commit/0a541f21ce9ac9e0e50115e37898d347460a2e87))

If you want to get definition files for older version tsc, exec `dtsm --ref 1.3.0 install <libname>`.
If you know what ref-name accepted by dtsm, exec `dtsm refs`.

e.g. get definition files without union types!

```
$ dtsm refs
Branches:
	 0.8
	 0.9.1.1
	 0.9.5
	 1.0.1
	 1.3.0
	 def/node
	 master
$ dtsm --ref 1.3.0 search promise
Search results.

	chai-as-promised/chai-as-promised.d.ts
	es6-promise/es6-promise.d.ts
	es6-promises/es6-promises.d.ts
	promise-pool/promise-pool.d.ts
	promises-a-plus/promises-a-plus.d.ts
	tspromise/tspromise.d.ts
$ dtsm --ref 1.3.0 install es6-promise
es6-promise/es6-promise.d.ts
```

<a name="0.5.0"></a>
## 0.5.0 (2015-02-08)


#### Features

* **deps:** add grunt-conventional-changelog ([6c30106a](https://github.com/vvakame/dtsm/commit/6c30106a3aa7d86e167fc4609e80288f359c87c9))
* **dtsm:** add update sub command ([d753cedf](https://github.com/vvakame/dtsm/commit/d753cedfbb92bfcaa17c38947d1bda8fbb88134c))

If you want to update dependencies revision, you can use `dtsm update` or `dtsm update --save`.

The general procedure.

```
$ dtsm update
...omitted...
$ npm run test
...omitted...
$ echo $?
0
$ dtsm update --save
$ git status -s
 M dtsm.json
```
