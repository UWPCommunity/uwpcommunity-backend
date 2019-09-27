import { Request, Response } from "express";
import User, { getUserByDiscordId } from "../../models/User"
import { ResponseErrorReasons } from "../../models/types";
import { genericServerError, validateAuthenticationHeader } from "../../common/helpers/generic";
import { GetDiscordIdFromToken } from "../../common/helpers/discord";
import { MalformedRequest, BadRequest, Success } from "../../common/helpers/responseHelper";

module.exports = async (req: Request, res: Response) => {
    const body = req.body;

    const authAccess = validateAuthenticationHeader(req, res);
    if (!authAccess) return;

    let discordId = await GetDiscordIdFromToken(authAccess, res);
    if (!discordId) return;

    const bodyCheck = checkBody(body);
    if (bodyCheck !== true) {
        MalformedRequest(res, `Parameter "${bodyCheck}" not provided or malformed`);        
        return;
    }

    // Check if the user already exists
    const user = await getUserByDiscordId(discordId).catch((err) => genericServerError(err, res));

    if (user) {
        BadRequest(res, ResponseErrorReasons.UserExists);
        return;
    }

    submitUser({ ...body, discordId: discordId })
        .then(() => {
            Success(res);
        })
        .catch((err) => genericServerError(err, res));
};

function checkBody(body: IPostUserRequestBody): true | string {
    if (!body.name) return "name";
    return true;
}

function submitUser(userData: IPostUserRequestBody): Promise<User> {
    return new Promise<User>((resolve, reject) => {
        User.create({ ...userData })
            .then(resolve)
            .catch(reject);
    });
}

interface IPostUserRequestBody {
    name: string;
    email?: string;
}