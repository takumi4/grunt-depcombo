(function(win) {
	var doc = win.document,
		loc = win.location,
		$ = (win['Zepto'] || win['$']),
		LOG_URL = 'http://log.m.taobao.com/js.do',
		COOKIE_REG = /(?:^|\s)cna=([^;]+)(?:;|$)/
		;		

	function getApRef() {
		return loc.href.toString();
	}

	function getApIP() {
		return '';
	}

	function getApCNA() {
		return doc.cookie.match(COOKIE_REG)
	}

	function parseUrl(url) {
		var a = doc.createElement('a');
		a.href = url;

		return a;
	}

	$.orginAjax = $.ajax;

	/**
	 * 扩展后的$.ajax方法，其中options扩充两个参数，分为为aplus和apdata。
	 * aplus为埋点开关
	 */
	$.ajax = function(options) {
		var ap_ref, ap_cna, ap_ip, ap_data, ap_uri, ap_options,
			aplus = (options.aplus != null ? options.aplus : $.ajaxSettings.aplus || false),
			params = {'_aplus' : '1'},
			complete = options.complete
			;

		function _complete() {
			complete && complete.apply(this, arguments);

			if (aplus === true || aplus === 1) {
				ap_ref = getApRef();
				ap_cna = getApCNA();
				ap_ip = getApIP();
				ap_data = options.apdata || options.ap_data;
		        ap_uri = options.apuri || options.ap_uri;
				ap_ref && (params['ap_ref'] = ap_ref);
				ap_cna && (params['ap_cna'] = ap_cna[1]);
				ap_data && (params['ap_data'] = ap_data);
		        ap_uri && (params['ap_uri'] = ap_uri);
				ap_ip && (params['ap_ip'] = ap_ip);

				ap_options = {
					url : LOG_URL,
					data : params,
					type : 'GET',
					dataType : 'jsonp'
					//headers : {}
				}
				
				// jsonp中，header无用
				// for (var k in params) {
				// 	ap_options.headers[k] = params[k];
				// }

				if (aplus === 2) {
					// TODO 延迟发送的功能，先留坑
				} else {
					// 即可发送埋点请求
					$.orginAjax(ap_options);
				}
			}
		}

		if (options.url) {
			options.complete = _complete;
			$.orginAjax(options);
		} else {
			_complete();
		}
	}
})(window);/**
 * @fileoverview slider组件 (支持translate3d)
 * @module zepto
 * @namespace lib.Slider
 * @author caochun.cr@taobao.com (曹纯) , siqi.song@alibaba-inc.com (颂奇)
 * @since 2013.8.2
 */
;(function(win, $){
	var //isAndroid = (/android/gi).test(navigator.appVersion),
		hasTransform = function() { // 判断浏览器是否支持transform（仅webkit）
			var ret = ('WebkitTransform' in document.documentElement.style) ? true : false;
			return ret;
		},
		has3d = function() { // 判断浏览器是否支持3d效果（仅webkit）
			var style,
				ret = false,
				div = document.createElement('div'),
				style = ['&#173;','<style id="smodernizr">', '@media (transform-3d),(-webkit-transform-3d){#modernizr{left:9px;position:absolute;height:3px;}}', '</style>'].join(''),
				mStyle = document.documentElement.style;
			div.id = 'modernizr';
			div.innerHTML += style;
			document.body.appendChild(div);
			if ('WebkitPerspective' in mStyle && 'webkitPerspective' in mStyle) {
				ret = (div.offsetLeft === 9 && div.offsetHeight === 3);
			}
			div.parentNode.removeChild(div);
			return ret;
		},
		
		gv1 = has3d ? 'translate3d(' : 'translate(',
		gv2 = has3d ? ',0)' : ')';
		
	var TouchSlider = function(container,options){
		if(!container) return null;
		if(options) options.container = container; //container会覆盖options内的container
		else options = typeof container == 'string' ? {'container' : container} : container;
		$.extend(this,{
			container : ".slider",  //大容器，包含面板元素、触发元素、上下页等
			wrap : null,  //滑动显示区域，默认为container的第一个子元素。（该元素固定宽高overflow为hidden，否则无法滑动）
			panel : null,  //面板元素，默认为wrap的第一个子元素
			trigger : null,   //触发元素，也可理解为状态元素
			activeTriggerCls : 'sel',  //触发元素内子元素的激活样式
			hasTrigger : false,  //是否需要触发事件，例tab页签就需要click触发
			steps : 0,  //步长，每次滑动的距离
			left : 0,  //panel初始的x坐标
			visible : 1,  //每次滑动几个panels，默认1
			margin : 0,  //面板元素内子元素间的间距
			curIndex : 0,  //初始化在哪个panels上，默认0为第一个
			duration : 300,  //动画持续时间
			//easing : 'ease-out', //动画公式
			loop : false,  //动画循环
			play : false,  //动画自动播放
			interval : 5000,  //播放间隔时间，play为true时才有效
			useTransform : has3d ? true : false, //以translate方式动画，安卓现在也支持了
			
			lazy : '.lazyimg', //图片延时加载属性
			lazyIndex : 1,  //默认加载到第几屏
			callback : null, //动画结束后触发
			
			prev : null,  //上一页
			next : null,  //下一页
			activePnCls : 'none'  //prev和next在头尾时的样式
		},options);
		
		this.findEl() && this.init() && this.increaseEvent();
	};
	$.extend(TouchSlider.prototype,{
		reset : function(options){
			$.extend(this,options || {});
			this.init();
		},
		findEl : function(){
			var container = this.container = $(this.container);
			if(!container.length){return null;}
			
			this.wrap = this.wrap && container.find(this.wrap) || container.children().first();
			if(!this.wrap.length){return null;}
			
			this.panel = this.panel && container.find(this.panel) || this.wrap.children().first();
			if(!this.panel.length){return null;}
			
			this.panels = this.panel.children();
			if(!this.panels.length){  //对于没有图片的元素，直接隐藏
				this.container.hide();
				return null;
			}
			
			this.trigger = this.trigger && container.find(this.trigger);
			this.prev = this.prev && container.find(this.prev);
			this.next = this.next && container.find(this.next);
			
			return this;
		},
		init : function(){
			var wrap = this.wrap,
			panel = this.panel,
			panels = this.panels,
			trigger = this.trigger,
			len = this.len = panels.length,  //子元素的个数
			margin = this.margin,
			allWidth = 0,  //滑动容器的宽度
			status = this.visible,  //每次切换多少个panels
			useTransform = this.useTransform = hasTransform ? this.useTransform : false;  //不支持直接false
			
			this.steps = this.steps || wrap.width();  //滑动步长，默认wrap的宽度
			panels.each(function(n,item){
				allWidth += item.offsetWidth;
			});
			
			if(margin && typeof margin == 'number'){
				allWidth += (len-1) * margin;  //总宽度增加
				this.steps += margin;  //步长增加margin
			}
			
			if(status > 1){this.loop = false;}  //如果一页显示的子元素超出1个，或设置了步长，则不支持循环；若自动播放，则只支持一次
			
			//初始位置
			var initLeft = this.left;
			initLeft -= this.curIndex * this.steps;
			this.setCoord(panel,initLeft);
			if(useTransform){
				if(has3d){
					wrap.css({'-webkit-transform':'translateZ(0)'});  //防止ios6下滑动会有顿感
				}
				panel.css({'-webkit-backface-visibility':'hidden'});
				//panels.css({'-webkit-transform':gv1+'0,0'+gv2});
			}
			
			var pages = this._pages = Math.ceil(len/status);  //总页数
			//初始坐标参数
			this._minpage = 0;  //最小页
			this._maxpage = this._pages - 1;  //最大页
			
			this.loadImg();
			this.updateArrow();
			if(pages <= 1){ //如果没超出一页，则不需要滑动
				this.getImg(panels[0]);  //存在一页的则显示第一页
				trigger && trigger.hide();
				return null;
			}
			
			if(this.loop){  //复制首尾以便循环
				panel.append(panels[0].cloneNode(true));
				var lastp = panels[len-1].cloneNode(true);
				panel.append(lastp);
				this.getImg(lastp);
				lastp.style.cssText += 'position:relative;left:'+(-this.steps*(len+2))+'px;';
				allWidth += panels[0].offsetWidth;
				allWidth += panels[len-1].offsetWidth;
			}
			panel.css('width',allWidth);
			if(trigger && trigger.length){  //如果触发容器存在，触发容器无子元素则添加子元素
				var temp='',
				childstu = trigger.children();
				if(!childstu.length){
					for(var i=0;i<pages;i++){
						temp += '<span'+(i == this.curIndex ? " class="+ this.activeTriggerCls +"" : "")+'></span>';
					}
					trigger.html(temp);
				}
				this.triggers = trigger.children();
				this.triggerSel = this.triggers[this.curIndex];  //当前状态元素
			}
			else{
				this.hasTrigger = false;
			}
			
			return this;
		},
		increaseEvent : function(){
			var that = this,
			_panel = that.wrap[0],  //外层容器
			prev = that.prev,
			next = that.next,
			triggers = that.triggers;
			if(_panel.addEventListener){
				_panel.addEventListener('touchstart', that, false);
				_panel.addEventListener('touchmove', that, false);
				_panel.addEventListener('touchend', that, false);
				_panel.addEventListener('webkitTransitionEnd', that, false);
				_panel.addEventListener('msTransitionEnd', that, false);
				_panel.addEventListener('oTransitionEnd', that, false);
				_panel.addEventListener('transitionend', that, false);
			}
			if(that.play){that.begin();}
			if(prev && prev.length){
				prev.on('click',function(e){that.backward.call(that,e)});
			}
			if(next && next.length){
				next.on('click',function(e){that.forward.call(that,e)});
			}
			if(that.hasTrigger && triggers){
				triggers.each(function(n,item){
					$(item).on('click',function(){
						that.slideTo(n);
					});
				});
			}
		},
		handleEvent : function(e){
			switch(e.type){
				case 'touchstart':
					this.start(e);break;
				case 'touchmove':
					this.move(e);break;
				case 'touchend':
				case 'touchcancel':
					this.end(e);break;
				case 'webkitTransitionEnd':
				case 'msTransitionEnd':
				case 'oTransitionEnd':
				case 'transitionend': 
					this.transitionEnd(e); break;
			}
		},
		loadImg : function(n){  //判断加载哪屏图片
			n = n || 0;
			//不考虑循环时候复制的元素
			if(n < this._minpage) n = this._maxpage;
			else if(n > this._maxpage) n = this._minpage;
			
			var status = this.visible,
			lazyIndex = this.lazyIndex - 1,
			maxIndex = lazyIndex + n;
			if(maxIndex > this._maxpage) return;
			maxIndex += 1;  //补上,for里判断没有=
			var start = (n && (lazyIndex + n) || n) * status,
			end = maxIndex * status,
			panels = this.panels;
			end = Math.min(panels.length,end);
			for(var i = start;i < end;i++){
				this.getImg(panels[i]);
			}
		},
		getImg : function(obj){  //加载图片
			if(!obj) return;
			obj = $(obj);
			if(obj.attr('l')){return;}  //已加载
			var that = this,
			lazy = that.lazy,
			cls = 'img' + lazy;
			lazy = lazy.replace(/^\.|#/g,'');
			obj.find(cls).each(function(n,item){
				var nobj = $(item);
				src = nobj.attr('dataimg');
				if(src){
					nobj.attr('src',src).removeAttr('dataimg').removeClass(lazy);
				}
			});
			obj.attr('l','1');
		},
		start : function(e){  //触摸开始
			var et = e.touches[0];
			//if(this._isScroll){return;}  //滑动未停止，则返回
			this._movestart = undefined;
			this._disX = 0;
			this._coord = {
				x : et.pageX , 
				y : et.pageY
			};
		},
		move : function(e){
			if(e.touches.length > 1 || e.scale && e.scale !== 1) return;
			var et = e.touches[0],
			disX = this._disX = et.pageX - this._coord.x,
			initLeft = this.left,
			tmleft;
			if(typeof this._movestart == 'undefined'){  //第一次执行touchmove
				this._movestart = !!(this._movestart || Math.abs(disX) < Math.abs(et.pageY - this._coord.y));
			}
			if(!this._movestart){ //不是上下
				e.preventDefault();
				this.stop();
				if(!this.loop){  //不循环
					disX = disX / ( (!this.curIndex && disX > 0 || this.curIndex == this._maxpage && disX < 0 ) ? ( Math.abs(disX) / this.steps + 1 ) : 1 );  //增加阻力
				}
				tmleft = initLeft - this.curIndex * this.steps + disX;
				this.setCoord(this.panel , tmleft);
				this._disX = disX;
				//this._left = tmleft;
			}
		},
		end : function(e){
			if(!this._movestart){  //如果执行了move
				var distance = this._disX;
				if(distance < -10){
					e.preventDefault();
					this.forward();
				}else if(distance > 10){
					e.preventDefault();
					this.backward();
				}
				distance = null;
			}
		},
		backward : function(e){
			if(e&&e.preventDefault){e.preventDefault()}
			var cur = this.curIndex,
			minp = this._minpage;
			cur -= 1;
			if(cur < minp){
				if(!this.loop){cur = minp;}
				else{cur = minp - 1;}
			}
			this.slideTo(cur);
			this.callback && this.callback(Math.max(cur,minp),-1);
		},
		forward : function(e){
			if(e&&e.preventDefault){e.preventDefault()}
			var cur = this.curIndex,
			maxp = this._maxpage;
			cur += 1;
			if(cur > maxp){
				if(!this.loop){cur = maxp;}
				else{cur = maxp + 1;}
			}
			this.slideTo(cur);
			this.callback && this.callback(Math.min(cur,maxp),1);
		},
		setCoord : function(obj,x){
			this.useTransform && obj.css("-webkit-transform",gv1 + x + 'px,0' + gv2) || obj.css("left",x);
		},
		slideTo : function(cur,duration){
			cur = cur || 0;
			this.curIndex = cur;  //保存当前屏数
			var panel = this.panel,
			style = panel[0].style,
			scrollx = this.left - cur * this.steps;
			style.webkitTransitionDuration = style.MozTransitionDuration = style.msTransitionDuration = style.OTransitionDuration = style.transitionDuration = (duration || this.duration) + 'ms';
			this.setCoord(panel,scrollx);
			this.loadImg(cur);
		},
		transitionEnd : function(){
			var panel = this.panel,
			style = panel[0].style,
			loop = this.loop,
			cur = this.curIndex;
			if(loop){  //把curIndex和坐标重置
				if(cur > this._maxpage){
					this.curIndex = 0;
				}else if(cur < this._minpage){
					this.curIndex = this._maxpage;
				}
				this.setCoord(panel,this.left - this.curIndex * this.steps);
			}
			if(!loop && cur == this._maxpage){  //不循环的，只播放一次
				this.stop();
				this.play = false;
			}
			else{
				this.begin();
			}
			this.update();
			this.updateArrow();
			style.webkitTransitionDuration = style.MozTransitionDuration = style.msTransitionDuration = style.OTransitionDuration = style.transitionDuration = 0;
			//this._isScroll = false;
		},
		update : function(){
			var triggers = this.triggers,
			cls = this.activeTriggerCls,
			curIndex = this.curIndex;
			if(triggers && triggers[curIndex]){
				this.triggerSel && (this.triggerSel.className = '');
				triggers[curIndex].className = cls;
				this.triggerSel = triggers[curIndex];
			}
		},
		updateArrow : function(){  //左右箭头状态
			var prev = this.prev,
			next = this.next;
			if(!prev || !prev.length || !next || !next.length) return;
			if(this.loop) return;  //循环不需要隐藏
			var cur = this.curIndex,
			cls = this.activePnCls;
			cur <= 0 && prev.addClass(cls) || prev.removeClass(cls);
			//console.log(cur,this._maxpage);
			cur >= this._maxpage && next.addClass(cls) || next.removeClass(cls);
		},
		begin : function(){
			var that = this;
			if(that.play && !that._playTimer){  //自动播放
				that.stop();
				that._playTimer = setInterval(function(){
					that.forward();
				},that.interval);
			}
		},
		stop : function(){
			var that = this;
			if(that.play && that._playTimer){
				clearInterval(that._playTimer);
				that._playTimer = null;
			}
		},
		destroy : function(){
			var that = this,
			_panel = that.wrap[0],
			prev = that.prev,
			next = that.next,
			triggers = that.triggers;
			if(_panel.removeEventListener){
				_panel.removeEventListener('touchstart', that, false);
				_panel.removeEventListener('touchmove', that, false);
				_panel.removeEventListener('touchend', that, false);
				_panel.removeEventListener('webkitTransitionEnd', that, false);
				_panel.removeEventListener('msTransitionEnd', that, false);
				_panel.removeEventListener('oTransitionEnd', that, false);
				_panel.removeEventListener('transitionend', that, false);
			}
			if(prev && prev.length) prev.off('click');
			if(next && next.length) next.off('click');
			if(that.hasTrigger && triggers){
				triggers.each(function(n,item){
					$(item).off('click');
				});
			}
		},
		// 去掉了原$.fn.slider方法，改用这个方法
		attachTo : function(obj, options) {
			obj = $(obj);
			return obj.each(function(n,item){
				if (!item.getAttribute('l')) {
					item.setAttribute('l', true);
					TouchSlider.cache.push(new TouchSlider(item, options));
				}
			});
		}
	});
	TouchSlider.cache = [];
	/*$.fn.slider = function(options){
		return this.each(function(n,item){
			if(!item.getAttribute('l')){
				item.setAttribute('l',true);
				TouchSlider.cache.push(new TouchSlider(item,options));
			}
		});
	}*/
	TouchSlider.destroy = function(){
		var cache = TouchSlider.cache,
		len = cache.length;
		//console.log(TouchSlider.cache);
		if(len < 1){return;}
		for(var i=0;i<len;i++){
			cache[i].destroy();
		}
		TouchSlider.cache = [];
		//console.log(TouchSlider.cache);
	};
	win.lib = win.lib || {};
	lib.Slider = TouchSlider;
}) (window, $);/*
*页面图片延迟加载
*
*  caochun edit by 20120724,修复safari下,前进回退键到当前页面onscroll事件失效
*  caochun edit by 20130220,扩展图片高清方案
*/
(function(win){
	var lib = win['lib'] || (win['lib'] = {}),
		$ = win['Zepto'] || win['$'];

	function compare(d1,d2){
		var left = d2.right > d1.left && d2.left < d1.right,
		top = d2.bottom > d1.top && d2.top < d1.bottom;
		return left && top;
	}

	lib.lazyload = {
		init : function(opt){
			this.img.init(opt);
		},
		img : {
			init : function(opt){
				var that = this;
				if(that.isload){  //已经初始化过，就触发trigger
					that.trigger();
					return;
				}
				var op = {
					lazyHeight : 400, //预加载当前屏幕以下lazyHeight内的图片
					lazyWidth : 0,
					definition : false,  //true表示retina需要显示size大小的图片
					size : null  //图片尺寸大小，默认直接去掉后缀使用原图大小，支持多种DPI{'1.5' : '120x120' , '2' : '180x180'}
				},
				opt = opt || {};
				$.extend(that,op,opt);
				var definition = that.definition,
				devicePixelRatio = win.devicePixelRatio;
				that.definition = definition && devicePixelRatio && devicePixelRatio > 1 || false;  //配置true且devicePixelRatio大于1，部分安卓机器是1.5的
				that.DPR = devicePixelRatio;
				var minDist = 5,
				minTime = 200,  //单位ms
				isPhone = that.isPhone = that.fetchVersion();
				if(isPhone){  //针对ios6以下的版本,后退键回到页面不触发onscroll时，直接使用touch事件替代
					var touchLazy,
					timerPhone;
					$(win).on('touchstart', function(ev){
						//var et = ev.changedTouches[0];
						touchLazy = {
							//sx : et.clientX,
							sy : win.pageYOffset,
							time : Date.now()
						};
						//$('#test')[0].innerHTML += 'starty:'+window.scrollY+'<br>';
						timerPhone && clearTimeout(timerPhone);
					}).on('touchend', function(ev){
						if(ev && ev.changedTouches){
							var disty = Math.abs(win.pageYOffset - touchLazy.sy);
							//distx = Math.abs(et.clientX - touchLazy.sx),
							//$('#test')[0].innerHTML += 'endy:'+window.scrollY+'<br>';
							if(disty > minDist){/* && disty > distx*/
								var timedist = Date.now() - touchLazy.time;
								timerPhone = setTimeout(function(){
									that.changeimg();
									touchLazy = {};
									clearTimeout(timerPhone);
									timerPhone = null;
								},timedist > minTime ? 0 : 200);
							}
						}
						else{  //trigger触发
							that.changeimg();
						}
					}).on('touchcancel',function(){
						timerPhone && clearTimeout(timerPhone);
						touchLazy = null;
					});
				}
				else{
					$(win).on('scroll', function(){
						that.changeimg();
					});
				}
				that.trigger();
				that.isload = true;
			},
			trigger : function(size){
				var that = this,
				isPhone = that.isPhone,
				eventType = isPhone && 'touchend' || 'scroll';
				if(that['imglist']){
					that['imglist'].each(function(n,node){
						node && (node.onerror = node.onload = null);
					});
				}
				size && (that.size = size);
				that['imglist'] = $('img.lazy');
				//that['prevlist'] = $(that['imglist'].concat());
				$(window).trigger(eventType);
			},
			fetchVersion : function(){
				var systemVer = navigator.appVersion.match(/(iPhone\sOS)\s([\d_]+)/),
				isPhone = systemVer && true || false,
				version = isPhone && systemVer[2].split('_');
				version = version && parseFloat(version.length > 1 ? version.splice(0,2).join('.') : version[0],10);
				return isPhone && version < 6;
			},
			setImgSrc : function(url,size){
				if(!url) return;
				size = size || this.size;
				size = size && (typeof size == 'string' ? size : size[this.DPR]) || null;
				size && (size = ['_' , size , '.jpg'].join(''));
				var arr = url.lastIndexOf('_.'),  //查找最后一个，url中可能存在_.
				last = arr != -1 ? url.slice(arr+2) : null,  //取到_.后的字符串
				isWebp = last && last.toLowerCase() == 'webp' ? true : false,  //是否webp
				newurl = isWebp ? url.slice(0,arr) : url,
				src = newurl.replace(/_\d+x\d+\.jpg?/g,'');  //去掉存在的后缀_100x100.jpg
				src += size;
				return isWebp && (src + '_.webp') || src;
			},
			getCoord : function (obj,param){
				if(!obj) return;
				var w,h,l,t,el;
				if(obj != win){
					el = obj.offset ? obj : $(obj);
					el = el.offset();
					w = el.width;
					h = el.height;
					l = el.left;
					t = el.top;
				}
				else{  //container
					var lazyHeight = param && param.y || 0,
					lazyWidth =  param && param.x || 0;
					w = obj.innerWidth + lazyWidth;
					h = obj.innerHeight + lazyHeight;
					l = obj.pageXOffset;
					t = obj.pageYOffset;
				}
				return{
					'left' : l,
					'top' : t,
					'right' : l + w,
					'bottom' : t + h
				}
			},
			changeimg : function(){
				var that = this,
				win = window,
				lazyo = {
					x : that.lazyWidth,
					y : that.lazyHeight
				},
				definition = that.definition;
				/*function inViewport(el){
					var top = win.pageYOffset,
					btm = top + win.innerHeight,
					offset = el.offset(),
					elTop = offset.top;
					//console.log(el.offset().top);
					if(elTop == 0 && offset.left == 0){  //当页面隐藏时，宽高为0（img取高度会存在延时，所以取img的left & top）
						return false;
					}
					return elTop >= top && elTop - lazyHeight <= btm;
				}*/
				function act(_self,n){
					var original = _self.attr('dataimg'),
					datasize = _self.attr('datasize');
					if(!original) return;
					if(definition || datasize){
						original = that.setImgSrc(original,datasize);
					}
					_self.attr('src', original);
					_self.css('visibility','visible');
					if(!_self[0].onload){
						_self[0].onload = _self[0].onerror = function(){
							$(this).removeClass('lazy').removeAttr('dataimg');
							that['imglist'][n] = null;
							this.onerror = this.onload = null;
						}
						/*_self[0].onerror = function(){
							this.src = 'http://a.tbcdn.cn/mw/s/common/icons/nopic/no-90.png';
							$(this).removeClass('lazy').removeAttr('dataimg');
							that['imglist'][n] = null;
							this.onerror = this.onload = null;
						}*/
					}
				}
				that['imglist'].each(function(index,node){
					if(!node) return;
					var $this = $(node);
					if(!compare(that.getCoord(win,lazyo),that.getCoord($this))) return;
					act($this,index);
				});
			}
		}
	};

})(window, window['app']);
(function(win){
	var app = win['app'] || (win['app'] = {}),
		indexApp = app['index'] || (app['index'] = {}),
		cardTpl = indexApp.card = {},
		dpr = win.devicePixelRatio
		;

	var playceholder = 'http://gtms02.alicdn.com/tps/i2/T1gtStFoVeXXbEBq2D-576-576.png_' + (dpr==2?'580x580':'290x290') + '.jpg',
		template = {
			layout: function(data) {
				var html = '';
				for (var i = 0; i < data.length; i++) {
					if (this[data[i].cardType]) html += this[data[i].cardType](data[i]);
				}
				return html;
			},

			item: function(data) {
				return '' + 
					'<a href="' + data.redirectUrl + '">' +
						'<img class="lazy" src="' + playceholder + '" dataimg="' + data.picUrl + '" height="100%">' +
					'</a>';
			},

			c1: function(data) {
				return '' + 
					'<div class="card tpl c1">' + 
						'<div class="title"><span>' + data.title + '</span></div>' +
						'<div class="row1col1 big">' +
							this.item(data.contentList[0]) + 
						'</div>' +
						'<div class="row1col1">' +
							this.item(data.contentList[1]) + 
						'</div>' +
						'<div class="row1col1">' +
							this.item(data.contentList[2]) + 
						'</div>' +
						'<h4 class="decoration"><span></span></h4>' +
					'</div>';
			},

			c2: function(data) {
				return '' +
					'<div class="card tpl c2">' + 
						'<div class="title"><span>' + data.title + '</span></div>' +
						'<div class="row1col1">' +
							this.item(data.contentList[0]) +
						'</div>' +
						'<div class="row2col2">' +
							'<div class="col1">' +
								this.item(data.contentList[1]) +
							'</div>' +
							'<div class="col2">' +
								'<div class="row1">' +
									this.item(data.contentList[2]) +
								'</div>' +
								'<div class="row2">' +
									this.item(data.contentList[3]) +
								'</div>' +
							'</div>' +
						'</div>' +
						'<h4 class="decoration"><span></span></h4>' +
					'</div>';
			},

			c3: function(data) {
				return '' + 
					'<div class="card tpl c3">' + 
						'<div class="title"><span>女人帮3</span></div>' +
						'<div class="row2col2">' +
							'<div class="col1">' +
								'<div class="row1">' +
									this.item(data.contentList[0]) +
								'</div>' +
								'<div class="row2">' +
									this.item(data.contentList[1]) +
									this.item(data.contentList[2]) +
								'</div>' +
							'</div>' +
							'<div class="col2">' +
								this.item(data.contentList[3]) +
								this.item(data.contentList[4]) +
								this.item(data.contentList[5]) +
							'</div>' +
						'</div>' +
						'<h4 class="decoration"><span></span></h4>' +
					'</div>';
			}
		};

	cardTpl.render = function(data) {
		return template.layout(data);
	}


})(window, window['$']);
(function(win){
	var app = win['app'] || (win['app'] = {}),
		indexApp = app['index'] || (app['index'] = {}),
		footerTpl = indexApp.footer = {},
		dpr = win.devicePixelRatio
		;

	var template = {
			layout: function(data) {
				return '' + 
					'<div class="hots">' + this.hots(data.hots) + '</div>' +
					'<div class="feedback">' + this.feedback(data.feedback) + '</div>';
			},

			hots: function(data) {
				if (data[data.length - 1] == null) data.pop();

				function line(d) {
					var html = '';

					for (var i = 0; i < Math.max(d.length, 3); i++) {
						if (d[i]) {
							html += '<a href="' + d[i].redirectUrl + '">' + d[i].description + '</a>';
						} else {
							html += '<a class="placeholder"></a>';
						}
					}
					
					return html;
				}

				function section(d) {
					if (d[d.length - 1] == null) d.pop();

					var html = '<ul' + (d[0].noborder === 'true'?' class="noborder"':'') + '>';

					for (var i = 0; i < d.length; i+=3) {
						html += '<li>' + line(d.slice(i, i + 3)) + '</li>';
					}
					html += '</ul>';

					return html;
				}

				var html = '';
				for (var i = 0; i < data.length; i++) {
					html += section(data[i]);
				}

				return html;
			},

			feedback: function(data) {
				function line(d) {
					if (d[d.length - 1] == null) d.pop();

					var html = '';

					for (var i = 0; i < d.length; i++) {
						html += '<li><a href="' + d[i].redirectUrl + '">' + d[i].description + '</a></li>';
					}

					return html;
				}

				return 	'' + 
					'<h3>' + data.title + '</h3>' + 
					'<ul>' + line(data.list)  + '<ul>';
			}
		};

	footerTpl.render = function(data) {
		return template.layout(data);
	}


})(window, window['$']);
(function(win){
	var app = win['app'] || (win['app'] = {}),
		indexApp = app['index'] || (app['index'] = {}),
		guideTpl = indexApp.guide = {},
		dpr = win.devicePixelRatio
		;

	var playceholder = 'http://gtms02.alicdn.com/tps/i2/T1gtStFoVeXXbEBq2D-576-576.png_' + (dpr==2?'580x580':'290x290') + '.jpg',
		template = {
			layout: function(data) {
				return '' + 
					'<div id="first-view">' + 
						'<div class="sliderwrap"><ul>' + this.firstView(data.firstViewPoint) + '</ul></div>' + 
						'<div class="indicator">' + 
							//'<span class="cur"></span><span></span>' + 
						'</div>' + 
					'</div>' + 
					'<div id="apps">' +
						'<div class="sliderwrap"><ul>' + this.apps(data.apps) + '</ul></div>' +
						'<div class="indicator">' +
							//'<span class="cur"></span><span></span>' +
						'</div>' +
					'</div>' +
					'<h4 class="title"><span>精选导购</span></h4>' +
					'<div id="channel" class="tpl c0">' + this.channel(data.channel) +'</div>' +
					'<div id="category">' + this.category(data.category) + '</div>' +
					'<h4 class="decoration"><span></span></h4>';
			},

			firstView: function(data) {
				var html = '';
				for (var i = 0; i < data.length; i++) {
					html += '<li><a href="' + data[i].redirectUrl + '"><img class="lazyimg" src="' + playceholder + '" dataimg="' + data[i].picUrl + '" height="100%"></a></li>'
				}
				return html;
			},

			apps: function(data) {
				if (data[data.length - 1] == null) data.pop();

				function line(d) {
					var html = '';
					for (var i = 0; i < d.length; i++) {
						html += '<a href="' + d[i].redirectUrl + '">' + 
									'<img class="lazyimg" src="' + playceholder + '" dataimg="' + d[i].picUrl + '" />' + 
									'<span>' + d[i].description + '</span>' + 
								'</a>'
					}
					return html;
				}

				function page(d) {
					return '' +
						'<div>' + line(d.slice(0, 4))  + '</div><div>' + line(d.slice(4, 8)) + '</div>';
				}

				return '' + 
					'<li>' + page(data.slice(0, 8)) + '</li><li>' + page(data.slice(8, 16)) + '</li>';
			},

			channel: function(data) {
				function item(d) {
					return '' + 
						'<a href="' + d.redirectUrl + '">' +
							'<img class="lazy" src="' + playceholder + '" dataimg="' + d.picUrl + '" height="100%" />' +
						'</a>';
				}

				return '' + 
					'<div class="row1col2">'+
						item(data[0]) + 
						item(data[1]) +
					'</div>' +
					'<div class="row1col2">'+
						item(data[2]) + 
						item(data[3]) +
					'</div>';
			},

			category: function(data) {
				function item(d) {
					return '' + 
						'<a href="' + d.redirectUrl + '">' + d.description + '</a>';
				}

				return '' + 
					item(data[0]) + item(data[1]) + item(data[2]) + item(data[3]);
			}
		};

	guideTpl.render = function(data) {
		return template.layout(data);
	}


})(window, window['$']);




(function(win, $) {
	var slice = Array.prototype.slice, 
		app = win['app'] || (win['app'] = {}),
		lib = win['lib'] || (win['lib'] = {}),
		indexApp = app['index'] || (app['index'] = {});

	// function $(s, p) {
	// 	p || (p = document);

	// 	if (s.indexOf('#') == 0 && s.indexOf(' ') < 0) {
	// 		return [p.getElementById(s.substring(1))];
	// 	} else if (s.indexOf('.') === 0 && s.indexOf(' ') < 0) {
	// 		return slice.call(p.getElementsByClassName(s.substring(1)));
	// 	} else {
	// 		return slice.call(p.querySelectorAll(s));
	// 	}
	// }

	var syncNumber = {};
	function sync(name, callback, func) {
		var nameSplit = name.split(':'),
			num = syncNumber[nameSplit[0]] || (syncNumber[nameSplit[0]] = {});
		
		function done(data) {
			num[nameSplit[1]] = data || true;
			var keys = Object.keys(num);
			for (var i = 0; i < keys.length; i++) {
				if (!num[keys[i]]) {
					return;
				}
			}
			callback && callback(num);
			// for (var i = 0; i < keys.length; i++) {
			// 	num[keys[i]] = false;
			// }
		}

		num[nameSplit[1]] = false;
		setTimeout(function(){
			func(done);
		}, 1);

		// return function() {
		// 	var args = slice.call(arguments);
		// 	args.push(done);
		// 	if (!name[nameSplit[1]]) {
		// 		func.apply(this, args);
		// 	}
		// }
	}

	function touchPrevent(e) {
		e.preventDefault();
	}

	document.addEventListener('touchmove', touchPrevent, false);
	$('#copyright')[0].innerHTML = lib.bottom.footer.getFooterTemplate();

	sync('ready:scrollTop', ready, function(done) {
		setTimeout(scrollTo, 0, 0, 1);
		setTimeout(function() {
			document.body.style.height = 'auto';
			document.body.style.minHeight = window.innerHeight + 'px';
			done();
		}, 400);
	});

	sync('ready:mtopData', ready, function(done) {
		lib.mtop.request({
			api: 'mtop.taobao.homepage.loadPageContent',
			v: '1.0',
			ttid: '123@taobao_android_1.0',
			data: {
				isFirstUse: 0
			}
		}, function(result) {
			if (result.ret[0].indexOf('SUCCESS::') === 0) {
				done(result.data);
			} else {
				// TODO error
			}
		}, function(result) {
			// TODO erroe
		});
	});

	sync('ready:tmsData', ready, function(done) {
		$.ajaxJSONP({
			url: 'http://m.taobao.com/go/rgn/h5index/opdata.html?callback=?&spm=0.0.0.0.QboqAi',
			jsonpCallback: 'jsonp_h5index_opdata',
			success: function(data) {
				done(data);
			}
		})
	});

	function ready(dataSet) {
		document.removeEventListener('touchmove', touchPrevent);
		$('#loading')[0].style.display = 'none';

		var mdata = dataSet.mtopData,
			tdata = dataSet.tmsData
			hpd = {};

		for (var k in mdata) {
			hpd[k] = mdata[k];
		}

		if (indexApp.guide && hpd.guide) {
			tdata.app || (tdata.app = []);
			hpd.guide.apps = tdata.app;
			sync('render:guide', complete, function(done) {
				var html = indexApp.guide.render(hpd.guide);
				$('#guide')[0].innerHTML = html;
				done();
			});
		}

		if (indexApp.card && hpd.marketing && hpd.marketing.cardList) {
			sync('render:card', complete, function(done){
				var html = indexApp.card.render(hpd.marketing.cardList);
				$('#cards')[0].innerHTML = html;
				done();
			});
		}

		hpd.footer = {
			hots: tdata.hots || [],
			feedback: tdata.feedback || {}
		}

		if (indexApp.footer && hpd.footer) {
			sync('render:footer', complete, function(done) {
				var html = indexApp.footer.render(hpd.footer);
				$('#others')[0].innerHTML = html;
				done();
			})
		}
	}

	function complete() {
		lib.lazyload.init();

		new lib.Slider($('#first-view'), {
			trigger: '.indicator',
			activeTriggerCls: 'cur',
			lazyIndex: 2
		});

		new lib.Slider($('#apps'), {
			trigger: '.indicator',
			activeTriggerCls: 'cur',
			lazyIndex: 1
		});
	}
})(window, window['$']);