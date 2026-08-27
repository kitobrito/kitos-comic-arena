// Minimal CommonJS shim so vendored server-side modules (battleLogic.js's
// require/module.exports style) can run unmodified in a plain <script> browser
// page with no bundler. Each vendored file is wrapped at build/copy time as
// window.__define('name', function (module, exports, require) { ...original... }).
window.__modules = window.__modules || {};

window.__define = function defineModule(name, factory) {
    var module = { exports: {} };
    var exports = module.exports;
    var localRequire = function localRequire(path) {
        var key = String(path).replace(/^\.\//, '').replace(/\.js$/, '');
        if (!Object.prototype.hasOwnProperty.call(window.__modules, key)) {
            throw new Error('cjs-shim: module "' + path + '" not loaded yet (loaded so far: ' +
                Object.keys(window.__modules).join(', ') + ')');
        }
        return window.__modules[key];
    };
    factory(module, exports, localRequire);
    window.__modules[name] = module.exports;
};
