var express = require('express');
var LastFmNode = require('lastfm').LastFmNode;
var _ = require('underscore');

exports.LastFm = function(options) {
	var lastfm = new LastFmNode({
		api_key: options.api_key,
		secret: options.secret,
		useragent: 'OneTune.fm'
	});

	this.router = express.Router();

	this.router.get('/auth', function (request, response) {
		response.redirect('http://www.last.fm/api/auth?api_key=' + options.api_key + '&cb=http://' + request.headers.host + '/lastfm/callback');
	});

	this.router.get('/callback', function (request, response) {
		if (!request.query.token) {
			return response.end('Request must contain token.');
		}
		var session = lastfm.session({
			token: request.query.token
		})
		session.on('success', function (session) {
			options.saveToken(request, session.key, session.user, function (success) {
				if (!success) {
					return response.end('You need to be logged in to link your account to Last.fm')
				}
				return response.redirect('http://' + request.headers.host + '/services');
			});
		});
		session.on('error', function (error) {
			return response.end('Authorization failed.');
		})
	});
	this.router.post('/scrobble', function (request, response) {
		var trackinfo = _.pick(request.body, 'artist', 'track', 'album', 'albumArtist');
		trackinfo.timestamp = Math.ceil(Date.now() / 1000)
		options.getToken(request, function (auth) {
			if (!auth) {
				return response.json({
					success: false
				})
			}
			var scrobble = lastfm.update('scrobble', lastfm.session({user: auth.service_username, key: auth.token}), trackinfo);
			scrobble.on('success', function (msg) {
				response.json({
					success: true
				});
			})
			scrobble.on('error', function (error) {
				response.json({
					success: false
				});
			});
		});
	});
	return this;
}