import pool from "../config/db.js";

export const getNotifications = async(req, res) => {
    try {
        
        const userId = req.user.id;

        const notificationResult = await pool.query(
            `SELECT n.id, n.from_user_id, n.to_user_id, n.type, n.is_read, n.created_at, 
                    u.id AS from_id, u.username, u.profile_img
                    FROM notifications n 
                    JOIN users u
                    ON u.id = n.from_user_id
                    WHERE n.to_user_id = $1
                    ORDER BY n.created_at DESC`,
            [userId]
        );

        await pool.query(`UPDATE notifications SET is_read = TRUE WHERE to_user_id = $1`,
            [userId]
        )

        const notifications = notificationResult.rows.map(notification => ({
            id: notification.id,
            type: notification.type,
            is_read: notification.is_read,
            created_at: notification.created_at,

            from: {
                id: notification.from_id,
                username: notification.username,
				profile_img: notification.profile_img,
            }
        }));

        res.status(200).json(notifications);

    } catch (error) {
        console.log("Error in getNotifications function", error.message);
		res.status(500).json({ error: "Internal Server Error" });
    }
};

export const deleteNotifications = async (req, res) => {
	try {
		const userId = req.user.id;

		await pool.query(
			`DELETE FROM notifications
			 WHERE to_user_id = $1`,
			[userId]
		);

		res.status(200).json({ message: "Notifications deleted successfully" });
	} catch (error) {
		console.log("Error in deleteNotifications function", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};