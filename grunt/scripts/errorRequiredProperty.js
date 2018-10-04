'use strict';

module.exports = function errorRequiredProperty(grunt, propName, hostName) {
	return grunt.fail.warn(
		grunt.template.process(
			[
				'The <%= hostName %> host requires the `<%= propName %>` property in .proxy.json.',
				'See the README for more information.',
			].join(' '),
			{
				data: {
					hostName,
					propName,
				},
			}
		)
	);
};
