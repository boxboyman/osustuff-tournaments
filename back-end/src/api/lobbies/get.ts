import { getAllUserBestScores } from '../../game/get-round-scores';
import { Game } from '../../models/Game.model';
import { Request, Response } from 'express';
import { Round } from '../../models/Round.model';
import mongoose from 'mongoose';
import { getDataOrCache } from '../../services/cache';

export async function getLobby(req: Request, res: Response) {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).end();
  }

  const cacheKey = `get-lobby-${id}`;
  const data = await getDataOrCache(cacheKey, 5000, async () => await getData(id));

  if (!data) {
    return res.status(404).end();
  }

  res.json(data);
}

async function getData(id: string) {
  const game = await Game.findById(id)
    .select({
      title: 1,
      nextStageStarts: 1,
      roundNumber: 1,
      status: 1,
      createdAt: 1,
      currentRound: 1,
      currentRoundNumber: 1,
      players: 1,
      winningUser: 1,
    })
    .lean();

  if (!game) {
    return null;
  }

  const secondsToNextRound = game.nextStageStarts
    ? (game.nextStageStarts.getTime() - Date.now()) / 1000
    : undefined;

  const round = await Round.findById(game.currentRound)
    .select({ beatmap: 1 })
    .lean();
  const scores = await getAllUserBestScores(game.currentRound);
  const scoresTransformed = scores.map((score: any) => {
    const player = game.players.find((p: any) => p.userId.toString() === score.userId.toString());
    score.username = player.username;
    score.userId = undefined;

    return score;
  });

  game.players = undefined;

  return {
    ...game,
    round,
    secondsToNextRound,
    scores: scoresTransformed,
  };
}
