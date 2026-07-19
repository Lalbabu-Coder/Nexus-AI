import proxy from "express-http-proxy";

export const proxyWithUser = (serviceUrl) => {
  const proxyMiddleware = proxy(
    serviceUrl,
    {
      timeout: 120000,
      proxyReqPathResolver: (req) => {
        const resolvedPath = req.url;
        const targetUrl = serviceUrl + resolvedPath;
        req._proxyTargetUrl = targetUrl;
        console.log(`[Gateway Proxy] Forwarding request to: ${targetUrl}`);
        return resolvedPath;
      },

      proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        if (srcReq.user) {
          proxyReqOpts.headers["x-user-id"] = srcReq.user.userId || srcReq.user._id || srcReq.user;
          proxyReqOpts.headers["x-user-email"] = srcReq.user.email || "";
          proxyReqOpts.headers["x-user-avatar"] = srcReq.user.avatar || "";
        }
        return proxyReqOpts;
      },

      userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
        const endTime = Date.now();
        const startTime = userReq._proxyStartTime || endTime;
        const duration = endTime - startTime;

        console.log("=== [Gateway Proxy] Upstream Response Success ===");
        console.log(`[Gateway Proxy] Incoming Request : ${userReq.method} ${userReq.originalUrl || userReq.url}`);
        console.log(`[Gateway Proxy] Target URL      : ${userReq._proxyTargetUrl || serviceUrl}`);
        console.log(`[Gateway Proxy] Time before proxy: ${userReq._proxyStartTimeISO}`);
        console.log(`[Gateway Proxy] Time after proxy : ${new Date(endTime).toISOString()}`);
        console.log(`[Gateway Proxy] Proxy Duration   : ${duration} ms`);
        console.log(`[Gateway Proxy] Upstream Status  : ${proxyRes.statusCode}`);
        return proxyResData;
      },

      proxyErrorHandler: function(err, res, next) {
        const endTime = Date.now();
        const req = res.req;
        const startTime = req?._proxyStartTime || endTime;
        const duration = endTime - startTime;

        console.error("=== [Gateway Proxy] UPSTREAM ERROR (502 BAD GATEWAY) ===");
        console.error(`[Gateway Proxy] Incoming Request : ${req?.method || 'UNKNOWN'} ${req?.originalUrl || req?.url || ''}`);
        console.error(`[Gateway Proxy] Target URL      : ${req?._proxyTargetUrl || serviceUrl}`);
        console.error(`[Gateway Proxy] Time before proxy: ${req?._proxyStartTimeISO || 'N/A'}`);
        console.error(`[Gateway Proxy] Time after proxy : ${new Date(endTime).toISOString()}`);
        console.error(`[Gateway Proxy] Elapsed Duration : ${duration} ms`);
        console.error(`[Gateway Proxy] Error Code/Status: ${err.code || err.status || 'N/A'}`);
        console.error(`[Gateway Proxy] Error Message    : ${err.message}`);
        console.error(`[Gateway Proxy] Full Upstream Error Stack:`, err.stack);
        console.error(`[Gateway Proxy] Full Upstream Error Object:`, JSON.stringify(err, Object.getOwnPropertyNames(err)));

        return res.status(502).json({
          success: false,
          message: "Bad Gateway: Upstream service failed to respond or timed out.",
          targetUrl: req?._proxyTargetUrl || serviceUrl,
          durationMs: duration,
          error: {
            code: err.code || err.status,
            message: err.message,
            stack: err.stack
          }
        });
      }
    }
  );

  return (req, res, next) => {
    req._proxyStartTime = Date.now();
    req._proxyStartTimeISO = new Date(req._proxyStartTime).toISOString();
    console.log("=== [Gateway Proxy] INCOMING REQUEST ===");
    console.log(`[Gateway Proxy] Timestamp: ${req._proxyStartTimeISO}`);
    console.log(`[Gateway Proxy] Method   : ${req.method}`);
    console.log(`[Gateway Proxy] Path     : ${req.originalUrl || req.url}`);
    console.log(`[Gateway Proxy] Client IP: ${req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress}`);
    console.log(`[Gateway Proxy] User ID  : ${req.user?.userId || req.user?._id || req.headers['x-user-id'] || 'Unauthenticated'}`);
    
    proxyMiddleware(req, res, next);
  };
};