import redis from "../../shared/redis/redis.js";


export const protect =
async(req,res,next)=>{

  console.log("=== GATEWAY AUTHENTICATION CHECK ===");
  console.log("Request URL:", req.originalUrl);
  console.log("Request cookies received:", req.cookies);
  console.log("Request Authorization header:", req.headers.authorization);

 try{

   const sessionId =
   req?.cookies?.session;
  
   if(!sessionId){
     console.error("401 Unauthorized: No session ID found in cookies. req.cookies.session is undefined.");
     return res.status(401).json({
       message:"Unauthorized"
     });

   }

   console.log("Retrieving session from Redis for session ID:", sessionId);
   const session =
   await redis.get(
    `session:${sessionId}`
   );

   if(!session){
     console.error("401 Session Expired: Session not found in Redis for ID:", sessionId);
     return res.status(401).json({
       message:"Session Expired"
     });

   }

   req.user =
   JSON.parse(session);

   console.log("Successfully authenticated user ID:", req.user.userId || req.user._id || req.user);

   next();

 }catch(error){
   console.error("500 Auth Middleware Error:", error);
   return res.status(500).json({
    message:error.message
   });

 }

}