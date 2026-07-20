import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import { generateTokenAndSetCookie } from "../lib/utils/generateTokens.js";

const getUserRelations = async (userId) => {
  const [followersResult, followingResult, likedPostsResult] =
    await Promise.all([
      pool.query(
        `SELECT follower_id
         FROM user_followers
         WHERE following_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT following_id
         FROM user_followers
         WHERE follower_id = $1`,
        [userId]
      ),
      pool.query(
        `SELECT post_id
         FROM post_likes
         WHERE user_id = $1`,
        [userId]
      ),
    ]);

  return {
    followers: followersResult.rows.map(row => row.follower_id),
    following: followingResult.rows.map(row => row.following_id),
    likedPosts: likedPostsResult.rows.map(row => row.post_id),
  };
};

export const signup = async (req, res) => {
    try {
        const {fullName, username, email, password} = req.body;

        if (!fullName || !username || !email || !password) {
            return res.status(400).json({
                error: "Please fill all the fields",
            });
        }

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
                profileImg: newUser.profile_img,
                coverImg: newUser.cover_img,
                bio: newUser.bio,
                link: newUser.link,
                followers: [],
                following: [],
                likedPosts: [],
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

        if (!username || !password) {
            return res.status(400).json({
                error: "Please fill all the fields",
            });
        }

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

        const relations = await getUserRelations(user.id);

        res.status(200).json({
            id: user.id,
            fullName: user.full_name,
            username: user.username,
            email: user.email,
            profileImg: user.profile_img,
            coverImg: user.cover_img,
            bio: user.bio,
            link: user.link,
            followers: relations.followers,
            following: relations.following,
            likedPosts: relations.likedPosts,
            created_at: user.created_at
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

		return res.status(200).json({ message: "Logged out successfully" });

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

        const relations = await getUserRelations(user.id);

        user.followers = relations.followers;
        user.following = relations.following;
        user.likedPosts = relations.likedPosts;

        res.status(200).json(user);

    } catch (error) {
        console.log(error.message);
        res.status(500).json({
            error: "Internal Server Error"
        });
    }
};