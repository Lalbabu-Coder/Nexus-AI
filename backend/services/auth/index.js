import express from "express";
import cors from "cors";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import router from "./routes/auth.routes.js";
dotenv.config();
const app = express();
app.use(express.json());
const port=process.env.PORT 



app.get("/", (req, res) => {
  res.status(200).json({
    service: "auth",
    status: "ok",
    commit: process.env.RENDER_GIT_COMMIT || "local"
  });
});
app.use("/",router)
app.listen(port, () => {
    connectDB()
  console.log(
    `auth service running on ${port}`
  );
});
