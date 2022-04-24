const oauthScope = 'write:self-assessment read:self-assessment';
const request = require('superagent');
const { AuthorizationCode } = require('simple-oauth2');
const serviceVersion = '1.0'
const hmrcconfig = require("./config.js")
const dateFormat = require('dateformat');
const winston = require('winston');

const log = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            timestamp: () => dateFormat(Date.now(), "isoDateTime"),
            formatter: (options) => `${options.timestamp()} ${options.level.toUpperCase()} ${options.message ? options.message : ''}
          ${options.meta && Object.keys(options.meta).length ? JSON.stringify(options.meta) : ''}`
        })
    ]
});



const client = new AuthorizationCode({
    client: {
        id: hmrcconfig.clientId,
        secret: hmrcconfig.clientSecret,
    },
    auth: {
        tokenHost: hmrcconfig.apiBaseUrl,
        tokenPath: '/oauth/token',
        authorizePath: '/oauth/authorize',
    },
});


module.exports = {

    hmrcapi: (req, res) => {

        if (req.session.oauth2Token) {
            var accessToken = client.createToken(req.session.oauth2Token);

            log.info('Using token from session: ', accessToken.token);
            res.send("user already granted the access")
            
        } else {
        

            const authorizationUri = client.authorizeURL({
                redirect_uri: hmrcconfig.redirectUri,
                scope: oauthScope,
            });
            
            req.session.caller = '/userCall';
            res.redirect(authorizationUri);
        }
    },


    hmrcauth: async (req, res) => {

        const { code } = req.query;
        const options = {
            code: code,
            redirect_uri: hmrcconfig.redirectUri,
            client_id: hmrcconfig.clientId,
            client_secret: hmrcconfig.clientSecret,
        };

        try {
            const accessToken = await client.getToken(options);


            req.session.oauth2Token = accessToken;

            return res.redirect(req.session.caller);
        } catch (error) {
            return res.status(500).json('Authentication failed');
        }

    },

    clearsession: (req, res) => {
        req.session.destroy();
        res.send("session" + req.session)

    },

    hmrcrequest: (req, res) => {

        let accessToken = req.body.accessToken || (req.session && req.session.oauth2Token && req.session.oauth2Token.access_token)

        console.log(req.body.accessToken)
        if (accessToken) {
            callApi(req, res, accessToken);
        }
        else {


            res.send("generate token logic")
        }

    }


}


function callApi(req, res, bearerToken) {
    const acceptHeader = `application/vnd.hmrc.${serviceVersion}+json`;
    const url = hmrcconfig.apiBaseUrl + req.body.url;

    log.info(`Calling ${url} with Accept: ${acceptHeader}`);

    if(req.body.type == "GET"){
        const apiRequest = request
        .get(url)
        .accept(acceptHeader);

        if (bearerToken) {
            log.info('Using bearer token:', bearerToken);
            apiRequest.set('Authorization', `Bearer ${bearerToken}`);
        }

        apiRequest.end((err, apiResponse) => handleResponse(res, err, apiResponse));
    }
    else if(req.body.type =="POST"){
        const apiRequest = request
        .post(url)
        .send(req.body.reqBody)
        .accept(acceptHeader);

        if (bearerToken) {
            log.info('Using bearer token:', bearerToken);
            apiRequest.set('Authorization', `Bearer ${bearerToken}`);
        }

        apiRequest.end((err, apiResponse) => handleResponse(res, err, apiResponse));
    }
    
}

function handleResponse(res, err, apiResponse) {
    if (err || !apiResponse.ok) {
        log.error('Handling error response: ', err);
        res.send(err);
    } else {
        res.send(apiResponse.body);
    }
};

