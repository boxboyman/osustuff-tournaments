import { IGame, IPlayer } from '../models/Game.model';
import { updateOrCreateUser, User } from '../models/User.model';
import faker from 'faker';
import { cache } from '../services/cache';
import { addOnlineUser } from '../helpers/add-online-user';
import { logger } from '../logger';
import { userToPlayer } from './user-to-player';

export async function addSamplePlayers(game: IGame, numberOfPlayers: number) {
  const players = await Promise.all(
    new Array(numberOfPlayers)
      .fill(null)
      .map(async (_, index) => {
        try {
          const osuUser = getSampleOsuUser(index);
          const existing = await User.findOne({ osuUserId: osuUser.user_id });
          const user = existing || await updateOrCreateUser(osuUser);
          addOnlineUser(user);
          cache.put(`user-active-${user._id}`, true, 60000);
          user.currentGame = game._id;
          await user.save();
          return userToPlayer(user);
        } catch (e) {
          logger.error('Failed to create sample players!');
          throw e;
        }
      })
      .filter(p => !!p),
  );

  game.players = <IPlayer[]>players;

  await game.save();
}

export function getSampleOsuUser(index?: number) {
  return {
    user_id: index === undefined
      ? (Math.floor(Math.random() * 100000) + 1).toString()
      : userIds[index],
    username: faker.name.findName(),
    pp_rank: (Math.random() <= 0.04 ? 0 : faker.random.number(1000000)).toString(),
    country: faker.address.countryCode(),
    pp_country_rank: '1',
  };
}

const userIds = [
  '4787150',
  '754565',
  '124493',
  '6304246',
  '9224078',
  '39828',
  '2845904',
  '2644700',
  '2438122',
  '1019489',
  '7342622',
  '9622163',
  '4133758',
  '4746949',
  '4361729',
  '4866665',
  '56917',
  '2705430',
  '5155973',
  '3638005',
  '2295787',
  '3737611',
  '3905273',
  '7969090',
  '4914055',
  '6182439',
  '1731277',
  '6703291',
  '3123488',
  '5710809',
  '4317480',
  '3837965',
  '3181676',
  '4866962',
  '2222447',
  '5403374',
  '3792472',
  '2503803',
  '916693',
  '2456599',
  '4956643',
  '1887616',
  '4759050',
  '9582556',
  '3869519',
  '4258689',
  '5696185',
  '3186952',
  '3889843',
  '2374950',
  '940964',
  '4142446',
  '6668666',
  '1788022',
  '1669213',
  '157972',
  '2482261',
  '3530678',
  '2184751',
  '4597600',
  '2842992',
  '7297416',
  '2681361',
  '7263333',
  '2728326',
  '3831425',
  '5509809',
  '675132',
  '8414284',
  '453226',
  '7050754',
  '7051163',
  '4062170',
  '3765989',
  '1500305',
  '1807167',
  '2948828',
  '3230412',
  '1021342',
  '5663203',
  '6861120',
  '5233686',
  '3336090',
  '7563435',
  '652457',
  '751834',
  '3126596',
  '7980502',
  '3596296',
  '1014222',
  '6569619',
  '3394763',
  '1136098',
  '8932920',
  '7545218',
  '1708517',
  '9876301',
  '3722715',
  '6512857',
  '2896273',
];
