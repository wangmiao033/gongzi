'use strict';

// Vercel 与 Koyeb 共用同一套企业微信解析逻辑，避免两边计算口径发生漂移。
module.exports = require('../relay/wecom-attendance');
