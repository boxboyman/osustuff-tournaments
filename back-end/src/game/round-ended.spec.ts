import { ObjectId } from 'bson';
import mongoose from 'mongoose';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import config from 'config';
import { Game, IPlayer } from '../models/Game.model';
import { Score } from '../models/Score.model';
import { User } from '../models/User.model';
import { Round } from '../models/Round.model';
import { roundEnded } from './round-ended';
import { addPlayer } from './add-player';

mongoose.set('useCreateIndex', true);
const expect = chai.expect;
chai.use(sinonChai);

describe('round-ended', () => {
  before(async () => {
    await mongoose.connect('mongodb://127.0.0.1:' + config.get('DB_PORT') + '/osu-br-test', {
      useNewUrlParser: true,
    });
  });
  after(async () => {
    await mongoose.disconnect();
  });
  beforeEach(async () => {
    await Game.deleteMany({});
    await Score.deleteMany({});
    await User.deleteMany({});
  });

  it('No one wins if no scores set', async () => {
    const u1 = await getUser(1);
    const game = await Game.create({ title: 'test', beatmaps: [] });
    await addPlayer(game, u1);
    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });

    await roundEnded(game, round);
    expect(game.status).to.equal('round-over');
    expect(game.players[0].alive).to.equal(false);
  });
  it('Players with no score set should draw', async () => {
    const game = await Game.create({ title: 'test', beatmaps: [] });

    for (let i = 1; i <= 3; i++) {
      const u = await getUser(i);
      await addPlayer(game, u);
    }
    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });
    const winner = await getUser(4);
    await addPlayer(game, winner);

    const baseScoreData = getBaseScoreData(round);
    const score1 = await Score.create({
      ...baseScoreData,
      score: 2,
      userId: winner._id,
      username: winner.username,
    });
    const loser = await getUser(5);
    await addPlayer(game, loser);
    const score2 = await Score.create({
      ...baseScoreData,
      score: 1,
      userId: loser._id,
      username: loser.username,
    });

    await roundEnded(game, round);

    expect(game.players[0].gameRank).to.equal(3);
    expect(game.players[0].alive).to.equal(false);
    expect(game.players[1].gameRank).to.equal(3);
    expect(game.players[1].alive).to.equal(false);
    expect(game.players[2].gameRank).to.equal(3);
    expect(game.players[2].alive).to.equal(false);
    expect(game.players[3].gameRank).to.equal(undefined);
    expect(game.players[3].alive).to.equal(true);
    expect(game.players[4].gameRank).to.equal(2);
    expect(game.players[4].alive).to.equal(false);
  });
  it('Out of 3 players, 2 progress', async () => {
    const u1 = await getUser(1);
    const u2 = await getUser(2);
    const u3 = await getUser(3);
    const game = await Game.create({ title: 'test', beatmaps: [] });

    await addPlayer(game, u2);
    await addPlayer(game, u3);
    await addPlayer(game, u1);

    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });
    const baseScoreData = getBaseScoreData(round);
    await Score.create({
      ...baseScoreData,
      score: 3,
      userId: u1._id,
      username: u1.username,
    });
    await Score.create({
      ...baseScoreData,
      score: 1,
      userId: u2._id,
      username: u2.username,
    });
    await Score.create({
      ...baseScoreData,
      score: 2,
      userId: u3._id,
      username: u3.username,
    });

    await roundEnded(game, round);
    expect(game.status).to.equal('round-over');
    const p1 = <IPlayer> game.players.find(p => p.userId.toString() === u1._id.toString());
    const p2 = <IPlayer> game.players.find(p => p.userId.toString() === u2._id.toString());
    const p3 = <IPlayer> game.players.find(p => p.userId.toString() === u3._id.toString());

    expect(p1.alive).to.equal(true);
    expect(p2.alive).to.equal(false);
    expect(p3.alive).to.equal(true);
  });
  it('Final 3, 2 players draw, all alive', async () => {
    const u1 = await getUser(1);
    const u2 = await getUser(2);
    const u3 = await getUser(3);
    const game = await Game.create({ title: 'test', beatmaps: [] });

    await addPlayer(game, u2);
    await addPlayer(game, u3);
    await addPlayer(game, u1);

    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });
    const baseScoreData = getBaseScoreData(round);
    await Score.create({
      ...baseScoreData,
      score: 3,
      userId: u1._id,
      username: u1.username,
    });
    await Score.create({
      ...baseScoreData,
      score: 1,
      userId: u2._id,
      username: u2.username,
    });
    await Score.create({
      ...baseScoreData,
      score: 1,
      userId: u3._id,
      username: u3.username,
    });

    await roundEnded(game, round);
    expect(game.status).to.equal('round-over');

    game.players.forEach((player, index) => {
      expect(player.alive).to.equal(true);
      expect(player.gameRank).to.equal(undefined);
    });
  });
  it('last 2 players tied scores, both should stay alive', async () => {
    const u1 = await getUser(1);
    const u2 = await getUser(2);
    const game = await Game.create({ title: 'test', beatmaps: [] });

    await addPlayer(game, u2);
    await addPlayer(game, u1);

    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });
    const baseScoreData = getBaseScoreData(round);
    await Score.create({
      ...baseScoreData,
      score: 1,
      userId: u1._id,
      username: u1.username,
    });
    await Score.create({
      ...baseScoreData,
      score: 2,
      userId: u1._id,
      username: u1.username,
    });
    const date = new Date();
    date.setMinutes(date.getMinutes() - 1);

    await Score.create({
      ...baseScoreData,
      score: 2,
      userId: u2._id,
      date,
      username: u2.username,
    });

    await roundEnded(game, round);
    const p1 = <IPlayer> game.players.find(p => p.userId.toString() === u1._id.toString());
    const p2 = <IPlayer> game.players.find(p => p.userId.toString() === u2._id.toString());
    expect(p1.alive).to.equal(true);
    expect(p1.gameRank).to.equal(undefined);
    expect(p2.alive).to.equal(true);
    expect(p2.gameRank).to.equal(undefined);
  });
  it('scores that tie with passing score should also pass', async () => {
    const game = await Game.create({ title: 'test', beatmaps: [] });

    const players = [];
    for (let i = 0; i < 5; i++) {
      players.push(await addPlayer(game, await getUser(i)));
    }

    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });
    const baseScoreData = getBaseScoreData(round);
    await Score.create({
      ...baseScoreData,
      score: 2,
      userId: players[0]._id,
      username: players[0].username,
    });
    for (let i = 1; i <= 3; i++) {
      await Score.create({
        ...baseScoreData,
        score: 1,
        userId: players[i]._id,
        username: players[i].username,
      });
    }
    await roundEnded(game, round);

    console.log(game.players.map(p => `${p.username} - ${p.gameRank}`));

    for (let i = 0; i < 4; i++) {
      expect(game.players[i].alive).to.equal(true);
      expect(game.players[i].gameRank).to.equal(undefined);
    }
    expect(game.players[4].alive).to.equal(false);
    expect(game.players[4].gameRank).to.equal(5);
  });
  it('ranks losing scores accordingly', async () => {
    const game = await Game.create({ title: 'test', beatmaps: [] });

    const players = [];
    for (let i = 0; i < 7; i++) {
      players.push(await addPlayer(game, await getUser(i)));
    }

    const round = await Round.create({
      roundNumber: 1,
      beatmap: {
        beatmapId: 'asd123',
        title: 'b1',
      },
      gameId: game._id,
    });
    const baseScoreData = getBaseScoreData(round);
    await Score.create({
      ...baseScoreData,
      score: 2,
      userId: players[0]._id,
      username: players[0].username,
    });
    await Score.create({
      ...baseScoreData,
      score: 5,
      userId: players[1]._id,
      username: players[1].username,
    });
    await Score.create({
      ...baseScoreData,
      score: 1,
      userId: players[2]._id,
      username: players[2].username,
    });
    await Score.create({
      ...baseScoreData,
      score: 4,
      userId: players[3]._id,
      username: players[3].username,
    });
    await Score.create({
      ...baseScoreData,
      score: 3,
      userId: players[4]._id,
      username: players[4].username,
    });

    await roundEnded(game, round);

    console.log(game.players.map(p => p.username + ' rank ' + p.gameRank));

    expect(game.players[0].gameRank).to.equal(undefined);
    expect(game.players[1].gameRank).to.equal(undefined);
    expect(game.players[2].gameRank).to.equal(5);
    expect(game.players[3].gameRank).to.equal(undefined);
    expect(game.players[4].gameRank).to.equal(undefined);
    expect(game.players[5].gameRank).to.equal(6);
    expect(game.players[6].gameRank).to.equal(6);
  });
});

async function getUser(id: number) {
  return await User.create({
    username: `user${id}`,
    ppRank: id,
    countryRank: id,
    osuUserId: id,
    country: 'US',
    rating: { mu: 1500, sigma: 150 },
  });
}

function getBaseScoreData(round: any) {
  return {
    gameId: new ObjectId(),
    roundId: round._id,
    rank: 'A',
    mods: 0,
    maxCombo: 10,
    accuracy: 1,
    misses: 0,
    count100: 1,
    date: new Date(),
  };
}
