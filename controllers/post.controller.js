import pool from "../config/db.js";
import { v2 as cloudinary } from "cloudinary";

export const createPost = async(req, res) => {
    try {
        const { text } = req.body;
        let { img } = req.body;
        
        const userId  = req.user.id;

        const userResult = await pool.query(
            `SELECT id FROM users WHERE id = $1`,
            [userId]
        );
        if(userResult.rows.length === 0){
            return res.status(404).json({ error: "User not found" });
        }

        if (!text && !img) {
            return res.status(400).json({ error: "Post must have text or image" });
        }

        if(img){
            const uploadedResponse = await cloudinary.uploader.upload(img);
            img = uploadedResponse.secure_url;
        }

        const result = await pool.query(
           `INSERT INTO posts (user_id, text, image) 
            VALUES ($1, $2, $3)
            RETURNING *`,
            [userId, text, img]
        );

        const post = result.rows[0];

        post.likes = [];
        post.comments = [];

        return res.status(201).json(post);

    } catch (error) {
        console.error("Error in createPost controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const deletePost = async(req, res) =>{
    try {
        const postId  = req.params.id;
        const  userId  = req.user.id;

        const postResult = await pool.query(
            `SELECT * FROM posts WHERE id = $1`,
            [postId]
        );
        if(postResult.rows.length === 0){
            return res.status(404).json({ error: "Post not found" });
        }

        const post = postResult.rows[0];
        if(userId !== post.user_id){
            return res.status(401).json({ error: "You are not authorized to delete this post" });
        }
       
        if(post.image){
            const imageId = post.image.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(imageId);
        }

        await pool.query(
            `DELETE FROM posts WHERE id = $1`,
            [postId]
        );

        res.status(200).json({ message: "Post deleted successfully" });

    } catch (error) {
        console.error("Error in deletePost controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const commentOnPost = async(req, res) => {
    try {
        const { text } = req.body;
        const userId = req.user.id;
        const postId = req.params.id;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "Text field is required" });
        }

        const postResult = await pool.query(
            `SELECT * FROM posts WHERE id = $1`,
            [postId]
        );

        if (postResult.rows.length === 0) {
            return res.status(404).json({ error: "Post not found" });
        }

        await pool.query(
            `INSERT INTO comments (post_id, user_id, text)
             VALUES ($1, $2, $3)`,
            [postId, userId, text]
        );

        // Get comments for that post
        const commentsResult = await pool.query(
            `SELECT
                c.id,
                c.text,
                c.user_id AS user,
                c.created_at
             FROM comments c
             WHERE c.post_id = $1
             ORDER BY c.created_at ASC`,
            [postId]
        );

        const post = postResult.rows[0];
        // Attach the comments array to the post object
        post.comments = commentsResult.rows;

        res.status(200).json(post);

    } catch (error) {
        console.error("Error in commentOnPost controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const likeUnlikePost = async(req, res) => {
    const userId = req.user.id;
    const postId = req.params.id;
    try {
        const postResult = await pool.query(
            `SELECT user_id FROM posts WHERE id = $1`,
            [postId]
        );
        if(postResult.rows.length === 0){
            return res.status(404).json({ error: "Post not found" });
        }

        const post = postResult.rows[0];

        const likeResult = await pool.query(
            `SELECT * FROM post_likes WHERE user_id = $1 AND post_id = $2`,
            [userId, postId]
        );

        const userLikedPost = likeResult.rows.length > 0;

        if(userLikedPost){
            await pool.query(
                `DELETE FROM post_likes WHERE user_id = $1 AND post_id = $2`,
                [userId, postId]
            );

            const likesResult = await pool.query(
            `SELECT user_id FROM post_likes WHERE post_id = $1`,
            [postId]
            );
        
        const updatedLikes = likesResult.rows.map((row) => row.user_Id);

        return res.status(200).json(updatedLikes);

        } else{
            await pool.query(
                `INSERT INTO post_likes (post_id, user_id) VALUES
                 ($1, $2)`,
                [postId, userId]
            );

            await pool.query(
                `INSERT INTO notifications (from_user_id, to_user_id, type)
                 VALUES ($1, $2, 'like')`,
                [userId, post.user_id]
            );

            const likesResult = await pool.query(
                `SELECT user_id FROM post_likes WHERE post_id = $1`,
                [postId]
            );

            const updatedLikes = likesResult.rows.map((row) => row.user_id);

            return res.status(200).json(updatedLikes)
        }

    } catch (error) {
        console.log("Error in likeUnlikePost controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAllPosts = async(req, res) => {
    try {
        
        const postsResult = await pool.query(
            `SELECT * FROM posts ORDER BY created_at DESC`
        );
        if(postsResult.rows.length === 0){
            return res.status(200).json([]);
        }

        const commentsResult = await pool.query(
            `SELECT * FROM comments`
        );

        const likesResult = await pool.query(
        `SELECT * FROM post_likes`
        );

        const usersResult = await pool.query(`
            SELECT
                id,
                full_name,
                username,
                email,
                profile_img,
                cover_img,
                bio,
                link,
                created_at
            FROM users
        `);
        
        const posts = postsResult.rows;
        const users = usersResult.rows;
        const likes = likesResult.rows;
        const comments = commentsResult.rows;

        const populatedPosts = posts.map((post) => ({
            id: post.id,
            text: post.text,
            image: post.image,
            created_at: post.created_at,

            user: users.find(user => user.id === post.user_id),

            likes: likes.filter(like => like.post_id === post.id)
                        .map(like => like.user_id),

            comments: comments.filter(comment => comment.post_id === post.id)
                              .map(comment => ({
                                id: comment.id,
                                text: comment.text,
                                created_at: comment.created_at,
                                user: users.find(user => user.id === comment.user_id)
                              }))
        }));

        res.status(200).json(populatedPosts);
    } catch (error) {
        console.log("Error in getAllPosts controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getLikedPosts = async(req, res) =>{
    const userId = req.params.id;

    try {
        
        const userResult = await pool.query(
            `SELECT id FROM users WHERE id = $1`,
            [userId]
        );
        if(userResult.rows.length === 0){
            return res.status(404).json({ error: "User not found" });
        }

        const postResult = await pool.query(
            `SELECT p.* FROM posts p 
             JOIN post_likes pl 
             ON p.id = pl.post_id
             WHERE pl.user_id = $1
             ORDER BY created_at DESC`,
             [userId]
        ); 
        if(postResult.rows.length === 0){
            return res.status(200).json([]);
        }

        const commentsResult = await pool.query(
            `SELECT * FROM comments`
        );

        const likesResult = await pool.query(
            `SELECT * FROM post_likes`
        );

        const usersResult = await pool.query(`
            SELECT
                id,
                full_name,
                username,
                email,
                profile_img,
                cover_img,
                bio,
                link,
                created_at
            FROM users
        `);

        const posts = postResult.rows;
        const users = usersResult.rows;
        const likes = likesResult.rows;
        const comments = commentsResult.rows;

        const populatedPosts = posts.map(post => ({
            id: post.id,
            text: post.text,
            image: post.image,
            created_at: post.created_at,

            user: users.find(user => user.id === post.user_id),

            likes: likes.filter(like => post.id === like.post_id)
                        .map(like => like.user_id),

            comments: comments.filter(comment => comment.post_id === post.id)
                              .map(comment => ({
                                id: comment.id,
                                text: comment.text,
                                created_at: comment.created_at,
                                user: users.find(user => user.id === comment.user_id)
                              }))  
        }));

        res.status(200).json(populatedPosts);

    } catch (error) {
        console.log("Error in getLikedPosts controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getFollowingPosts = async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await pool.query(
            `SELECT * FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const postsResult = await pool.query(
            `SELECT p.*
             FROM posts p
             JOIN user_followers uf
             ON p.user_id = uf.following_id
             WHERE uf.follower_id = $1
             ORDER BY p.created_at DESC`,
            [userId]
        );

        if (postsResult.rows.length === 0) {
            return res.status(200).json([]);
        }

        const commentsResult = await pool.query(
            `SELECT * FROM comments`
        );

        const likesResult = await pool.query(
            `SELECT * FROM post_likes`
        );

        const usersResult = await pool.query(`
            SELECT
                id,
                full_name,
                username,
                email,
                profile_img,
                cover_img,
                bio,
                link,
                created_at
            FROM users
        `);

        const posts = postsResult.rows;
        const comments = commentsResult.rows;
        const likes = likesResult.rows;
        const users = usersResult.rows;

        const populatedPosts = posts.map((post) => ({
            id: post.id,
            text: post.text,
            image: post.image,
            created_at: post.created_at,

            user: users.find(user => user.id === post.user_id),

            likes: likes
                .filter(like => like.post_id === post.id)
                .map(like => like.user_id),

            comments: comments
                .filter(comment => comment.post_id === post.id)
                .map(comment => ({
                    id: comment.id,
                    text: comment.text,
                    created_at: comment.created_at,
                    user: users.find(user => user.id === comment.user_id)
                }))
        }));

        res.status(200).json(populatedPosts);
    } catch (error) {
        console.log("Error in getFollowingPosts controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const { username } = req.params;

        // Check if user exists
        const userResult = await pool.query(
            `SELECT id FROM users WHERE username = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        const userId = userResult.rows[0].id;

        // Get user's posts
        const postsResult = await pool.query(
            `SELECT *
             FROM posts
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [userId]
        );

        if (postsResult.rows.length === 0) {
            return res.status(200).json([]);
        }

        // Get all comments
        const commentsResult = await pool.query(
            `SELECT * FROM comments`
        );

        // Get all likes
        const likesResult = await pool.query(
            `SELECT * FROM post_likes`
        );

        // Get all users
        const usersResult = await pool.query(`
            SELECT
                id,
                full_name,
                username,
                email,
                profile_img,
                cover_img,
                bio,
                link,
                created_at
            FROM users
        `);

        const posts = postsResult.rows;
        const comments = commentsResult.rows;
        const likes = likesResult.rows;
        const users = usersResult.rows;

        const populatedPosts = posts.map(post => ({
            id: post.id,
            text: post.text,
            image: post.image,
            created_at: post.created_at,

            user: users.find(user => user.id === post.user_id),

            likes: likes.filter(like => like.post_id === post.id)
                        .map(like => like.user_id),

            comments: comments.filter(comment => comment.post_id === post.id)
                              .map(comment => ({
                                id: comment.id,
                                text: comment.text,
                                created_at: comment.created_at,
                                user: users.find(user => user.id === comment.user_id)
                              }))

        }));

        res.status(200).json(populatedPosts);
    } catch (error) {
        console.log("Error in getUserPosts controller:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};