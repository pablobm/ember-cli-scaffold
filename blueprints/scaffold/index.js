var path                 = require('path');
var fs                   = require('fs-extra');
var RSVP                 = require('rsvp');
var buildNaming          = require('../../lib/utilities/entity').buildNaming;
var addScaffoldRoutes    = require('../../lib/utilities/scaffold-routes-generator').addScaffoldRoutes;
var removeScaffoldRoutes = require('../../lib/utilities/scaffold-routes-generator').removeScaffoldRoutes;
var chalk                = require('chalk');
var entityAttrs          = require('../../lib/utilities/entity').entityAttrs;
var sampleDataFromAttrs  = require('../../lib/utilities/entity').sampleDataFromAttrs;

function validMirageIsInstalled(options) {
  var pjs = require(options.target + '/package.json') || {};
  var deps = pjs.devDependencies || [];
  var version = deps['ember-cli-mirage'] || '';
  return version.search(/0\.2\..$/) !== -1;
}

module.exports = {
  anonymousOptions: [
    'name',
    'attr:type'
  ],
  description: 'Scaffolds an entire resource',
  invoke: function(name, operation, options) {
    if (!validMirageIsInstalled(options)) {
      throw new Error("ember-cli-scaffold requires ember-cli-mirage 0.2");
    }
    var blueprint = this.lookupBlueprint(name);
    return blueprint[operation](options);
  },
  afterInstall: function(options) {
    this._addScaffoldRoutes(options);

    var locals = buildNaming(options.entity.name);
    var resourcePath = locals.dasherizedModuleNamePlural;

    var mirageConfig = this.insertIntoFile('app/mirage/config.js', [
      'this.namespace = \'api\';',
      'this.get(\'/' + resourcePath + '\');',
      'this.get(\'/' + resourcePath + '/:id\');',
      'this.post(\'/'+ resourcePath + '\');',
      'this.del(\'/'+ resourcePath + '/:id\');',
      'this.put(\'/'+ resourcePath + '/:id\');'
    ].join('\n'), {
      after: 'export default function() {\n'
    });

    return RSVP.all([
      mirageConfig,
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

