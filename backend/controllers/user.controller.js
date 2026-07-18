import pool from "../config/db.js";
import { v2 as cloudinary } from "cloudinary";
import bcrypt from "bcryptjs";

export const getUserProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `SELECT id,
              full_name,
              username,
              email,
              profile_img,
              cover_img,
              bio,
              link,
              created_at
      FROM users
      WHERE username = $1`,
      [username],
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get followers
    const followersResult = await pool.query(
      `SELECT follower_id
       FROM user_followers
       WHERE following_id = $1`,
      [user.id]
    );

    // Get following
    const followingResult = await pool.query(
      `SELECT following_id
       FROM user_followers
       WHERE follower_id = $1`,
      [user.id]
    );

    const likedPostsResult = await pool.query(
      `SELECT post_id
       FROM post_likes
       WHERE user_id = $1`,
      [user.id]
    );

    user.likedPosts = likedPostsResult.rows.map(row => row.post_id);
    user.followers = followersResult.rows.map(row => row.follower_id);
    user.following = followingResult.rows.map(row => row.following_id);

    res.status(200).json(user);

  } catch (error) {
    console.log("Error in getUserProfile: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const followUnfollowUser = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user.id;
    const userToFollowId = req.params.id;

    if (currentUserId === Number(userToFollowId)) {
      return res
        .status(400)
        .json({ error: "You can't follow/unfollow yourself" });
    }

    const userResult = await pool.query(`SELECT id FROM users WHERE id = $1`, [
      userToFollowId,
    ]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const followResult = await pool.query(
      `SELECT * FROM user_followers WHERE follower_id = $1 AND following_id = $2`,
      [currentUserId, userToFollowId],
    );

    if (followResult.rowCount > 0) {
      //unfollow
      await pool.query(
        `DELETE FROM user_followers WHERE follower_id = $1 AND following_id = $2`,
        [currentUserId, userToFollowId],
      );
      return res.status(200).json({ message: "User unfollowed successfully" });
    }

    //follow
    await pool.query(
      `INSERT INTO user_followers(follower_id, following_id) VALUES ($1, $2)`,
      [currentUserId, userToFollowId],
    );

    // Create notification
    await pool.query(
      `INSERT INTO notifications (from_user_id, to_user_id, type) VALUES ($1, $2, $3)`,
      [currentUserId, userToFollowId, "follow"],
    );

    res.status(200).json({ message: "User followed successfully" });
  } catch (error) {
    console.log("Error in followUnfollowUser: ", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const getSuggestedUsers = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
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
            WHERE id != $1
              AND id NOT IN (
                    SELECT following_id
                    FROM user_followers
                    WHERE follower_id = $1
              )
            ORDER BY RANDOM()
            LIMIT 4;
            `,
      [userId],
    );

    res.status(200).json(result.rows);
  } catch (error) {
    console.log("Error in getSuggestedUsers:", error.message);
    res.status(500).json({ error: error.message });
  }
};

export const updateUser = async (req, res) => {
  const {
    full_name,
    email,
    username,
    currentPassword,
    newPassword,
    bio,
    link,
  } = req.body;
  let { profile_img, cover_img } = req.body;

  const userId = req.user.id;

  try {
    const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [
      userId,
    ]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email && !emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
  }

  if (username) {
      const existingUser = await pool.query(
          `SELECT id FROM users WHERE username = $1 AND id != $2`,
          [username,userId]
      );

      if (existingUser.rowCount > 0) {
          return res.status(400).json({ error: "Username is already taken" });
      }
  }

  if (email) {
      const existingEmail = await pool.query(
          `SELECT id FROM users WHERE email = $1 AND id != $2`,
          [email, userId]
      );

      if (existingEmail.rowCount > 0) {
          return res.status(400).json({ error: "Email is already taken" });
      }
  }

    if (
      (!currentPassword && newPassword) ||
      (!newPassword && currentPassword)
    ) {
      return res.status(400).json({
        error: "Please provide both current password and new password",
      });
    }

    let hashedPassword = user.password;

    if (currentPassword && newPassword) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);

      if (!isMatch) {
          return res.status(400).json({ error: "Current password is incorrect" });
      }

      if (newPassword.length < 6) {
          return res.status(400).json({
              error: "Password must be at least 6 characters long",
          });
      }

      const salt = await bcrypt.genSalt(10);
      hashedPassword = await bcrypt.hash(newPassword, salt);
    }

    if (profile_img) {
      if (user.profile_img) {
        await cloudinary.uploader.destroy(
          user.profile_img.split("/").pop().split(".")[0],
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(profile_img);
      profile_img = uploadedResponse.secure_url;
    }

    if (cover_img) {
      if (user.cover_img) {
        await cloudinary.uploader.destroy(
          user.cover_img.split("/").pop().split(".")[0],
        );
      }

      const uploadedResponse = await cloudinary.uploader.upload(cover_img);
      cover_img = uploadedResponse.secure_url;
    }

    const updatedUser = await pool.query(
      `UPDATE users SET full_name = $1,
                            username = $2,
                            email = $3,
                            password = $4, 
                            profile_img = $5, 
                            cover_img = $6, 
                            bio = $7, 
                            link = $8, 
                            updated_at = CURRENT_TIMESTAMP 
                        WHERE id = $9
          RETURNING id, full_name, 
                        username, 
                        email, 
                        profile_img, 
                        cover_img, 
                        bio, 
                        link,
                        updated_at`,
                        [
        full_name ?? user.full_name,
        username ?? user.username,
        email ?? user.email,
        hashedPassword,
        profile_img ?? user.profile_img,
        cover_img ?? user.cover_img,
        bio ?? user.bio,
        link ?? user.link,
        userId,
      ],
    );
    
    const updatedUserData = updatedUser.rows[0];

      // Get followers
      const followersResult = await pool.query(
        `SELECT follower_id
        FROM user_followers
        WHERE following_id = $1`,
        [userId]
      );

      // Get following
      const followingResult = await pool.query(
        `SELECT following_id
        FROM user_followers
        WHERE follower_id = $1`,
        [userId]
      );

      // Get liked posts
      const likedPostsResult = await pool.query(
        `SELECT post_id
        FROM post_likes
        WHERE user_id = $1`,
        [userId]
      );

      updatedUserData.followers = followersResult.rows.map(
        row => row.follower_id
      );

      updatedUserData.following = followingResult.rows.map(
        row => row.following_id
      );

      updatedUserData.likedPosts = likedPostsResult.rows.map(
        row => row.post_id
      );

      return res.status(200).json(updatedUserData);
  } catch (error) {
    console.error("Error in updateUser:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};