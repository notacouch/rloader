//============================================
//	Author:		2basix automatisering
//				http://2basix.nl
// 	Project: 	resource loader
// 	Version:	1.1
// 	license: 	GNU General Public License v3
//	project:	http://code.google.com/p/rloader
//============================================

/***
 * improvements by Abed (aislam1@nshs.edu)
 *
 * - removed 'type' as a necessary argument attribute
 * - enhanced loadJS to allow for callbacks after a file is loaded
 * - enhanced loadJS to check for scripts loading but not yet loaded so the callback can be queued
 * - took local functions out of loop
 *
 **/

(function($){
	$.rloader = function(args) {

		var list = [];
		if (args && !(args.propertyIsEnumerable('length')) && typeof args === 'object' && typeof args.length === 'number') {
			list=args;
		} else {list[0]=args;}

		var STATUS = {
			DNE: 0,
			LOADING: 1,
			READY: 2
		};

		// is the resource loaded ?
		function checkHist(src) {
			if ($.rloader.track[src].status) {
				return $.rloader.track[src].status;
			} else {
				return 0;
			}
		}

		// Add a js/css file to the document
		function loadFile(options) {
			// Process options
			var callback=null;
			var src	= options.src,
				async = options.async || false,
				execute = options.execute || false, // In case we want to embed/execute the script on the page multiple times. Only for JS.
				cache = true,
				arg	= options.arg || {};
			if (options.callback) {callback=options.callback;}
			if (typeof options.cache != 'undefined') {cache=options.cache;}

			//
			// -If status is 0 (set below), then this thing hasn't fired,
			// -- (A) Trigger download / callback on success
			// -- execute is irrelevant (because it will execute anyway)
			//
			// -If status is 1 then it has fired but is not done downloading
			// -- (B) Callback wouldn't get called, trigger a setinterval
			// -- include execute in the interval
			//
			// -If status is 2 then script is downloaded
			// -- (C) just call the callback
			// -- execute the script
			//

			var status = checkHist(src); // check status
			var loader;

			if (options.type === 'js') {

				var ajax_options = {
					type: "GET",
					url: src,
					async: async,
					cache: cache,
					dataType: "script",
					success: function(){
						$.rloader.track[src].status = STATUS.READY;
						if(typeof callback === 'function') {
							callback(arg);
						}
					}
				};

				loader = function() {
					$.ajax(ajax_options);
					if ($.rloader.track[src].status === STATUS.DNE) {
						$.rloader.track[src].status = STATUS.LOADING;
					}
				};

			} else if (options.type === 'css') {

				loader = function() {
					var node   = document.createElement('link');
					node.type  = 'text/css';
					node.rel   = 'stylesheet';
					node.media = 'screen';

					// Removed the following caching logic from original code
					//if (cache===false) {
					//	var d=new Date();
					//	src=src+"?"+d.getTime();
					//}

					// Support for link onload is nice but not good enough esp. on Android.
					// See:
					// @link https://pie.gd/test/script-link-events/
					//$(node).on('load', function(){
					//	$.rloader.track[src].status = STATUS.READY;
					//});
					// Instead we poll for readiness.
					// Credit:
					// @link https://www.zachleat.com/web/load-css-dynamically/
					node.href = src;
					document.getElementsByTagName("head")[0].appendChild(node);
					$.rloader.track[src].status = STATUS.LOADING;

					var href  = node.href; // can't just use `src` b/c it can be a path whereas the value for the href attribute is fully formed, i.e. protocol, domain, the whole 9.
					var timer = 0;

					timer = setInterval(function(){
						var sheets = document.styleSheets;
						// Learning from above, lazyload.js, and loadCSS.js by Filament Group
						// While I had the same idea code-wise, may as well give credit to proofs in ze puddingz:
						// @link https://github.com/rgrove/lazyload/blob/ba2dac297cc39fe2ee2420f19eeda43e1b0b9b8f/lazyload.js#L321
						// @link https://github.com/filamentgroup/loadCSS/blob/7905124c2b0050896abc8e3ade59a52874e5cb73/src/loadCSS.js#L47
				        var sheet_index = sheets.length;

						while (--sheet_index) {
							if (sheets[sheet_index].href === href) {
								clearInterval(timer);
								if(typeof callback === 'function') {
									callback(arg);
								}
								return $.rloader.track[src].status = STATUS.READY;
							}
						}
					}, 200);
				}
			}

			// !(C) - The file has been loaded.
			if (status === STATUS.READY) {
				if (execute && (options.type === 'js')) {
					loader(); // Since the response is cached it should just execute
				} else {
					if (typeof callback === 'function') return callback(arg);
					else return callback;
				}
			// !(B) - The file is downloading.
			} else if (status === STATUS.LOADING) {
				if ( typeof $.rloader.track[src].timers === 'undefined' ) {
					$.rloader.track[src].timers = [];
				}

				// Create and run poll that runs callback once file is ready.
				var timer_index = $.rloader.track[src].timers.length;
				var timer_fn;
				if (execute && (options.type === 'js')) {
					timer_fn = function(){
						if ( checkHist(src) === STATUS.READY ) {
							clearInterval($.rloader.track[src].timers[timer_index]);
							loader(); // Since the response is cached it should just execute
						}
					};
				} else {
					timer_fn = function(){
						if ( checkHist(src) === STATUS.READY ) {
							clearInterval($.rloader.track[src].timers[timer_index]);
							if (typeof callback == 'function') {
								callback(arg);
							}
						}
					};
				}
				$.rloader.track[src].timers[timer_index] = setInterval(timer_fn, 200);
			// !(A) - This is the first call to this file.
			} else {
				$.rloader.track[src].status = STATUS.DNE;

				loader();
			}
		}

		$.each(list, function(i,res){
			if (typeof res.src=='string') {
				if (!$.rloader.track[res.src]) {
					$.rloader.track[res.src] = {'status':0};
				}
				//  { type: 'js'|'css' } is never mentioned in the docs, make it optional and intelligent
				if (typeof res.type == 'undefined') {
					if (/\.js/.test(res.src)) {
						res.type = 'js';
					} else if (/\.css/.test(res.src)) {
						res.type = 'css';
					} else {
						res.type = '';
					}
				}
				if (res.type === 'css') {
					loadFile(res);
				} else if (res.type === 'js') {
					loadFile(res);
				}
			}
		});
	};
	$.rloader.track = {};
})(jQuery);


// Original rloader below
//(function($){
//	$.rloader = function(args) {
//
//		var list = [];
//		if (args && !(args.propertyIsEnumerable('length')) && typeof args === 'object' && typeof args.length === 'number') {
//			list=args;
//		} else {list[0]=args;}
//
//		$.each(list, function(i,res){
//			// is the resource loaded ?
//			function checkHist(src) {
//				if ($.rloader.track[src].status) {
//					return $.rloader.track[src].status;
//				} else {
//					return 0;
//				}
//			}
//			// Add a CSS file to the document
//			function loadCSS(options){
//				// Process options
//				var callback=null;
//				var src	= options.src,
//					cache = true,
//					arg	= options.arg || {};
//				if (options.callback) {callback=options.callback;}
//
//				if (typeof options.cache != 'undefined') {cache=options.cache;}
//				if (cache===false) {
//					var d=new Date();
//					src=src+"?"+d.getTime();
//				}
//				if (checkHist(options.src)>0) {return true;}
//
//				$.rloader.track[options.src].status = 0;
//				var node = document.createElement('link');
//				node.type = 'text/css';
//				node.rel = 'stylesheet';
//				node.href = src;
//				node.media = 'screen';
//				document.getElementsByTagName("head")[0].appendChild(node);
//				$.rloader.track[options.src].status = 1;
//				if(callback){callback(arg);}
//			}
//
//			// Add a JS file to the document
//			function loadJS (options){
//				// Process options
//				var callback=null;
//				var src	= options.src,
//					async = options.async || false,
//					cache = true,
//					arg	= options.arg || {};
//				if (options.callback) {callback=options.callback;}
//				if (typeof options.cache != 'undefined') {cache=options.cache;}
//
//				if (checkHist(src)>0) {return true;}		// check status
//				$.rloader.track[src].status = 0;
//
//				$.ajax({
//					type: "GET",
//					url: src,
//					async: async,
//					cache: cache,
//					dataType: "script",
//					success: function(){
//						$.rloader.track[src].status = 1;
//						if(callback) {
//							callback(arg);
//						}
//					}
//				});
//			}
//			if (typeof res.type=='string' && typeof res.src=='string') {
//				if (!$.rloader.track[res.src]) {
//					$.rloader.track[res.src] = {'status':0};
//				}
//				if (res.type=='css') {
//					loadCSS(res);
//				}
//				if (res.type=='js') {
//					loadJS(res);
//				}
//			}
//		});
//	};
//	$.rloader.track = {};
//})(jQuery);
