/* ========================================================================
 * UNILIB: uni-carousel.js v0.1
 * https://stroim-web.ru/demo/uni-carousel/
 * ========================================================================
 * Copyright 2016 Aleksey Esev
 * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
 * ======================================================================== */

var UNILIB = (function() {
	var PFX = 'uni';
	return {
		modules: {
			cache: {
				carousel: {}
			}
		},
		addScrollEvent: function(params) {
            var scrollEvent = function (delta) {
				    if (!params.isEventInProgress()) {
                        params.fn[((delta > 0) ? 'next' : 'prev')]();
				    }
                },
                wheel = function (e) {
                    var delta = Math.max(-1, Math.min(1, (e.originalEvent.wheelDelta || -e.originalEvent.detail)));
                    scrollEvent(delta);
                    e.preventDefault();
                };
			params.tpl
				.addClass(PFX + '-scrollable')
            $(params.eventArea)
			    .on('mousewheel DOMMouseScroll', wheel);
		},
		addTouchEvent: function(params) {
			var inProgress,
			    coordinate,
				setCoordinate = function(e) {
					var touch = e.originalEvent.touches[0];
					coordinate = (typeof params.orientation === 'undefined' || params.orientation === 'horizontal') ? touch.clientX : touch.clientY;
				};
		    if ('ontouchstart' in params.tpl[0]) {
				params.tpl
					.addClass(PFX + '-touchable')
					.on('touchstart', params.eventArea, function(e) {
						setCoordinate(e);
						inProgress = false;
						e.stopPropagation();
					})
					.on('touchmove', params.eventArea, function(e) {
						var oldCoordinate = coordinate,
					    	delta;
						setCoordinate(e);
						delta = oldCoordinate - coordinate;
						if (delta > 0) {
							params.fn.next();
						}
						else if (delta < 0) {
							params.fn.prev();
						}
						inProgress = true;
						e.stopPropagation();
					})
					.on('touchend', params.eventArea, function(e) {
						e.stopPropagation();
						if (inProgress === true) {
							e.preventDefault();
						}
					});
		    }
			else {
				params.tpl
					.removeClass(PFX + '-touchable');
			}
		}
    };
})();

(function($, window, document) {
	
    'use strict';
	
    // CAROUSEL CLASS DEFINITION
    // =========================

    var Carousel,
	    Cache = UNILIB.modules.cache,
		addScrollEvent = UNILIB.addScrollEvent,
		addTouchEvent = UNILIB.addTouchEvent;

	Carousel = function (carousel, carouselId, options) {
		var dataOptions;

		this.autoplayTimerId    = 0;
		this.playTimerId        = 0;
		this.showTimerId        = 0;
        this.$carousel          = $(carousel);
		dataOptions             = this.$carousel.data(Carousel.PFX + 'Options');
        this.$carouselInner     = $('.' + Carousel.PFX + '-carousel-inner-limit', this.$carousel);
		this.options            = (typeof options === 'object') ? $.extend({}, Carousel.DEFAULTS, options) : (typeof dataOptions === 'undefined' ? Carousel.DEFAULTS : $.extend({}, Carousel.DEFAULTS, dataOptions));
		this.stepLength         = 33.3333;
		this.cache              = {
			                        html:   '',
								    length: 0,
									data:   {}
		                        };
		this.groupId            = 0;
		
		this.privateMethod('setStepLength');

		this.destroy = function() {
			this.privateMethod('__destruct', [carouselId]);
		};
			
		return (this.privateMethod('__construct')) ? this : false;
    };
	
    Carousel.PFX      = 'uni';

    Carousel.VERSION  = '0.1';

    Carousel.DEFAULTS = {
		width:           'auto',
		height:          'auto',
        count:           3,
        inverse:         false,
		cycle:           true,
		orientation:     'horizontal',
		autoplay:        false,
		playImmediately: true,
		pause:           false,
		time:            600,
		interval:        2000,
		mode:            'carousel',
		controls:   {
			arrows: {
				position: 'out'
			},
            indicators: {
				position: 'out'
            }			
		}
    };
	
	Carousel.prototype = (function() {
		
		// Private properties and methods
		var privateMethods = (function(privateProperties) {
			return {
				onInit: function(e) {
					var $carousel = $(e.currentTarget),
						api = e.api;
					$carousel
						.css({
							width: api.options.width,
							height: api.options.height
						})[0].className = Carousel.PFX + '-carousel ' + Carousel.PFX + '-carousel_count-' + api.options.count + ' ' + Carousel.PFX + '-carousel_' + api.options.orientation + ' ' + Carousel.PFX + '-carousel_controls-' + api.options.controls.arrows.position;
				},
				initEventConstructor: function() {
					var api = this,
						htmlCache = '';
						
					$(api.cache.html)
						.each(function(i, item) {
							htmlCache += $(item)
								.css('transition-duration', api.options.time + 'ms')[0].outerHTML;
						});
					
					if (htmlCache) {
						api.cache.html = htmlCache;
					}
					
					api
						.getItems()
						.css('transition-duration', api.options.time + 'ms');
						
					api.$carousel.trigger($.Event('init.' + Carousel.PFX + '.carousel', {
						currentTarget: api.$carousel[0],
						relatedTarget: null,
						api: api
					}));
				},			
				onBeforePlay: function(e) {
					var $carousel = $(e.currentTarget),
						api = e.api;
						
					if (privateProperties.initialPlayEvent) {
						privateProperties.initialPlayEvent = false;	
					}
					
					if ($carousel.hasClass(Carousel.PFX + '-carousel_before-play')) {
						$carousel
							.removeClass(Carousel.PFX + '-carousel_before-play');
					}
				},
				beforePlayEventConstructor: function(control) {
					var api = this;
					api.$carousel.trigger($.Event('beforePlay.' + Carousel.PFX + '.carousel', {
						currentTarget: api.$carousel[0],
						relatedTarget: control,
						api: api
					}));
					$('.' + Carousel.PFX + '-carousel-control', api.$carousel).off('focus.' + Carousel.PFX + '.carousel');	
				},
				onPlay: function(e) { 
					var api = e.api,
						order = e.order,
						autoplayFn;
					if (!api.autoplayTimerId) { 
						autoplayFn = function(customTotalTime) {
							var totalTime = typeof customTotalTime !== 'undefined' ? customTotalTime : api.options.time + api.options.interval;
							api.autoplayTimerId = setTimeout(function() {
								api.privateMethod('slideEventConstructor', [order]);
								if (api.options.autoplay) {
									autoplayFn();
								}
							}, totalTime);
						};
						if (api.options.playImmediately) {
							autoplayFn(0);
						}
						else {
							autoplayFn();
						}
					}
				},
				playEventConstructor: function(order) { 
					var control,
						api = this; 
					if (api.options.autoplay) { 
						order = (typeof order === 'undefined') ? 'next' : order;
						control = $('.' + Carousel.PFX + '-carousel-control_' + order, api.$carousel);
						api.playTimerId = setTimeout(function() {
							api.privateMethod('beforePlayEventConstructor', [control[0]]);
							api.$carousel.trigger($.Event('play.' + Carousel.PFX + '.carousel', {
								currentTarget: api.$carousel[0],
								relatedTarget: control[0],
								order: order,
								api: api
							}));
						}, (privateProperties.initialPlayEvent ? api.options.interval : 0));
					}
				},
				onStop: function(e) {
					var api = e.api,
						$carousel = $(e.currentTarget),
						args;
					$carousel
						.addClass(Carousel.PFX + '-carousel_stop');
					clearTimeout(api.autoplayTimerId);
					api.autoplayTimerId = 0;
					clearTimeout(api.playTimerId);
					api.playTimerId = 0;
					clearTimeout(api.showTimerId);
					api.showTimerId = 0;
					if ($carousel.hasClass(Carousel.PFX + '-carousel_slide')) {
						args = api.isPrev(api.cache.data.direction) ? ['next'] : ['prev'];
						api.privateMethod('slideEventConstructor', args);
					}
				},
				stopEventConstructor: function() {
					var api = this;
					if (api.options.pause) { 
						if (api.$carousel.hasClass(Carousel.PFX + '-carousel_stop')) {
							api.$carousel
								.removeClass(Carousel.PFX + '-carousel_stop');
							if (api.options.autoplay) { 
								api.privateMethod('playEventConstructor');
							}
						}
						else {
							api.$carousel.trigger($.Event('stop.' + Carousel.PFX + '.carousel', {
								currentTarget: api.$carousel[0],
								relatedTarget: api.$carouselInner[0],
								api: api
							}));
						}
					}
				},
				onSlide: function(e) {
					var api = e.api,
						data = api.cache.data;

					api.$carousel
						.removeClass(Carousel.PFX + '-carousel_show')
						.addClass(Carousel.PFX + '-carousel_slide');

					if (api.isNext(data.direction)) { // Next slide
						if (api.options.cycle) {
							if (data.isFirstVisibleFirstInGroup) {
								api.addNewGroup(data.direction, data.firstVisible);
							}
							setTimeout(function() { api.control(data.currentItem, data.direction); }, 10);
						}
						else {
							if (data.currentIndex > 0) {
								api.control(data.currentItem, data.direction);
							}
							else {
								api.control(data.currentItem, api.getDirection('prev'), api.getItems().eq(api.getItems().length - 1 - (api.options.count - 1)));
							}
						}
					}
					else if (api.isPrev(data.direction)) { // Prev slide
						if (api.options.cycle) {
							if (data.isLastVisibleLastInGroup) {
								api.addNewGroup(data.direction, data.lastVisible);
							}
							setTimeout(function() { api.control(data.currentItem, data.direction); }, 10);
						}
						else {
							if ((api.getItems().length - data.currentIndex) > api.options.count) {
								api.control(data.currentItem, data.direction);
							}
							else {
								api.control(data.currentItem, api.getDirection('next'), api.getItems().eq(0));
							}
						}
					}
					
					api.privateMethod('showEventConstructor');
				},
				slideEventConstructor: function(order) {
					var data = {},
						api = this;
						
					data.direction = api.getDirection(order);
					data.currentIndex = api.getCurrentIndex();
					data.currentItem = $('.' + Carousel.PFX + '-carousel-item:eq(' + data.currentIndex + ')', api.$carouselInner);
					data.firstVisible = api.getItems().eq(data.currentIndex);
					data.lastVisible = api.getItems().eq(data.currentIndex + (api.options.count - 1));
					data.currentGroupId = data.lastVisible.data(Carousel.PFX  + 'GroupId');
					data.isFirstVisibleFirstInGroup = data.firstVisible.is(':first-child');
					data.isLastVisibleLastInGroup = data.lastVisible.is(':last-child');

					api.cache.data = data;
						
					api.$carousel.trigger($.Event('slide.' + Carousel.PFX + '.carousel', {
						currentTarget: api.$carousel[0],
						relatedTarget: data.currentItem[0],
						api: api
					}));
				},
				onShow: function(e) {
					var api = e.api;

					api.showTimerId = setTimeout(function() {
						api.$carousel
							.removeClass(Carousel.PFX + '-carousel_slide')
							.addClass(Carousel.PFX + '-carousel_show');
					}, api.options.time);
				},
				showEventConstructor: function() {
					var api = this,
						currentItem = api.getItems().eq(api.getCurrentIndex())[0];
						
					api.$carousel.trigger($.Event('show.' + Carousel.PFX + '.carousel', {
						currentTarget: api.$carousel[0],
						relatedTarget: currentItem,
						api: api
					}));
				},
				resetOptions: function(options) {
					var api = this;
					
					api.privateMethod('stopEventConstructor');

					api.options = $.extend({}, Carousel.DEFAULTS, options);
					
					api.privateMethod('initEventConstructor');
					api.privateMethod('setStepLength');
					api.privateMethod('restoreOriginalItems');
					api.privateMethod('countValues');
					api.privateMethod('playEventConstructor');
				},
				setStepLength: function() {
					var api = this,
						stepLength = parseFloat((100 / api.options.count).toFixed(4));

					api.stepLength = stepLength;
				},
				countValues: function() {
					var api = this;
					
					api.getItems()
						.each(function(i, item) {
							var css = (api.options.orientation === 'horizontal') ? {left: (api.stepLength * i) + '%'} : {top: (api.stepLength * i) + '%'};
							$(item)
								.attr('data-' + Carousel.PFX + '-group-id', api.groupId)
								.css(css);
						});
				},
				restoreOriginalItems: function() {
					var api = this;
					
					api.$carouselInner
						.html(api.cache.html)
						.find('.' + Carousel.PFX + '-carousel-item:eq(0)')
						.addClass(Carousel.PFX + '-carousel-item_active');
				},
				__construct: function() {
					
					var api = this,
						additionalEventParams = {
							tpl: api.$carousel,
							eventArea: api.$carouselInner,
							orientation: api.options.orientation,
							isEventInProgress: function() {
								return api.$carousel.hasClass(Carousel.PFX + '-carousel_slide');
							},
							fn: {
								prev: function() {
									api.privateMethod('slideEventConstructor', ['prev']);
								},
								next: function() {
									api.privateMethod('slideEventConstructor', ['next']);
								}
							}
						};

					api.cache.html = api.$carouselInner
						.clone()
						.find('.' + Carousel.PFX + '-carousel-item_active')
						.removeClass(Carousel.PFX + '-carousel-item_active')
						.end()
						.html()
						.replace(/\s+</gm, '<')
						.replace(/>\s+/gm, '>');
					api.cache.length = api.getItems().length;
					
					api.privateMethod('countValues');

					api.$carousel
						.on('init.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('onInit', [e]);
						})
						.on('beforePlay.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('onBeforePlay', [e]);
						})
						.on('slide.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('onSlide', [e]);
						})
						.on('play.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('onPlay', [e]);
						})
						.on('stop.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('onStop', [e]);
						})
						.on('show.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('onShow', [e]);
						});
				
					$('.' + Carousel.PFX + '-carousel-control', api.$carousel)
						.on('focus.' + Carousel.PFX + '.carousel', function(e) {
							api.privateMethod('beforePlayEventConstructor', [e.currentTarget]);
							return true;
						})
						.on('click.' + Carousel.PFX + '.carousel', function(e) {
							var order = ($(e.currentTarget).hasClass(Carousel.PFX + '-carousel-control_next')) ? 'next' : 'prev';
							api.privateMethod('slideEventConstructor', [order]);
							return false;
						});
					
					api.$carouselInner
						.on('mouseenter.' + Carousel.PFX + '.carousel', function(e) {		
							api.privateMethod('stopEventConstructor', [e]);
						})
						.on('mouseleave.' + Carousel.PFX + '.carousel', function(e) {				
							api.privateMethod('stopEventConstructor', [e]);
						});
						
					addScrollEvent(additionalEventParams);

					addTouchEvent(additionalEventParams);
					
					api.privateMethod('initEventConstructor');
					api.privateMethod('playEventConstructor');
				
					return true;

				},
				__destruct: function(carouselId) {
					var api = this;
					
					api.privateMethod('stopEventConstructor');
					api.privateMethod('restoreOriginalItems');
					delete Cache.carousel[carouselId];

				}
			}
		})({ // Private properties
			initialPlayEvent: true
		});

		// Public methods
		return {
			privateMethod: function(methodName, args) {
				privateMethods[methodName].apply(this, args);
	    	},
	    	getItems: function() {
		    	return $('.' + Carousel.PFX + '-carousel-item', this.$carouselInner);
	    	},
	    	getItemValue: function(item) {
				var style = $(item).attr('style'),
					value;
				if (this.options.orientation === 'horizontal') {
					value = (style === 'left: 0%;') ? ['left: 0%;','0'] : /left:\s{0,}(\S+)%/.exec(style);
				}
				else {
			    	value = (style === 'top: 0%;') ? ['top: 0%;','0'] : /top:\s{0,}(\S+)%/.exec(style);
				}
				value = parseFloat(value[1]);
				return value;
			},
	    	getCurrentIndex: function() {
				return this.getItems().index($('.' + Carousel.PFX + '-carousel-item_active', this.$carouselInner));
			},
	    	getDirection: function(order) {
				var direction;
				if (this.options.orientation === 'horizontal') {
					direction = (order === 'next') ? ((this.options.inverse) ? 'left' : 'right') : ((this.options.inverse) ? 'right' : 'left');
				}
				else {
					direction = (order === 'next') ? ((this.options.inverse) ? 'bottom' : 'top') : ((this.options.inverse) ? 'top' : 'bottom');
				}
				return direction;
			},
			isPrev: function(direction) {
				return direction === 'left' || direction === 'bottom';
			},
			isNext: function(direction) {
				return direction === 'right' || direction === 'top';
			},
			slide: function(direction, multiplier) {
				var api = this,
				    width = api.options.mode === 'slider' ? 100 : api.stepLength;
				multiplier = (typeof multiplier === 'undefined') ? 1 : multiplier;
				api.getItems()
					.each(function(i, item) {
						var value = api.getItemValue(item),
					    	css;
						if (api.isNext(direction)) {
							value += (width * multiplier);
						}
						else if (api.isPrev(direction)) {
							value -= (width * multiplier);
						}
						value = (value > -1 && value < 1) ? 0 : value;
						css = (api.options.orientation === 'horizontal') ? {left: value + '%'} : {top: value + '%'};
						$(item)
							.css(css);
					});
			},
			control: function(currentItem, direction, activated) {
				var itemClass = Carousel.PFX + '-carousel-item',
				    currentItemIndex = this.getCurrentIndex(),
					itemLength = this.getItems().length,
		    		currentItem = currentItem.removeClass(itemClass + '_active'),
					slideArgs = [direction];
				if (typeof activated === 'undefined') {
					if (this.isPrev(direction)) {
						activated = (this.options.mode === 'slider' ? (currentItemIndex + this.options.count >= itemLength ? this.getItems().eq(itemLength - 1) : this.getItems().eq(currentItemIndex + this.options.count)) : currentItem.next('.' + itemClass))
						    .addClass(itemClass + '_active');
					}
					else {
						activated = (this.options.mode === 'slider' ? (currentItemIndex - this.options.count < 0 ? this.getItems().eq(0) : this.getItems().eq(currentItemIndex - this.options.count)) : currentItem.prev('.' + itemClass))
						    .addClass(itemClass + '_active');
					}
				}
				else {
				    activated
				        .addClass(itemClass + '_active');
					slideArgs.push(Math.abs(currentItemIndex - this.getCurrentIndex()));
				}
        		this.slide.apply(this, slideArgs);
			},
			addNewGroup: function(direction, finalVisible) {
				this.groupId += 1;
				var api = this,
		    		leftValue,
					css,
		    		value = api.getItemValue(finalVisible),
					newItemsLength = api.cache.length,
					newItems = $(api.cache.html)
				    	.attr('data-' + Carousel.PFX + '-group-id', api.groupId);
				if (api.isNext(direction)) {
					newItems
						.each(function(i, item) {
							leftValue = -((newItemsLength - i) * api.stepLength);
							css = (api.options.orientation === 'horizontal') ? {left: leftValue + '%'} : {top: leftValue + '%'};
							$(item)
								.css(css);
						})
					.insertBefore(finalVisible);
				}
				else if (api.isPrev(direction)) {
            		newItems
						.each(function(i, item) {
							css = (api.options.orientation === 'horizontal') ? {left: value + ((i + 1) * api.stepLength) + '%'} : {top: value + ((i + 1) * api.stepLength) + '%'};
							$(item)
								.css(css);
						})
					.insertAfter(finalVisible);
				}
				api.removeBorderGroup(direction);
			},
			removeBorderGroup: function(direction) {
				var borderItem,
			    	borderGroupId,
					borderGroup,
					groupsLength = this.getItems().length / this.cache.length;
				if (groupsLength > 2) {
					borderItem = (this.isPrev(direction)) ? $('.' + Carousel.PFX + '-carousel-item:first-child', this.$carouselInner) : $('.' + Carousel.PFX + '-carousel-item:last-child', this.$carouselInner);
			    	borderGroupId = borderItem.data(Carousel.PFX + '-group-id');
					borderGroup = $('[data-' + Carousel.PFX + '-group-id=' + borderGroupId + ']', this.$carouselInner);
					borderGroup
				    	.remove();
				}
			},
		    stop: function() {
			    this.privateMethod('stopEventConstructor');
		    },
		    resetOptions: function(options) {
			    this.privateMethod('resetOptions', [options]);
		    }
		}
	})();
	
    $.fn.uniCarousel = function(options){
        return this.each(function(index, carousel) {
			var carouselId = 'carousel-' + index;
			if (typeof Cache.carousel[carouselId] === 'undefined') {
		        Cache.carousel[carouselId] = new Carousel(carousel, carouselId, options);
				Cache.carousel[carouselId].$carousel.prop('id', carouselId).attr('id', carouselId);
			}
			else if (typeof options === 'object') {
				Cache.carousel[carouselId].resetOptions(options);
			}
			else if (typeof options === 'string') {
				switch (options) {
					case 'stop':
				    	Cache.carousel[carouselId].stop();
					break;
					case 'destroy':
				    	Cache.carousel[carouselId].destroy();
					break;
				}
			}
	    });
    };
	
	$(function() {
		$('.uni-carousel').uniCarousel();
	});

})(jQuery, window, document);