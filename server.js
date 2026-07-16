import express from "express";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import pool from "./config/db.js";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";

// pool.query("SELECT NOW()", (err, result) => {
//   if (err) {
//     console.log(err);
//   } else {
//     console.log(result.rows);
//   }
// });

cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});

const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/post", postRoutes);

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})