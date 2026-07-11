import express from "express";
import authRoutes from "./routes/auth.routes.js";
import pool from "./config/db.js";
import cookieParser from "cookie-parser";

// pool.query("SELECT NOW()", (err, result) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(result.rows);
//   }
// });

const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})