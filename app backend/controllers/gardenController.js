const { createGarden, getUserGardens, getGardenById, getGardenByInviteCode, joinGardenByInviteCode, getGardenMembers, leaveGarden, updateGarden, isUserMemberOfGarden } = require('../models/gardenModel');
const { getUser } = require('../models/userModel');
const { sendSuccess, sendError } = require('../utils/wsResponses');
const { getEmailBySocket } = require('../models/userSessions');

const gardenHandlers = {
    CREATE_GARDEN: handleCreateGarden,
    GET_USER_GARDENS: handleGetUserGardens,
    GET_GARDEN_DETAILS: handleGetGardenDetails,
    SEARCH_GARDEN_BY_CODE: handleSearchGardenByCode,
    JOIN_GARDEN: handleJoinGarden,
    GET_GARDEN_MEMBERS: handleGetGardenMembers,
    LEAVE_GARDEN: handleLeaveGarden,
    UPDATE_GARDEN: handleUpdateGarden
};

async function handleGardenMessage(data, ws) {
    try {
        const email = getEmailBySocket(ws);
        if (!email) {
            return sendError(ws, 'UNAUTHORIZED', 'User must be logged in to manage gardens');
        }

        const handler = gardenHandlers[data.type];
        if (handler) {
            await handler(data, ws, email);
        } else {
            sendError(ws, 'UNKNOWN_TYPE', `Unknown garden message type: ${data.type}`);
        }
    } catch (err) {
        console.log(`[GARDEN] Error handling message: ${err.message}`);
        sendError(ws, 'GARDEN_ERROR', 'Internal server error while processing garden request');
    }
}

// Create a new garden
async function handleCreateGarden(data, ws, email) {
    const { gardenName, country, city } = data;

    if (!gardenName || typeof gardenName !== 'string' || gardenName.trim().length === 0) {
        return sendError(ws, 'CREATE_GARDEN_FAIL', 'Garden name is required and must be a non-empty string');
    }

    if (gardenName.length > 255) {
        return sendError(ws, 'CREATE_GARDEN_FAIL', 'Garden name must be 255 characters or less');
    }

    try {
        // Get user from database
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'User not found');
        }

        // Require valid country and city
        const { isValidLocation, isValidCountryAndCity } = require('../utils/validators');
        if (!isValidLocation(country, city)) {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'Country and city are required');
        }
        if (!isValidCountryAndCity(country, city)) {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'Invalid country or city');
        }

        // Create garden (with optional country/city)
        const result = await createGarden(user.id, gardenName.trim(), country, city);

        if (result.error === 'USER_ALREADY_ADMIN') {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'You already manage a garden. You can only be admin of one garden at a time.');
        }

        if (result.error === 'USER_ALREADY_MEMBER') {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'You are already a member of a garden. You can only be connected to one garden at a time.');
        }

        if (result.error === 'INVALID_LOCATION') {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'Country and city are required');
        }

        if (result.error === 'DATABASE_ERROR') {
            return sendError(ws, 'CREATE_GARDEN_FAIL', 'Failed to create garden. Please try again.');
        }

        // Success - garden created
        sendSuccess(ws, 'CREATE_GARDEN_SUCCESS', {
            garden: {
                id: result.garden.id,
                name: result.garden.name,
                admin_user_id: result.garden.admin_user_id,
                invite_code: result.inviteCode,
                country: result.garden.country,
                city: result.garden.city,
                created_at: result.garden.created_at
            },
            inviteCode: result.inviteCode,
            message: `Garden "${gardenName}" created successfully! Share invite code: ${result.inviteCode}`
        });

        console.log(`[GARDEN] Created: name=${gardenName} user=${user.full_name} email=${email} code=${result.inviteCode}`);

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to create - ${error.message}`);
        sendError(ws, 'CREATE_GARDEN_FAIL', 'Internal server error while creating garden');
    }
}

// Get user's gardens
async function handleGetUserGardens(data, ws, email) {
    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'GET_GARDENS_FAIL', 'User not found');
        }

        const gardens = await getUserGardens(user.id);

        if (gardens.length === 0) {
            // User has no gardens - show create garden option
            sendSuccess(ws, 'GET_USER_GARDENS_SUCCESS', {
                gardens: [],
                message: 'You don\'t have any gardens yet. Create your first garden to start managing plants!',
                showCreateGarden: true
            });
        } else {
            // User has gardens
            sendSuccess(ws, 'GET_USER_GARDENS_SUCCESS', {
                gardens: gardens.map(garden => ({
                    id: garden.id,
                    name: garden.name,
                    role: garden.role,
                    admin_name: garden.admin_name,
                    country: garden.country,
                    city: garden.city,
                    member_count: garden.member_count,
                    joined_at: garden.joined_at
                })),
                defaultGarden: gardens[0]
            });
        }

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to get user gardens - ${error.message}`);
        sendError(ws, 'GET_GARDENS_FAIL', 'Internal server error while fetching gardens');
    }
}

// Get garden details
async function handleGetGardenDetails(data, ws, email) {
    const { gardenId } = data;

    if (!gardenId) {
        return sendError(ws, 'GET_GARDEN_DETAILS_FAIL', 'Garden ID is required');
    }

    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'GET_GARDEN_DETAILS_FAIL', 'User not found');
        }

        const garden = await getGardenById(gardenId);
        if (!garden) {
            return sendError(ws, 'GET_GARDEN_DETAILS_FAIL', 'Garden not found');
        }

        sendSuccess(ws, 'GET_GARDEN_DETAILS_SUCCESS', {
            garden: {
                id: garden.id,
                name: garden.name,
                admin_name: garden.admin_name,
                country: garden.country,
                city: garden.city,
                invite_code: garden.invite_code,
                created_at: garden.created_at
            }
        });

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to get details - ${error.message}`);
        sendError(ws, 'GET_GARDEN_DETAILS_FAIL', 'Internal server error while fetching garden details');
    }
}

// Search garden by invite code
async function handleSearchGardenByCode(data, ws, email) {
    const { inviteCode } = data;

    if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
        return sendError(ws, 'SEARCH_GARDEN_FAIL', 'Invite code is required');
    }

    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'SEARCH_GARDEN_FAIL', 'User not found');
        }

        const garden = await getGardenByInviteCode(inviteCode.trim());
        if (!garden) {
            return sendError(ws, 'SEARCH_GARDEN_FAIL', 'Invalid invite code. Please check and try again.');
        }

        sendSuccess(ws, 'SEARCH_GARDEN_SUCCESS', {
            garden: {
                id: garden.id,
                name: garden.name,
                admin_name: garden.admin_name,
                country: garden.country,
                city: garden.city,
                invite_code: garden.invite_code
            },
            message: `Found garden: "${garden.name}" managed by ${garden.admin_name}`
        });

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to search by code - ${error.message}`);
        sendError(ws, 'SEARCH_GARDEN_FAIL', 'Internal server error while searching for garden');
    }
}

// Join a garden by invite code
async function handleJoinGarden(data, ws, email) {
    const { inviteCode } = data;

    if (!inviteCode || typeof inviteCode !== 'string' || inviteCode.trim().length === 0) {
        return sendError(ws, 'JOIN_GARDEN_FAIL', 'Invite code is required');
    }

    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'JOIN_GARDEN_FAIL', 'User not found');
        }

        const result = await joinGardenByInviteCode(user.id, inviteCode.trim());

        if (result.error === 'USER_ALREADY_MEMBER') {
            return sendError(ws, 'JOIN_GARDEN_FAIL', 'You are already a member of a garden. You can only be connected to one garden at a time.');
        }

        if (result.error === 'ALREADY_IN_GARDEN') {
            return sendError(ws, 'JOIN_GARDEN_FAIL', 'You are already a member of this garden.');
        }

        if (result.error === 'GARDEN_NOT_FOUND') {
            return sendError(ws, 'JOIN_GARDEN_FAIL', 'Invalid invite code. Please check and try again.');
        }

        if (result.error === 'DATABASE_ERROR') {
            return sendError(ws, 'JOIN_GARDEN_FAIL', 'Failed to join garden. Please try again.');
        }

        // Success - user joined garden
        sendSuccess(ws, 'JOIN_GARDEN_SUCCESS', {
            garden: {
                id: result.garden.id,
                name: result.garden.name,
                admin_name: result.garden.admin_name,
                country: result.garden.country,
                city: result.garden.city
            },
            message: `Successfully joined "${result.garden.name}"! You can now manage plants in this garden.`
        });

        console.log(`[GARDEN] User joined: name=${user.full_name} email=${email} garden=${result.garden.name} id=${result.garden.id}`);

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to join - ${error.message}`);
        sendError(ws, 'JOIN_GARDEN_FAIL', 'Internal server error while joining garden');
    }
}

// Get garden members
async function handleGetGardenMembers(data, ws, email) {
    const { gardenId } = data;

    if (!gardenId) {
        return sendError(ws, 'GET_GARDEN_MEMBERS_FAIL', 'Garden ID is required');
    }

    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'GET_GARDEN_MEMBERS_FAIL', 'User not found');
        }

        // Check if user is a member of this garden
        const membership = await isUserMemberOfGarden(user.id, gardenId);
        if (!membership) {
            return sendError(ws, 'GET_GARDEN_MEMBERS_FAIL', 'You are not a member of this garden');
        }

        const members = await getGardenMembers(gardenId);

        sendSuccess(ws, 'GET_GARDEN_MEMBERS_SUCCESS', {
            members: members,
            message: `Found ${members.length} member(s) in the garden`
        });

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to get members - ${error.message}`);
        sendError(ws, 'GET_GARDEN_MEMBERS_FAIL', 'Internal server error while fetching garden members');
    }
}

// Leave a garden
async function handleLeaveGarden(data, ws, email) {
    const { gardenId } = data;

    if (!gardenId) {
        return sendError(ws, 'LEAVE_GARDEN_FAIL', 'Garden ID is required');
    }

    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'LEAVE_GARDEN_FAIL', 'User not found');
        }

        const result = await leaveGarden(user.id, gardenId);

        if (result.error === 'NOT_MEMBER') {
            return sendError(ws, 'LEAVE_GARDEN_FAIL', 'You are not a member of this garden');
        }

        if (result.error === 'ADMIN_CANNOT_LEAVE') {
            return sendError(ws, 'LEAVE_GARDEN_FAIL', 'Garden admin cannot leave. Please transfer ownership first.');
        }

        if (result.error === 'DATABASE_ERROR') {
            return sendError(ws, 'LEAVE_GARDEN_FAIL', 'Failed to leave garden. Please try again.');
        }

        // Success - user left garden
        sendSuccess(ws, 'LEAVE_GARDEN_SUCCESS', {
            message: 'Successfully left the garden'
        });

        console.log(`[GARDEN] User left: name=${user.full_name} email=${email} garden=${gardenId}`);

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to leave - ${error.message}`);
        sendError(ws, 'LEAVE_GARDEN_FAIL', 'Internal server error while leaving garden');
    }
}

// Update garden details (admin only)
async function handleUpdateGarden(data, ws, email) {
    const { gardenId, name, max_members, country, city } = data;

    if (!gardenId) {
        return sendError(ws, 'UPDATE_GARDEN_FAIL', 'Garden ID is required');
    }

    try {
        const user = await getUser(email);
        if (!user) {
            return sendError(ws, 'UPDATE_GARDEN_FAIL', 'User not found');
        }

        // Check if user is admin of this garden
        const membership = await isUserMemberOfGarden(user.id, gardenId);
        if (!membership || membership.role !== 'admin') {
            return sendError(ws, 'UPDATE_GARDEN_FAIL', 'Only garden admin can update garden details');
        }

        const updates = {};
        if (name !== undefined) updates.name = name;
        if (max_members !== undefined) updates.max_members = max_members;
        if (country !== undefined || city !== undefined) {
            const { isValidLocation, isValidCountryAndCity } = require('../utils/validators');
            if (!isValidLocation(country, city) || !isValidCountryAndCity(country, city)) {
                return sendError(ws, 'UPDATE_GARDEN_FAIL', 'Invalid country or city');
            }
            updates.country = country;
            updates.city = city;
        }

        if (Object.keys(updates).length === 0) {
            return sendError(ws, 'UPDATE_GARDEN_FAIL', 'No updates provided');
        }

        const result = await updateGarden(gardenId, updates);

        if (result.error === 'GARDEN_NOT_FOUND') {
            return sendError(ws, 'UPDATE_GARDEN_FAIL', 'Garden not found');
        }

        if (result.error === 'DATABASE_ERROR') {
            return sendError(ws, 'UPDATE_GARDEN_FAIL', 'Failed to update garden. Please try again.');
        }

        // Success - garden updated
        sendSuccess(ws, 'UPDATE_GARDEN_SUCCESS', {
            garden: result.garden,
            message: 'Garden updated successfully'
        });

        // If location changed, push updated coordinates to Pi for all plants in this garden
        try {
            if (updates.country !== undefined || updates.city !== undefined) {
                const { getLatLonForCountryCity } = require('../services/locationService');
                const { getPlantsByGardenId } = require('../models/plantModel');
                const { getPiSocket } = require('../sockets/piSocket');
                const piSocket = getPiSocket();
                if (piSocket) {
                    const coords = await getLatLonForCountryCity(result.garden.country, result.garden.city);
                    if (coords) {
                        const plants = await getPlantsByGardenId(gardenId);
                        for (const plant of plants) {
                            try {
                                piSocket.send(JSON.stringify({
                                    type: 'UPDATE_PLANT_LOCATION',
                                    data: { plant_id: plant.plant_id, lat: coords.lat, lon: coords.lon }
                                }));
                            } catch (e) { }
                        }
                    }
                }
            }
        } catch (e) {
            // Best-effort only
        }

        console.log(`[GARDEN] Location Updated: id=${gardenId} user=${user.full_name} email=${email}`);

    } catch (error) {
        console.log(`[GARDEN] Error: Failed to update - ${error.message}`);
        sendError(ws, 'UPDATE_GARDEN_FAIL', 'Internal server error while updating garden');
    }
}

module.exports = {
    handleGardenMessage
};
