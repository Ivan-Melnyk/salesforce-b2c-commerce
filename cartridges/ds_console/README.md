# DS_CONSOLE
MOVED TO https://vmmelnic@bitbucket.org/vmmelnic/public.git

**`ds_console`** Demandware Cartridge.<br/>
This cartridge allows you to test/perform Demandware script on a fly without changing any file in your existing cartridges.<br/>
This cartridge also allows you to test the script against Pipelines as well as Controllers.<br/>
*Please note that the code snippets which you gonna test/perform with using this cartridge must be written with considering only storefront context, so for example, if you wanna try to test some logic with reading/writing files from/to IMPEX folder - it wont work.*

## HowTo
1. Download cartridge on your computer
2. Upload cartridge to your sandbox (using eclipse studio or your favourite webdav client tool)
3. Add the cartridge **`ds_console`** to your cartridge's path of your Site Settings<br/>
&emsp;`Administration -> Sites -> Manage Sites -> [Your Site] -> Settings (Tab) -> Cartridges`
4. Open Storefront in your Browser with pipeline [IDS-Show](https://host-name/on/demandware.store/Sites-Site-ID-Site/default/IDS-Show) ([IDSC-Show](https://host-name/on/demandware.store/Sites-Site-ID-Site/default/IDSC-Show) - for Controllers version)
5. Now you have to be able to see the editor of Demandware script<br/>
![Demandware Console Demo](https://github.com/vmmelnic/sfcc/raw/master/cartridges/ds_console/dsconsole_demo.png "Demandware Console Demo")

## Method Detail
**debug**<br/>
**`debug`**`(object : Object) : void`<br/>
&emsp;Will print the properties and methods of the object (only first level of the properties!).<br/>
&emsp;**Parameters:**<br/>
&emsp;&emsp;`object` - The object which will be printed in output. Can be also any kind of variable, like `String`, `Number`, `Object`, `Array`, etc.

**trace**<br/>
**`trace`**`(output : String) : void`<br/>
&emsp;Will print the value of `output` parameter.<br/>
&emsp;**Parameters:**<br/>
&emsp;&emsp;`output` - The variable which should be printed. If the type of parameter is not a String - will be converted to String automatically.

**console.log**<br/>
**`console.log`**`(output : String) : void`<br/>
&emsp;The same as **trace**.

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
You can also use the global objects `request` (or `CurrentRequest`), `session` (or `CurrentSession`), `customer` (or `CurrentCustomer`) and `Basket`.
