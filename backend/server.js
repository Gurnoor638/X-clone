import express from "express";
import path from "path";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";
import cookieParser from "cookie-parser";
import { v2 as cloudinary } from "cloudinary";

const __dirname = path.resolve();
cloudinary.config(process.env.CLOUDINARY_URL);

const PORT = process.env.PORT || 5000;

const app = express();

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({extended: true,  limit: "5mb" }));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	app.get("/{*splat}", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

app.listen(PORT, () => {
    console.log(`server is running on port ${PORT}`);
})