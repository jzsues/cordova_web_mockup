/**
 * @file 所有UI组件的基类，通过它可以简单的快速的创建新的组件。
 * @name zepto.zui
 * @short zepto.zui
 * @desc 所有UI组件的基类，通过它可以简单的快速的创建新的组件。
 * @import core/zepto.js, core/zepto.extend.js
 */
(function ($, undefined) {
    $.fragment = function (html, name, properties) {
        if (html.replace) html = html.replace(tagExpanderRE, "<$1></$2>")
        if (name === undefined) name = fragmentRE.test(html) && RegExp.$1
        if (!(name in containers)) name = '*'

        var nodes, dom, container = containers[name]
        container.innerHTML = '' + html
        dom = $.each(slice.call(container.childNodes), function () {
            container.removeChild(this)
        })
        if (isPlainObject(properties)) {
            nodes = $(dom)
            $.each(properties, function (key, value) {
                if (methodAttributes.indexOf(key) > -1) nodes[key](value)
                else nodes.attr(key, value)
            })
        }
        return dom
    };
    $.traverseNode = function (node, fun) {
        fun(node)
        for (var key in node.childNodes) $.traverseNode(node.childNodes[key], fun)
    };
    var adjacencyOperators = [ 'zafter', 'zprepend', 'zbefore', 'zappend' ];
    adjacencyOperators.forEach(function (operator, operatorIndex) {
        var inside = operatorIndex % 2 //=> prepend, append

        $.fn[operator] = function () {
            // arguments can be nodes, arrays of nodes, Zepto objects and HTML strings
            var argType, nodes = $.map(arguments, function (arg) {
                    argType = $z.type(arg)
                    return argType == "object" || argType == "array" || arg == null ?
                        arg : $.fragment(arg)
                }),
                parent, copyByClone = this.length > 1
            if (nodes.length < 1) return this

            return this.each(function (_, target) {
                parent = inside ? target : target.parentNode

                // convert all methods to a "before" operation
                target = operatorIndex == 0 ? target.nextSibling :
                    operatorIndex == 1 ? target.firstChild :
                        operatorIndex == 2 ? target :
                            null

                nodes.forEach(function (node) {
                    if (copyByClone) node[0][0] = node[0][0].cloneNode(true)
                    else if (!parent) return $(node).remove()
                    var _node = parent.insertBefore(node[0][0], target);
                    $.traverseNode(_node, function (el) {
                        if (el.nodeName != null && el.nodeName.toUpperCase() === 'SCRIPT' &&
                            (!el.type || el.type === 'text/javascript') && !el.src)
                            window['eval'].call(window, el.innerHTML)
                    })
                })
            })
        };
    });
    function dasherize(str) {
        return str.replace(/::/g, '/')
            .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
            .replace(/([a-z\d])([A-Z])/g, '$1_$2')
            .replace(/_/g, '-')
            .toLowerCase()
    }

    function maybeAddPx(name, value) {
        return (typeof value == "number" && !cssNumber[dasherize(name)]) ? value + "px" : value
    }

    function camelize(str) {
        return str.replace(/-+(.)?/g, function (match, chr) {
            return chr ? chr.toUpperCase() : ''
        })
    }

    $.fn["zcss"] = function (property, value) {
        if (arguments.length < 2 && typeof property == 'string')
            return this[0] && (this[0].style[camelize(property)] || getComputedStyle(this[0], '').getPropertyValue(property))

        var css = ''
        if ($z.isString(property)) {
            if (!value && value !== 0)
                this.each(function () {
                    this.style.removeProperty(dasherize(property))
                })
            else
                css = dasherize(property) + ":" + maybeAddPx(property, value)
        } else {
            for (key in property)
                if (!property[key] && property[key] !== 0)
                    this.each(function () {
                        this.style.removeProperty(dasherize(key))
                    })
                else
                    css += dasherize(key) + ':' + maybeAddPx(key, property[key]) + ';'
        }

        return this.each(function () {
            this.style.cssText += ';' + css
        })
    };
    $.fn["zwrapAll"] = function (structure) {
        if (this[0]) {
            $(this[0]).zbefore(structure = $(structure))
            var children
            // drill down to the inmost element
            while ((children = structure.children()).length) structure = children.first()
            $(structure).append(this)
        }
        return this
    };
    var zmap = {
        zwidth: "width",
        zheight: "height"
    };

    ['zwidth', 'zheight'].forEach(function (dimension) {
        $.fn[dimension] = function (value) {
            var offset, el = this[0],
                Dimension = zmap[dimension].replace(/./, function (m) {
                    return m[0].toUpperCase()
                })
            if (value === undefined) return $z.isWindow(el) ? el['inner' + Dimension] :
                $z.isDocument(el) ? el.documentElement['offset' + Dimension] :
                    (offset = this.offset()) && offset[zmap[dimension]]
            else return this.each(function (idx) {
                el = $(this)
                el.css(zmap[dimension], funcArg(this, value, idx, el[zmap[dimension]]()))
            })
        }
    });
    function funcArg(context, arg, idx, payload) {
        return $z.isFunction(arg) ? arg.call(context, idx, payload) : arg
    }

    var $z = {
        class2type: {},
        type: function (obj) {
            return obj == null ? String(obj) :
                this.class2type[toString.call(obj)] || "object"
        },
        slice: function (array, index) {
            return Array.prototype.slice.call(array, index || 0);
        },
        /**
         * @grammar $.toString(obj)  ⇒ string
         * @name $.toString
         * @desc toString转化
         */
        toString: function (obj) {
            return Object.prototype.toString.call(obj);
        },

        /**
         * @desc 从集合中截取部分数据，这里说的集合，可以是数组，也可以是跟数组性质很像的对象，比如arguments
         * @name $.slice
         * @grammar $.slice(collection, [index])  ⇒ array
         * @example (function(){
         *     var args = $.slice(arguments, 2);
         *     console.log(args); // => [3]
         * })(1, 2, 3);
         */
        slice: function (array, index) {
            return Array.prototype.slice.call(array, index || 0);
        },

        /**
         * @name $.later
         * @grammar $.later(fn, [when, [periodic, [context, [data]]]])  ⇒ timer
         * @desc 延迟执行fn
         * **参数:**
         * - ***fn***: 将要延时执行的方法
         * - ***when***: *可选(默认 0)* 什么时间后执行
         * - ***periodic***: *可选(默认 false)* 设定是否是周期性的执行
         * - ***context***: *可选(默认 undefined)* 给方法设定上下文
         * - ***data***: *可选(默认 undefined)* 给方法设定传入参数
         * @example $.later(function(str){
         *     console.log(this.name + ' ' + str); // => Example hello
         * }, 250, false, {name:'Example'}, ['hello']);
         */
        later: function (fn, when, periodic, context, data) {
            return window['set' + (periodic ? 'Interval' : 'Timeout')](function () {
                fn.apply(context, data);
            }, when || 0);
        },
        isPlainObject: function (obj) {
            return this.isObject(obj) && !this.isWindow(obj) && obj.__proto__ == Object.prototype
        },
        isFunction: function (value) {
            return typeof value == "function"
        },
        isWindow: function (obj) {
            return obj != null && obj == obj.window
        },
        isDocument: function (obj) {
            return obj != null && obj.nodeType == obj.DOCUMENT_NODE
        },

        isArray: function (value) {
            return value instanceof Array
        },
        likeArray: function (obj) {
            return typeof obj.length == 'number'
        },

        /**
         * @desc 解析模版
         * @grammar $.parseTpl(str, data)  ⇒ string
         * @name $.parseTpl
         * @example var str = "<p><%=name%></p>",
         * obj = {name: 'ajean'};
         * console.log($.parseTpl(str, data)); // => <p>ajean</p>
         */
        parseTpl: function (str, data) {
            var tmpl = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' + 'with(obj||{}){__p.push(\'' + str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/<%=([\s\S]+?)%>/g,function (match, code) {
                return "'," + code.replace(/\\'/g, "'") + ",'";
            }).replace(/<%([\s\S]+?)%>/g,function (match, code) {
                    return "');" + code.replace(/\\'/g, "'").replace(/[\r\n\t]/g, ' ') + "__p.push('";
                }).replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + "');}return __p.join('');";
            var func = new Function('obj', tmpl);
            return data ? func(data) : func;
        },

        /**
         * @desc 减少执行频率, 多次调用，在指定的时间内，只会执行一次。
         * **options:**
         * - ***delay***: 延时时间
         * - ***fn***: 被稀释的方法
         * - ***debounce_mode***: 是否开启防震动模式, true:start, false:end
         *
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         * X    X    X    X    X    X      X    X    X    X    X    X</code>
         *
         * @grammar $.throttle(delay, fn) ⇒ function
         * @name $.throttle
         * @example var touchmoveHander = function(){
         *     //....
         * }
         * //绑定事件
         * $(document).bind('touchmove', $.throttle(250, touchmoveHander));//频繁滚动，每250ms，执行一次touchmoveHandler
         *
         * //解绑事件
         * $(document).unbind('touchmove', touchmoveHander);//注意这里面unbind还是touchmoveHander,而不是$.throttle返回的function, 当然unbind那个也是一样的效果
         *
         */
        throttle: function (delay, fn, debounce_mode) {
            var last = 0,
                timeId;

            if (typeof fn !== 'function') {
                debounce_mode = fn;
                fn = delay;
                delay = 250;
            }

            function wrapper() {
                var that = this,
                    period = Date.now() - last,
                    args = arguments;

                function exec() {
                    last = Date.now();
                    fn.apply(that, args);
                };

                function clear() {
                    timeId = undefined;
                };

                if (debounce_mode && !timeId) {
                    // debounce模式 && 第一次调用
                    exec();
                }

                timeId && clearTimeout(timeId);
                if (debounce_mode === undefined && period > delay) {
                    // throttle, 执行到了delay时间
                    exec();
                } else {
                    // debounce, 如果是start就clearTimeout
                    timeId = setTimeout(debounce_mode ? clear : exec, debounce_mode === undefined ? delay - period : delay);
                }
            };
            // for event bind | unbind
            wrapper._zid = fn._zid = fn._zid || $.proxy(fn)._zid;
            return wrapper;
        },

        /**
         * @desc 减少执行频率, 在指定的时间内, 多次调用，只会执行一次。
         * **options:**
         * - ***delay***: 延时时间
         * - ***fn***: 被稀释的方法
         * - ***t***: 指定是在开始处执行，还是结束是执行, true:start, false:end
         *
         * 非at_begin模式
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         *                         X                                X</code>
         * at_begin模式
         * <code type="text">||||||||||||||||||||||||| (空闲) |||||||||||||||||||||||||
         * X                                X                        </code>
         *
         * @grammar $.debounce(delay, fn[, at_begin]) ⇒ function
         * @name $.debounce
         * @example var touchmoveHander = function(){
         *     //....
         * }
         * //绑定事件
         * $(document).bind('touchmove', $.debounce(250, touchmoveHander));//频繁滚动，只要间隔时间不大于250ms, 在一系列移动后，只会执行一次
         *
         * //解绑事件
         * $(document).unbind('touchmove', touchmoveHander);//注意这里面unbind还是touchmoveHander,而不是$.debounce返回的function, 当然unbind那个也是一样的效果
         */
        debounce: function (delay, fn, t) {
            return fn === undefined ? $.throttle(250, delay, false) : $.throttle(delay, fn, t === undefined ? false : t !== false);
        }
    };
    var toString = $z.toString;
    $.each("String Boolean RegExp Number Date Object Null Undefined".split(" "), function (i, name) {
        var fn;

        if ('is' + name in $z) return;//already defined then ignore.

        switch (name) {
            case 'Null':
                fn = function (obj) {
                    return obj === null;
                };
                break;
            case 'Undefined':
                fn = function (obj) {
                    return obj === undefined;
                };
                break;
            default:
                fn = function (obj) {
                    return new RegExp(name + ']', 'i').test(toString(obj))
                };
        }
        $z['is' + name] = fn;
    });
    var id = 1,
        _blankFn = function () {
        },
        tpl = '<%=name%>-<%=id%>',
        record = (function () {
            var data = {},
                id = 0,
                iKey = "GMUWidget" + (+new Date()); //internal key.

            return function (obj, key, val) {
                var dkey = obj[ iKey ] || ( obj[ iKey ] = ++id ),
                    store = data[dkey] || (data[dkey] = {});

                !$z.isUndefined(val) && (store[key] = val);
                $z.isNull(val) && delete store[key];

                return store[ key ];
            }
        })();

    $.zui = $.zui || {
        version: '2.0.5',

        guid: _guid,

        /**
         * @name $.zui.define
         * @grammar $.zui.define(name, data[, superClass]) ⇒ undefined
         * @desc 定义组件,
         * - ''name'' 组件名称
         * - ''data'' 对象，设置此组件的prototype。可以添加属性或方法
         * - ''superClass'' 基类，指定此组件基于哪个现有组件，默认为Widget基类
         * **示例:**
         * <code type="javascript">
         * $.zui.define('helloworld', {
         *     _data: {
         *         opt1: null
         *     },
         *     enable: function(){
         *         //...
         *     }
         * });
         * </code>
         *
         * **定义完后，就可以通过以下方式使用了**
         *<code type="javascript">
         * var instance = $.zui.helloworld({opt1: true});
         * instance.enable();
         *
         * //或者
         * $('#id').helloworld({opt1:true});
         * //...later
         * $('#id').helloworld('enable');
         * </code>
         *
         * **Tips**
         * 1. 通过Zepto对象上的组件方法，可以直接实例话组件, 如: $('#btn').button({label: 'abc'});
         * 2. 通过Zepto对象上的组件方法，传入字符串this, 可以获得组件实例，如：var btn = $('#btn').button('this');
         * 3. 通过Zepto对象上的组件方法，可以直接调用组件方法，第一个参数用来指定方法名，之后的参数作为方法参数，如: $('#btn').button('setIcon', 'home');
         * 4. 在子类中，如覆写了某个方法，可以在方法中通过this.$super()方法调用父级方法。如：this.$super('enable');
         */
        define: function (name, data, superClass) {
            if (superClass) data.inherit = superClass;
            var Class = $.zui[name] = _createClass(function (el, options) {
                var obj = _createObject(Class.prototype, {
                    _id: $z.parseTpl(tpl, {
                        name: name,
                        id: _guid()
                    })
                });

                obj._createWidget.call(obj, el, options, Class.plugins);
                return obj;
            }, data);
            return _zeptoLize(name, Class);
        },

        /**
         * @name $.zui.isWidget()
         * @grammar $.zui.isWidget(obj) ⇒ boolean
         * @grammar $.zui.isWidget(obj, name) ⇒ boolean
         * @desc 判断obj是不是widget实例
         *
         * **参数**
         * - ''obj'' 用于检测的对象
         * - ''name'' 可选，默认监测是不是''widget''(基类)的实例，可以传入组件名字如''button''。作用将变为obj是不是button组件实例。
         * @param obj
         * @param name
         * @example
         *
         * var btn = $.zui.button(),
         *     dialog = $.zui.dialog();
         *
         * console.log($.isWidget(btn)); // => true
         * console.log($.isWidget(dialog)); // => true
         * console.log($.isWidget(btn, 'button')); // => true
         * console.log($.isWidget(dialog, 'button')); // => false
         * console.log($.isWidget(btn, 'noexist')); // => false
         */
        isWidget: function (obj, name) {
            return obj instanceof (name === undefined ? _widget : $.zui[name] || _blankFn);
        }
    };

    /**
     * generate guid
     */
    function _guid() {
        return id++;
    };

    function _createObject(proto, data) {
        var obj = {};
        Object.create ? obj = Object.create(proto) : obj.__proto__ = proto;
        return $.extend(obj, data || {});
    }

    function _createClass(Class, data) {
        if (data) {
            _process(Class, data);
            $.extend(Class.prototype, data);
        }
        return $.extend(Class, {
            plugins: [],
            register: function (fn) {
                if ($z.isObject(fn)) {
                    $.extend(this.prototype, fn);
                    return;
                }
                this.plugins.push(fn);
            }
        });
    }

    /**
     * handle inherit & _data
     */
    function _process(Class, data) {
        var superClass = data.inherit || _widget,
            proto = superClass.prototype,
            obj;
        obj = Class.prototype = _createObject(proto, {
            $factory: Class,
            $super: function (key) {
                var fn = proto[key];
                return $z.isFunction(fn) ? fn.apply(this, $z.slice(arguments, 1)) : fn;
            }
        });
        obj._data = $.extend({}, proto._data, data._data);
        delete data._data;
        return Class;
    }

    /**
     * 强制setup模式
     * @grammar $(selector).dialog(opts);
     */
    function _zeptoLize(name) {
        $.fn[ name ] = function (opts) {
            var ret,
                obj,
                args = $z.slice(arguments, 1);

            $.each(this, function (i, el) {
                if (i != "length") {
                    obj = record(el, name) || $.zui[name](el, $.extend($z.isPlainObject(opts) ? opts : {}, {
                        setup: true
                    }));
                    if ($z.isString(opts)) {
                        if (!$z.isFunction(obj[ opts ]) && opts !== 'this') {
                            throw new Error(name + '组件没有此方法');    //当不是取方法是，抛出错误信息
                        }
                        ret = $z.isFunction(obj[ opts ]) ? obj[opts].apply(obj, args) : undefined;
                    }
                    if (ret !== undefined && ret !== obj || opts === "this" && ( ret = obj )) {
                        return false;
                    }
                    ret = undefined;
                }

            });
            //ret 为真就是要返回ui实例之外的内容
            //obj 'this'时返回
            //其他都是返回zepto实例
            //修改返回值为空的时，返回值不对的问题
            return ret !== undefined ? ret : this;
        };
    }

    /**
     * @name widget
     * @desc GMU所有的组件都是此类的子类，即以下此类里面的方法都可在其他组建中调用。
     */
    var _widget = function () {
    };
    $.extend(_widget.prototype, {
        _data: {
            status: true
        },

        /**
         * @name data
         * @grammar data(key) ⇒ value
         * @grammar data(key, value) ⇒ value
         * @desc 设置或者获取options, 所有组件中的配置项都可以通过此方法得到。
         * @example
         * $('a#btn').button({label: '按钮'});
         * console.log($('a#btn').button('data', 'label'));// => 按钮
         */
        data: function (key, val) {
            var _data = this._data;
            if ($z.isObject(key)) return $.extend(_data, key);
            else return !$z.isUndefined(val) ? _data[key] = val : _data[key];
        },

        /**
         * common constructor
         */
        _createWidget: function (el, opts, plugins) {

            if ($z.isObject(el)) {
                opts = el || {};
                el = undefined;
            }

            var data = $.extend({}, this._data, opts);
            $.extend(this, {
                _el: el ? $(el) : undefined,
                _data: data
            });

            //触发plugins
            var me = this;
            $.each(plugins, function (i, fn) {
                var result = fn.apply(me);
                if (result && $z.isPlainObject(result)) {
                    var plugins = me._data.disablePlugin;
                    if (!plugins || $z.isString(plugins) && !~plugins.indexOf(result.pluginName)) {
                        delete result.pluginName;
                        $.each(result, function (key, val) {
                            var orgFn;
                            if ((orgFn = me[key]) && $z.isFunction(val)) {
                                me[key] = function () {
                                    me[key + 'Org'] = orgFn;
                                    return val.apply(me, arguments);
                                }
                            } else
                                me[key] = val;
                        });
                    }
                }
            });
            // use setup or render
            if (data.setup) this._setup(el && el.getAttribute('data-mode'));
            else this._create();
            this._init();

            var me = this,
                $el = this.trigger('init').root();
            $el.on('tap', function (e) {
                (e['bubblesList'] || (e['bubblesList'] = [])).push(me);
            });

            record($el[0], me._id.split('-')[0], me);
        },

        /**
         * @interface: use in render mod
         * @name _create
         * @desc 接口定义，子类中需要重新实现此方法，此方法在render模式时被调用。
         *
         * 所谓的render方式，即，通过以下方式初始化组件
         * <code>
         * $.zui.widgetName(options);
         * </code>
         */
        _create: function () {
        },

        /**
         * @interface: use in setup mod
         * @name _setup
         * @desc 接口定义，子类中需要重新实现此方法，此方法在setup模式时被调用。第一个行参用来分辨时fullsetup，还是setup
         *
         * <code>
         * $.zui.define('helloworld', {
         *     _setup: function(mode){
         *          if(mode){
         *              //为fullsetup模式
         *          } else {
         *              //为setup模式
         *          }
         *     }
         * });
         * </code>
         *
         * 所谓的setup方式，即，先有dom，然后通过选择器，初始化Zepto后，在Zepto对象直接调用组件名方法实例化组件，如
         * <code>
         * //<div id="widget"></div>
         * $('#widget').widgetName(options);
         * </code>
         *
         * 如果用来初始化的element，设置了data-mode="true"，组件将以fullsetup模式初始化
         */
        _setup: function (mode) {
        },

        /**
         * @name root
         * @grammar root() ⇒ value
         * @grammar root(el) ⇒ value
         * @desc 设置或者获取根节点
         * @example
         * $('a#btn').button({label: '按钮'});
         * console.log($('a#btn').button('root'));// => a#btn
         */
        root: function (el) {
            return this._el = el || this._el;
        },

        /**
         * @name id
         * @grammar id() ⇒ value
         * @grammar id(id) ⇒ value
         * @desc 设置或者获取组件id
         */
        id: function (id) {
            return this._id = id || this._id;
        },

        /**
         * @name destroy
         * @grammar destroy() ⇒ undefined
         * @desc 注销组件
         */
        destroy: function () {
            var me = this,
                $el;
            $el = this.trigger('destroy').off().root();
            $el.find('*').off();
            record($el[0], me._id.split('-')[0], null);
            $el.off().remove();
            this.__proto__ = null;
            $.each(this, function (key) {
                delete me[key];
            });
        },

        /**
         * @name on
         * @grammar on(type, handler) ⇒ instance
         * @desc 绑定事件，此事件绑定不同于zepto上绑定事件，此On的this只想组件实例，而非zepto实例
         */
        on: function (ev, callback) {
            this.root().on(ev, $.proxy(callback, this));
            return this;
        },

        /**
         * @name off
         * @grammar off(type) ⇒ instance
         * @grammar off(type, handler) ⇒ instance
         * @desc 解绑事件
         */
        off: function (ev, callback) {
            this.root().off(ev, callback);
            return this;
        },

        /**
         * @name trigger
         * @grammar trigger(type[, data]) ⇒ instance
         * @desc 触发事件, 此trigger会优先把options上的事件回调函数先执行，然后给根DOM派送事件。
         * options上回调函数可以通过e.preventDefaualt()来组织事件派发。
         */
        trigger: function (event, data) {
            event = $z.isString(event) ? $.Event(event) : event;
            var onEvent = this.data(event.type), result;
            if (onEvent && $.isFunction(onEvent)) {
                event.data = data;
                result = onEvent.apply(this, [event].concat(data));
                if (result === false || event.defaultPrevented) {
                    return this;
                }
            }
            this.root().trigger(event, data);
            return this;
        }
    });
})(jq);