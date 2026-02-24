"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mdClients = exports.ccClients = void 0;
const StreamClient_1 = __importDefault(require("sparql-http-client/StreamClient"));
const ParsingClient_1 = __importDefault(require("sparql-http-client/ParsingClient"));
const customFetch_1 = require("@cube-creator/core/customFetch");
const endpoints = (db) => {
    if (db === 'cube-creator') {
        return {
            updateUrl: process.env.STORE_UPDATE_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/update`,
            endpointUrl: process.env.STORE_QUERY_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/query`,
            storeUrl: process.env.STORE_GRAPH_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/data`,
        };
    }
    return {
        updateUrl: process.env.MANAGED_DIMENSIONS_STORE_UPDATE_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/update`,
        endpointUrl: process.env.MANAGED_DIMENSIONS_STORE_QUERY_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/query`,
        storeUrl: process.env.MANAGED_DIMENSIONS_STORE_GRAPH_ENDPOINT || `https://db.cube-creator.lndo.site/${db}/data`,
    };
};

exports.ccClients = {
    parsingClient: new ParsingClient_1.default({ ...endpoints('cube-creator'), fetch: customFetch_1.customFetch }),
    streamClient: new StreamClient_1.default({ ...endpoints('cube-creator'), fetch: customFetch_1.customFetch }),
};
exports.mdClients = {
    parsingClient: new ParsingClient_1.default({ ...endpoints('shared-dimensions'), fetch: customFetch_1.customFetch }),
    streamClient: new StreamClient_1.default({ ...endpoints('shared-dimensions'), fetch: customFetch_1.customFetch }),
};
