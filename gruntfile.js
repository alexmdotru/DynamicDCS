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

module.exports = function (grunt, options) {
    if (grunt.option('time') === true) { timeGrunt(grunt); }

    const projectPath = process.cwd();
    const gruntPluginPath = require.resolve('grunt-contrib-clean');

    const defaults = {
        configPath: path.join(projectPath, 'grunt'),
        overridePath: path.join(projectPath, 'grunt'),
        data: {
            BUILD_NUMBER: process.env.BUILD_NUMBER || 'Development',
            GIT_COMMIT: process.env.GIT_COMMIT || 'Development',
            appFileName: '<%= package.name %>',
            banner: grunt.file.read(path.join(projectPath, 'grunt/banner.txt')),
            dest: 'dist',
            demoDest: 'demo',
            process: grunt.template.process,
            src: 'app',
            demoSrc: 'src.demo',
            temp: '.temp',
            testEnvYAML: 'app/test-env.yml',
            useMin: grunt.option('min') || includes(grunt.cli.tasks, 'build'),
            vendorYAML: 'app/vendor.js.yml',
            vendorLocales: 'app/locales.yml',
            versions: getDependencyVersions,
        },
        jitGrunt: {
            pluginsRoot: path.join(projectPath, 'node_modules'),
            staticMappings: merge(
            {
                configureProxies: 'grunt-connect-proxy',
                force: 'grunt-force-task',
                ngtemplates: 'grunt-angular-templates',
            },
            generateStaticMappings([projectPath])
            ),
        },
    };

    // Apply grunt template helpers
    gruntTemplateProgeny(grunt);
    gruntTemplateRename(grunt);
    set(grunt, 'template.path', path);

    loadGruntConfig(grunt, merge({}, defaults, options));
};
