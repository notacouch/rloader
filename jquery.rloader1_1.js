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
		
		// is the resource loaded ?
		function checkHist(src) {
			if ($.rloader.track[src].status) {
				return $.rloader.track[src].status;
			} else {
				return 0;
			}
		}
		
		// Add a CSS file to the document
		function loadCSS(options){
			// Process options
			var callback=null;
			var src	= options.src,
				cache = true,
				arg	= options.arg || {};
			if (options.callback) {callback=options.callback;}

			if (typeof options.cache != 'undefined') {cache=options.cache;}
			if (cache===false) {
				var d=new Date();
				src=src+"?"+d.getTime();
			}
			if (checkHist(options.src)>0) {return true;}
			
			$.rloader.track[options.src].status = 0;
			var node = document.createElement('link');
			node.type = 'text/css';
			node.rel = 'stylesheet';
			node.href = src;
			node.media = 'screen';
			document.getElementsByTagName("head")[0].appendChild(node);
			$.rloader.track[options.src].status = 1;
			if(callback){callback(arg);}	
		}
		
		// Add a JS file to the document
		function loadJS (options){
			// Process options
			var callback=null;
			var src	= options.src,
				async = options.async || false,
				cache = true,
				arg	= options.arg || {};
			if (options.callback) {callback=options.callback;}
			if (typeof options.cache != 'undefined') {cache=options.cache;}
	
			// If status is 0 (set below), then this thing hasn't fired,
			// -- (A) Trigger download / callback on success
			// If status is 1 then it has fired but is not done downloading
			// -- (B) Callback wouldn't get called, trigger a setinterval
			// If status is 2 then script is downloaded
			// -- (C) just call the callback
			
			var status = checkHist(src); // check status
			
			// !(C)
			if (status > 1) {
				if (typeof callback === 'function') return callback(arg);
				else return callback;
			// !(B)
			} else if (status === 1) {
				if ( typeof $.rloader.track[src].timers == 'undefined' ) {
					$.rloader.track[src].timers = [];
				}
				// untested
				// my worry is inheritance of stuff in the closure below
				// @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures#Creating_closures_in_loops.3A_A_common_mistake
				// but I don't think that applies since this isn't an actual loop, it's one-off
				var timer_index = $.rloader.track[src].timers.length;
				$.rloader.track[src].timers[timer_index] = setInterval(function(){
					if ( checkHist(src) === 2 ) {
						clearInterval($.rloader.track[src].timers[timer_index]);
						if (typeof callback == 'function') {
							callback(arg);
						}
					}
				}, 200);
			}
			// !(A)
			$.rloader.track[src].status = 1;

			$.ajax({
				type: "GET",
				url: src,
				async: async,
				cache: cache,
				dataType: "script",
				success: function(){
					$.rloader.track[src].status = 2;
					if(callback) {
						callback(arg);
					}
				}
			});
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
				if (res.type=='css') {
					loadCSS(res);
				}
				if (res.type=='js') {
					loadJS(res);
				}
			}
		});
	};
	$.rloader.track = {};
})(jQuery);