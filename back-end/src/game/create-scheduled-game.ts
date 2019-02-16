import { IUser } from './../models/User.model';
import { ICreateScheduledGameOptions } from '../api/lobbies/create-game';
import { Game, IGame } from '../models/Game.model';
import { Beatmap, IBeatmap } from '../models/Beatmap.model';
import { getBeatmapBetweenStars } from './create-game';

const stars = [
  [3, 3.8],
  [4.5, 5],
  [5, 5.5],
  [5.2, 5.7],
  [5.4, 5.9],
  [5.5, 6.1],
  [5.7, 6.2],
  [6],
  [6],
  [6.5],
];

export async function createScheduledGame(
  {
    title,
    roundBeatmaps,
    date,
    minRank,
    maxRank,
    description,
  }: ICreateScheduledGameOptions,
  user: IUser,
): Promise<IGame> {
  const shouldUseRandombeatmaps = roundBeatmaps.some(b => !b) || undefined;
  let beatmaps =
    shouldUseRandombeatmaps &&
    (await Beatmap.aggregate([{ $sample: { size: 3000 } }]));

  if (shouldUseRandombeatmaps) {
    roundBeatmaps = roundBeatmaps.map((r, idx) => {
      if (r) {
        // If beatmap is already defined, use the given beatmap
        return r;
      } else {
        // Get a random beatmap from the standard star ratings
        const [beatmap, remaining] = getBeatmapBetweenStars(
          <IBeatmap[]>beatmaps,
          stars[idx][0],
          stars[idx][1],
          90 + 15 * idx, // min length
          160 + 20 * idx, // max length
        );
        beatmaps = remaining;

        return beatmap;
      }
    });
  }

  return await Game.create({
    title,
    beatmaps: roundBeatmaps,
    status: 'scheduled',
    nextStageStarts: date,
    minRank,
    maxRank,
    owner: user._id,
    description,
  });
}
