import pool from '../config/db.js';
import jwt from 'jsonwebtoken';

export const protectRoute = async(req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if(!token){
            return res.status(401).json({ error: "Unauthorized: no token provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded){
            return res.status(401).json({ error: "Unauthorized: Invalid token " });
        }
        
        const result = await pool.query(
                `SELECT id,
                    full_name,
                    username,
                    email,
                    profile_img,
                    cover_img,
                    bio,
                    link
                FROM users
                WHERE id = $1`,
                [decoded.userId]
        );

        const user = result.rows[0];

        if(!user){
            return res.status(404).json({ error: "User not found" });
        }

        req.user = user;
        next();
        
    } catch (error) {
        if (
        error.name === "JsonWebTokenError" ||
        error.name === "TokenExpiredError"
        ) {
            return res.status(401).json({
                error: "Unauthorized: Invalid token"
            });
        }

        console.log("Error in protectRoute middleware", error.message);
        return res.status(500).json({
            error: "Internal Server Error"
        });
    }

}