//============================================
//	Author:		2basix automatisering
//				http://2basix.nl
// 	Project: 	resource loader
// 	Version:	1.5.4 development (20120210)
// 	license: 	GNU General Public License v3
//	project:	http://code.google.com/p/rloader
//============================================
(function ($) {
    $.rloader = function (args) {
        var list = [],
			resourcestoload = [],
			eventstohandle = [],
			attachevents = [],
			onreadyevent = null;
			
        if (args && !(args.propertyIsEnumerable('length')) && typeof args === 'object' && typeof args.length === 'number') {
            list = args;
        } else {
            list[0] = args;
        }

		function runFunction(f, arg) {
			if ( $.isFunction(f) || typeof f === 'string') {
				if ($.isFunction(f)) {
					f(arg);
					return true;
				} else {
					var fn = window[f];
					if (typeof fn === 'function') {
						fn(arg);
						return true;
					} else {
						if (typeof eval(f) === "function") {
							eval(f).call(this,arg);
							return true;
						}	
					}	
				}
				return false;
			}
			return true;
		}

		// alternative IE safe console solution	
		function add2console(text) {
			if (!(console)) {
				window.console = { tlog:"", log: function (par){ console.tlog+=par+"\n"; return true;}};
			}
			console.log(text);
		}
		
		//==================================================================
		//==================================================================
		function processAttachedCallbacks(src) {
			var j;
			var callbackstructarray = $.rloader.track[src]._cback;
			if (callbackstructarray) {
				for (j = 0; j < callbackstructarray.length; j++) {
					runFunction(callbackstructarray[j].callback, callbackstructarray[j].arg);
				}
				// reset the array to no elements (all callbacks were processed)
				$.rloader.track[src]._cback= [];
			}	
			return true;
		}
		
		//==================================================================
		//==================================================================
		function processAttachedEvents(src) {
			var i, j, fire, event;
			for (j = 0; j < $.rloader.track[src]._evts.length; j++) {
				event=$.rloader.track[src]._evts[j];
				if (event.fired===0) {
					fire=true;
					for (i = 0; i < event.rlist.length; i++) {
						// -1 is error in loading  (ignore this.... we still fire the event even though there was an error !!!)
						if ($.rloader.track[event.rlist[i]]) {
							if ($.rloader.track[event.rlist[i]].status === 0) {
								fire = false;
								break;
							}
						} else {
							// Bugfix in 1.5.4
							fire = false;
							break;
						}
					}
					if (fire) { 
						runFunction(event.func, event.arg); 
						// make sure this event does not get fired twice
						$.rloader.track[src]._evts[j].fired=1;
						$.rloader.track[src]._evts[j].rlist=null;
						$.rloader.track[src]._evts[j].event="";
						$.rloader.track[src]._evts[j].arg=null;
					}
				}
			}
			$.rloader.track[src]._evts=$.grep($.rloader.track[src]._evts, function(val) { return val.fired !== 1; });
		}

		
		//=============================================================================
		// 	this will handle an event
		//=============================================================================
        function doEvent(src) {
			processAttachedCallbacks(src);
			processAttachedEvents(src);
        }

        function loadCSS(options) {
			var src=options.src;
            if (!options.cache) {
                var d = new Date();
                src = src + "?" + d.getTime();
            }
            var node = document.createElement('link');
            node.type = 'text/css';
            node.rel = 'stylesheet';
            node.href = src;
            node.media = 'screen';
            document.getElementsByTagName("head")[0].appendChild(node);
            $.rloader.track[options.src].status = 1;
			doEvent(options.src);
			return true;
        }

		
        function loadJS(options) {
			var src=options.src;
			$.ajax({
				type: "GET",
				url: src,
				async: options.async,
				cache: options.cache,
				dataType: "script",
				error: function (jqXHR, textStatus, errorThrown) {
					$.rloader.track[src].status = -1;
					$.rloader.track[src].error = "rloader ajax error: "+textStatus+" - "+errorThrown;
					add2console($.rloader.track[src].error);
					add2console('rloader error on resource: '+src);
				},
				statusCode: {
					404: function() {
						$.rloader.track[src].status = -2;
						$.rloader.track[src].error = "rloader error: 404 - Resource NOT found: "+src;
						add2console($.rloader.track[src].error);
					}
				},
				success: function () {
					$.rloader.track[src].status = 1;
					doEvent(src);
				}
			});
        }

		function getFileType(filename) {
			return filename.split('.').pop().toLowerCase();
		}

		// process the listed arguments (Split them into resources and events, and do checking)
        $.each(list, function (i, res) {
			if (typeof res.defaultcache === "boolean") {
				$.rloader.track.defaultcache=res.defaultcache;
			}	
			if (typeof res.defaultasync === "boolean") {
				$.rloader.track.defaultasync=res.defaultasync;
			}	
			
			if (typeof res.event === 'string') {
				if (res.event === 'onready' || res.event === 'beforeload') {
					// type check for an event
					if (typeof res.func === 'string' || typeof res.func === 'function') {
						var arg = null;
						if (res.arg) {
							arg = res.arg;
						}
						if (arg === null) {
							res.arg = {};
						}
						res.fired=0;
						eventstohandle.push(res);
					}
				}
			} else {
				// The fileextension will be the type, in this version the type parameter is ignored completely
				if (typeof res.src === 'string') {
					res.type=getFileType(res.src);
					if (res.type==='js' || res.type==='css') {
					
						// preprocess all options here to correct format
						var callback = null;
						if (res.callback) {
							// type checking
							if (typeof res.callback === 'string' || typeof res.callback === 'function') {
								callback = res.callback;
							}	
						}
						res.callback=callback;
						var argf= {};
						if (typeof res.arg !== "undefined") {
							// type checking
							if (typeof res.arg === "object") {
								argf=res.arg;
							}
						}
						res.arg=argf;
						
						var async=$.rloader.track.defaultasync;
						if (typeof res.async !== "undefined") {
							if (typeof res.async==="boolean") {
								async=res.async;
							}
							if ((typeof res.async==="number") && res.async===1) {
								async=true;
							}	
						}
						res.async=async;

						var cache=$.rloader.track.defaultcache;
						if (typeof res.cache !== "undefined") {
							if (typeof res.cache==="boolean") {
								cache=res.cache;
							}
							if ((typeof res.cache==="number") && res.cache===1) {
								cache=true;
							}	
						}
						res.cache=cache;
						resourcestoload.push(res);
					}	
				}
			}
		});
		var i, j, justres;
		for (i = 0; i < eventstohandle.length; i++) {
			if (eventstohandle[i].event==="beforeload") {
				runFunction(eventstohandle[i].func, eventstohandle[i].arg);
			}
			if (eventstohandle[i].event==="onready") {
				justres = [];	
				for (j=0;j<resourcestoload.length;j++) { 
					justres.push(resourcestoload[j].src);
				}	
				eventstohandle[i].rlist=justres;
				onreadyevent=eventstohandle[i];
			}
		}

		//==--   process the resources
		var resname="", restype="", xxx, trackstruct, callbstruct, estruct;
		var addcallback, addevent,allresourcesloaded=true;
		for (j = 0; j < resourcestoload.length; j++) {
			// does it need to be loaded ?
			resname=resourcestoload[j].src;
			restype=resourcestoload[j].type;
			
			if (!$.rloader.track[resname]) {
				allresourcesloaded=false;
				trackstruct={};
				trackstruct.status=0;
				trackstruct._cback=[];
				trackstruct._evts=[];
				callbstruct={};
				callbstruct.callback=resourcestoload[j].callback;
				callbstruct.arg=resourcestoload[j].arg;
				trackstruct._cback.push(callbstruct);
				// add flag to process the onreadyevents
				if (onreadyevent!==null) { 
					trackstruct._evts.push(onreadyevent);
				}
				$.rloader.track[resname] = trackstruct;
				
				if (restype === 'css') {
					loadCSS(resourcestoload[j]);
					all_loaded=false;
				}
				if (restype === 'js') {
					loadJS(resourcestoload[j]);
					all_loaded=false;
				}
			} else {

				if ($.rloader.track[resname].status===1) {
					callbstruct={};
					callbstruct.callback=resourcestoload[j].callback;
					callbstruct.arg=resourcestoload[j].arg;
					$.rloader.track[resname]._cback.push(callbstruct);
					if (onreadyevent!==null) { 
						$.rloader.track[resname]._evts.push(onreadyevent);
					}	
					processAttachedCallbacks(resname);
					// dont have to change all_loaded here, because it was allready loaded !
				} else {
					if ($.rloader.track[resname].status===0) {
						addcallback=true;
						for (xxx = 0; xxx < $.rloader.track[resname]._cback.length; xxx++) {
							// walk through all existing callbacks and compare those
							if (	$.rloader.track[resname]._cback[xxx].callback===resourcestoload[j].callback && 
									$.rloader.track[resname]._cback[xxx].arg===resourcestoload[j].arg) {
								addcallback=false;
								break;
							}
						}
						if (addcallback) {
							callbstruct={};
							callbstruct.callback=resourcestoload[j].callback;
							callbstruct.arg=resourcestoload[j].arg;
							$.rloader.track[resname]._cback.push(callbstruct);
						}
						// add flag to process the onreadyevents
						if (onreadyevent!==null) { 
							addevent=true;
							for (xxx = 0; xxx < $.rloader.track[resname]._evts.length; xxx++) {
								estruct=$.rloader.track[resname]._evts[xxx];
								// LLS 20110724
								if (estruct===null) {
									continue;
								}

								if (	estruct.event	===	onreadyevent.event 			&& 
										estruct.func	===	onreadyevent.func			&&
										estruct.arg		===	onreadyevent.arg			&&
										estruct.rlist	=== onreadyevent.rlist	&&
										estruct.fired	=== 0	) {
									// if this event is allready in the list and not fired	
									addevent=false;	
									break;
								}
							}
							if (addevent) {
								$.rloader.track[resname]._evts.push(onreadyevent);
							}
						}
					} else {
						// the status could be -1 (but that is an error situation)
						// the resource does not exist or timed out.... something went wrong
						allresourcesloaded=false;   // ???????? should we do this ????
						
					}
				}
			}
		}

		// All resources are being loaded or are loaded into the list
		// BUT 1 thing to check if all resources were loaded, then we need to trigger the onready event !!!
		if (allresourcesloaded && onreadyevent !== null) {
			runFunction(onreadyevent.func, onreadyevent.arg); 
		}

	};
    $.rloader.track = { defaultcache:true, defaultasync:true };
})(jQuery);
