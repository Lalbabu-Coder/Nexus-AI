import proxy from "express-http-proxy";

export const proxyWithUser =
(serviceUrl)=>{

 return proxy(
  serviceUrl,
  {
   proxyReqPathResolver: (req) => {
     const resolvedPath = req.url;
     console.log("Forwarding request to chat-service:", serviceUrl);
     console.log("Full Forwarded URL:", serviceUrl + resolvedPath);
     return resolvedPath;
   },

   proxyReqOptDecorator:
   (proxyReqOpts, srcReq)=>{

    if(srcReq.user){

      proxyReqOpts.headers[
       "x-user-id"
      ] =
      srcReq.user.userId;

      proxyReqOpts.headers[
       "x-user-email"
      ] =
      srcReq.user.email;
      proxyReqOpts.headers[
       "x-user-avatar"
      ] =
      srcReq.user.avatar

    }

    return proxyReqOpts;

   },

   userResDecorator: function(proxyRes, proxyResData, userReq, userRes) {
     console.log("Upstream Response Status:", proxyRes.statusCode);
     console.log("Upstream Response Body:", proxyResData.toString("utf8"));
     return proxyResData;
   },

   proxyErrorHandler: function(err, res, next) {
     console.error("=== PROXY ERROR ===");
     console.error("Error status/code:", err.status || err.code);
     console.error(err.stack);
     res.status(500).json({
       message: err.message,
       stack: err.stack,
       code: err.code
     });
   }

  }
 );

}