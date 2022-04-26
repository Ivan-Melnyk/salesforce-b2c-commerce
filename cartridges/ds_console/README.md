
# DS_CONSOLE

**`ds_console`** SFCC Cartridge.
This cartridge allows you to test/perform SFCC script on a fly without changing any file in your existing cartridges, in storefront context.
This cartridge supports SiteGenesis JavaScript Controllers and SFRA storefront architectures.
*Please note that the code snippets which you going to test/perform with using this cartridge must be written with considering only storefront context, so for example, if you want to try to test some logic with reading/writing files from/to IMPEX folder - it wont work.*
*For SFRA version, please make sure that `modules` folder is uploaded to your cartridges on sandbox and you've added at least app_storefront_base cartridge in your cartridge path.*
*For SGJC no extra requirements, everything needed is already included in this cartridge.*

## How To
1. Download cartridge on your computer
2. Upload cartridge to your sandbox (using eclipse studio, VS Code or your favourite webdav client tool)
3. Add the cartridge **`ds_console`** to your cartridge's path of your Site Settings
&emsp;`Administration -> Sites -> Manage Sites -> [Your Site] -> Settings (Tab) -> Cartridges`
4. Open the following Controller of your Storefront in your Browser: [Console-Show](https://{sandbox-host-name}/on/demandware.store/Sites-{site-id}-Site/default/Console-Show) *([CConsole-Show](https://{sandbox-host-name}/on/demandware.store/Sites-{site-id}-Site/default/CConsole-Show) - for SiteGenesis JavaScript Controllers version, Pipelines are not supported any more.)*
5. Now you have to be able to see the SFCC script editor
![SFCC Console Demo](https://user-images.githubusercontent.com/41744752/100095575-a081f700-2e52-11eb-86a4-5c483b339514.png "SFCC Console Demo")

Please do not override or call the following properties of `this` in root level of your code snippet:
 - _output
 - _sfccTypes
 - _template
 - _trace
 - _print
 - _debug
 - execute

like:
```javascript
this.execute = function () { /* do something */ };
this._output = 'test';
debug(this._debug(...));
```
as well as override global `module` or anything inside of it.
It may end up with unexpected result.
However you can print any internal property of root `this`, or use your own private `this` in your class(es):
```javascript
debug(this);
debug(this._debug);
function test() {
   this.test = 'test';
   debug(this);
};
var test1 = new test();
```

## Method Detail
**debug**
**`debug`**`(object : Any) : void`
&emsp;Will print the properties and methods of the object (only first level of the properties!).
&emsp;**Parameters:**
&emsp;&emsp;`object` - The object which will be printed in output. Can be also any kind of variable, like `String`, `Number`, `Object`, `Array`, etc.

**trace**
**`trace`**`(variable : Any) : void`
&emsp;Will print the value of `variable` parameter.
&emsp;**Parameters:**
&emsp;&emsp;`variable` - The variable which should be printed. If the type of parameter is not a String - will be converted to String automatically.

**console.log**
**`console.log`**`(variable : Any) : void`
&emsp;Same as **trace**.

**print**
**`print`**`(variable : Any) : void`
&emsp;Same as **trace**.

**out.print**
**`out.print`**`(variable : Any) : void`
&emsp;Same as **trace**.

## Examples
### Print product details
```javascript
var product = dw.catalog.ProductMgr.getProduct('1234567890');
debug(product);
```

### Print output of the calculation
```javascript
var result = 0.1 + 0.2;
trace(result);
```

### Common Tips
You can still use the global objects `request`, `response`, `session` and `customer` as usually in any SFCC script (on backend).
