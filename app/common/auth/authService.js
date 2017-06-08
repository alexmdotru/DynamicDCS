(function (angular) {
	'use strict';

	function authService($state, angularAuth0, $timeout) {

		var userProfile;

		function login() {
			angularAuth0.authorize();
		}

		function handleAuthentication() {
			angularAuth0.parseHash(function(err, authResult) {
				if (authResult && authResult.idToken) {
					setSession(authResult);
					$state.go('index');
				} else if (err) {
					$timeout(function() {
						$state.go('index');
					});
					console.log(err);
					alert('Error: ' + err.error + '. Check the console for further details.');
				}
			});
		}

		function getProfile(cb) {
			if (localStorage.getItem('access_token') !== null) {
				var accessToken = localStorage.getItem('access_token');
				if (!accessToken) {
					console.log('Access token must exist to fetch profile');
				}
				angularAuth0.client.userInfo(accessToken, function(err, profile) {
					if (profile) {
						setUserProfile(profile);
					}
					cb(err, profile);
				});
			}
		}

		function setUserProfile(profile) {
			userProfile = profile;
		}

		function getCachedProfile() {
			return userProfile;
		}

		function setSession(authResult) {
			// Set the time that the access token will expire at
			var expiresAt = JSON.stringify((authResult.expiresIn * 1000) + new Date().getTime());
			localStorage.setItem('access_token', authResult.accessToken);
			localStorage.setItem('id_token', authResult.idToken);
			localStorage.setItem('expires_at', expiresAt);
		}

		function logout() {
			// Remove tokens and expiry time from localStorage
			localStorage.removeItem('access_token');
			localStorage.removeItem('id_token');
			localStorage.removeItem('expires_at');
		}

		function isAuthenticated() {
			var expiresAt = JSON.parse(localStorage.getItem('expires_at'));
			return new Date().getTime() < expiresAt;
		}

		function updateMetadata (user, context, callback) {
			user.user_metadata = user.user_metadata || {};
			// update the user_metadata that will be part of the response
			user.user_metadata.preferences = user.user_metadata.preferences || {};
			user.user_metadata.preferences.fontSize = 12;

			// persist the user_metadata update
			angularAuth0.users.updateUserMetadata(user.user_id, user.user_metadata)
				.then(function(){
					callback(null, user, context);
				})
				.catch(function(err){
					callback(err);
				});
		}

		return {
			login: login,
			getProfile: getProfile,
			getCachedProfile: getCachedProfile,
			handleAuthentication: handleAuthentication,
			logout: logout,
			isAuthenticated: isAuthenticated
		}
	}

	authService.$inject = ['$state', 'angularAuth0', '$timeout'];

	angular
		.module('dynamic-dcs.authService',[])
		.service('authService', authService)
	;
})(angular);
