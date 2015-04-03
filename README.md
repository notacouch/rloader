Loads resources like css and js files when you need them with one line of code.

It keeps track off the items that allready have been loaded.
If the same resource is called (loaded) twice it will load it only once.

This is handy when you load pieces of content (widgets) with Ajax that needs the same resources. This form off loading items is also called **lazy** loading
and it can REALLY REALLY help you to speed up websites and webapplications.


This plugin is very simple, but effective in use.. So Enjoy




# Usage #


## CSS parameters ##

  * src: <string: the url to the css file>
  * cache: <true or false>  default: true (see the global settings)
  * callback: <string or function>  name of your function fired when loading is done
  * arg: <string or JSON object> arguments, parameters for your callback function


## JS parameters ##

  * src: <string: the url to the js file>
  * async: <true or false>  default: true  (see the global settings)
  * cache: <true or false>  default: true  (see the global settings)
  * callback: <string or function>  name of your function fired when loading is done
  * arg: <string or JSON object> arguments, parameters for your callback function


## Events ##
  * event    'beforeload'        Fired before the list gets loaded.
  * event    'onready'           Fired when every resource in the list is loaded (finished).


> parameters:
> > func: <string or function>     name of your function fired when loading is done


> arg:  <string or JSON object>  optional arguments, parameters to parse to your callback function


## Making global settings ##

You can make global settings that rloader will use as a default for all resources.
When the parameters are omitted in the resources (css or js), the global settings will be used
as the default !

  * defaultcache:    <true or false>  default: true    (so use browser caching by default)
  * defaultasync:    <true or false>  default: true    (so load it async by default)


# Examples #

**Load 1 resource**

```
$.rloader({src:'/js/ctpgn.widget.min.js', callback:initwidget, arg:'MyArg'});
```

> ---

**Loads 2 resources**
```
$.rloader([ {src:'/css/widget.css'},{src:'/js/ctpgn.widget.min.js'} ]);
```
_note: the default async and cache options will be used_

> ---

**Loads 2 resources and fires an event when ready**
```
$.rloader([ {src:'/css/widget.css'},{src:'/js/ctpgn.widget.min.js'}, {event:'onready', func:'init_widget', arg:<parameters>} ]);
```
_note: the default async and cache options will be used_

> ---

**Changing global settings**
```
 $.rloader({defaultcache:false});
```