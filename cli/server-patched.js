"use strict";
const { opentelemetry } = require("./lib/otel/index");
const http = require("http");
const express = require("express");
let asyncMiddleware = require("middleware-async");
if (asyncMiddleware.default) {
    asyncMiddleware = asyncMiddleware.default;
}
const cors = require("cors");
const bodyParser = require("body-parser");
const command = require("./lib/commands");

// Try to require debug, fallback to console.log
let debug;
try {
    debug = require("debug");
} catch (e) {
    debug = () => console.log;
}

async function main() {
    await opentelemetry();
    const log = debug('cube-creator');
    const app = express();
    app.enable('trust proxy');
    app.use(cors());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get('/', (req, res) => res.status(204).end());

    app.post('/', asyncMiddleware(async (req, res) => {
        const transformJob = req.body.TRANSFORM_JOB_URI;
        const publishJob = req.body.PUBLISH_JOB_URI;
        const unlistJob = req.body.UNLIST_JOB_URI;
        const importJob = req.body.IMPORT_JOB_URI;
        
        if (!transformJob && !publishJob && !unlistJob && !importJob) {
            res.status(400);
            return res.send('No job defined');
        }

        if (transformJob) {
            command.transform({ to: 'graph-store', job: transformJob, debug: true }).catch((e) => log(e));
        }
        if (importJob) {
            command.importCube({ job: importJob, debug: true }).catch((e) => log(e));
        }
        if (publishJob) {
            command.publish({ to: 'graph-store', job: publishJob, debug: true }).catch((e) => log(e));
        }
        if (unlistJob) {
            command.unlist({ job: unlistJob, debug: true }).catch((e) => log(e));
        }
        return res.status(202).end();
    }));

    http.createServer(app).listen(80, () => log('Api ready'));
}

main();