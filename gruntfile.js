'use strict';

const forEach = require('lodash/forEach');
const getDependencyVersions = require('./grunt/scripts/dependencyVersions.js');
const glob = require('glob');
const gruntTemplateProgeny = require('grunt-template-progeny');
const gruntTemplateRename = require('grunt-template-rename');
const includes = require('lodash/includes');
const loadGruntConfig = require('load-grunt-config');
const merge = require('lodash/merge');
const path = require('path');
const reduce = require('lodash/reduce');
const set = require('lodash/set');
const timeGrunt = require('time-grunt');

function generateStaticMappings(dirs) {
    return reduce(dirs, (result, dir) => {
        const files = glob.sync(path.join(dir, 'grunt/tasks/*.js'));
        forEach(files, (file) => {
            const ext = path.extname(file);
            const base = path.basename(file, ext);
            result[base] = file; // eslint-disable-line no-param-reassign
        });
        return result;
    }, {});
}

module.exports = function nsBundleConfig(grunt, options) {
    if (grunt.option('time') === true) { timeGrunt(grunt); }

    const projectPath = process.cwd();
    const gruntPluginPath = require.resolve('grunt-contrib-clean');
    const bundlePath = path.dirname(require.resolve('./'));

    const defaults = {
        configPath: path.join(bundlePath, 'grunt'),
        overridePath: path.join(projectPath, 'grunt'),
        data: {
            BUILD_NUMBER: process.env.BUILD_NUMBER || 'Development',
            GIT_COMMIT: process.env.GIT_COMMIT || 'Development',
            appFileName: '<%= package.name %>',
            banner: grunt.file.read(path.join(bundlePath, 'grunt/banner.txt')),
            dest: 'dist',
            demoDest: 'demo',
            process: grunt.template.process,
            src: '<%= package.config.isLib ? "src" : "app" %>',
            demoSrc: 'src.demo',
            temp: '.temp',
            testEnvYAML: '<%= src %>/test-env.yml',
            useMin: grunt.option('min') || includes(grunt.cli.tasks, 'build'),
            vendorYAML: '<%= package.config.isLib ? demoSrc + "/vendor.js.yml" : src + "/vendor.js.yml" %>',
            vendorLocales: '<%= src %>/locales.yml',
            versions: getDependencyVersions,
        },
        jitGrunt: {
            pluginsRoot: includes(gruntPluginPath, 'ns-grunt-bundle/node_modules')
            ? path.join(bundlePath, 'node_modules') // nested node_modules
            : path.join(projectPath, 'node_modules'),
            staticMappings: merge(
            {
                configureProxies: 'grunt-connect-proxy',
                force: 'grunt-force-task',
                ngtemplates: 'grunt-angular-templates',
            },
            generateStaticMappings([bundlePath, projectPath])
            ),
        },
    };

    // Apply grunt template helpers
    gruntTemplateProgeny(grunt);
    gruntTemplateRename(grunt);
    set(grunt, 'template.path', path);

    loadGruntConfig(grunt, merge({}, defaults, options));
};
