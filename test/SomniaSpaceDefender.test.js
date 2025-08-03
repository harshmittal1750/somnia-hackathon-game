const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SomniaSpaceDefender", function () {
  let SomniaSpaceDefender;
  let somniaSpaceDefender;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();
    SomniaSpaceDefender = await ethers.getContractFactory(
      "SomniaSpaceDefender"
    );
    somniaSpaceDefender = await SomniaSpaceDefender.deploy();
    await somniaSpaceDefender.deployed();
  });

  it("Should set the right owner", async function () {
    expect(await somniaSpaceDefender.owner()).to.equal(owner.address);
  });

  it("Should start with game active", async function () {
    expect(await somniaSpaceDefender.gameActive()).to.be.true;
  });

  it("Should allow owner to toggle game active status", async function () {
    expect(await somniaSpaceDefender.gameActive()).to.be.true;
    await somniaSpaceDefender.connect(owner).toggleGameActive();
    expect(await somniaSpaceDefender.gameActive()).to.be.false;
  });

  it("Should not allow non-owner to toggle game active status", async function () {
    await expect(
      somniaSpaceDefender.connect(player1).toggleGameActive()
    ).to.be.revertedWith("Only owner can call this function");
  });

  it("Should allow players to submit scores", async function () {
    await somniaSpaceDefender
      .connect(player1)
      .submitScore(1000, 3, 20, "normal");

    const playerStats = await somniaSpaceDefender.getPlayerStats(
      player1.address
    );
    expect(playerStats.highScore).to.equal(1000);
    expect(playerStats.totalGames).to.equal(1);
    expect(playerStats.totalAliensKilled).to.equal(20);
    expect(playerStats.maxLevelReached).to.equal(3);
  });

  it("Should update player's highest score", async function () {
    await somniaSpaceDefender
      .connect(player1)
      .submitScore(1000, 3, 20, "normal");
    await somniaSpaceDefender
      .connect(player1)
      .submitScore(2000, 5, 40, "normal");

    const playerStats = await somniaSpaceDefender.getPlayerStats(
      player1.address
    );
    expect(playerStats.highScore).to.equal(2000);
    expect(playerStats.totalGames).to.equal(2);
  });

  it("Should not submit score if game is inactive", async function () {
    await somniaSpaceDefender.connect(owner).toggleGameActive();
    await expect(
      somniaSpaceDefender.connect(player1).submitScore(1000, 3, 20, "normal")
    ).to.be.revertedWith("Game is not active");
  });

  it("Should not submit score if score is zero", async function () {
    await expect(
      somniaSpaceDefender.connect(player1).submitScore(0, 3, 20, "normal")
    ).to.be.revertedWith("Score must be greater than 0");
  });

  it("Should not submit score if level is invalid", async function () {
    await expect(
      somniaSpaceDefender.connect(player1).submitScore(1000, 0, 20, "normal")
    ).to.be.revertedWith("Invalid level");

    await expect(
      somniaSpaceDefender.connect(player1).submitScore(1000, 11, 20, "normal")
    ).to.be.revertedWith("Invalid level");
  });

  it("Should return top scores correctly", async function () {
    await somniaSpaceDefender
      .connect(player1)
      .submitScore(1000, 3, 20, "normal");
    await somniaSpaceDefender
      .connect(player2)
      .submitScore(1500, 4, 30, "normal");
    await somniaSpaceDefender.connect(owner).submitScore(800, 2, 15, "normal");

    const topScores = await somniaSpaceDefender.getTopScores(3);
    expect(topScores.length).to.equal(3);
    expect(topScores[0].score).to.equal(1500); // player2 highest
    expect(topScores[1].score).to.equal(1000); // player1 middle
    expect(topScores[2].score).to.equal(800); // owner lowest
  });

  it("Should emit NewHighScore event for new personal bests", async function () {
    await expect(
      somniaSpaceDefender.connect(player1).submitScore(1000, 3, 20, "normal")
    )
      .to.emit(somniaSpaceDefender, "NewHighScore")
      .withArgs(player1.address, 1000);

    await expect(
      somniaSpaceDefender.connect(player1).submitScore(2000, 5, 40, "normal")
    )
      .to.emit(somniaSpaceDefender, "NewHighScore")
      .withArgs(player1.address, 2000);
  });

  it("Should track game statistics correctly", async function () {
    await somniaSpaceDefender
      .connect(player1)
      .submitScore(1000, 3, 20, "normal");
    await somniaSpaceDefender
      .connect(player2)
      .submitScore(1500, 4, 30, "normal");

    const gameStats = await somniaSpaceDefender.getGameStats();
    expect(gameStats.totalGames).to.equal(2);
    expect(gameStats.totalPlayers).to.equal(2);
    expect(gameStats.leaderboardSize).to.equal(2);
  });

  it("Should return correct player rank", async function () {
    await somniaSpaceDefender
      .connect(player1)
      .submitScore(1000, 3, 20, "normal");
    await somniaSpaceDefender
      .connect(player2)
      .submitScore(1500, 4, 30, "normal");

    const player1Rank = await somniaSpaceDefender.getPlayerRank(
      player1.address
    );
    const player2Rank = await somniaSpaceDefender.getPlayerRank(
      player2.address
    );

    expect(player2Rank).to.equal(1); // player2 has higher score
    expect(player1Rank).to.equal(2); // player1 has lower score
  });

  it("Should have initialized achievements", async function () {
    const totalAchievements = await somniaSpaceDefender.getTotalAchievements();
    expect(totalAchievements.toNumber()).to.be.greaterThan(0);

    const achievements = await somniaSpaceDefender.getAllAchievements();
    expect(achievements.length).to.equal(totalAchievements.toNumber());
  });
});
