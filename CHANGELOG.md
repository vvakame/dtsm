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
