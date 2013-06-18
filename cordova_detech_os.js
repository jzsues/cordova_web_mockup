/**
 * Created with JetBrains WebStorm.
 * User: jiangzm
 * Date: 13-6-18
 * Time: 上午12:23
 * To change this template use File | Settings | File Templates.
 */


function detechCordova() {
    //alert("is android:" + $.os.android);
    //alert("is ios:" + $.os.ios);
    if ($.os.android) {
        loadScript("./cordova.android.js");
    }
    if ($.os.ios) {
        loadScript("./cordova.ios.js");
    }
}


function loadScript(files, callback, parent) {
    var urls = files && typeof (files) == "string" ? [files] : files;
    for (var i = 0, len = urls.length; i < len; i++) {
        var script = document.createElement("script");
        script.setAttribute('charset', 'utf-8');
        script.setAttribute('type', 'text/javascript');
        script.setAttribute('src', urls[i]);
        if (!hasFile("script", urls[i])) {
            loadFile(script, callback, parent);
        }
    }
}

function loadFile(element, callback, parent) {
    var p = parent && parent != undefined ? parent : "head";
    document.getElementsByTagName(p)[0].appendChild(element);
}

function hasFile(tag, url) {
    var contains = false;
    var files = document.getElementsByTagName(tag);
    var type = tag == "script" ? "src" : "href";
    for (var i = 0, len = files.length; i < len; i++) {
        if (files[i].getAttribute(type) == url) {
            contains = true;
            break;
        }
    }
    return contains;
}