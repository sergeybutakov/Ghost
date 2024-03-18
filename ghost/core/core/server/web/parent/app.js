const debug = require('@tryghost/debug')('web:parent');
const config = require('../../../shared/config');
const express = require('../../../shared/express');
const compress = require('compression');
const mw = require('./middleware');

module.exports = function setupParentApp() {
    debug('ParentApp setup start');
    const parentApp = express('parent');

    const logging = require('@tryghost/logging');
    let requestQueueLimit = config.get('optimization')?.requestQueue?.limit;
    if (!requestQueueLimit) {
        logging.info('express-queue limit is not set (optimization.requestQueue.limit), using db pool max size as limit (database.pool.max)');

        requestQueueLimit = config.get('database')?.pool?.max;
    }
    if (!requestQueueLimit) {
        logging.info('express-queue limit is not set (database.pool.max), using default value of 20');

        requestQueueLimit = 20;
    }
    logging.info(`express-queue limit is ${requestQueueLimit}`);
    parentApp.use(mw.requestQueue({
        activeLimit: requestQueueLimit,
        queuedLimit: -1 // ensure that requests are queued and not rejected
    }));
    parentApp.use(mw.requestId);

    // Register event emitter on req/res to trigger cache invalidation webhook event
    parentApp.use(mw.emitEvents);

    // enabled gzip compression by default
    if (config.get('compress') !== false) {
        parentApp.use(compress());
    }

    // This sets global res.locals which are needed everywhere
    // @TODO: figure out if this is really needed everywhere? Is it not frontend only...
    parentApp.use(mw.ghostLocals);

    debug('ParentApp setup end');

    return parentApp;
};