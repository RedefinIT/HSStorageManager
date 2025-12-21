/**
 * Created by govind on 7/24/16.
 * Refactored for ZincSearch compatibility
 */

'use strict';
// This module provides the interface to the search engine (ZincSearch or Elasticsearch).

require('dotenv').config();
const http = require('http');
const https = require('https');
const { URL } = require('url');
const esIndicesConfig = require('./esIndicesConfig');
const _ = require('lodash');

// Configuration from environment variables
const SEARCH_ENGINE = process.env.SEARCH_ENGINE || 'zincsearch';
const ZINC_URL = process.env.ZINC_URL || 'http://localhost:4080';
const ZINC_USER = process.env.ZINC_USER || 'admin';
const ZINC_PASSWORD = process.env.ZINC_PASSWORD || 'Complexpass#123';
const ES_PORT = process.env.ES_PORT || '9200';
const MAX_RESULT_WINDOW = 10000;

// Legacy Elasticsearch client (fallback)
let es_client = null;
if (SEARCH_ENGINE === 'elasticsearch') {
  const elasticsearch = require('elasticsearch');
  es_client = new elasticsearch.Client({
    host: 'localhost:' + ES_PORT,
    log: 'info'
  });
}

// Exports
exports.getFilterItems = getFilterItems;
exports.getItems = getItems;
exports.getItem = getItem;
exports.deleteItem = deleteItem;
exports.createIndex = createIndex;
exports.initIndices = initIndices;
exports.addItem = addItem;
exports.bulkupdate = bulkupdate;

/**
 * Helper: Makes HTTP request to ZincSearch
 */
function zincRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(ZINC_URL);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const auth = Buffer.from(`${ZINC_USER}:${ZINC_PASSWORD}`).toString('base64');

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    };

    if (body) {
      const bodyStr = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = data ? JSON.parse(data) : {};
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`ZincSearch error: ${res.statusCode} - ${data}`));
          }
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
}

/**
 * Helper: Build search query with filters
 */
function buildSearchQuery(query, params) {
  const body = {};

  // Handle camera filter (special case)
  if (query?.query?.camerafilter) {
    body.query = {
      match: {
        'exif.Exif IFD0.Model': query.query.camerafilter
      }
    };
  } else if (query?.query) {
    body.query = query.query;
  } else {
    body.query = { match_all: {} };
  }

  return body;
}

/**
 * Create an index
 */
function createIndex(indexDef) {
  if (SEARCH_ENGINE === 'zincsearch') {
    const indexName = indexDef.index;
    const mappings = indexDef.body?.mappings || {};

    return zincRequest('POST', '/api/index', {
      name: indexName,
      storage_type: 'disk',
      mappings: mappings
    }).catch(err => {
      console.error('Error creating index:', err);
    });
  } else {
    // Legacy Elasticsearch
    return new Promise((resolve, reject) => {
      es_client.create(indexDef, (error, response) => {
        if (error) reject(error);
        else resolve(response);
      });
    });
  }
}

/**
 * Initialize all indices
 */
async function initIndices(allIndices, callback) {
  try {
    // Create initial indices
    const promises = allIndices.map(async (indexSetting) => {
      const indexName = indexSetting.index;

      if (SEARCH_ENGINE === 'zincsearch') {
        // Check if index exists by trying to get it
        try {
          await zincRequest('GET', `/api/index/${indexName}`);
          console.log(`Index ${indexName} already exists`);
          return null;
        } catch (err) {
          // Index doesn't exist, create it
          console.log(`Creating index: ${indexName}`);
          return createIndex(indexSetting);
        }
      } else {
        // Legacy Elasticsearch
        const exists = await es_client.indices.exists({ index: indexName });
        if (!exists) {
          console.log(`Creating index: ${indexName}`);
          return es_client.indices.create(indexSetting);
        }
        return null;
      }
    });

    await Promise.all(promises);
    console.log('Initial indices created');

    // Create container-specific indices
    const containers = await getItems('sm_oscontainersindex', {}, {});

    if (containers?.items) {
      const containerPromises = containers.items.map(async (bucket) => {
        const indexName = `sm_objectstoreindex_${bucket.id}`;

        if (SEARCH_ENGINE === 'zincsearch') {
          try {
            await zincRequest('GET', `/api/index/${indexName}`);
            return null;
          } catch (err) {
            console.log(`Creating container index: ${indexName}`);
            const indexConfig = { ...esIndicesConfig.storagemanagerIndices.sm_objectstoreindex };
            indexConfig.index = indexName;
            return createIndex(indexConfig);
          }
        } else {
          const exists = await es_client.indices.exists({ index: indexName });
          if (!exists) {
            const indexConfig = { ...esIndicesConfig.storagemanagerIndices.sm_objectstoreindex };
            indexConfig.index = indexName;
            return es_client.indices.create(indexConfig);
          }
          return null;
        }
      });

      await Promise.all(containerPromises);
    }

    callback();
  } catch (err) {
    console.error('Failed to create indices:', err);
    callback(err);
  }
}

/**
 * Get a single item by ID
 */
async function getItem(index, id, query, callback) {
  try {
    if (SEARCH_ENGINE === 'zincsearch') {
      const searchBody = { query: query || { match_all: {} } };
      const result = await zincRequest('POST', `/api/${index}/_search`, {
        search_type: 'match',
        query: {
          term: { _id: id }
        },
        from: 0,
        size: 1
      });

      if (result.hits?.hits?.length > 0) {
        callback(undefined, result.hits.hits[0]._source);
      } else {
        callback({ error: 'empty result!' }, {});
      }
    } else {
      // Legacy Elasticsearch
      const param = {
        index: index,
        id: id,
        body: { query: query }
      };

      es_client.search(param, (err, resp) => {
        if (err) {
          callback(err);
        } else if (!resp || resp.hits.hits.length === 0) {
          callback({ error: 'empty result!' }, {});
        } else {
          callback(undefined, resp.hits.hits[0]._source);
        }
      });
    }
  } catch (err) {
    console.error('Error in getItem:', err);
    callback(err);
  }
}

/**
 * Get multiple items with query and pagination
 */
async function getItems(index, params, query, callback1) {
  try {
    // Handle index name mapping
    const indexName = index === 'digitallibrary' ? 'documents' : index;

    // Build search query
    const searchBody = buildSearchQuery(query, params);

    // Pagination parameters
    const from = params.from || 0;
    const size = params.size || 1000;

    if (SEARCH_ENGINE === 'zincsearch') {
      const result = await zincRequest('POST', `/api/${indexName}/_search`, {
        ...searchBody,
        from: from,
        size: size
      });

      const formattedResult = {
        total: result.hits?.total?.value || result.hits?.total || 0,
        count: result.hits?.hits?.length || 0,
        items: (result.hits?.hits || []).map((item) => {
          const returnItem = item._source;
          returnItem.id = item._id;
          return returnItem;
        })
      };

      callback1(undefined, formattedResult);
    } else {
      // Legacy Elasticsearch
      const searchRequest = {
        index: indexName,
        from: from,
        size: size,
        body: searchBody
      };

      es_client.search(searchRequest, (err, resp) => {
        if (err || !resp) {
          callback1(err || new Error('No response from search'));
        } else {
          const result = {
            total: resp.hits.total,
            count: resp.hits.hits.length,
            items: resp.hits.hits.map((item) => {
              const returnItem = item._source;
              returnItem.id = item._id;
              return returnItem;
            })
          };
          callback1(undefined, result);
        }
      });
    }
  } catch (err) {
    console.error('Error in getItems:', err);
    callback1(err);
  }
}

/**
 * Get aggregated filter values
 */
async function getFilterItems(index, field1, callback1) {
  try {
    if (SEARCH_ENGINE === 'zincsearch') {
      // ZincSearch aggregations
      const result = await zincRequest('POST', `/api/${index}/_search`, {
        aggs: {
          result: {
            terms: {
              field: field1,
              order: { _term: 'asc' }
            }
          }
        },
        size: 0
      });

      const buckets = result.aggregations?.result?.buckets || [];
      const filterValues = buckets.map(bucket => bucket.key);
      callback1(filterValues);
    } else {
      // Legacy Elasticsearch
      const data = {
        index: index,
        body: {
          aggs: {
            result: {
              terms: {
                field: field1,
                order: { _term: 'asc' }
              }
            }
          }
        }
      };

      es_client.search(data, (err, resp) => {
        if (err) {
          console.error('Error in getFilterItems:', err);
          callback1(null);
        } else {
          const buckets = resp.aggregations.result.buckets;
          const filterValues = buckets.map(bucket => bucket.key);
          callback1(filterValues);
        }
      });
    }
  } catch (err) {
    console.error('Error in getFilterItems:', err);
    callback1(null);
  }
}

/**
 * Add/Index a document
 */
async function addItem(index, data, id, callback1) {
  try {
    if (SEARCH_ENGINE === 'zincsearch') {
      // ZincSearch uses PUT for indexing with ID
      const result = await zincRequest('PUT', `/api/${index}/_doc/${id}`, data);
      callback1(null, result);
    } else {
      // Legacy Elasticsearch
      const indexDocument = {
        index: index,
        type: index,
        id: id,
        body: data
      };

      es_client.index(indexDocument, (error, response) => {
        callback1(error, response);
      });
    }
  } catch (err) {
    console.error('Error in addItem:', err);
    callback1(err);
  }
}

/**
 * Delete a document
 */
async function deleteItem(index, id, callback1) {
  if (!id) {
    callback1(new Error('ID is required'));
    return;
  }

  try {
    if (SEARCH_ENGINE === 'zincsearch') {
      const result = await zincRequest('DELETE', `/api/${index}/_doc/${id}`);
      callback1(null, result);
    } else {
      // Legacy Elasticsearch
      const indexDocument = {
        index: index,
        type: index,
        id: id
      };

      es_client.delete(indexDocument, (error, response) => {
        callback1(error, response);
      });
    }
  } catch (err) {
    console.error('Error in deleteItem:', err);
    callback1(err);
  }
}

/**
 * Bulk update documents
 */
async function bulkupdate(arrUpdateItems, callback) {
  try {
    if (SEARCH_ENGINE === 'zincsearch') {
      // ZincSearch bulk API
      const result = await zincRequest('POST', '/api/_bulk', {
        operations: arrUpdateItems
      });
      callback(null, result);
    } else {
      // Legacy Elasticsearch
      es_client.bulk({ body: arrUpdateItems, refresh: 'true' }, (err, resp) => {
        callback(err, resp);
      });
    }
  } catch (err) {
    console.error('Error in bulkupdate:', err);
    callback(err);
  }
}

/**
 * Get the client instance (for backward compatibility)
 */
function getESClient() {
  if (SEARCH_ENGINE === 'zincsearch') {
    console.warn('ZincSearch mode: No Elasticsearch client available');
    return null;
  }
  return es_client;
}
