import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/utils/generateTokens.js";

export const signup = async (req, res) => {
    try {
        const {fullName, username, email, password} = req.body;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if(!emailRegex.test(email)){
            return res.status(400).json({error: "Invalid email format"});
        }

        const existingUser = await pool.query(
            `SELECT * FROM users WHERE username = $1`,
            [username]
        )
        if(existingUser.rowCount > 0){
            return res.status(400).json({error:"Username is already taken"})
        }

        const existingEmail = await pool.query(
            `SELECT * FROM users WHERE email = $1`,
            [email]
        )
        if(existingEmail.rowCount > 0){
            return res.status(400).json({error:"Email is already taken"})
        }

        if (password.length < 6) {
			return res.status(400).json({ error: "Password must be at least 6 characters long" });
		}

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const result = await pool.query(
           `INSERT INTO users (full_name, username, email, password)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [fullName, username, email, hashedPassword]
        );

        const newUser = result.rows[0];

        if (newUser) {
            generateTokenAndSetCookie(newUser.id, res);

            res.status(201).json({
                id: newUser.id,
                fullName: newUser.full_name,
                username: newUser.username,
                email: newUser.email,
                followers: newUser.followers,
                following: newUser.following,
                profileImg: newUser.profile_img,
                coverImg: newUser.cover_img,
            });
        } else{
            res.status(400).json({error: "Invalid user data"});
        }

    } catch (error) {
        console.log("error in signup controller: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}
 
export const login = async (req, res) => {
    try {
        const {username, password} = req.body;
        const result = await pool.query(
            `SELECT * FROM users WHERE username = $1`,
            [username]
        );

        const user = result.rows[0];

        const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

        if(!user || !isPasswordCorrect){
            return res.status(400).json({ error: "Invalid username or password" });
        }

        generateTokenAndSetCookie(user.id, res);

        res.status(201).json({
            id: user.id,
            fullName: user.full_name,
            username: user.username,
            email: user.email,
            followers: user.followers,
            following: user.following,
            profileImg: user.profile_img,
            coverImg: user.cover_img,
        });

    } catch (error) {
        console.log("error in login controller: ", error.message);
        res.status(500).json({error: "Internal server error"});
    }
}
 
export const logout = async (req, res) => {
    try {
		res.cookie("jwt", "", { 
            maxAge: 0,
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV !== "development"});
		    res.status(200).json({ message: "Logged out successfully" 
            });

	} catch (error) {
		console.log("Error in logout controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
}

export const getMe = async (req, res) => {
    try {
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
            [req.user.id]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.status(200).json(user);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
};