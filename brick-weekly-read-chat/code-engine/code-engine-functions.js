/**
 * Domo Toolshed — Code Engine Functions
 *
 * Two CE functions powering the Toolshed:
 *
 * 1. apiRequest (alias: apiProxy) — Universal Product API gateway.
 *    Uses codeengine.sendRequest which auto-injects auth and bypasses
 *    the app manifest requirement, giving direct Product API access.
 *
 * 2. webFetchRequest (alias: webFetch) — External HTTP gateway.
 *    Uses codeengine.axios to fetch arbitrary external URLs.
 *    No Domo auth injected — for public web content and APIs.
 *
 * SETUP (per function):
 * 1. In Domo: More > Workflows > Code Engine > open the agent package
 * 2. Add function with the name, inputs, and output listed in each header
 * 3. Paste the function code and Save & Deploy
 * 4. Wire the function to the agent app card in the Domo wiring screen
 * 5. Add the corresponding packageMapping entry to manifest.json
 *
 * MANIFEST ENTRIES:
 *   // apiProxy — Product API gateway
 *   {
 *     "alias": "apiProxy",
 *     "parameters": [
 *       { "alias": "method", "type": "text", "nullable": false, "isList": false, "children": null },
 *       { "alias": "path", "type": "text", "nullable": false, "isList": false, "children": null },
 *       { "alias": "body", "type": "text", "nullable": true, "isList": false, "children": null },
 *       { "alias": "headers", "type": "text", "nullable": true, "isList": false, "children": null },
 *       { "alias": "contentType", "type": "text", "nullable": true, "isList": false, "children": null }
 *     ],
 *     "output": { "alias": "result", "type": "text", "children": null }
 *   }
 *   // webFetch — External HTTP gateway
 *   {
 *     "alias": "webFetch",
 *     "parameters": [
 *       { "alias": "url", "type": "text", "nullable": false, "isList": false, "children": null },
 *       { "alias": "method", "type": "text", "nullable": true, "isList": false, "children": null },
 *       { "alias": "headers", "type": "text", "nullable": true, "isList": false, "children": null },
 *       { "alias": "body", "type": "text", "nullable": true, "isList": false, "children": null },
 *       { "alias": "maxLength", "type": "text", "nullable": true, "isList": false, "children": null }
 *     ],
 *     "output": { "alias": "result", "type": "text", "children": null }
 *   }
 *
 * CALLED BY (ryuu.js v6, preferred):
 *   Domo.codeEngine('apiProxy', { method, path, body, headers, contentType })
 *   Domo.codeEngine('webFetch', { url, method, headers, body, maxLength })
 *
 * v5 back-compat (still works under ryuu.js v6):
 *   Domo.post('/domo/codeengine/v2/packages/apiProxy', { method, path, body, headers, contentType })
 *   Domo.post('/domo/codeengine/v2/packages/webFetch', { url, method, headers, body, maxLength })
 *
 * The CE function source below is the server-side implementation — independent of the
 * client-side caller's ryuu version. No changes needed when upgrading client to v6.
 */

const codeengine = require('codeengine');

// ============================================================================
// API PROXY — Universal Product API gateway
// ============================================================================
// Function name: apiRequest
// Inputs: method (text, required), path (text, required), body (text, optional),
//         headers (text, optional), contentType (text, optional)
// Output: result (text)
// Manifest alias: apiProxy
// Product API: Any — method + path are passed through
// ----------------------------------------------------------------------------

/**
 * Universal proxy for calling any Domo Product API endpoint.
 * Accepts an HTTP method, API path, and optional JSON body.
 * Used by toolshed tools that need dynamic Product API access
 * without creating a dedicated CE function per endpoint.
 *
 * @param {text} method - HTTP method (get, post, put, delete)
 * @param {text} path - API path, e.g. "api/data/v1/lineage/DATA_SOURCE/abc-123"
 * @param {text} body - (optional) JSON string of the request body
 * @param {text} headers - (optional) JSON string of request headers
 * @param {text} contentType - (optional) Request body content type, defaults to "application/json"
 * @returns {text} - JSON string of the API response
 */
async function apiRequest(method, path, body, headers, contentType) {
  if (!method || !path) {
    throw new Error('method and path are required');
  }

  const resolvedContentType = contentType || 'application/json';
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  const apiPath = normalized.startsWith('api/')
    ? normalized
    : `api/${normalized}`;

  try {
    const parsedBody = body ? JSON.parse(body) : null;
    const parsedHeaders = headers ? JSON.parse(headers) : null;

    const response = await codeengine.sendRequest(
      method.toLowerCase(),
      apiPath,
      parsedBody,
      parsedHeaders,
      resolvedContentType,
    );

    // When the API returns null (common for POST/PUT 201/204), wrap in metadata
    // so the client can distinguish "null response" from "request failed".
    // The CE output type is text, so we always return a JSON string.
    if (response === null || response === undefined) {
      const isWrite = method.toLowerCase() === 'post' || method.toLowerCase() === 'put' || method.toLowerCase() === 'delete';
      console.warn(`[API Proxy] ${method.toUpperCase()} ${apiPath} returned ${response} — ${isWrite ? 'write may have succeeded with no response body' : 'unexpected null'}`);
      return JSON.stringify({ __nullResponse: true, __method: method.toLowerCase(), __path: apiPath });
    }

    return JSON.stringify(response);
  } catch (error) {
    console.error(
      `[API Proxy] ${method.toUpperCase()} ${apiPath} failed:`,
      `\nPayload: ${body || '(none)'}`,
      `\nError:`, error,
    );
    throw new Error(`API request failed: ${error.message || error}`);
  }
}


// ============================================================================
// WEB FETCH — External HTTP gateway
// ============================================================================
// Function name: webFetchRequest
// Inputs: url (text, required), method (text, optional), headers (text, optional),
//         body (text, optional), maxLength (text, optional)
// Output: result (text)
// Manifest alias: webFetch
// External: Any URL — uses codeengine.axios (no Domo auth injected)
// ----------------------------------------------------------------------------

/**
 * Fetch content from an external URL via codeengine.axios.
 * Used by the webFetch tool to retrieve web pages, API responses,
 * and other external content that the agent needs to answer questions.
 *
 * @param {text} url - The URL to fetch (must be http or https)
 * @param {text} method - (optional) HTTP method, defaults to "GET"
 * @param {text} headers - (optional) JSON string of request headers
 * @param {text} body - (optional) Request body string
 * @param {text} maxLength - (optional) Max characters to return, defaults to 50000
 * @returns {text} - JSON string: { status, contentType, body, truncated }
 */
async function webFetchRequest(url, method, headers, body, maxLength) {
  if (!url) {
    throw new Error('url is required');
  }

  const requestOptions = {
    method: (method || 'GET').toUpperCase(),
    headers: headers ? JSON.parse(headers) : {},
    // Don't throw on 4xx/5xx — let the tool handler decide what to do
    validateStatus: () => true,
    // Return raw text so we can truncate before sending back
    responseType: 'text',
  };

  if (body) {
    requestOptions.data = body;
  }

  try {
    const response = await codeengine.axios(url, requestOptions);

    const responseText = typeof response.data === 'string'
      ? response.data
      : JSON.stringify(response.data);

    const limit = parseInt(maxLength) || 50000;

    return JSON.stringify({
      status: response.status,
      contentType: (response.headers && response.headers['content-type']) || '',
      body: responseText.slice(0, limit),
      truncated: responseText.length > limit,
    });
  } catch (error) {
    console.error(`[Web Fetch] ${(method || 'GET').toUpperCase()} ${url} failed:`, error);
    throw new Error(`Web fetch failed: ${error.message || error}`);
  }
}
