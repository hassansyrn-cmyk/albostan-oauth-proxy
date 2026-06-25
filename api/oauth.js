/**
 * GitHub OAuth Handler for Vercel
 * ملف يعمل على Vercel Serverless Functions
 */

const https = require('https');
const querystring = require('querystring');

// بيانات التطبيق
const CLIENT_ID = 'Ov23li6uFp3e8D6pqO64';
const CLIENT_SECRET = '4fd594670c7ee9ce04298a3f830ca48bf569a1de';

// دالة مساعدة لإرسال طلب HTTPS
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// معالج الطلبات الرئيسي
module.exports = async (req, res) => {
  // السماح بـ CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { query, body } = req;

  try {
    // المسار: /api/oauth?action=login
    if (query.action === 'login') {
      const redirectUri = query.redirect_uri || 'https://albostanstore.online/admin.html';
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
      
      return res.status(200).json({ authUrl });
    }

    // المسار: /api/oauth?action=callback&code=xxx
    if (query.action === 'callback') {
      const code = query.code;
      if (!code) {
        return res.status(400).json({ error: 'No code provided' });
      }

      const postData = querystring.stringify({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      });

      const options = {
        hostname: 'github.com',
        path: '/login/oauth/access_token',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'Accept': 'application/json'
        }
      };

      const response = await httpsRequest(options, postData);
      return res.status(response.status).json(response.data);
    }

    // المسار: /api/oauth?action=user&token=xxx
    if (query.action === 'user') {
      const token = query.token;
      if (!token) {
        return res.status(400).json({ error: 'No token provided' });
      }

      const options = {
        hostname: 'api.github.com',
        path: '/user',
        method: 'GET',
        headers: {
          'Authorization': `token ${token}`,
          'User-Agent': 'AlBostan-Admin'
        }
      };

      const response = await httpsRequest(options);
      return res.status(response.status).json(response.data);
    }

    res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('OAuth Error:', error);
    res.status(500).json({ error: error.message });
  }
};
