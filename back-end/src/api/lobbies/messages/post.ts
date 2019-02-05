import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { User } from '../../../models/User.model';
import { Message } from '../../../models/Message.model';
import { ObjectID } from 'bson';
import { cache } from '../../../services/cache';

export async function sendMessage(req: Request, res: Response) {
  const { id } = req.params;
  const { message } = req.body;

  const { username } = req.app.get('claim');

  if (!Types.ObjectId.isValid(id)) {
    return res.status(404).end();
  }

  if (typeof message !== 'string' || message.length < 1 || message.length > 500) {
    return res.status(400).end();
  }

  const user = await User.findOne({ username });

  if (!user || !user.currentGame || user.currentGame.toString() !== id) {
    return res.status(401).end();
  }

  const { _id } = await Message.create({
    username: user.username,
    userId: user._id,
    osuUserId: user.osuUserId,
    gameId: new ObjectID(id),
    message,
  });

  cache.put('last-message-id', _id.toString());

  res.status(200).end();
}
