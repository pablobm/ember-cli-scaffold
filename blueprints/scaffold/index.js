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
      this._invokeMirageGenerators(options),
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
    if (this._mirageVersionIsOld(options)) {
      this._addMirage01Endpoints(locals, options);
    }
    else {
      this._addMirage02Endpoints(locals, options);
    }
  },
  _addMirage01Endpoints: function(locals, options) {
    var mirageConfigPath = '/app/mirage/config.js';
    fs.ensureFileSync(options.target + mirageConfigPath);
    var addImports = this._prependToFile(options.target + '/' + mirageConfigPath, "import Mirage from 'ember-cli-mirage';");

    var attributeKeyValues = [];
    for (name in options.entity.options) {
      attributeKeyValues.push(
        '        ' + name + ': ' + 'obj.' + name
      );
    }

    var templateLocals = {
      resourcePath: locals.moduleNamePlural,
      jsonTypeName: locals.moduleNamePlural,
      collectionName: locals.moduleNamePlural,
      dataBuilderFunctionName: 'build' + locals.classifiedModuleName + 'Data',
      idParamName: locals.moduleName + '_id',
      attributeKeyValues: attributeKeyValues.join(",\n"),
    };

    var templateStr = fs.readFileSync(__dirname + '/mirage-config-old.js.tpl', { encoding: 'utf8' });
    var template = lodash.template(templateStr);
    var mirageEndpointsInsert = template(templateLocals);

    var addEndpoints = this.insertIntoFile(mirageConfigPath, mirageEndpointsInsert, {
      after: 'export default function() {'
    });

    return RSVP.all([addImports, addEndpoints]);
  },
  _addMirage02Endpoints: function(locals, options) {
    var mirageConfigPath = '/mirage/config.js';
    fs.ensureFileSync(options.target + mirageConfigPath);

    var templateLocals = {
      resourcePath: locals.moduleNamePlural,
    };

    var templateStr = fs.readFileSync(__dirname + '/mirage-config-new.js.tpl', { encoding: 'utf8' });
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
  _invokeMirageGenerators: function(options) {
    if (this._mirageVersionIsOld(options)) {
      return;
    }
    return this.invoke('mirage-model', 'install', options);
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

