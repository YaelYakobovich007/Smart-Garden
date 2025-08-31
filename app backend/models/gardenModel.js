const { pool } = require('../config/database');

// Generate unique invite code for garden
async function generateUniqueInviteCode() {
    let code;
    let exists = true;

    while (exists) {
        // Generate 6-character code: ROSE24, MINT89, etc.
        const words = ['ROSE', 'MINT', 'SAGE', 'BASIL', 'LILY', 'IRIS', 'PALM', 'FERN', 'MOSS', 'VINE'];
        const word = words[Math.floor(Math.random() * words.length)];
        const num = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        code = word + num;

        const check = await pool.query('SELECT id FROM gardens WHERE invite_code = $1', [code]);
        exists = check.rows.length > 0;
    }

    return code;
}

// Create a new garden
async function createGarden(adminUserId, gardenName, country, city) {
    try {
        if (!country || !city) {
            return { error: 'INVALID_LOCATION' };
        }
        // Check if user already has a garden as admin
        const existingGarden = await pool.query(
            'SELECT id FROM gardens WHERE admin_user_id = $1 AND is_active = true',
            [adminUserId]
        );

        if (existingGarden.rows.length > 0) {
            return { error: 'USER_ALREADY_ADMIN' };
        }

        // Check if user is already a member of any garden
        const existingMembership = await pool.query(
            'SELECT garden_id FROM user_gardens WHERE user_id = $1 AND is_active = true',
            [adminUserId]
        );

        if (existingMembership.rows.length > 0) {
            return { error: 'USER_ALREADY_MEMBER' };
        }

        // Generate unique invite code
        const inviteCode = await generateUniqueInviteCode();

        // Create garden (country/city optional)
        const gardenResult = await pool.query(`
      INSERT INTO gardens (name, admin_user_id, invite_code, country, city)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [gardenName, adminUserId, inviteCode, country, city]);

        const garden = gardenResult.rows[0];

        // Add admin to user_gardens as admin
        await pool.query(`
      INSERT INTO user_gardens (user_id, garden_id, role, is_active)
      VALUES ($1, $2, 'admin', true)
    `, [adminUserId, garden.id]);

        return { garden, inviteCode };
    } catch (error) {
        console.error('Error creating garden:', error);
        return { error: 'DATABASE_ERROR' };
    }
}

// Get garden by ID
async function getGardenById(gardenId) {
    try {
        const result = await pool.query(`
      SELECT g.*, u.full_name as admin_name
      FROM gardens g
      JOIN users u ON g.admin_user_id = u.id
      WHERE g.id = $1 AND g.is_active = true
    `, [gardenId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting garden by ID:', error);
        return null;
    }
}

// Get gardens for a user (where user is a member)
async function getUserGardens(userId) {
    try {
        const result = await pool.query(`
      SELECT g.*, ug.role, u.full_name as admin_name,
             (SELECT COUNT(*) FROM user_gardens WHERE garden_id = g.id AND is_active = true) as member_count
      FROM gardens g
      JOIN user_gardens ug ON g.id = ug.garden_id
      JOIN users u ON g.admin_user_id = u.id
      WHERE ug.user_id = $1 AND ug.is_active = true AND g.is_active = true
      ORDER BY ug.joined_at ASC
    `, [userId]);

        return result.rows;
    } catch (error) {
        console.error('Error getting user gardens:', error);
        return [];
    }
}

// Get garden by invite code
async function getGardenByInviteCode(inviteCode) {
    try {
        const result = await pool.query(`
      SELECT g.*, u.full_name as admin_name
      FROM gardens g
      JOIN users u ON g.admin_user_id = u.id
      WHERE g.invite_code = $1 AND g.is_active = true
    `, [inviteCode.toUpperCase()]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error getting garden by invite code:', error);
        return null;
    }
}

// Check if user is member of garden
async function isUserMemberOfGarden(userId, gardenId) {
    try {
        const result = await pool.query(`
      SELECT role FROM user_gardens 
      WHERE user_id = $1 AND garden_id = $2 AND is_active = true
    `, [userId, gardenId]);

        return result.rows[0] || null;
    } catch (error) {
        console.error('Error checking garden membership:', error);
        return null;
    }
}

// Join a garden by invite code (with one garden per user limit)
async function joinGardenByInviteCode(userId, inviteCode) {
    try {
        // Check if user is already a member of any garden
        const existingMembership = await pool.query(
            'SELECT garden_id FROM user_gardens WHERE user_id = $1 AND is_active = true',
            [userId]
        );

        if (existingMembership.rows.length > 0) {
            return { error: 'USER_ALREADY_MEMBER' };
        }

        // Find garden by invite code
        const garden = await getGardenByInviteCode(inviteCode);
        if (!garden) {
            return { error: 'GARDEN_NOT_FOUND' };
        }

        // Check if user is already a member of this specific garden (active)
        const existingInGarden = await pool.query(
            'SELECT garden_id FROM user_gardens WHERE user_id = $1 AND garden_id = $2 AND is_active = true',
            [userId, garden.id]
        );

        if (existingInGarden.rows.length > 0) {
            return { error: 'ALREADY_IN_GARDEN' };
        }

        // Check if user previously left this garden (inactive record exists)
        const previousMembership = await pool.query(
            'SELECT garden_id FROM user_gardens WHERE user_id = $1 AND garden_id = $2 AND is_active = false',
            [userId, garden.id]
        );

        if (previousMembership.rows.length > 0) {
            // Reactivate the previous membership
            await pool.query(
                'UPDATE user_gardens SET is_active = true WHERE user_id = $1 AND garden_id = $2',
                [userId, garden.id]
            );
        } else {
            // Add new user to garden as member
            await pool.query(`
                INSERT INTO user_gardens (user_id, garden_id, role, is_active)
                VALUES ($1, $2, 'member', true)
            `, [userId, garden.id]);
        }

        return { success: true, garden };
    } catch (error) {
        console.error('Error joining garden:', error);
        return { error: 'DATABASE_ERROR' };
    }
}

// Get garden members
async function getGardenMembers(gardenId) {
    try {
        const result = await pool.query(`
      SELECT u.id, u.full_name, u.email, ug.role, ug.joined_at
      FROM user_gardens ug
      JOIN users u ON ug.user_id = u.id
      WHERE ug.garden_id = $1 AND ug.is_active = true
      ORDER BY ug.joined_at ASC
    `, [gardenId]);

        return result.rows;
    } catch (error) {
        console.error('Error getting garden members:', error);
        return [];
    }
}

// Leave a garden
async function leaveGarden(userId, gardenId) {
    try {
        // Check if user is a member of this garden
        const membership = await pool.query(
            'SELECT role FROM user_gardens WHERE user_id = $1 AND garden_id = $2 AND is_active = true',
            [userId, gardenId]
        );

        if (membership.rows.length === 0) {
            return { error: 'NOT_MEMBER' };
        }

        // Check if user is admin (admin cannot leave, must transfer ownership first)
        if (membership.rows[0].role === 'admin') {
            return { error: 'ADMIN_CANNOT_LEAVE' };
        }

        // Remove user from garden
        await pool.query(
            'UPDATE user_gardens SET is_active = false WHERE user_id = $1 AND garden_id = $2',
            [userId, gardenId]
        );

        return { success: true };
    } catch (error) {
        console.error('Error leaving garden:', error);
        return { error: 'DATABASE_ERROR' };
    }
}

// Update garden details (admin only)
async function updateGarden(gardenId, updates) {
    try {
        const { name, max_members, country, city } = updates;
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        if (name !== undefined) {
            updateFields.push(`name = $${paramCount}`);
            values.push(name);
            paramCount++;
        }

        if (max_members !== undefined) {
            updateFields.push(`max_members = $${paramCount}`);
            values.push(max_members);
            paramCount++;
        }

        if (country !== undefined) {
            updateFields.push(`country = $${paramCount}`);
            values.push(country);
            paramCount++;
        }

        if (city !== undefined) {
            updateFields.push(`city = $${paramCount}`);
            values.push(city);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return { error: 'NO_UPDATES' };
        }

        values.push(gardenId);
        const query = `
            UPDATE gardens 
            SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount} AND is_active = true
            RETURNING *
        `;

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            return { error: 'GARDEN_NOT_FOUND' };
        }

        return { success: true, garden: result.rows[0] };
    } catch (error) {
        console.error('Error updating garden:', error);
        return { error: 'DATABASE_ERROR' };
    }
}

module.exports = {
    createGarden,
    getGardenById,
    getUserGardens,
    getGardenByInviteCode,
    isUserMemberOfGarden,
    getGardenMembers,
    joinGardenByInviteCode,
    generateUniqueInviteCode,
    leaveGarden,
    updateGarden
};
