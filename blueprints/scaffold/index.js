var path                 = require('path');
var fs                   = require('fs-extra');
var RSVP                 = require('rsvp');
var buildNaming          = require('../../lib/utilities/entity').buildNaming;
var addScaffoldRoutes    = require('../../lib/utilities/scaffold-routes-generator').addScaffoldRoutes;
var removeScaffoldRoutes = require('../../lib/utilities/scaffold-routes-generator').removeScaffoldRoutes;
var chalk                = require('chalk');
var entityAttrs          = require('../../lib/utilities/entity').entityAttrs;
var sampleDataFromAttrs  = require('../../lib/utilities/entity').sampleDataFromAttrs;
var lodash               = require('lodash');
var os                   = require('os');

module.exports = {
  anonymousOptions: [
    'name',
    'attr:type'
  ],
  description: 'Scaffolds an entire resource',
  invoke: function(name, operation, options) {
    if (this._mirageVersionIsOld(options)) {
      throw new Error("ember-cli-scaffold is compatible only with Mirage v0.2.x");
    }
    var blueprint = this.lookupBlueprint(name);
    return blueprint[operation](options);
  },
  afterInstall: function(options) {
    this._addScaffoldRoutes(options);

    var locals = buildNaming(options.entity.name);
    var resourcePath = locals.dasherizedModuleNamePlural;

    return RSVP.all([
      this.invoke('model', 'install', options),
      this.invoke('scaffold-template', 'install', options),
      this.invoke('scaffold-route', 'install', options),
      this.invoke('scaffold-mixin', 'install', options),
      this.invoke('scaffold-acceptance-test', 'install', options),
      this.invoke('mirage-model', 'install', options),
      this._addMirageEndpoints(locals, options)
    ]);
  },
  afterUninstall: function(options) {
    this._removeScaffoldRoutes(options);
    return RSVP.all([
      this.invoke('model', 'uninstall', options),
      this.invoke('scaffold-template', 'uninstall', options),
      this.invoke('scaffold-route', 'uninstall', options),
      this.invoke('scaffold-mixin', 'uninstall', options),
      this.invoke('scaffold-acceptance-test', 'uninstall', options)
    ]);
  },
  _addMirageEndpoints: function(locals, options) {
    var mirageConfigPath = '/mirage/config.js';
    fs.ensureFileSync(options.target + mirageConfigPath);

    var templateLocals = {
      resourcePath: locals.moduleNamePlural,
    };

    var templateStr = fs.readFileSync(__dirname + '/mirage-config.js.tpl', { encoding: 'utf8' });
    var template = lodash.template(templateStr);
    var mirageEndpointsInsert = template(templateLocals);

    var addEndpoints = this.insertIntoFile(mirageConfigPath, mirageEndpointsInsert, {
      after: "export default function() {\n"
    });

    return addEndpoints;
  },
  _addScaffoldRoutes: function(options) {
    var routerFile = path.join(options.target, 'app', 'router.js');
    if (fs.existsSync(routerFile)) {
      var locals = buildNaming(options.entity.name);
      var status = addScaffoldRoutes(routerFile, locals);
      this._writeRouterStatus(status, 'green');
    }
  },
  _prependToFile: function(path, line) {
    return new RSVP.Promise(function(resolve) {
      var content = fs.readFileSync(path, 'utf8');
      content = line + os.EOL + content;
      fs.writeFileSync(path, content);
      resolve();
    });
  },
  _removeScaffoldRoutes: function(options) {
    var routerFile = path.join(options.target, 'app', 'router.js');
    if (fs.existsSync(routerFile)) {
      var locals = buildNaming(options.entity.name);
      var status = removeScaffoldRoutes(routerFile, locals);
      this._writeRouterStatus(status, 'red');
    }
  },
  _mirageVersionIsOld: function(options) {
    var basePath = options.target;
    var oldPath = '/app/mirage/config.js';
    var newPath = '/mirage/config.js';
    try {
      fs.statSync(basePath + newPath);
      return false;
    }
    catch(_) {
    }
    try {
      fs.statSync(basePath + oldPath);
      return true;
    }
    catch(e) {
      throw new Error("Can't tell what version of Mirage this is: can't find config file. Tried " + newPath + " and " + oldPath + ". Got " + e);
    }
  },
  _writeRouterStatus: function(status, operationColor) {
    var color = status === 'identical' ? 'yellow' : operationColor;
    this._writeStatusToUI(chalk[color], status, 'app/router.js');
  },
  locals: function(options) {
    var locals = {};
    var attrs = entityAttrs(options.entity.options);
    var sampleData = sampleDataFromAttrs(attrs);
    locals.sampleData = sampleData;
    return locals;
  }
}

