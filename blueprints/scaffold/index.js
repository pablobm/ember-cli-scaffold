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
var inflection           = require('inflection');
var stringUtils          = require('ember-cli-string-utils');

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

    var attributeKeyValues = [];
    for (var name in options.entity.options) {
      var attrName = stringUtils.camelize(name);
      attributeKeyValues.push('        ' + attrName + ': ' + 'obj.' + attrName + ',');
    }

    var locals = buildNaming(options.entity.name);
    var templateLocals = {
      resourcePath: inflection.pluralize(stringUtils.dasherize(options.entity.name)),
      jsonTypeName: inflection.pluralize(stringUtils.camelize(options.entity.name)),
      collectionName: inflection.pluralize(stringUtils.camelize(options.entity.name)),
      classifiedResourceName: stringUtils.classify(options.entity.name),
      attributeKeyValues: attributeKeyValues.join("\n"),
    };

    var mirageConfigImports = this.insertIntoFile('app/mirage/config.js', "import Mirage from 'ember-cli-mirage';\n\n", {
      before: 'export default',
    });

    var templateStr = fs.readFileSync(__dirname + '/mirage-config.js.tpl', { encoding: 'utf8' });
    var template = lodash.template(templateStr);
    var mirageRoutesInsert = template(templateLocals);
    var mirageConfigRoutes = this.insertIntoFile('app/mirage/config.js', mirageRoutesInsert, {
      after: 'export default function() {\n',
    });

    return RSVP.all([
      mirageConfigImports,
      mirageConfigRoutes,
      this.invoke('model', 'install', options),
      this.invoke('scaffold-template', 'install', options),
      this.invoke('scaffold-route', 'install', options),
      this.invoke('scaffold-mixin', 'install', options),
      this.invoke('scaffold-acceptance-test', 'install', options)
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
  _addScaffoldRoutes: function(options) {
    var routerFile = path.join(options.target, 'app', 'router.js');
    if (fs.existsSync(routerFile)) {
      var locals = buildNaming(options.entity.name);
      var status = addScaffoldRoutes(routerFile, locals);
      this._writeRouterStatus(status, 'green');
    }
  },
  _removeScaffoldRoutes: function(options) {
    var routerFile = path.join(options.target, 'app', 'router.js');
    if (fs.existsSync(routerFile)) {
      var locals = buildNaming(options.entity.name);
      var status = removeScaffoldRoutes(routerFile, locals);
      this._writeRouterStatus(status, 'red');
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

