import express from "express";
import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";

pool.query("SELECT NOW()", (err, result) => {
  if (err) {
    console.log(err);
  } else {
    console.log(result.rows);
  }
});

const PORT = process.env.PORT || 5000;

const app = express();

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})