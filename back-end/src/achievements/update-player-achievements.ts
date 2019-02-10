import { achievementNewbie } from './game-complete/newbie';
import { IGame } from '../models/Game.model';
import { achievementVersatile } from './game-complete/versatile';
import { achievementPlayAsTester } from './join-game/play-as-tester';
import { User } from '../models/User.model';
import { achievementWinAGame } from './game-complete/win-a-game';
import { Round } from '../models/Round.model';
import { Score } from '../models/Score.model';
import { achievementHdPlayer } from './game-complete/hd-player';
import { achievementGrinder } from './game-complete/grinder';
import { achievementSpeed } from './game-complete/speedy';
import { logger } from '../logger';
import config from 'config';
import { passWithAnF } from './round-over/pass-with-f';

const TEST_MODE = config.get('TEST_MODE');

export async function updatePlayerAchievements(game: IGame) {
  const userOsuIds = game.players.map(p => p.osuUserId);
  const allGameUsers = await User.find({ osuUserId: userOsuIds });
  const aliveUsers = allGameUsers.filter(u => {
    const player = game.players.find(p => p.osuUserId === u.osuUserId);
    return player && !!player.alive;
  });

  try {
    switch (game.status) {
      case 'round-over':
        if (TEST_MODE) {
          await achievementPlayAsTester(aliveUsers);
        }
        const passedRoundScores = await Score.find({
          roundId: game.currentRound,
          gameId: game._id,
          passedRound: true,
        });
        await passWithAnF(passedRoundScores, aliveUsers);
        break;
      case 'complete':
        const passedScores = await Score.find({
          gameId: game._id,
          passedRound: true,
        }).sort({
          roundId: 1,
          score: -1,
          date: 1,
        });

        await achievementNewbie(allGameUsers);
        await achievementVersatile(allGameUsers, passedScores);
        await achievementWinAGame(game, allGameUsers);
        await achievementHdPlayer(allGameUsers);
        await achievementGrinder(allGameUsers);
        await achievementSpeed(allGameUsers, passedScores);
        break;
    }
  } catch (e) {
    logger.error('Failed to updated achievements', e);
  }
}
