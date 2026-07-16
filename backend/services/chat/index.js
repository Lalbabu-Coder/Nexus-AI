import express from "express";
import dotenv from "dotenv";
import router from "./routes/chat.routes.js";
import connectDB from "./config/db.js";

dotenv.config();
const app = express();
app.use(express.json());
const port=process.env.PORT


app.use("/",router)

app.use((err, req, res, next) => {
  console.error("=== GLOBAL CHAT ERROR ===");
  console.error(err);
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: err.stack,
    code: err.code
  });
});


app.listen(port, () => {
    connectDB()
  console.log(
    `chat service running on ${port}`
  );
});
