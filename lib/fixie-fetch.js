'use strict';

const { ProxyAgent, fetch: undiciFetch } = require('undici');

let cachedProxyUrl = '';
let cachedDispatcher = null;

function proxyDispatcher(proxyUrl, ProxyAgentClass = ProxyAgent) {
  if (!proxyUrl) return null;
  if (ProxyAgentClass === ProxyAgent && cachedDispatcher && cachedProxyUrl === proxyUrl) {
    return cachedDispatcher;
  }
  const dispatcher = new ProxyAgentClass(proxyUrl);
  if (ProxyAgentClass === ProxyAgent) {
    cachedProxyUrl = proxyUrl;
    cachedDispatcher = dispatcher;
  }
  return dispatcher;
}

function createFixieFetch(proxyUrl, dependencies = {}) {
  const value = String(proxyUrl || '').trim();
  if (!value) return dependencies.fallbackFetch || globalThis.fetch;
  const dispatcher = proxyDispatcher(value, dependencies.ProxyAgentClass || ProxyAgent);
  const fetchImpl = dependencies.fetchImpl || undiciFetch;
  return (url, options = {}) => fetchImpl(url, { ...options, dispatcher });
}

module.exports = { createFixieFetch, proxyDispatcher };
